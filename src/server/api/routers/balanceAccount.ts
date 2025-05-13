import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const balanceAccountRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.balanceAccount.findMany({
      orderBy: {
        id: "desc",
      },
    });
  }),

  getById: protectedProcedure
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

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        account_number: z.string().min(1, "Account number is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.balanceAccount.create({
        data: {
          name: input.name,
          account_number: input.account_number,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1, "Name is required"),
        account_number: z.string().min(1, "Account number is required"),
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
        },
      });
    }),

  delete: protectedProcedure
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
