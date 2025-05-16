import { z } from "zod";
import {
    createTRPCRouter,
    protectedProcedure,
} from "@/server/api/trpc";

export const permissionRouter = createTRPCRouter({
    createSingle: protectedProcedure
        .input(z.object({
            name: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.permission.create({
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

    create: protectedProcedure
        .input(z.object({
            name: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            const actions = ['create', 'edit', 'delete', 'list', 'show'];
            const permissions = await Promise.all(
                actions.map(action => 
                    ctx.db.permission.create({
                        data: {
                            name: `${action}:${input.name}`,
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
            search: z.string().optional(),
            searchColumn: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            const where = {
                AND: [
                    input.search ? {
                        OR: [
                            { name: { contains: input.search, mode: "insensitive" as const } }
                        ],
                    } : {},
                ],
            };

            const items = await ctx.db.permission.findMany({
                skip: (input.page - 1) * input.limit,
                take: input.limit,
                where,
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

    getAll: protectedProcedure
        .query(async ({ ctx }) => {
            const permissions = await ctx.db.permission.findMany({
                orderBy: {
                    name: 'asc'
                }
            });
            return permissions;
        }),
});
