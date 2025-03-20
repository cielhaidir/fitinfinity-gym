import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const voucherRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(10),
        search: z.string().optional(),
        searchColumn: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, search, searchColumn } = input;
      const skip = (page - 1) * limit;

      // Build where clause for search
      const where = search && searchColumn ? {
        [searchColumn]: {
          contains: search,
          mode: 'insensitive' as const,
        }
      } : {};

      // Get total count
      const total = await ctx.db.voucher.count({ where });

      // Get paginated items
      const items = await ctx.db.voucher.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      return {
        items,
        total,
        page,
        limit,
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