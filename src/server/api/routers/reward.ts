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
    }))
    .mutation(async ({ ctx, input }) => {
      const reward = await ctx.db.reward.findUnique({
        where: { id: input.rewardId },
      });

      if (!reward) {
        throw new Error("Reward not found");
      }

      if (reward.stock <= 0) {
        throw new Error("Reward out of stock");
      }

      // TODO: Check if user has enough points
      // TODO: Deduct points from user
      // TODO: Create redemption record
      // TODO: Update reward stock

      return reward;
    }),
}); 