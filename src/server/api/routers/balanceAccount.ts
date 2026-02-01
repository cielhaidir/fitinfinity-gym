import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  permissionProtectedProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { logApiMutation, extractIpAddress, extractUserAgent } from "@/server/utils/mutationLogger";

export const balanceAccountRouter = createTRPCRouter({
  getAll: permissionProtectedProcedure(["list:balances"])
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(10),
        search: z.string().optional(),
        searchColumn: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, search, searchColumn } = input;
      const skip = (page - 1) * limit;

      const where =
        search && searchColumn
          ? {
              [searchColumn]: {
                contains: search,
                mode: "insensitive",
              },
            }
          : {};

      const [items, total] = await Promise.all([
        ctx.db.balanceAccount.findMany({
          where,
          orderBy: {
            id: "desc",
          },
          skip,
          take: limit,
        }),
        ctx.db.balanceAccount.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        limit,
      };
    }),

  getById: permissionProtectedProcedure(["show:balances"])
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const account = await ctx.db.balanceAccount.findUnique({
        where: { id: input.id },
      });

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Balance account not found",
        });
      }

      return account;
    }),

  create: permissionProtectedProcedure(["create:balances"])
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        account_number: z.string().min(1, "Account number is required"),
        initialBalance: z.number().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const account = await ctx.db.balanceAccount.create({
          data: {
            name: input.name,
            account_number: input.account_number,
            initialBalance: input.initialBalance,
          },
        });
        result = account;
        success = true;
        return account;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        await logApiMutation({
          db: ctx.db,
          endpoint: "balanceAccount.create",
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

  update: permissionProtectedProcedure(["update:balances"])
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1, "Name is required"),
        account_number: z.string().min(1, "Account number is required"),
        initialBalance: z.number().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const account = await ctx.db.balanceAccount.findUnique({
          where: { id: input.id },
        });

        if (!account) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Balance account not found",
          });
        }

        const updated = await ctx.db.balanceAccount.update({
          where: { id: input.id },
          data: {
            name: input.name,
            account_number: input.account_number,
            initialBalance: input.initialBalance,
          },
        });
        result = updated;
        success = true;
        return updated;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        await logApiMutation({
          db: ctx.db,
          endpoint: "balanceAccount.update",
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

  delete: permissionProtectedProcedure(["delete:balances"])
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const account = await ctx.db.balanceAccount.findUnique({
          where: { id: input.id },
        });

        if (!account) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Balance account not found",
          });
        }

        const deleted = await ctx.db.balanceAccount.delete({
          where: { id: input.id },
        });
        result = deleted;
        success = true;
        return deleted;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        await logApiMutation({
          db: ctx.db,
          endpoint: "balanceAccount.delete",
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
