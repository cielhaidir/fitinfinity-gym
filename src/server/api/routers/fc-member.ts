import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { type Prisma, type FcMember } from "@prisma/client";

const FCMemberStatus = {
  new: 'new',
  contacted: 'contacted',
  follow_up: 'follow_up',
  interested: 'interested',
  not_interested: 'not_interested',
  pending: 'pending',
  scheduled: 'scheduled',
  converted: 'converted',
  rejected: 'rejected',
  inactive: 'inactive'
} as const;

export const fcMemberRouter = createTRPCRouter({
  // Create FC Member
  create: protectedProcedure
    .input(
      z.object({
        member_name: z.string(),
        member_phone: z.string(),
        member_email: z.string().email(),
        status: z.enum([
          'new',
          'contacted',
          'follow_up',
          'interested',
          'not_interested',
          'pending',
          'scheduled',
          'converted',
          'rejected',
          'inactive'
        ] as const),
      })
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
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const fc = await ctx.db.fC.findFirst({
      where: {
        userId: ctx.session.user.id,
      },
    });

    if (!fc) {
      throw new Error("FC not found");
    }

    return ctx.db.fcMember.findMany({
      where: {
        fc_id: fc.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }),

  // Get FC Member by ID
  getById: protectedProcedure
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
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        member_name: z.string().optional(),
        member_phone: z.string().optional(),
        member_email: z.string().email().optional(),
        status: z.enum([
          'new',
          'contacted',
          'follow_up',
          'interested',
          'not_interested',
          'pending',
          'scheduled',
          'converted',
          'rejected',
          'inactive'
        ] as const).optional(),
      })
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
        throw new Error("FC Member not found or you don't have permission to update");
      }

      return ctx.db.fcMember.update({
        where: { id },
        data: updateData,
      });
    }),

  // Delete FC Member
  delete: protectedProcedure
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
        throw new Error("FC Member not found or you don't have permission to delete");
      }

      return ctx.db.fcMember.delete({
        where: { id: input.id },
      });
    }),
});