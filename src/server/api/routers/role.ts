import { z } from "zod";
import { createTRPCRouter, permissionProtectedProcedure } from "@/server/api/trpc";

export const roleRouter = createTRPCRouter({
  create: permissionProtectedProcedure(["create:role"])
    .input(
      z.object({
        name: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.role.create({
        data: {
          name: input.name,
        },
      });
    }),

  update: permissionProtectedProcedure(["update:role"])
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.role.update({
        where: { id: input.id },
        data: {
          name: input.name,
        },
      });
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
      return ctx.db.role.delete({
        where: { id: input.id },
      });
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
