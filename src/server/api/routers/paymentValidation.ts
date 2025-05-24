import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { PaymentValidationStatus, PaymentStatus } from "@prisma/client";
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { TRPCError } from "@trpc/server";

export const paymentValidationRouter = createTRPCRouter({
    uploadFile: protectedProcedure
        .input(z.object({
            fileData: z.string(), // base64 string
            fileName: z.string(),
            fileType: z.string(),
            memberId: z.string(),
        }))
        .mutation(async ({ input }) => {
            const { fileData, fileName, fileType, memberId } = input;

            // Validate file type
            const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
            if (!validTypes.includes(fileType)) {
                throw new Error('Invalid file type. Only PNG, JPG, JPEG, and PDF files are allowed.');
            }

            // Remove data URL prefix if present
            const base64Data = fileData.replace(/^data:.*?;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');

            // Validate file size (5MB max)
            const maxSize = 5 * 1024 * 1024; // 5MB in bytes
            if (buffer.length > maxSize) {
                throw new Error('File size too large. Maximum size is 5MB.');
            }

            // Generate a unique filename
            const extension = path.extname(fileName);
            const uniqueFilename = `${uuidv4()}${extension}`;
            
            // Construct the path relative to the public directory
            const relativeUploadDir = path.join('assets', 'transaction', memberId);
            const uploadDir = path.join(process.cwd(), 'public', relativeUploadDir);
            const filePath = path.join('/', relativeUploadDir, uniqueFilename); // Path to be stored in DB

            // Create directory if it doesn't exist
            await mkdir(uploadDir, { recursive: true });

            // Write the file
            await writeFile(path.join(uploadDir, uniqueFilename), buffer);

            return {
                success: true,
                filePath: filePath,
                message: 'File uploaded successfully'
            };
        }),

    create: protectedProcedure
        .input(z.object({
            memberId: z.string(),
            packageId: z.string(),
            trainerId: z.string().optional(),
            subsType: z.string(), // "gym" or "trainer"
            duration: z.number(), // days for gym, sessions for trainer
            totalPayment: z.number(),
            paymentMethod: z.string(),
            filePath: z.string(),
            voucherId: z.string().optional(), // Add voucherId to input
        }))
        .mutation(async ({ ctx, input }) => {
            // Use transaction to ensure all operations succeed or fail together
            return ctx.db.$transaction(async (tx) => {
                // Get the membership to get the user ID
                const membership = await tx.membership.findUnique({
                    where: { id: input.memberId },
                    include: { user: true }
                });

                if (!membership) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "Membership not found",
                    });
                }

                // Create PaymentValidation entry
                const paymentValidation = await tx.paymentValidation.create({
                    data: {
                        memberId: input.memberId,
                        packageId: input.packageId,
                        trainerId: input.trainerId,
                        subsType: input.subsType,
                        duration: input.duration,
                        totalPayment: input.totalPayment,
                        paymentMethod: input.paymentMethod,
                        filePath: input.filePath,
                        paymentStatus: PaymentValidationStatus.WAITING,
                    },
                });

                // If voucherId is provided, create VoucherClaim and update voucher
                if (input.voucherId) {
                    // Create voucher claim using the user ID
                    await tx.voucherClaim.create({
                        data: {
                            memberId: membership.user.id, // Use user ID instead of member ID
                            voucherId: input.voucherId,
                        },
                    });

                    // Decrement maxClaim
                    await tx.voucher.update({
                        where: { id: input.voucherId },
                        data: {
                            maxClaim: {
                                decrement: 1
                            }
                        },
                    });
                }

                return paymentValidation;
            });
        }),

    listWaiting: protectedProcedure // Assuming only admins/protected users can see this
        .input(z.object({
            page: z.number().min(1).default(1),
            limit: z.number().min(1).max(100).default(10),
            // Add any search/filter options if needed later
        }))
        .query(async ({ ctx, input }) => {
            const { page, limit } = input;
            const whereClause = {
                paymentStatus: PaymentValidationStatus.WAITING,
                filePath: { not: null }, // Only those with uploaded proof
            };

            const items = await ctx.db.paymentValidation.findMany({
                where: whereClause,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    member: {
                        include: {
                            user: true, // To get member's name
                        }
                    },
                    package: true, // To get package details
                    trainer: {
                        include: {
                            user: true // To get trainer's name if applicable
                        }
                    }
                },
            });
            const total = await ctx.db.paymentValidation.count({ where: whereClause });
            return { items, total, page, limit };
        }),

    accept: protectedProcedure // Assuming only admins can accept
        .input(z.object({ id: z.string(), balanceId: z.number() }))
        .mutation(async ({ ctx, input }) => {
            const paymentValidation = await ctx.db.paymentValidation.findUnique({
                where: { id: input.id },
                include: { 
                    package: true,
                    member: {
                        include: {
                            user: true
                        }
                    }
                }, // Include package to get duration/session details
            });

            if (!paymentValidation) {
                throw new Error("Payment validation record not found.");
            }
            if (paymentValidation.paymentStatus !== PaymentValidationStatus.WAITING) {
                throw new Error("Payment validation is not in WAITING state.");
            }
            if (!paymentValidation.package) {
                throw new Error("Package details not found for this validation.");
            }

            const startDate = new Date();
            let endDate: Date | undefined = undefined;
            let remainingSessions: number | undefined = undefined;

            if (paymentValidation.subsType === "gym") {
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + paymentValidation.duration);
            } else if (paymentValidation.subsType === "trainer") {
                remainingSessions = paymentValidation.duration;
            }

            // Use a transaction to ensure atomicity
            return ctx.db.$transaction(async (prisma) => {
                // 1. Update PaymentValidation status dan balanceId
                await prisma.paymentValidation.update({
                    where: { id: input.id },
                    data: { 
                        paymentStatus: PaymentValidationStatus.ACCEPTED, 
                        updatedAt: new Date(),
                        balanceId: input.balanceId,
                    },
                });

                // 2. Create Subscription
                const subscription = await prisma.subscription.create({
                    data: {
                        memberId: paymentValidation.memberId,
                        packageId: paymentValidation.packageId,
                        trainerId: paymentValidation.trainerId,
                        startDate: startDate,
                        endDate: endDate,
                        remainingSessions: remainingSessions,
                    },
                });

                // 3. Create Payment record for the subscription
                await prisma.payment.create({
                    data: {
                        subscriptionId: subscription.id,
                        status: PaymentStatus.SUCCESS, // Since it's accepted
                        method: paymentValidation.paymentMethod,
                        totalPayment: paymentValidation.totalPayment,
                        createdAt: new Date(),
                    },
                });
                
                // 4. Optionally, give points to user if applicable by package
                if (paymentValidation.package.point && paymentValidation.package.point > 0 && paymentValidation.member?.user?.id) {
                    await prisma.user.update({
                        where: {
                            id: paymentValidation.member.user.id
                        },
                        data: {
                            point: { increment: paymentValidation.package.point }
                        }
                    });
                }

                return { success: true, subscriptionId: subscription.id };
            });
        }),

    decline: protectedProcedure // Assuming only admins can decline
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const paymentValidation = await ctx.db.paymentValidation.findUnique({
                where: { id: input.id },
            });

            if (!paymentValidation) {
                throw new Error("Payment validation record not found.");
            }
            if (paymentValidation.paymentStatus !== PaymentValidationStatus.WAITING) {
                throw new Error("Payment validation is not in WAITING state.");
            }

            return ctx.db.paymentValidation.update({
                where: { id: input.id },
                data: { paymentStatus: PaymentValidationStatus.DECLINED, updatedAt: new Date() },
            });
        }),

    listAll: protectedProcedure
        .input(z.object({
            page: z.number().min(1).default(1),
            limit: z.number().min(1).max(100).default(10),
        }))
        .query(async ({ ctx, input }) => {
            const { page, limit } = input;

            const items = await ctx.db.paymentValidation.findMany({
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    member: {
                        include: {
                            user: true,
                        }
                    },
                    package: true,
                    trainer: {
                        include: {
                            user: true
                        }
                    }
                },
            });
            const total = await ctx.db.paymentValidation.count();
            return { items, total, page, limit };
        }),

    getMemberPayments: protectedProcedure
        .input(
            z.object({
                page: z.number().min(1).default(1),
                limit: z.number().min(1).max(100).default(10),
            })
        )
        .query(async ({ ctx, input }) => {
            const { page, limit } = input;
            const skip = (page - 1) * limit;

            // Get the member ID from the user's session
            const member = await ctx.db.membership.findFirst({
                where: {
                    userId: ctx.session.user.id,
                },
            });

            if (!member) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Member not found",
                });
            }

            // Get total count
            const total = await ctx.db.paymentValidation.count({
                where: {
                    memberId: member.id,
                },
            });

            // Get paginated payments
            const items = await ctx.db.paymentValidation.findMany({
                where: {
                    memberId: member.id,
                },
                include: {
                    package: true,
                    trainer: {
                        include: {
                            user: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
                skip,
                take: limit,
            });

            return {
                items,
                total,
                page,
                limit,
            };
        }),
}); 