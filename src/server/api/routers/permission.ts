import { z } from "zod";
import {
    createTRPCRouter,
    protectedProcedure,
} from "@/server/api/trpc";

export const permissionRouter = createTRPCRouter({
    create: protectedProcedure
        .input(z.object({
            name: z.string(),
            roleIds: z.array(z.string()).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.permission.create({
                data: {
                    name: input.name,
                    roles: input.roleIds ? {
                        create: input.roleIds.map(roleId => ({
                            role: {
                                connect: { id: roleId }
                            }
                        }))
                    } : undefined
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

    update: protectedProcedure
        .input(z.object({
            id: z.string(),
            name: z.string(),
            roleIds: z.array(z.string()).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            if (input.roleIds) {
                await ctx.db.rolePermission.deleteMany({
                    where: {
                        permissionId: input.id
                    }
                });
            }

            return ctx.db.permission.update({
                where: { id: input.id },
                data: {
                    name: input.name,
                    roles: input.roleIds ? {
                        create: input.roleIds.map(roleId => ({
                            role: {
                                connect: { id: roleId }
                            }
                        }))
                    } : undefined
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
        }))
        .query(async ({ ctx, input }) => {
            const whereClause = input.search
                ? {
                    name: {
                        contains: input.search,
                        mode: "insensitive" as const
                    }
                }
                : {};

            const permissions = await ctx.db.permission.findMany({
                skip: (input.page - 1) * input.limit,
                take: input.limit,
                where: whereClause,
                orderBy: { name: "asc" },
                include: {
                    roles: {
                        include: {
                            role: true
                        }
                    }
                }
            });

            const total = await ctx.db.permission.count({ where: whereClause });

            return {
                permissions,
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
