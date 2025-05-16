import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, permissionProtectedProcedure } from "@/server/api/trpc";

export const memberCalendarRouter = createTRPCRouter({
    getAll: permissionProtectedProcedure(['list:session']).query(async ({ ctx }) => {
        const member = await ctx.db.membership.findUnique({
            where: {
                userId: ctx.session.user.id,
            },
        });

        if (!member) {
            return [];
        }

        const sessions = await ctx.db.trainerSession.findMany({
            where: {
                memberId: member.id,
            },
            include: {
                trainer: {
                    select: {
                        user: {
                            select: {
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                date: "asc",
            },
        });

        return sessions;
    }),
}); 