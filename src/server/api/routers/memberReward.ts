import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  permissionProtectedProcedure,
} from "@/server/api/trpc";
import { logApiMutationAsync, extractIpAddress, extractUserAgent } from "@/server/utils/mutationLogger";

export const memberRewardRouter = createTRPCRouter({
  list: permissionProtectedProcedure(["list:reward"])
    .input(
      z
        .object({
          page: z.number().optional().default(1),
          limit: z.number().optional().default(10),
          memberId: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = input?.memberId ? { memberId: input.memberId } : {};

      const items = await ctx.db.memberReward.findMany({
        where,
        include: {
          member: {
            select: {
              id: true,
              name: true,
              point: true,
            },
          },
          reward: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
        },
        orderBy: {
          claimedAt: "desc",
        },
        skip: ((input?.page ?? 1) - 1) * (input?.limit ?? 10),
        take: input?.limit ?? 10,
      });

      const total = await ctx.db.memberReward.count({ where });

      return {
        items,
        total,
        page: input?.page ?? 1,
        limit: input?.limit ?? 10,
      };
    }),

  create: permissionProtectedProcedure(["claim:reward"])
    .input(
      z.object({
        rewardId: z.string(),
        memberId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result;
      let error: Error | null = null;

      try {
        const { rewardId, memberId } = input;

        // Get reward and member details
        const [reward, membership] = await Promise.all([
          ctx.db.reward.findUnique({
            where: { id: rewardId },
          }),
          ctx.db.membership.findUnique({
            where: { id: memberId },
            include: {
              user: true,
            },
          }),
        ]);

        if (!reward) {
          throw new Error("Reward not found");
        }

        if (!membership) {
          throw new Error("Member not found");
        }

        if (reward.stock <= 0) {
          throw new Error("Reward out of stock");
        }

        if (membership.user.point < reward.price) {
          throw new Error("Insufficient points");
        }

        // Create member reward and update points in a transaction
        const transactionResult = await ctx.db.$transaction([
          // Create member reward record
          ctx.db.memberReward.create({
            data: {
              memberId: membership.userId,
              rewardId,
              claimedAt: new Date(),
            },
          }),
          // Update member points
          ctx.db.user.update({
            where: { id: membership.userId },
            data: {
              point: membership.user.point - reward.price,
            },
          }),
          // Update reward stock
          ctx.db.reward.update({
            where: { id: rewardId },
            data: {
              stock: reward.stock - 1,
            },
          }),
        ]);

        result = transactionResult[0];
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "memberReward.create",
          method: "POST",
          userId: ctx.session.user.id,
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
