import { z } from "zod";
import {
  createTRPCRouter,
  permissionProtectedProcedure,
} from "@/server/api/trpc";
import { logApiMutationAsync, extractIpAddress, extractUserAgent } from "@/server/utils/mutationLogger";

const rewardInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  iconName: z.string().min(1, "Icon name is required"),
  price: z.number().min(0, "Price must be at least 0"),
  stock: z.number().min(0, "Stock must be at least 0"),
});

export const rewardRouter = createTRPCRouter({
  list: permissionProtectedProcedure(["list:reward"]).query(async ({ ctx }) => {
    const items = await ctx.db.reward.findMany({
      orderBy: { createdAt: "desc" },
    });
    const total = await ctx.db.reward.count();
    return {
      items,
      total,
      page: 1,
      limit: 10,
    };
  }),

  create: permissionProtectedProcedure(["create:reward"])
    .input(rewardInputSchema)
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        result = await ctx.db.reward.create({
          data: {
            name: input.name,
            iconName: input.iconName || "Gift", // Default icon jika kosong
            price: input.price,
            stock: input.stock,
          },
        });
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        console.error("Error creating reward:", error);
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "reward.create",
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

  update: permissionProtectedProcedure(["update:reward"])
    .input(
      z.object({
        id: z.string(),
        ...rewardInputSchema.shape,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const { id, ...data } = input;
        result = await ctx.db.reward.update({
          where: { id },
          data: {
            name: data.name,
            iconName: data.iconName || "Gift", // Default icon jika kosong
            price: data.price,
            stock: data.stock,
          },
        });
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        console.error("Error updating reward:", error);
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "reward.update",
          method: "PUT",
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

  delete: permissionProtectedProcedure(["delete:reward"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        // First check if the reward exists
        const reward = await ctx.db.reward.findUnique({
          where: { id: input.id },
          include: {
            memberRewards: true,
          },
        });

        if (!reward) {
          throw new Error("Reward not found");
        }

        // Check if there are any related member rewards
        if (reward.memberRewards.length > 0) {
          throw new Error(
            "Cannot delete reward that has been claimed by members",
          );
        }

        // If no related records, proceed with deletion
        await ctx.db.reward.delete({
          where: { id: input.id },
        });

        result = { success: true };
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        console.error("Error deleting reward:", error);
        if (error instanceof Error) {
          throw new Error(error.message);
        }
        throw new Error("Failed to delete reward");
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "reward.delete",
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

  redeem: permissionProtectedProcedure(["claim:reward"])
    .input(
      z.object({
        rewardId: z.string(),
        memberId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const { rewardId, memberId } = input;

        // Get reward and member details
        const [reward, member] = await Promise.all([
          ctx.db.reward.findUnique({
            where: { id: rewardId },
          }),
          ctx.db.user.findUnique({
            where: { id: memberId },
          }),
        ]);

        if (!reward) {
          throw new Error("Reward not found");
        }

        if (!member) {
          throw new Error("Member not found");
        }

        if (reward.stock <= 0) {
          throw new Error("Reward out of stock");
        }

        if (member.point < reward.price) {
          throw new Error("Insufficient points");
        }

        // Create member reward and update points in a transaction
        const transactionResult = await ctx.db.$transaction([
          // Create member reward record
          ctx.db.memberReward.create({
            data: {
              memberId,
              rewardId,
              claimedAt: new Date(),
            },
          }),
          // Update member points
          ctx.db.user.update({
            where: { id: memberId },
            data: {
              point: member.point - reward.price,
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
          endpoint: "reward.redeem",
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

  // Get member rewards
  getMemberRewards: permissionProtectedProcedure(["list:reward"])
    .input(
      z.object({
        memberId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = input.memberId ? { memberId: input.memberId } : {};

      const items = await ctx.db.memberReward.findMany({
        where,
        include: {
          member: {
            select: {
              name: true,
              point: true,
            },
          },
          reward: {
            select: {
              name: true,
              price: true,
            },
          },
        },
        orderBy: {
          claimedAt: "desc",
        },
      });

      const total = await ctx.db.memberReward.count({ where });

      return {
        items,
        total,
        page: 1,
        limit: 10,
      };
    }),
});
