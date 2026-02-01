import { z } from "zod";
import { createTRPCRouter, permissionProtectedProcedure } from "@/server/api/trpc";
import { logApiMutation, extractIpAddress, extractUserAgent } from "@/server/utils/mutationLogger";

export const rolePermissionRouter = createTRPCRouter({
  create: permissionProtectedProcedure(["create:role-permission"])
    .input(
      z.object({
        roleId: z.string(),
        permissionIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const { roleId, permissionIds } = input;

        // Create all role permissions
        result = await Promise.all(
          permissionIds.map((permissionId) =>
            ctx.db.rolePermission.create({
              data: {
                roleId,
                permissionId,
              },
            }),
          ),
        );
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        await logApiMutation({
          db: ctx.db,
          endpoint: "rolePermission.create",
          method: "POST",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  list: permissionProtectedProcedure(["list:role-permission"])
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(10),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, search } = input;
      const skip = (page - 1) * limit;

      const where = search
        ? {
            name: {
              contains: search,
              mode: "insensitive" as const,
            },
          }
        : {};

      const [roles, total] = await Promise.all([
        ctx.db.role.findMany({
          skip,
          take: limit,
          where,
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
          orderBy: {
            name: "asc",
          },
        }),
        ctx.db.role.count({ where }),
      ]);

      return {
        items: roles.map((role) => ({
          ...role,
          permissions: role.permissions.map(
            (rp: { permission: { name: string; id: string } }) => ({
              permission: rp.permission,
            }),
          ),
        })),
        total,
        page,
        limit,
      };
    }),

  getRoles: permissionProtectedProcedure(["list:role"]).query(async ({ ctx }) => {
    const roles = await ctx.db.role.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });
    return roles;
  }),

  getPermissions: permissionProtectedProcedure(["list:permission"]).query(async ({ ctx }) => {
    const permissions = await ctx.db.permission.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });
    return permissions;
  }),

  getPermissionsByRole: permissionProtectedProcedure(["show:role-permission"])
    .input(
      z.object({
        roleId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const rolePermissions = await ctx.db.rolePermission.findMany({
        where: {
          roleId: input.roleId,
        },
        include: {
          permission: true,
        },
      });
      return rolePermissions;
    }),

  update: permissionProtectedProcedure(["update:role-permission"])
    .input(
      z.object({
        roleId: z.string(),
        permissionIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const { roleId, permissionIds } = input;

        // Delete existing role permissions
        await ctx.db.rolePermission.deleteMany({
          where: {
            roleId,
          },
        });

        // Create new role permissions
        result = await Promise.all(
          permissionIds.map((permissionId) =>
            ctx.db.rolePermission.create({
              data: {
                roleId,
                permissionId,
              },
            }),
          ),
        );
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        await logApiMutation({
          db: ctx.db,
          endpoint: "rolePermission.update",
          method: "PUT",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  delete: permissionProtectedProcedure(["delete:role-permission"])
    .input(
      z.object({
        roleId: z.string(),
        permissionId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const { roleId, permissionId } = input;

        result = await ctx.db.rolePermission.delete({
          where: {
            roleId_permissionId: {
              roleId,
              permissionId,
            },
          },
        });
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        await logApiMutation({
          db: ctx.db,
          endpoint: "rolePermission.delete",
          method: "DELETE",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),
});
