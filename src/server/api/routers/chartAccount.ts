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
import { logApiMutationAsync, extractIpAddress, extractUserAgent } from "@/server/utils/mutationLogger";

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
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const account = await ctx.db.chartAccount.create({
          data: input,
        });
        result = account;
        success = true;
        return account;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "chartAccount.create",
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

  update: permissionProtectedProcedure(["update:coa"])
    .input(updateChartAccountSchema)
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const { id, ...data } = input;
        const account = await ctx.db.chartAccount.update({
          where: { id },
          data,
        });
        result = account;
        success = true;
        return account;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "chartAccount.update",
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

  delete: permissionProtectedProcedure(["delete:coa"])
    .input(updateChartAccountSchema.pick({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const account = await ctx.db.chartAccount.delete({
          where: { id: input.id },
        });
        result = account;
        success = true;
        return account;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "chartAccount.delete",
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
