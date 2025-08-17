import { z } from "zod";
import {
  createTRPCRouter,
  permissionProtectedProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { VoucherType } from "@prisma/client";

export const voucherRouter = createTRPCRouter({
  list: permissionProtectedProcedure(["list:voucher"])
    .input(
      z.object({
        type: z.nativeEnum(VoucherType).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get all vouchers that match the criteria and haven't been claimed by this user
      const vouchers = await ctx.db.voucher.findMany({
        where: {
          type: input.type,
          isActive: input.isActive,
          OR: [{ expiryDate: null }, { expiryDate: { gt: new Date() } }],
          // Exclude vouchers that have been claimed by this user
          claims: {
            none: {
              memberId: ctx.user.id,
            },
          },
        },
        include: {
          _count: {
            select: {
              claims: true,
            },
          },
        },
      });

      // Filter out vouchers that have reached max claim
      return vouchers.filter(
        (voucher) => voucher._count.claims < voucher.maxClaim,
      );
    }),

  claim: permissionProtectedProcedure(["claim:voucher"])
    .input(
      z.object({
        voucherId: z.string().optional(),
        referralCode: z.string().optional(),
        purchaseAmount: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { voucherId, referralCode } = input;

      // Find the voucher first
      const voucher = await ctx.db.voucher.findFirst({
        where: {
          AND: [
            {
              OR: [
                { id: voucherId },
                { referralCode: referralCode, type: VoucherType.REFERRAL },
              ],
            },
            { isActive: true },
            {
              OR: [{ expiryDate: null }, { expiryDate: { gt: new Date() } }],
            },
          ],
        },
      });

      if (!voucher) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Voucher tidak ditemukan atau sudah tidak aktif",
        });
      }

      // Check if voucher has reached max claim
      if (voucher.maxClaim <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Voucher sudah mencapai batas klaim maksimum",
        });
      }

      // Check minimum purchase requirement
      if (voucher.minimumPurchase && input.purchaseAmount && input.purchaseAmount < voucher.minimumPurchase) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Minimum pembelian untuk voucher ini adalah Rp ${voucher.minimumPurchase.toLocaleString()}`,
        });
      }

      // Return the voucher information without creating VoucherClaim
      return {
        id: voucher.id,
        name: voucher.name,
        amount: voucher.amount,
        discountType: voucher.discountType,
      };
    }),

  finalizeVoucherClaim: permissionProtectedProcedure(["claim:voucher"])
    .input(
      z.object({
        voucherId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { voucherId } = input;

      // Find the voucher
      const voucher = await ctx.db.voucher.findFirst({
        where: {
          id: voucherId,
          isActive: true,
          OR: [{ expiryDate: null }, { expiryDate: { gt: new Date() } }],
        },
      });

      if (!voucher) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Voucher tidak ditemukan atau sudah tidak aktif",
        });
      }

      // Check if voucher has reached max claim
      if (voucher.maxClaim <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Voucher sudah mencapai batas klaim maksimum",
        });
      }

      try {
        // Use transaction to ensure both operations succeed or fail together
        const result = await ctx.db.$transaction(async (tx) => {
          // Create VoucherClaim
          await tx.voucherClaim.create({
            data: {
              memberId: ctx.user.id,
              voucherId: voucher.id,
            },
          });

          // Update voucher with decremented maxClaim
          const updatedVoucher = await tx.voucher.update({
            where: {
              id: voucher.id,
            },
            data: {
              maxClaim: voucher.maxClaim - 1,
            },
          });

          return updatedVoucher;
        });

        return {
          id: result.id,
          name: result.name,
          amount: result.amount,
          discountType: result.discountType,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal mengklaim voucher",
        });
      }
    }),

  getAll: permissionProtectedProcedure(["list:voucher"]).query(
    async ({ ctx }) => {
      return ctx.db.voucher.findMany({
        orderBy: { createdAt: "desc" },
      });
    },
  ),

  create: permissionProtectedProcedure(["create:voucher"])
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        maxClaim: z.number().min(1, "Max claim must be at least 1"),
        type: z.enum(["REFERRAL", "GENERAL"]),
        discountType: z.enum(["PERCENT", "CASH"]),
        referralCode: z.string().optional(),
        amount: z.number().min(1, "Amount must be at least 1"),
        minimumPurchase: z.number().min(0).optional(),
        allowStack: z.boolean().optional(),
        expiryDate: z.date().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.voucher.create({
        data: {
          ...input,
          isActive: true,
        },
      });
    }),

  update: permissionProtectedProcedure(["update:voucher"])
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "Name is required"),
        maxClaim: z.number().min(1, "Max claim must be at least 1"),
        type: z.enum(["REFERRAL", "GENERAL"]),
        discountType: z.enum(["PERCENT", "CASH"]),
        referralCode: z.string().optional(),
        amount: z.number().min(1, "Amount must be at least 1"),
        minimumPurchase: z.number().min(0).optional(),
        allowStack: z.boolean().optional(),
        isActive: z.boolean(),
        expiryDate: z.date().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.voucher.update({
        where: { id },
        data,
      });
    }),

  delete: permissionProtectedProcedure(["delete:voucher"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.voucher.delete({
        where: { id: input.id },
      });
    }),

  getGeneralVouchers: permissionProtectedProcedure(["list:voucher"]).query(
    async ({ ctx }) => {
      return ctx.db.voucher.findMany({
        where: {
          type: "GENERAL",
          isActive: true,
        },
      });
    },
  ),


});
