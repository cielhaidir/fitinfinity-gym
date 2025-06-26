import { z } from "zod";
import { createTRPCRouter, permissionProtectedProcedure } from "../trpc";
import { type Prisma, type FcMember } from "@prisma/client";

const FCMemberStatus = {
  new: "new",
  contacted: "contacted",
  follow_up: "follow_up",
  interested: "interested",
  not_interested: "not_interested",
  pending: "pending",
  scheduled: "scheduled",
  converted: "converted",
  rejected: "rejected",
  inactive: "inactive",
} as const;

export const fcMemberRouter = createTRPCRouter({
  // Create FC Member
  create: permissionProtectedProcedure(["create:fc-member"])
    .input(
      z.object({
        member_name: z.string(),
        member_phone: z.string(),
        address: z.string(),
        status: z.enum([
          "new",
          "contacted",
          "follow_up",
          "interested",
          "not_interested",
          "pending",
          "scheduled",
          "converted",
          "rejected",
          "inactive",
        ] as const),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get the current user's FC ID
      const fc = await ctx.db.fC.findFirst({
        where: {
          userId: ctx.session.user.id,
        },
      });

      if (!fc) {
        throw new Error("FC not found");
      }

      return ctx.db.fcMember.create({
        data: {
          ...input,
          fc_id: fc.id,
        },
      });
    }),

  // Get all FC Members for current FC
  getAll: permissionProtectedProcedure(["list:fc-member"])
    .input(
      z.object({
        page: z.number().min(1),
        limit: z.number().min(1).max(100),
      })
    )
    .query(async ({ ctx, input }) => {
      const fc = await ctx.db.fC.findFirst({
        where: {
          userId: ctx.session.user.id,
        },
      });

      if (!fc) {
        throw new Error("FC not found");
      }

      const where = { fc_id: fc.id };

      const [items, total] = await Promise.all([
        ctx.db.fcMember.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        }),
        ctx.db.fcMember.count({ where }),
      ]);

      return { items, total };
    }),

  // Get FC Member by ID
  getById: permissionProtectedProcedure(["show:fc-member"])
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const fc = await ctx.db.fC.findFirst({
        where: {
          userId: ctx.session.user.id,
        },
      });

      if (!fc) {
        throw new Error("FC not found");
      }

      const fcMember = await ctx.db.fcMember.findFirst({
        where: {
          id: input.id,
          fc_id: fc.id,
        },
      });

      if (!fcMember) {
        throw new Error("FC Member not found");
      }

      return fcMember;
    }),

  // Update FC Member
  update: permissionProtectedProcedure(["update:fc-member"])
    .input(
      z.object({
        id: z.string(),
        member_name: z.string().optional(),
        member_phone: z.string().optional(),
        address: z.string().optional(),
        status: z
          .enum([
            "new",
            "contacted",
            "follow_up",
            "interested",
            "not_interested",
            "pending",
            "scheduled",
            "converted",
            "rejected",
            "inactive",
          ] as const)
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const fc = await ctx.db.fC.findFirst({
        where: {
          userId: ctx.session.user.id,
        },
      });

      if (!fc) {
        throw new Error("FC not found");
      }

      const { id, ...updateData } = input;

      const fcMember = await ctx.db.fcMember.findFirst({
        where: {
          id,
          fc_id: fc.id,
        },
      });

      if (!fcMember) {
        throw new Error(
          "FC Member not found or you don't have permission to update",
        );
      }

      return ctx.db.fcMember.update({
        where: { id },
        data: updateData,
      });
    }),

  // Delete FC Member
  delete: permissionProtectedProcedure(["delete:fc-member"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const fc = await ctx.db.fC.findFirst({
        where: {
          userId: ctx.session.user.id,
        },
      });

      if (!fc) {
        throw new Error("FC not found");
      }

      const fcMember = await ctx.db.fcMember.findFirst({
        where: {
          id: input.id,
          fc_id: fc.id,
        },
      });

      if (!fcMember) {
        throw new Error(
          "FC Member not found or you don't have permission to delete",
        );
      }

      return ctx.db.fcMember.delete({
        where: { id: input.id },
      });
    }),
});
