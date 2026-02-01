import { z } from "zod";
import { createTRPCRouter, permissionProtectedProcedure } from "../trpc";
import { type Prisma, type FcMember } from "@prisma/client";
import { logApiMutationAsync, extractIpAddress, extractUserAgent } from "@/server/utils/mutationLogger";

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
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        // Get the current user's FC ID
        const fc = await ctx.db.fC.findFirst({
          where: {
            userId: ctx.session.user.id,
          },
        });

        if (!fc) {
          throw new Error("FC not found");
        }

        result = await ctx.db.fcMember.create({
          data: {
            ...input,
            fc_id: fc.id,
          },
        });
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "fcMember.create",
          method: "POST",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
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
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
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

        result = await ctx.db.fcMember.update({
          where: { id },
          data: updateData,
        });
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "fcMember.update",
          method: "PATCH",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  // Delete FC Member
  delete: permissionProtectedProcedure(["delete:fc-member"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
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

        result = await ctx.db.fcMember.delete({
          where: { id: input.id },
        });
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "fcMember.delete",
          method: "DELETE",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),
});
