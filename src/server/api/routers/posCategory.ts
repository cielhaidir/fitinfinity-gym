import { z } from "zod";
import { createTRPCRouter, permissionProtectedProcedure } from "@/server/api/trpc";
import { logApiMutation, extractIpAddress, extractUserAgent } from "@/server/utils/mutationLogger";

export const posCategoryRouter = createTRPCRouter({
  list: permissionProtectedProcedure(["list:pos-category"])
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, search } = input;
      const skip = (page - 1) * limit;

      const where = {
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
          ],
        }),
      };

      const [items, total] = await Promise.all([
        ctx.db.pOSCategory.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            _count: {
              select: { items: true },
            },
          },
        }),
        ctx.db.pOSCategory.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }),

  getById: permissionProtectedProcedure(["show:pos-category"])
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.pOSCategory.findUnique({
        where: { id: input.id },
        include: {
          items: {
            where: { isActive: true },
            orderBy: { name: "asc" },
          },
        },
      });
    }),

  create: permissionProtectedProcedure(["create:pos-category"])
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        result = await ctx.db.pOSCategory.create({
          data: input,
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
          endpoint: "posCategory.create",
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

  update: permissionProtectedProcedure(["update:pos-category"])
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const { id, ...data } = input;
        result = await ctx.db.pOSCategory.update({
          where: { id },
          data,
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
          endpoint: "posCategory.update",
          method: "PATCH",
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

  delete: permissionProtectedProcedure(["delete:pos-category"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        // Check if category has items
        const itemCount = await ctx.db.pOSItem.count({
          where: { categoryId: input.id },
        });

        if (itemCount > 0) {
          throw new Error("Cannot delete category with existing items");
        }

        result = await ctx.db.pOSCategory.delete({
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
          endpoint: "posCategory.delete",
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

  getAll: permissionProtectedProcedure(["list:pos-category"])
    .query(async ({ ctx }) => {
      return ctx.db.pOSCategory.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      });
    }),
});