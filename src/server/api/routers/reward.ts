import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

const rewardInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  iconName: z.string().min(1, "Icon name is required"),
  price: z.number().min(0, "Price must be at least 0"),
  stock: z.number().min(0, "Stock must be at least 0"),
});

export const rewardRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const items = await ctx.db.reward.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const total = await ctx.db.reward.count();
    return { 
      items,
      total,
      page: 1,
      limit: 10
    };
  }),

  create: protectedProcedure
    .input(rewardInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.db.reward.create({
          data: {
            name: input.name,
            iconName: input.iconName || "Gift", // Default icon jika kosong
            price: input.price,
            stock: input.stock,
          },
        });
      } catch (error) {
        console.error("Error creating reward:", error);
        throw error;
      }
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      ...rewardInputSchema.shape
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      try {
        return await ctx.db.reward.update({
          where: { id },
          data: {
            name: data.name,
            iconName: data.iconName || "Gift", // Default icon jika kosong
            price: data.price,
            stock: data.stock,
          },
        });
      } catch (error) {
        console.error("Error updating reward:", error);
        throw error;
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.db.reward.delete({
          where: { id: input.id },
        });
      } catch (error) {
        console.error("Error deleting reward:", error);
        throw error;
      }
    }),

  redeem: protectedProcedure
    .input(z.object({
      rewardId: z.string(),
      memberId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
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
      const result = await ctx.db.$transaction([
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

      return result[0];
    }),

  // Get member rewards
  getMemberRewards: protectedProcedure
    .input(z.object({
      memberId: z.string().optional(),
    }))
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
          claimedAt: 'desc',
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