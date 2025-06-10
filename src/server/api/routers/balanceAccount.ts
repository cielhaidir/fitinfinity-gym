import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  permissionProtectedProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

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
      return await ctx.db.balanceAccount.create({
        data: {
          name: input.name,
          account_number: input.account_number,
          initialBalance: input.initialBalance,
        },
      });
    }),

  update: permissionProtectedProcedure(["edit:balances"])
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1, "Name is required"),
        account_number: z.string().min(1, "Account number is required"),
        initialBalance: z.number().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.db.balanceAccount.findUnique({
        where: { id: input.id },
      });

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Balance account not found",
        });
      }

      return await ctx.db.balanceAccount.update({
        where: { id: input.id },
        data: {
          name: input.name,
          account_number: input.account_number,
          initialBalance: input.initialBalance,
        },
      });
    }),

  delete: permissionProtectedProcedure(["delete:balances"])
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.db.balanceAccount.findUnique({
        where: { id: input.id },
      });

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Balance account not found",
        });
      }

      return await ctx.db.balanceAccount.delete({
        where: { id: input.id },
      });
    }),
});
