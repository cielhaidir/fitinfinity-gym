import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createChartAccountSchema, updateChartAccountSchema } from "@/app/(authenticated)/finance/chart_of_account/schema";

export const chartAccountRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.chartAccount.findMany({
      orderBy: {
        id: "asc",
      },
    });
  }),

  getById: protectedProcedure
    .input(updateChartAccountSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      return ctx.db.chartAccount.findUnique({
        where: { id: input.id },
      });
    }),

  create: protectedProcedure
    .input(createChartAccountSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.chartAccount.create({
        data: input,
      });
    }),

  update: protectedProcedure
    .input(updateChartAccountSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.chartAccount.update({
        where: { id },
        data,
      });
    }),

  delete: protectedProcedure
    .input(updateChartAccountSchema.pick({ id: true }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.chartAccount.delete({
        where: { id: input.id },
      });
    }),
}); 