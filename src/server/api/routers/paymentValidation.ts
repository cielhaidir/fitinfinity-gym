import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  permissionProtectedProcedure,
} from "@/server/api/trpc";
import { db } from "@/server/db";
import {
  PaymentValidationStatus,
  PaymentStatus,
  EmailType,
} from "@prisma/client";
import { emailService } from "@/lib/email/emailService";
import { format } from "date-fns";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { TRPCError } from "@trpc/server";
import { siteConfig } from "@/lib/config/siteConfig";
import { start } from "repl";

export const paymentValidationRouter = createTRPCRouter({
  uploadFile: permissionProtectedProcedure(["upload:payment"])
    .input(
      z.object({
        fileData: z.string(), // base64 string
        fileName: z.string(),
        fileType: z.string(),
        memberId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const { fileData, fileName, fileType, memberId } = input;

      // Validate file type
      const validTypes = [
        "image/jpeg",
        "image/png",
        "image/jpg",
        "application/pdf",
      ];
      if (!validTypes.includes(fileType)) {
        throw new Error(
          "Invalid file type. Only PNG, JPG, JPEG, and PDF files are allowed.",
        );
      }

      // Remove data URL prefix if present
      const base64Data = fileData.replace(/^data:.*?;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (buffer.length > maxSize) {
        throw new Error("File size too large. Maximum size is 5MB.");
      }

      // Generate a unique filename
      const extension = path.extname(fileName);
      const uniqueFilename = `${uuidv4()}${extension}`;

      // Construct the path relative to the public directory
      const relativeUploadDir = path.join("assets", "transaction", memberId);
      const uploadDir = path.join(process.cwd(), "public", relativeUploadDir);
      const filePath = path.join("/", relativeUploadDir, uniqueFilename); // Path to be stored in DB

      // Create directory if it doesn't exist
      await mkdir(uploadDir, { recursive: true });

      // Write the file
      await writeFile(path.join(uploadDir, uniqueFilename), buffer);

      return {
        success: true,
        filePath: filePath,
        message: "File uploaded successfully",
      };
    }),

  create: permissionProtectedProcedure(["create:payment"])
    .input(
      z.object({
        memberId: z.string(),
        packageId: z.string(),
        trainerId: z.string().optional(),
        subsType: z.string(), // "gym", "trainer", or "group"
        duration: z.number(), // days for gym, sessions for trainer and group
        sessions: z.number().optional(), // number of sessions for trainer and group packages
        totalPayment: z.number(),
        paymentMethod: z.string(),
        filePath: z.string(),
        voucherId: z.string().optional(), // Add voucherId to input
        salesId: z.string().optional(), // Add salesId to input
        salesType: z.string().optional(), // Add salesType to input
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Use transaction to ensure all operations succeed or fail together
      return ctx.db.$transaction(async (tx) => {
        // Get the membership to get the user ID
        const membership = await tx.membership.findUnique({
          where: { id: input.memberId },
          include: { user: true },
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
            sessions: input.sessions,
            totalPayment: input.totalPayment,
            paymentMethod: input.paymentMethod,
            filePath: input.filePath,
            paymentStatus: PaymentValidationStatus.WAITING,
            salesId: input.salesId,
            salesType: input.salesType,
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
                decrement: 1,
              },
            },
          });
        }

        return paymentValidation;
      });
    }),

  listWaiting: permissionProtectedProcedure(["list:payment"])
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        // Add any search/filter options if needed later
      }),
    )
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
            },
          },
          package: true, // To get package details
          trainer: {
            include: {
              user: true, // To get trainer's name if applicable
            },
          },
        },
      });
      const total = await ctx.db.paymentValidation.count({
        where: whereClause,
      });
      return { items, total, page, limit };
    }),

  accept: permissionProtectedProcedure(["accept:payment"])
    .input(z.object({ id: z.string(), balanceId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      
      const paymentValidation = await ctx.db.paymentValidation.findUnique({
        where: { id: input.id },
        include: {
          package: true,
          member: {
            include: {
              user: true,
            },
          },
          trainer: {
            include: {
              user: true,
            },
          },
        },
      });

      // console.log("Payment Validation:", paymentValidation);

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

      // Get package details to access day field
      const packageDetails = await ctx.db.package.findUnique({
        where: { id: paymentValidation.packageId },
      });

      if (!packageDetails) {
        throw new Error("Package details not found");
      }

      // Calculate end date based on day field for both package types
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + (packageDetails.day ?? 0));

      // Set remaining sessions for trainer and group packages
      if (paymentValidation.subsType === "trainer" || paymentValidation.subsType === "group") {
        remainingSessions =
          paymentValidation.sessions ?? paymentValidation.duration;
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
            isActive: true,
            salesId: paymentValidation.salesId,
            salesType: paymentValidation.salesType,
          },
        });

        // 2.1. If it's a group training package, create GroupSubscription and GroupMember
        if (paymentValidation.subsType === "group" && packageDetails.isGroupPackage) {
          // Check if group subscription already exists for this subscription
          const existingGroupMember = await prisma.groupMember.findFirst({
            where: { subscriptionId: subscription.id }
          });

          if (!existingGroupMember) {
            // Get member details for group name
            const memberDetails = await prisma.membership.findUnique({
              where: { id: paymentValidation.memberId },
              include: { user: true }
            });

            // Create group subscription
            const groupSubscription = await prisma.groupSubscription.create({
              data: {
                groupName: `${memberDetails?.user?.name || 'Member'}'s Group`,
                leadSubscriptionId: subscription.id,
                packageId: paymentValidation.packageId,
                totalMembers: 1,
                maxMembers: packageDetails.maxUsers ?? 4,
                status: "ACTIVE"
              }
            });

            // Add lead as first member
            await prisma.groupMember.create({
              data: {
                groupSubscriptionId: groupSubscription.id,
                subscriptionId: subscription.id,
                status: "ACTIVE"
              }
            });
          }
        }

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

        // 4. Send payment receipt email
        const paymentTemplate = await prisma.emailTemplate.findFirst({
          where: { type: EmailType.PAYMENT_RECEIPT },
        });

        if (paymentTemplate && paymentValidation.member?.user?.email) {
          await emailService.sendTemplateEmail({
            to: paymentValidation.member.user.email,
            templateId: paymentTemplate.id,
            templateData: {
              memberName: paymentValidation.member.user.name,
              packageName: paymentValidation.package.name,
              receiptNumber: subscription.id,
              totalAmount: paymentValidation.totalPayment,
              paymentStatus: PaymentStatus.SUCCESS,
              statusClass: PaymentStatus.SUCCESS.toLowerCase(),
              paymentDate: format(new Date(), "PPP"),
              paymentMethod: paymentValidation.paymentMethod,
              duration: `${paymentValidation.duration} ${paymentValidation.subsType === "gym" ? "days" : "sessions"}`,
              currency: "Rp",
              memberEmail: paymentValidation.member.user.email,
              supportEmail: siteConfig.supportEmail,
              supportPhone: siteConfig.supportPhone,
              logoUrl: siteConfig.logoUrl,
              portalUrl: siteConfig.portalUrl,
              currentYear: new Date().getFullYear(),
              address: siteConfig.address,
              // Conditional trainer data
              ...(paymentValidation.trainer && {
                personalTrainer: true,
                trainerName: paymentValidation.trainer.user.name,
              }),
              // Optional discount data if voucher was used
              ...(paymentValidation.package.price >
                paymentValidation.totalPayment && {
                subtotal: paymentValidation.package.price,
                discount:
                  paymentValidation.package.price -
                  paymentValidation.totalPayment,
              }),
            },
          });
        }

        // 6. Optionally, give points to user if applicable by package
        if (
          paymentValidation.package.point &&
          paymentValidation.package.point > 0 &&
          paymentValidation.member?.user?.id
        ) {
          await prisma.user.update({
            where: {
              id: paymentValidation.member.user.id,
            },
            data: {
              point: { increment: paymentValidation.package.point },
            },
          });
        }

        return { success: true, subscriptionId: subscription.id };
      });
    }),

  decline: permissionProtectedProcedure(["decline:payment"])
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
        data: {
          paymentStatus: PaymentValidationStatus.DECLINED,
          updatedAt: new Date(),
        },
      });
    }),

  listAll: permissionProtectedProcedure(["list:payment"])
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
      }),
    )
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
            },
          },
          package: true,
          trainer: {
            include: {
              user: true,
            },
          },
        },
      });
      const total = await ctx.db.paymentValidation.count();
      return { items, total, page, limit };
    }),

  getAllPayments: permissionProtectedProcedure(["list:payment"])
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
        searchColumn: z.string().optional(),
        status: z.string().optional(), // Add status filter
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, search, searchColumn, status } = input;
      const skip = (page - 1) * limit;

      // Build search conditions for offline payments
      let offlineWhereCondition: any = {};
      if (search && searchColumn) {
        if (searchColumn === "member.user.name") {
          offlineWhereCondition = {
            member: {
              user: {
                name: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
          };
        } else if (searchColumn === "package.name") {
          offlineWhereCondition = {
            package: {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
          };
        }
      }

      // Add status filter for offline payments
      if (status) {
        offlineWhereCondition.paymentStatus = status;
      }

      // Fetch offline payments (payment validations)
      const offlinePaymentsPromise = ctx.db.paymentValidation.findMany({
        where: offlineWhereCondition,
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
          member: {
            include: {
              user: true, // To get member's name
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Fetch total count for offline payments
      const offlineTotalPromise = ctx.db.paymentValidation.count({
        where: offlineWhereCondition,
      });

      // Build search conditions for online payments
      let onlineWhereCondition: any = {};
      if (search && searchColumn) {
        if (searchColumn === "member.user.name") {
          onlineWhereCondition = {
            member: {
              user: {
                name: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
          };
        } else if (searchColumn === "package.name") {
          onlineWhereCondition = {
            package: {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
          };
        }
      }

      // Add status filter to payments query for online payments
      let paymentStatusFilter: any = {
        NOT: {
          orderReference: null, // Only get payments with order references (online)
        },
      };
      if (status) {
        paymentStatusFilter.status = status;
      }

      // Fetch online payments through subscriptions
      const onlineSubscriptionsPromise = ctx.db.subscription.findMany({
        where: onlineWhereCondition,
        include: {
          payments: {
            where: paymentStatusFilter,
          },
          member: {
            include: {
              user: true, // To get member's name
            },
          },
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
      });

      // Resolve promises for offline and online payments
      const [offlinePayments, offlineTotal, onlineSubscriptions] =
        await Promise.all([
          offlinePaymentsPromise,
          offlineTotalPromise,
          onlineSubscriptionsPromise,
        ]);

      // Transform online subscriptions with payments into a similar format as offline payments
      const onlinePayments = onlineSubscriptions.flatMap((subscription) =>
        subscription.payments.map((payment) => ({
          id: payment.id,
          subscriptionId: subscription.id, // Add subscription ID for editing
          createdAt: payment.createdAt,
          paymentStatus: payment.status,
          totalPayment: payment.totalPayment,
          paymentMethod: payment.method,
          subsType: subscription.trainerId
            ? (subscription.package?.type === "GROUP_TRAINING" ? "group" : "trainer")
            : "gym",
          orderReference: payment.orderReference,
          package: subscription.package,
          trainer: subscription.trainer,
          member: subscription.member,
          isOnlinePayment: true,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          // Add sales information
          salesId: subscription.salesId,
          salesType: subscription.salesType,
        })),
      );

      // Transform offline payments to include subscription-like data
      // For offline payments, we need to create a subscription record or handle differently
      const transformedOfflinePayments = offlinePayments.map((payment) => ({
        ...payment,
        subscriptionId: payment.id, // Use payment validation ID as fallback
        isOnlinePayment: false,
        salesId: null, // Offline payments don't have sales tracking yet
        salesType: null,
      }));
      // Combine and sort both payment types
      const allPayments = [...transformedOfflinePayments, ...onlinePayments].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      // Apply pagination to the combined result
      const paginatedItems = allPayments.slice(skip, skip + limit);

      return {
        items: paginatedItems,
        total: offlineTotal + onlinePayments.length,
        page,
        limit,
      };
    }),
  getMemberPayments: permissionProtectedProcedure(["show:payment"])
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        includeOnline: z.boolean().default(true), // Add flag to include online payments
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, includeOnline } = input;
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

      // Get offline payments (payment validations)
      const offlinePaymentsPromise = ctx.db.paymentValidation.findMany({
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
          member: {
            include: {
              user: true, // To get member's name
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Get total count for offline payments
      const offlineTotalPromise = ctx.db.paymentValidation.count({
        where: {
          memberId: member.id,
        },
      });

      // Get online payments if requested
      let onlinePayments: any[] = [];
      let onlineTotal = 0;

      if (includeOnline) {
        // Get online payments through subscription
        const subscriptions = await ctx.db.subscription.findMany({
          where: {
            memberId: member.id,
          },
          include: {
            payments: {
              where: {
                NOT: {
                  orderReference: null, // Only get payments with order references (online)
                },
              },
            },
            member: {
              include: {
                user: true, // To get member's name
              },
            },
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
        });

        // Transform subscriptions with payments into a similar format as offline payments
        onlinePayments = subscriptions.flatMap((subscription) =>
          subscription.payments.map((payment) => ({
            id: payment.id,
            createdAt: payment.createdAt,
            paymentStatus: payment.status,
            totalPayment: payment.totalPayment,
            paymentMethod: payment.method,
            subsType: subscription.trainerId 
            ? (subscription.package?.type === "GROUP_TRAINING" ? "group" : "trainer")
            : "gym",
            orderReference: payment.orderReference,
            package: subscription.package,
            trainer: subscription.trainer,
            isOnlinePayment: true,
            startDate: subscription.startDate,
            endDate: subscription.endDate
          })),
        );

        onlineTotal = onlinePayments.length;
      }

      // Resolve promises for offline payments
      const [offlinePayments, offlineTotal] = await Promise.all([
        offlinePaymentsPromise,
        offlineTotalPromise,
      ]);

      // Combine and sort both payment types
      const allPayments = [...transformedOfflinePayments, ...onlinePayments].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      // Apply pagination to the combined result
      const paginatedItems = allPayments.slice(skip, skip + limit);

      return {
        items: paginatedItems,
        total: offlineTotal + onlineTotal,
        page,
        limit,
      };
    }),


    getActive: permissionProtectedProcedure(["list:payment"])
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate } = input;
  
      const now = new Date();
      const defaultStart = new Date();
      defaultStart.setDate(now.getDate() - 30);
  
      return ctx.db.payment.findMany({
        where: {
          status: PaymentStatus.SUCCESS,
          createdAt: {
            gte: startDate || defaultStart,
            lte: endDate || now,
          },
        },
        include: {
          subscription: {
            include: {
              member: {
                include: {
                  user: true,
                  fc: {
                    include: {
                      user: {
                        select: { name: true },
                      },
                    },
                  },
                 
                },
              },
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
          },
        },
      });
    }),
  
});
