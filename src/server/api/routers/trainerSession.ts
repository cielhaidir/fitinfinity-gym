import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const trainerSessionRouter = createTRPCRouter({
    create: protectedProcedure
        .input(z.object({
            memberId: z.string(),
            date: z.date(),
            startTime: z.date(),
            endTime: z.date(),
            description: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            console.log('Creating session for member:', input.memberId);
            
            // Get the trainer ID for the current user
            const trainer = await ctx.db.personalTrainer.findFirst({
                where: { 
                    userId: ctx.session.user.id,
                    isActive: true
                }
            });

            if (!trainer) {
                console.log('Trainer not found or not active');
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Trainer not found or not active'
                });
            }

            console.log('Found trainer:', trainer.id);

            // Get the member's subscription
            const subscription = await ctx.db.subscription.findFirst({
                where: {
                    memberId: input.memberId,
                    trainerId: trainer.id,
                },
                orderBy: {
                    remainingSessions: 'desc'
                }
            });

            if (!subscription) {
                console.log('No subscription found for member');
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Member does not have a subscription with this trainer'
                });
            }

            console.log('Found subscription:', {
                id: subscription.id,
                remainingSessions: subscription.remainingSessions,
                endDate: subscription.endDate
            });

            if (!subscription.remainingSessions || subscription.remainingSessions <= 0) {
                console.log('No remaining sessions:', subscription.remainingSessions);
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Member tidak memiliki sisa sesi yang tersedia'
                });
            }

            // Create the training session and decrement remaining sessions in a transaction
            return ctx.db.$transaction(async (tx) => {
                console.log('Starting transaction');
                
                // Create the session
                const session = await tx.trainerSession.create({
                    data: {
                        trainerId: trainer.id,
                        memberId: input.memberId,
                        date: input.date,
                        startTime: input.startTime,
                        endTime: input.endTime,
                        description: input.description,
                    }
                });

                console.log('Session created:', session.id);

                // Decrement remaining sessions
                const updatedSubscription = await tx.subscription.update({
                    where: {
                        id: subscription.id
                    },
                    data: {
                        remainingSessions: {
                            decrement: 1
                        }
                    }
                });

                console.log('Updated subscription:', {
                    id: updatedSubscription.id,
                    remainingSessions: updatedSubscription.remainingSessions
                });

                return session;
            });
        }),

    getAll: protectedProcedure
        .query(async ({ ctx }) => {
            // Check if user is a trainer
            const trainer = await ctx.db.personalTrainer.findFirst({
                where: { 
                    userId: ctx.session.user.id,
                    isActive: true
                }
            });

            if (trainer) {
                // If user is a trainer, get all their sessions
                return ctx.db.trainerSession.findMany({
                    where: {
                        trainerId: trainer.id,
                    },
                    include: {
                        member: {
                            include: {
                                user: {
                                    select: {
                                        name: true,
                                        email: true,
                                    }
                                }
                            }
                        }
                    },
                    orderBy: {
                        date: 'asc',
                    }
                });
            }

            // If not a trainer, check if user is a member
            const member = await ctx.db.membership.findFirst({
                where: { 
                    userId: ctx.session.user.id
                }
            });

            if (!member) {
                return [];
            }

            // Get all active subscriptions for this member
            const subscriptions = await ctx.db.subscription.findMany({
                where: {
                    memberId: member.id,
                    remainingSessions: {
                        gt: 0
                    }
                },
                select: {
                    trainerId: true
                }
            });

            if (subscriptions.length === 0) {
                return [];
            }

            // Get all sessions for this member from their subscribed trainers
            return ctx.db.trainerSession.findMany({
                where: {
                    memberId: member.id,
                    trainerId: {
                        in: subscriptions.map(sub => sub.trainerId).filter((id): id is string => id !== null)
                    }
                },
                include: {
                    trainer: {
                        include: {
                            user: {
                                select: {
                                    name: true,
                                    email: true,
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    date: 'asc',
                }
            });
        }),

    getByDate: protectedProcedure
        .input(z.object({
            date: z.date(),
        }))
        .query(async ({ ctx, input }) => {
            // Get the trainer ID for the current user
            const trainer = await ctx.db.personalTrainer.findFirst({
                where: { 
                    userId: ctx.session.user.id,
                    isActive: true
                }
            });

            if (!trainer) {
                return [];
            }

            // Get sessions for this trainer on the specified date
            return ctx.db.trainerSession.findMany({
                where: {
                    trainerId: trainer.id,
                    date: {
                        gte: new Date(input.date.setHours(0, 0, 0, 0)),
                        lt: new Date(input.date.setHours(23, 59, 59, 999)),
                    }
                },
                include: {
                    member: {
                        include: {
                            user: {
                                select: {
                                    name: true,
                                    email: true,
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    startTime: 'asc',
                }
            });
        }),

    delete: protectedProcedure
        .input(z.object({
            id: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            // Get the trainer ID for the current user
            const trainer = await ctx.db.personalTrainer.findFirst({
                where: { 
                    userId: ctx.session.user.id,
                    isActive: true
                }
            });

            if (!trainer) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Trainer not found or not active'
                });
            }

            // Check if the session belongs to this trainer
            const session = await ctx.db.trainerSession.findFirst({
                where: {
                    id: input.id,
                    trainerId: trainer.id,
                }
            });

            if (!session) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Session not found or you do not have permission to delete it'
                });
            }

            // Delete the session
            return ctx.db.trainerSession.delete({
                where: {
                    id: input.id,
                }
            });
        }),

    update: protectedProcedure
        .input(z.object({
            id: z.string(),
            date: z.date(),
            startTime: z.date(),
            endTime: z.date(),
        }))
        .mutation(async ({ ctx, input }) => {
            console.log('Received update mutation:', {
                id: input.id,
                date: input.date.toISOString(),
                startTime: input.startTime.toISOString(),
                endTime: input.endTime.toISOString(),
            });

            try {
                // Verify the trainer owns this session
                const existingSession = await ctx.db.trainerSession.findFirst({
                    where: {
                        id: input.id,
                        trainer: {
                            userId: ctx.session.user.id,
                        },
                    },
                });

                console.log('Found existing session:', existingSession);

                if (!existingSession) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Sesi tidak ditemukan atau Anda tidak memiliki akses',
                    });
                }

                // Create new Date objects to ensure proper formatting
                const updateDate = new Date(input.date);
                const updateStartTime = new Date(input.startTime);
                const updateEndTime = new Date(input.endTime);

                console.log('Updating with formatted dates:', {
                    date: updateDate.toISOString(),
                    startTime: updateStartTime.toISOString(),
                    endTime: updateEndTime.toISOString(),
                });

                // Update the session
                const updatedSession = await ctx.db.trainerSession.update({
                    where: { id: input.id },
                    data: {
                        date: updateDate,
                        startTime: updateStartTime,
                        endTime: updateEndTime,
                    },
                    include: {
                        member: {
                            include: {
                                user: true,
                            },
                        },
                    },
                });

                console.log('Update successful:', updatedSession);
                return updatedSession;

            } catch (error) {
                console.error('Error in update mutation:', error);
                if (error instanceof TRPCError) throw error;
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Gagal mengupdate sesi',
                });
            }
        }),
}); 