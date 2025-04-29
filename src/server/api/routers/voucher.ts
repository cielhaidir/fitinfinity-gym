import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const voucherRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1),
        limit: z.number().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit } = input;
      const skip = (page - 1) * limit;

      const [vouchers, total] = await Promise.all([
        ctx.db.voucher.findMany({
          where: {
            isActive: true,
            OR: [
              { expiryDate: null },
              { expiryDate: { gt: new Date() } },
            ],
          },
          skip,
          take: limit,
          orderBy: {
            createdAt: "desc",
          },
        }),
        ctx.db.voucher.count({
          where: {
            isActive: true,
            OR: [
              { expiryDate: null },
              { expiryDate: { gt: new Date() } },
            ],
          },
        }),
      ]);

      return {
        items: vouchers,
        total,
        page,
        limit,
      };
    }),

  claim: protectedProcedure
    .input(
      z.object({
        voucherId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { voucherId } = input;
      const userId = ctx.session.user.id;

      // Get the voucher
      const voucher = await ctx.db.voucher.findUnique({
        where: { id: voucherId },
      });

      if (!voucher) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Voucher not found",
        });
      }

      if (!voucher.isActive) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Voucher is not active",
        });
      }

      if (voucher.expiryDate && new Date(voucher.expiryDate) < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Voucher has expired",
        });
      }

      // Check if user has already claimed this voucher
      const existingClaim = await ctx.db.voucherClaim.findFirst({
        where: {
          memberId: userId,
          voucherId: voucherId,
        },
      });

      if (existingClaim) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You have already claimed this voucher",
        });
      }

      // Check if voucher has reached max claims
      if (voucher.maxClaim <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Voucher has reached maximum claims",
        });
      }

      // Create the claim record and decrement maxClaim in a transaction
      const [claim] = await ctx.db.$transaction([
        ctx.db.voucherClaim.create({
          data: {
            memberId: userId,
            voucherId: voucherId,
          },
        }),
        ctx.db.voucher.update({
          where: { id: voucherId },
          data: {
            maxClaim: {
              decrement: 1
            }
          }
        })
      ]);

      return claim;
    }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.voucher.findMany({
      orderBy: { createdAt: "desc" },
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        maxClaim: z.number().min(1, "Max claim must be at least 1"),
        type: z.enum(["REFERRAL", "GENERAL"]),
        discountType: z.enum(["PERCENT", "CASH"]),
        referralCode: z.string().optional(),
        amount: z.number().min(1, "Amount must be at least 1"),
        expiryDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.voucher.create({
        data: {
          ...input,
          isActive: true,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "Name is required"),
        maxClaim: z.number().min(1, "Max claim must be at least 1"),
        type: z.enum(["REFERRAL", "GENERAL"]),
        discountType: z.enum(["PERCENT", "CASH"]),
        referralCode: z.string().optional(),
        amount: z.number().min(1, "Amount must be at least 1"),
        isActive: z.boolean(),
        expiryDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.voucher.update({
        where: { id },
        data,
      });
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.voucher.delete({
        where: { id: input.id },
      });
    }),
}); 