import { createTRPCRouter, protectedProcedure } from "../trpc";
import { getUpcomingClassesSchema, getActivePackageSchema } from "@/app/(authenticated)/member/dashboard/schema";
import { PackageType } from "@prisma/client";

export const memberUcRouter = createTRPCRouter({
    list: protectedProcedure
        .input(getUpcomingClassesSchema)
        .query(async ({ ctx, input }) => {
            const now = new Date();
            
            return await ctx.db.class.findMany({
                where: {
                    schedule: {
                        gte: now,
                    },
                },
                include: {
                    trainer: {
                        include: {
                            user: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },
                    registeredMembers: {
                        where: {
                            memberId: input.memberId,
                        },
                    },
                    _count: {
                        select: {
                            registeredMembers: true,
                        },
                    },
                },
                orderBy: {
                    schedule: 'asc',
                },
                take: input.limit,
            });
        }),

    getActivePackage: protectedProcedure
        .input(getActivePackageSchema)
        .query(async ({ ctx, input }) => {
            const now = new Date();
            
            return await ctx.db.subscription.findFirst({
                where: {
                    memberId: input.memberId,
                    endDate: {
                        gte: now,
                    },
                    package: {
                        type: PackageType.GYM_MEMBERSHIP
                    }
                },
                include: {
                    package: true,
                    payments: {
                        orderBy: {
                            createdAt: 'desc'
                        },
                        take: 1
                    }
                },
                orderBy: {
                    endDate: 'asc',
                },
            });
        }),
}); 