import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const fcRouter = createTRPCRouter({
  list: publicProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
        searchColumn: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, search, searchColumn } = input;
      const skip = (page - 1) * limit;

      const where = search && searchColumn
        ? {
            user: {
              [searchColumn]: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
          }
        : {};

      const [items, total] = await Promise.all([
        ctx.db.fC.findMany({
          where,
          include: {
            user: true,
          },
          skip,
          take: limit,
          orderBy: {
            createdAt: "desc",
          },
        }),
        ctx.db.fC.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        limit,
      };
    }),

  create: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        isActive: z.boolean().default(true),
        createdBy: z.string(),
        referralCode: z.string().min(5, "Referral code must be at least 5 characters"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId, isActive, createdBy, referralCode } = input;

      // Check if user exists
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Check if FC already exists for this user
      const existingFC = await ctx.db.fC.findUnique({
        where: { userId },
      });

      if (existingFC) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "FC already exists for this user",
        });
      }

      // Check if referral code is already taken
      const existingReferralCode = await ctx.db.fC.findUnique({
        where: { referralCode },
      });

      if (existingReferralCode) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Referral code is already taken",
        });
      }

      return ctx.db.fC.create({
        data: {
          userId,
          isActive,
          createdBy,
          referralCode,
        },
        include: {
          user: true,
        },
      });
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        user: z.object({
          name: z.string().nullable(),
          email: z.string().nullable(),
          address: z.string().nullable(),
          phone: z.string().nullable(),
          birthDate: z.date().nullable(),
          idNumber: z.string().nullable(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, user } = input;

      const fc = await ctx.db.fC.findUnique({
        where: { id },
        include: { user: true },
      });

      if (!fc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "FC not found",
        });
      }

      // Update user data
      await ctx.db.user.update({
        where: { id: fc.userId },
        data: user,
      });

      return ctx.db.fC.findUnique({
        where: { id },
        include: { user: true },
      });
    }),

  remove: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id } = input;

      const fc = await ctx.db.fC.findUnique({
        where: { id },
      });

      if (!fc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "FC not found",
        });
      }

      return ctx.db.fC.delete({
        where: { id },
      });
    }),

  findByReferralCode: publicProcedure
    .input(z.object({ referralCode: z.string() }))
    .query(async ({ ctx, input }) => {
      const fc = await ctx.db.fC.findUnique({
        where: { referralCode: input.referralCode },
        include: { user: true },
      });

      if (!fc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "FC with this referral code not found",
        });
      }

      return fc;
    }),
}); 