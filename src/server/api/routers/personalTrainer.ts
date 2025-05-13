import { z } from "zod";
import {
    createTRPCRouter,
    protectedProcedure,
    publicProcedure,
} from "@/server/api/trpc";

export const personalTrainerRouter = createTRPCRouter({
    create: protectedProcedure
        .input(z.object({
            userId: z.string(),
            isActive: z.boolean().optional(),
            createdBy: z.string().optional(),
            description: z.string().optional(),
            expertise: z.string().optional(),
            slogan: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.personalTrainer.create({
                data: {
                    userId: input.userId,
                    isActive: input.isActive ?? true,
                    description: input.description,
                    expertise: input.expertise,
                    slogan: input.slogan,
                },
            });
        }),

    update: protectedProcedure
        .input(z.object({
            id: z.string(),
            description: z.string().optional(),
            expertise: z.string().optional(),
            slogan: z.string().optional(),
            isActive: z.boolean().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.personalTrainer.update({
                where: { id: input.id },
                data: {
                    description: input.description,
                    expertise: input.expertise,
                    slogan: input.slogan,
                    isActive: input.isActive,
                },
            });
        }),

    getById: protectedProcedure
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

    list: protectedProcedure
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

    remove: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.personalTrainer.delete({
                where: { id: input.id },
            });
        }),

    listAll: protectedProcedure
        .query(async ({ ctx }) => {
            return ctx.db.personalTrainer.findMany({
                include: {
                    user: true,
                },
            });
        }),

    createSession: protectedProcedure
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

    getMembers: protectedProcedure
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
                                    name: true,
                                    email: true,
                                    phone: true,
                                },
                            },
                        },
                    },
                },
            });

            console.log('Found subscriptions:', subscriptions.map(s => ({
                memberId: s.memberId,
                remainingSessions: s.remainingSessions
            })));

            // Transform the data to match the frontend interface
            return subscriptions.map((subscription) => ({
                id: subscription.member.id,
                name: subscription.member.user.name || "",
                email: subscription.member.user.email || "",
                phone: subscription.member.user.phone || "",
                remainingSessions: subscription.remainingSessions || 0,
                subscriptionEndDate: subscription.endDate?.toISOString() || "",
            }));
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