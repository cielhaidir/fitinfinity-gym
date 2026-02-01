import { z } from "zod";
import { createTRPCRouter, permissionProtectedProcedure } from "@/server/api/trpc";
import { logApiMutation, extractIpAddress, extractUserAgent } from "@/server/utils/mutationLogger";

export const roleRouter = createTRPCRouter({
  create: permissionProtectedProcedure(["create:role"])
    .input(
      z.object({
        name: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        result = await ctx.db.role.create({
          data: {
            name: input.name,
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
          endpoint: "role.create",
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

  update: permissionProtectedProcedure(["update:role"])
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        result = await ctx.db.role.update({
          where: { id: input.id },
          data: {
            name: input.name,
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
          endpoint: "role.update",
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

  listAll: permissionProtectedProcedure(["list:role"])
    .input(
      z.object({
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const whereClause = input.search
        ? {
            name: {
              contains: input.search,
              mode: "insensitive" as const,
            },
          }
        : {};

      const items = await ctx.db.role.findMany({
        where: whereClause,
        orderBy: { name: "asc" },
      });

      return items;
    }),

  list: permissionProtectedProcedure(["list:role"])
    .input(
      z.object({
        page: z.number().min(1),
        limit: z.number().min(1).max(100),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const whereClause = input.search
        ? {
            name: {
              contains: input.search,
              mode: "insensitive" as const,
            },
          }
        : {};

      const items = await ctx.db.role.findMany({
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        where: whereClause,
        orderBy: { name: "asc" },
      });

      const total = await ctx.db.role.count({ where: whereClause });

      return {
        items,
        total,
        page: input.page,
        limit: input.limit,
      };
    }),

  delete: permissionProtectedProcedure(["delete:role"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        result = await ctx.db.role.delete({
          where: { id: input.id },
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
          endpoint: "role.delete",
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

  getAll: permissionProtectedProcedure(["list:role"]).query(async ({ ctx }) => {
    const roles = await ctx.db.role.findMany({
      orderBy: {
        name: "asc",
      },
    });
    return roles;
  }),
});
