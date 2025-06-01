import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { configService } from "@/lib/config/configService";
import { TRPCError } from "@trpc/server";

export const configRouter = createTRPCRouter({
    getAll: protectedProcedure
        .query(async ({ ctx }) => {
            // Check for admin permission

            await configService.ensureLoaded();

            const configs = await ctx.db.config.findMany({
                orderBy: [
                    { category: 'asc' },
                    { key: 'asc' }
                ]
            });

            return configs;
        }),

    update: protectedProcedure
        .input(z.object({
            key: z.string(),
            value: z.string(),
            category: z.string().optional()
        }))
        .mutation(async ({ ctx, input }) => {
            // Check for admin permission
            
            // If category is provided, update with category
            if (input.category) {
                await configService.set(input.key, input.value, input.category);
            } else {
                await configService.set(input.key, input.value);
            }

            return { success: true };
        }),

    resetToDefaults: protectedProcedure
        .mutation(async ({ ctx }) => {
            
            await configService.initializeDefaults();

            return { success: true };
        }),
});