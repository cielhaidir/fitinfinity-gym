import { z } from "zod";
import {
    createTRPCRouter,
    protectedProcedure,
} from "@/server/api/trpc";

export const permissionRouter = createTRPCRouter({
    create: protectedProcedure
        .input(z.object({
            name: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            const actions = ['create', 'edit', 'delete', 'list'];
            const permissions = await Promise.all(
                actions.map(action => 
                    ctx.db.permission.create({
                        data: {
                            name: `${action}_${input.name}`,
                        },
                        include: {
                            roles: {
                                include: {
                                    role: true
                                }
                            }
                        }
                    })
                )
            );
            
            return permissions;
        }),

    update: protectedProcedure
        .input(z.object({
            id: z.string(),
            name: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.permission.update({
                where: { id: input.id },
                data: {
                    name: input.name,
                },
                include: {
                    roles: {
                        include: {
                            role: true
                        }
                    }
                }
            });
        }),

    list: protectedProcedure
        .input(z.object({
            page: z.number().min(1),
            limit: z.number().min(1).max(100),
        }))
        .query(async ({ ctx, input }) => {
            const items = await ctx.db.permission.findMany({
                skip: (input.page - 1) * input.limit,
                take: input.limit,
                orderBy: { name: "asc" },
            });

            const total = await ctx.db.permission.count();

            return {
                items,
                total,
                page: input.page,
                limit: input.limit,
            };
        }),

    getAllRoles: protectedProcedure
        .query(async ({ ctx }) => {
            return ctx.db.role.findMany({
                orderBy: { name: "asc" },
                select: {
                    id: true,
                    name: true
                }
            });
        }),

    getById: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            return ctx.db.permission.findUnique({
                where: { id: input.id },
                include: {
                    roles: {
                        include: {
                            role: true
                        }
                    }
                }
            });
        }),

    remove: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.permission.delete({
                where: { id: input.id },
            });
        }),
});
