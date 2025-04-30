import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { VoucherType } from "@prisma/client";

export const voucherRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        type: z.nativeEnum(VoucherType).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.voucher.findMany({
        where: {
          type: input.type,
          isActive: input.isActive,
          expiryDate: {
            gt: new Date(),
          },
        },
      });
    }),

  claim: protectedProcedure
    .input(
      z.object({
        voucherId: z.string().optional(),
        referralCode: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { voucherId, referralCode } = input;

      // Find the voucher
      const voucher = await ctx.db.voucher.findFirst({
        where: {
          OR: [
            { id: voucherId },
            { referralCode: referralCode, type: VoucherType.REFERRAL }
          ],
          isActive: true,
          expiryDate: {
            gt: new Date(),
          },
        },
        include: {
          claims: true,
        },
      });

      if (!voucher) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Voucher tidak ditemukan atau sudah tidak aktif",
        });
      }

      // Check if voucher has been claimed by this member
      const existingClaim = await ctx.db.voucherClaim.findFirst({
        where: {
          memberId: ctx.session.user.id,
          voucherId: voucher.id,
        },
      });

      if (existingClaim) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Voucher sudah pernah diklaim",
        });
      }

      // Check if voucher has reached max claim
      if (voucher.claims.length >= voucher.maxClaim) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Voucher sudah mencapai batas klaim maksimum",
        });
      }

      // Use transaction to ensure both operations succeed or fail together
      const result = await ctx.db.$transaction(async (tx) => {
        // Create voucher claim
        await tx.voucherClaim.create({
          data: {
            memberId: ctx.session.user.id,
            voucherId: voucher.id,
          },
        });

        // Decrement maxClaim
        const updatedVoucher = await tx.voucher.update({
          where: { id: voucher.id },
          data: {
            maxClaim: {
              decrement: 1
            }
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

  getGeneralVouchers: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.db.voucher.findMany({
        where: {
          type: "GENERAL",
          isActive: true,
        },
        select: {
          id: true,
          code: true,
          discount: true,
          type: true,
        },
      });
    }),
}); 