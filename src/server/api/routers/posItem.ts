import { z } from "zod";
import { createTRPCRouter, permissionProtectedProcedure } from "@/server/api/trpc";
import { logApiMutation, extractIpAddress, extractUserAgent } from "@/server/utils/mutationLogger";

export const posItemRouter = createTRPCRouter({
  list: permissionProtectedProcedure(["list:pos-item"])
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
        categoryId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, search, categoryId } = input;
      const skip = (page - 1) * limit;

      const where = {
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
          ],
        }),
        ...(categoryId && { categoryId }),
      };

      const [items, total] = await Promise.all([
        ctx.db.pOSItem.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            category: true,
          },
        }),
        ctx.db.pOSItem.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }),

  getById: permissionProtectedProcedure(["show:pos-item"])
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.pOSItem.findUnique({
        where: { id: input.id },
        include: {
          category: true,
        },
      });
    }),

  create: permissionProtectedProcedure(["create:pos-item"])
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        price: z.number().min(0),
        cost: z.number().min(0).optional(),
        stock: z.number().int().min(0).default(0),
        minStock: z.number().int().min(0).optional(),
        categoryId: z.string(),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        result = await ctx.db.pOSItem.create({
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
          endpoint: "posItem.create",
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

  update: permissionProtectedProcedure(["update:pos-item"])
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
        price: z.number().min(0),
        cost: z.number().min(0).optional(),
        stock: z.number().int().min(0),
        minStock: z.number().int().min(0).optional(),
        categoryId: z.string(),
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
        result = await ctx.db.pOSItem.update({
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
          endpoint: "posItem.update",
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

  delete: permissionProtectedProcedure(["delete:pos-item"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        result = await ctx.db.pOSItem.delete({
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
          endpoint: "posItem.delete",
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

  updateStock: permissionProtectedProcedure(["update:pos-item"])
    .input(
      z.object({
        id: z.string(),
        stock: z.number().int().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        result = await ctx.db.pOSItem.update({
          where: { id: input.id },
          data: { stock: input.stock },
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
          endpoint: "posItem.updateStock",
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

  getLowStock: permissionProtectedProcedure(["list:pos-item"])
    .query(async ({ ctx }) => {
      return ctx.db.pOSItem.findMany({
        where: {
          isActive: true,
          AND: [
            { minStock: { not: null } },
            { stock: { lte: ctx.db.pOSItem.fields.minStock } },
          ],
        },
        include: {
          category: true,
        },
        orderBy: { stock: "asc" },
      });
    }),

  getByCategory: permissionProtectedProcedure(["list:pos-item"])
    .input(z.object({ categoryId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.pOSItem.findMany({
        where: {
          categoryId: input.categoryId,
          isActive: true,
        },
        orderBy: { name: "asc" },
      });
    }),

  getAll: permissionProtectedProcedure(["list:pos-item"])
    .query(async ({ ctx }) => {
      return ctx.db.pOSItem.findMany({
        where: { isActive: true },
        include: {
          category: true,
        },
        orderBy: { name: "asc" },
      });
    }),
});