import { z } from "zod";
import { createTRPCRouter, permissionProtectedProcedure } from "@/server/api/trpc";

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
      return ctx.db.pOSCategory.create({
        data: input,
      });
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
      const { id, ...data } = input;
      return ctx.db.pOSCategory.update({
        where: { id },
        data,
      });
    }),

  delete: permissionProtectedProcedure(["delete:pos-category"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if category has items
      const itemCount = await ctx.db.pOSItem.count({
        where: { categoryId: input.id },
      });

      if (itemCount > 0) {
        throw new Error("Cannot delete category with existing items");
      }

      return ctx.db.pOSCategory.delete({
        where: { id: input.id },
      });
    }),

  getAll: permissionProtectedProcedure(["list:pos-category"])
    .query(async ({ ctx }) => {
      return ctx.db.pOSCategory.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      });
    }),
});