import { z } from "zod"
import {
    createTRPCRouter,
    protectedProcedure,
} from "@/server/api/trpc"

export const memberClassRouter = createTRPCRouter({
    list: protectedProcedure
        .input(z.object({
            page: z.number().min(1),
            limit: z.number().min(1).max(100),
        }))
        .query(async ({ ctx, input }) => {
            const now = new Date();
            
            const items = await ctx.db.class.findMany({
                where: {
                    schedule: {
                        gt: now // Hanya ambil kelas yang jadwalnya lebih besar dari sekarang
                    }
                },
                orderBy: {
                    schedule: 'asc' // Urutkan berdasarkan jadwal terdekat
                },
                include: {
                    trainer: {
                        include: {
                            user: true
                        }
                    },
                    registeredMembers: {
                        include: {
                            member: {
                                include: {
                                    user: true
                                }
                            }
                        }
                    },
                    waitingList: {
                        include: {
                            member: {
                                include: {
                                    user: true
                                }
                            }
                        }
                    }
                },
                skip: (input.page - 1) * input.limit,
                take: input.limit,
            });

            const total = await ctx.db.class.count({
                where: {
                    schedule: {
                        gt: now
                    }
                }
            });

            return {
                items,
                total,
                page: input.page,
                limit: input.limit,
            };
        }),

    register: protectedProcedure
        .input(z.object({ classId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const membership = await ctx.db.membership.findUnique({
                where: { userId: ctx.session.user.id },
            })

            if (!membership) {
                throw new Error("You must be a member to register for classes")
            }

            if (!membership.isActive) {
                throw new Error("Your membership is not active")
            }

            const class_ = await ctx.db.class.findUnique({
                where: { id: input.classId },
                include: {
                    registeredMembers: true,
                },
            })

            if (!class_) {
                throw new Error("Class not found")
            }

            if (class_.schedule < new Date()) {
                throw new Error("Cannot register for past classes")
            }

            if (class_.limit && class_.registeredMembers.length >= class_.limit) {
                throw new Error("Class is full")
            }

            // Check if already registered
            const existingRegistration = await ctx.db.classMember.findFirst({
                where: {
                    classId: input.classId,
                    memberId: membership.id,
                },
            })

            if (existingRegistration) {
                throw new Error("You are already registered for this class")
            }

            return ctx.db.classMember.create({
                data: {
                    classId: input.classId,
                    memberId: membership.id,
                },
                include: {
                    class: {
                        include: {
                            trainer: {
                                include: {
                                    user: true,
                                },
                            },
                        },
                    },
                },
            })
        }),

    joinWaitlist: protectedProcedure
        .input(z.object({ classId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const membership = await ctx.db.membership.findUnique({
                where: { userId: ctx.session.user.id },
            })

            if (!membership) {
                throw new Error("You must be a member to join the waitlist")
            }

            if (!membership.isActive) {
                throw new Error("Your membership is not active")
            }

            const class_ = await ctx.db.class.findUnique({
                where: { id: input.classId },
            })

            if (!class_) {
                throw new Error("Class not found")
            }

            if (class_.schedule < new Date()) {
                throw new Error("Cannot join waitlist for past classes")
            }

            // Check if already registered for the class
            const existingRegistration = await ctx.db.classMember.findFirst({
                where: {
                    classId: input.classId,
                    memberId: membership.id,
                },
            })

            if (existingRegistration) {
                throw new Error("You are already registered for this class")
            }

            // Check if already on waitlist
            const existingWaitlist = await ctx.db.classWaitingList.findFirst({
                where: {
                    classId: input.classId,
                    memberId: membership.id,
                },
            })

            if (existingWaitlist) {
                throw new Error("You are already on the waitlist for this class")
            }

            return ctx.db.classWaitingList.create({
                data: {
                    classId: input.classId,
                    memberId: membership.id,
                },
                include: {
                    class: {
                        include: {
                            trainer: {
                                include: {
                                    user: true,
                                },
                            },
                        },
                    },
                },
            })
        }),

    myClasses: protectedProcedure
        .query(async ({ ctx }) => {
            const membership = await ctx.db.membership.findUnique({
                where: { userId: ctx.session.user.id },
            })

            if (!membership) {
                throw new Error("Membership not found")
            }

            return ctx.db.classMember.findMany({
                where: {
                    memberId: membership.id,
                    class: {
                        schedule: {
                            gte: new Date(),
                        },
                    },
                },
                include: {
                    class: {
                        include: {
                            trainer: {
                                include: {
                                    user: true,
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    class: {
                        schedule: 'asc',
                    },
                },
            })
        }),
}) 