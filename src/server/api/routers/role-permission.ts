import { z } from "zod";
import {
    createTRPCRouter,
    protectedProcedure,
} from "@/server/api/trpc";

export const rolePermissionRouter = createTRPCRouter({
    create: protectedProcedure
        .input(z.object({
            roleId: z.string(),
            permissionIds: z.array(z.string())
        }))
        .mutation(async ({ ctx, input }) => {
            // Create multiple role-permission relationships
            return ctx.db.rolePermission.createMany({
                data: input.permissionIds.map(permissionId => ({
                    roleId: input.roleId,
                    permissionId
                }))
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
                    role: {
                        name: {
                            contains: input.search,
                            mode: "insensitive" as const
                        }
                    }
                }
                : {};

            const items = await ctx.db.rolePermission.findMany({
                skip: (input.page - 1) * input.limit,
                take: input.limit,
                where: whereClause,
                include: {
                    role: true,
                    permission: true
                },
                orderBy: {
                    role: {
                        name: "asc"
                    }
                }
            });

            const total = await ctx.db.rolePermission.count({ where: whereClause });

            return {
                items,
                total,
                page: input.page,
                limit: input.limit,
            };
        }),

    getRoles: protectedProcedure.query(async ({ ctx }) => {
        return ctx.db.role.findMany({
            orderBy: { name: "asc" }
        });
    }),

    getPermissions: protectedProcedure.query(async ({ ctx }) => {
        return ctx.db.permission.findMany({
            orderBy: { name: "asc" }
        });
    }),

    getPermissionsByRole: protectedProcedure
        .input(z.object({ roleId: z.string() }))
        .query(async ({ ctx, input }) => {
            return ctx.db.rolePermission.findMany({
                where: { roleId: input.roleId },
                include: { permission: true }
            });
        }),

    update: protectedProcedure
        .input(z.object({
            roleId: z.string(),
            permissionIds: z.array(z.string())
        }))
        .mutation(async ({ ctx, input }) => {
            // Delete existing permissions for this role
            await ctx.db.rolePermission.deleteMany({
                where: { roleId: input.roleId }
            });

            // Create new permissions
            return ctx.db.rolePermission.createMany({
                data: input.permissionIds.map(permissionId => ({
                    roleId: input.roleId,
                    permissionId
                }))
            });
        }),

    remove: protectedProcedure
        .input(z.object({ 
            roleId: z.string(),
            permissionId: z.string()
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.rolePermission.delete({
                where: {
                    roleId_permissionId: {
                        roleId: input.roleId,
                        permissionId: input.permissionId
                    }
                }
            });
        }),
}); 