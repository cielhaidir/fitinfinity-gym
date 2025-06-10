import {
  createTRPCRouter,
  protectedProcedure,
  permissionProtectedProcedure,
} from "@/server/api/trpc";
import {
  createChartAccountSchema,
  updateChartAccountSchema,
} from "@/app/(authenticated)/finance/chart-of-account/schema";
import { z } from "zod";

export const chartAccountRouter = createTRPCRouter({
  list: permissionProtectedProcedure(["list:coa"])
    .input(
      z.object({
        page: z.number().min(1),
        limit: z.number().min(1).max(100),
      }),
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.chartAccount.findMany({
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        orderBy: { name: "asc" },
      });

      const total = await ctx.db.chartAccount.count();

      return {
        items,
        total,
        page: input.page,
        limit: input.limit,
      };
    }),

  getAll: permissionProtectedProcedure(["list:coa"]).query(async ({ ctx }) => {
    return ctx.db.chartAccount.findMany({
      orderBy: {
        id: "asc",
      },
    });
  }),

  getById: permissionProtectedProcedure(["show:coa"])
    .input(updateChartAccountSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      return ctx.db.chartAccount.findUnique({
        where: { id: input.id },
      });
    }),

  create: permissionProtectedProcedure(["create:coa"])
    .input(createChartAccountSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.chartAccount.create({
        data: input,
      });
    }),

  update: permissionProtectedProcedure(["edit:coa"])
    .input(updateChartAccountSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.chartAccount.update({
        where: { id },
        data,
      });
    }),

  delete: permissionProtectedProcedure(["delete:coa"])
    .input(updateChartAccountSchema.pick({ id: true }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.chartAccount.delete({
        where: { id: input.id },
      });
    }),
});
