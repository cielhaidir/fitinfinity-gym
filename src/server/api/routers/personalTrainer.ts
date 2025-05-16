import { z } from "zod";
import {
    createTRPCRouter,
    permissionProtectedProcedure,
    publicProcedure,
    protectedProcedure
} from "@/server/api/trpc";
import { memberSchema } from "@/app/(authenticated)/PT/member_list/schema";

export const personalTrainerRouter = createTRPCRouter({
    create: permissionProtectedProcedure(['create:trainers'])
        .input(z.object({
            userId: z.string(),
            isActive: z.boolean().optional(),
            createdBy: z.string().optional(),
            description: z.string().optional(),
            expertise: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.personalTrainer.create({
                data: {
                    userId: input.userId,
                    isActive: input.isActive ?? true,
                    description: input.description,
                    expertise: input.expertise,
                },
            });
        }),

    update: permissionProtectedProcedure(['edit:trainers'])
        .input(z.object({
            id: z.string(),
            description: z.string().optional(),
            expertise: z.string().optional(),
            isActive: z.boolean().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.personalTrainer.update({
                where: { id: input.id },
                data: {
                    description: input.description,
                    expertise: input.expertise,
                    isActive: input.isActive,
                },
            });
        }),

    getById: permissionProtectedProcedure(['show:trainers'])
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            return ctx.db.personalTrainer.findFirst({
                where: { 
                    userId: input.id,
                    isActive: true
                },
                include: {
                    user: true,
                },
            });
        }),

    list: permissionProtectedProcedure(['list:trainers'])
        .input(z.object({
            page: z.number().min(1),
            limit: z.number().min(1).max(100),
            search: z.string().optional(),
            searchColumn: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            const whereClause = input.search
                ? input.searchColumn?.startsWith("user.")
                    ? {
                        user: {
                            [input.searchColumn.replace("user.", "")]: {
                                contains: input.search,
                                mode: "insensitive" as const
                            }
                        }
                    }
                    : {
                        [input.searchColumn ?? ""]: {
                            contains: input.search,
                            mode: "insensitive" as const
                        }
                    }
                : {};

            const items = await ctx.db.personalTrainer.findMany({
                skip: (input.page - 1) * input.limit,
                take: input.limit,
                where: whereClause,
                orderBy: { createdAt: "desc" },
                include: {
                    user: true,
                },
            });

            const total = await ctx.db.personalTrainer.count({ where: whereClause });

            return {
                items,
                total,
                page: input.page,
                limit: input.limit,
            };
        }),

    remove: permissionProtectedProcedure(['remove:trainers'])
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.personalTrainer.delete({
                where: { id: input.id },
            });
        }),

    listAll: permissionProtectedProcedure(['list:trainers'])
        .query(async ({ ctx }) => {
            return ctx.db.personalTrainer.findMany({
                include: {
                    user: true,
                },
            });
        }),

    createSession: permissionProtectedProcedure(['create:session'])
        .input(z.object({
            memberId: z.string(),
            date: z.date(),
            startTime: z.date(),
            endTime: z.date(),
            description: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            console.log('ctx.db:', ctx.db);
            
            const trainer = await ctx.db.personalTrainer.findFirst({
                where: { 
                    userId: ctx.session.user.id,
                    isActive: true
                }
            });

            console.log('Current user ID:', ctx.session.user.id);
            console.log('Found trainer:', trainer);

            if (!trainer) {
                throw new Error("Trainer not found. Please make sure you are registered as an active trainer.");
            }

            return ctx.db.trainerSession.create({
                data: {
                    trainerId: trainer.id,
                    memberId: input.memberId,
                    date: input.date,
                    startTime: input.startTime,
                    endTime: input.endTime,
                    description: input.description,
                }
            });
        }),

    getMembers: permissionProtectedProcedure(['list:trainers'])
        .query(async ({ ctx }) => {
            console.log('Getting members for trainer');
            
            // Get the personal trainer's ID
            const personalTrainer = await ctx.db.personalTrainer.findFirst({
                where: {
                    userId: ctx.session.user.id,
                    isActive: true,
                },
            });

            if (!personalTrainer) {
                console.log('No active trainer found');
                return [];
            }

            console.log('Found trainer:', personalTrainer.id);

            // Get all subscriptions for this personal trainer
            const subscriptions = await ctx.db.subscription.findMany({
                where: {
                    trainerId: personalTrainer.id,
                },
                orderBy: {
                    remainingSessions: 'desc'
                },
                include: {
                    member: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                    phone: true,
                                    height: true,
                                    weight: true,
                                    birthDate: true,
                                },
                            },
                        },
                    },
                },
            });

            console.log('Found subscriptions:', subscriptions.map(s => ({
                memberId: s.memberId,
                remainingSessions: s.remainingSessions,
                userId: s.member.userId
            })));

            // Transform the data to match the frontend interface
            return subscriptions.map((subscription) => ({
                id: subscription.member.userId,
                membershipId: subscription.memberId,
                name: subscription.member.user.name || "",
                email: subscription.member.user.email || "",
                phone: subscription.member.user.phone || "",
                height: subscription.member.user.height ?? null,
                weight: subscription.member.user.weight ?? null,
                birthDate: subscription.member.user.birthDate?.toISOString() ?? null,
                remainingSessions: subscription.remainingSessions || 0,
                subscriptionEndDate: subscription.endDate?.toISOString() || "",
            }));
        }),

    updateMember: protectedProcedure
        .input(memberSchema)
        .mutation(async ({ ctx, input }) => {
            const trainer = await ctx.db.personalTrainer.findFirst({
                where: { 
                    userId: ctx.session.user.id,
                    isActive: true
                }
            });

            if (!trainer) {
                throw new Error("Trainer not found or not active.");
            }

            return ctx.db.$transaction(async (prisma) => {
                // Update User details
                await prisma.user.update({
                    where: { id: input.id },
                    data: {
                        name: input.name,
                        email: input.email,
                        phone: input.phone,
                        height: input.height,
                        weight: input.weight,
                    },
                });

                // Find Membership record using User.id
                const membership = await prisma.membership.findUnique({
                    where: {
                        userId: input.id,
                    },
                    select: {
                        id: true,
                    }
                });

                if (!membership) {
                    throw new Error("Membership not found for this user.");
                }

                // Update Subscription details
                // We need to find the specific subscription for this member (Membership.id) with this trainer
                const subscription = await prisma.subscription.findFirst({
                    where: {
                        memberId: membership.id,
                        trainerId: trainer.id,
                    },
                });

                if (!subscription) {
                    throw new Error("Subscription not found for this member with the current trainer.");
                }
                
                await prisma.subscription.update({
                    where: {
                        id: subscription.id,
                    },
                    data: {
                        remainingSessions: input.remainingSessions,
                        endDate: new Date(input.subscriptionEndDate),
                    },
                });

                return { success: true, message: "Member updated successfully" };
            });
        }),

    // Public endpoint to get active trainers for landing page
    getActiveTrainers: publicProcedure
        .query(async ({ ctx }) => {
            return ctx.db.personalTrainer.findMany({
                where: {
                    isActive: true,
                },
                include: {
                    user: {
                        select: {
                            name: true,
                            image: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
            });
        }),
}); 