import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  permissionProtectedProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const promoRouter = createTRPCRouter({
  list: permissionProtectedProcedure(["list:voucher"])
    .input(
      z
        .object({
          isActive: z.boolean().optional(),
          triggerPackageId: z.string().optional(),
          page: z.number().min(1).default(1),
          limit: z.number().min(1).max(100).default(10),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const safeInput = input ?? { page: 1, limit: 10 };

      const where = {
        ...(safeInput.isActive !== undefined && { isActive: safeInput.isActive }),
        ...(safeInput.triggerPackageId && {
          triggerPackageId: safeInput.triggerPackageId,
        }),
      };

      const [items, total] = await Promise.all([
        ctx.db.promoCampaign.findMany({
          where,
          skip: (safeInput.page - 1) * safeInput.limit,
          take: safeInput.limit,
          orderBy: { createdAt: "desc" },
          include: {
            triggerPackage: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
            bonusPackage: {
              select: {
                id: true,
                name: true,
                type: true,
                day: true,
                sessions: true,
              },
            },
            _count: {
              select: { redemptions: true },
            },
          },
        }),
        ctx.db.promoCampaign.count({ where }),
      ]);

      return {
        items,
        total,
        page: safeInput.page,
        limit: safeInput.limit,
      };
    }),

  create: permissionProtectedProcedure(["create:voucher"])
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        isActive: z.boolean().default(true),
        startDate: z.date(),
        endDate: z.date().nullable().optional(),
        triggerPackageId: z.string(),
        bonusPackageId: z.string(),
        bonusStartMode: z.enum(["IMMEDIATE", "AFTER_CURRENT", "CUSTOM_DATE"]).default("AFTER_CURRENT"),
        bonusCustomStartDate: z.date().nullable().optional(),
        maxPerMember: z.number().int().min(1).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.endDate && input.endDate < input.startDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End date must be after start date",
        });
      }

      if (input.bonusStartMode === "CUSTOM_DATE" && !input.bonusCustomStartDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Custom start date wajib diisi jika mode CUSTOM_DATE",
        });
      }

      const triggerPackage = await ctx.db.package.findUnique({
        where: { id: input.triggerPackageId },
      });

      if (!triggerPackage) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trigger package not found",
        });
      }

      const bonusPackage = await ctx.db.package.findUnique({
        where: { id: input.bonusPackageId },
      });

      if (!bonusPackage) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bonus package not found",
        });
      }

      return ctx.db.promoCampaign.create({
        data: {
          name: input.name,
          description: input.description,
          isActive: input.isActive,
          startDate: input.startDate,
          endDate: input.endDate ?? null,
          triggerPackageId: input.triggerPackageId,
          bonusType: "BONUS_PACKAGE",
          bonusPackageId: input.bonusPackageId,
          bonusStartMode: input.bonusStartMode,
          bonusCustomStartDate: input.bonusCustomStartDate ?? null,
          maxPerMember: input.maxPerMember ?? null,
        },
      });
    }),

  update: permissionProtectedProcedure(["update:voucher"])
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        description: z.string().nullable().optional(),
        isActive: z.boolean(),
        startDate: z.date(),
        endDate: z.date().nullable().optional(),
        triggerPackageId: z.string(),
        bonusPackageId: z.string(),
        bonusStartMode: z.enum(["IMMEDIATE", "AFTER_CURRENT", "CUSTOM_DATE"]).default("AFTER_CURRENT"),
        bonusCustomStartDate: z.date().nullable().optional(),
        maxPerMember: z.number().int().min(1).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.endDate && input.endDate < input.startDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End date must be after start date",
        });
      }

      if (input.bonusStartMode === "CUSTOM_DATE" && !input.bonusCustomStartDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Custom start date wajib diisi jika mode CUSTOM_DATE",
        });
      }

      const promo = await ctx.db.promoCampaign.findUnique({
        where: { id: input.id },
      });

      if (!promo) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Promo not found",
        });
      }

      return ctx.db.promoCampaign.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description ?? null,
          isActive: input.isActive,
          startDate: input.startDate,
          endDate: input.endDate ?? null,
          triggerPackageId: input.triggerPackageId,
          bonusType: "BONUS_PACKAGE",
          bonusPackageId: input.bonusPackageId,
          bonusStartMode: input.bonusStartMode,
          bonusCustomStartDate: input.bonusCustomStartDate ?? null,
          maxPerMember: input.maxPerMember ?? null,
        },
      });
    }),

  delete: permissionProtectedProcedure(["delete:voucher"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const promo = await ctx.db.promoCampaign.findUnique({
        where: { id: input.id },
        include: { _count: { select: { redemptions: true } } },
      });

      if (!promo) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Promo not found",
        });
      }

      // Use transaction to delete redemptions first, then the promo
      return ctx.db.$transaction(async (tx) => {
        if (promo._count.redemptions > 0) {
          await tx.promoRedemption.deleteMany({
            where: { promoId: input.id },
          });
        }
        return tx.promoCampaign.delete({
          where: { id: input.id },
        });
      });
    }),

  getMatchingPromos: protectedProcedure
    .input(
      z.object({
        packageIds: z.array(z.string()).min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      return ctx.db.promoCampaign.findMany({
        where: {
          isActive: true,
          triggerPackageId: { in: input.packageIds },
          startDate: { lte: now },
          OR: [{ endDate: null }, { endDate: { gte: now } }],
        },
        include: {
          triggerPackage: {
            select: { id: true, name: true, type: true },
          },
          bonusPackage: {
            select: { id: true, name: true, type: true, day: true, sessions: true },
          },
        },
      });
    }),

  listPromoRedemptions: permissionProtectedProcedure(["list:voucher"])
    .input(
      z.object({
        promoId: z.string(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const [items, total] = await Promise.all([
        ctx.db.promoRedemption.findMany({
          where: { promoId: input.promoId },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { grantedAt: "desc" },
          include: {
            member: {
              select: {
                id: true,
                user: {
                  select: { name: true, email: true },
                },
              },
            },
            triggerSubscription: {
              select: {
                id: true,
                startDate: true,
                endDate: true,
                isActive: true,
                deletedAt: true,
                package: {
                  select: { id: true, name: true, type: true },
                },
              },
            },
            bonusSubscription: {
              select: {
                id: true,
                startDate: true,
                endDate: true,
                isActive: true,
                isFrozen: true,
                deletedAt: true,
                package: {
                  select: { id: true, name: true, type: true },
                },
              },
            },
          },
        }),
        ctx.db.promoRedemption.count({
          where: { promoId: input.promoId },
        }),
      ]);

      return { items, total, page: input.page, limit: input.limit };
    }),

  listMemberRedemptions: permissionProtectedProcedure(["list:subscription"])
    .input(
      z.object({
        memberId: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const hasManageMemberPermission =
        ctx.permissions?.includes("manage:member") ||
        ctx.permissions?.includes("list:member") ||
        ctx.permissions?.includes("update:member");

      let effectiveMemberId = input.memberId;

      if (!hasManageMemberPermission) {
        const ownMembership = await ctx.db.membership.findFirst({
          where: { userId: ctx.session.user.id },
          select: { id: true },
          orderBy: { createdAt: "asc" },
        });

        if (!ownMembership) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Membership not found for current user",
          });
        }

        if (input.memberId && input.memberId !== ownMembership.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized to view promo redemptions for this member",
          });
        }

        effectiveMemberId = ownMembership.id;
      }

      if (!effectiveMemberId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Member ID is required",
        });
      }

      const [items, total] = await Promise.all([
        ctx.db.promoRedemption.findMany({
          where: { memberId: effectiveMemberId },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { grantedAt: "desc" },
          include: {
            promo: true,
            triggerSubscription: {
              include: {
                package: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                  },
                },
              },
            },
            bonusSubscription: {
              include: {
                package: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                  },
                },
              },
            },
          },
        }),
        ctx.db.promoRedemption.count({
          where: { memberId: effectiveMemberId },
        }),
      ]);

      return {
        items,
        total,
        page: input.page,
        limit: input.limit,
      };
    }),
});
