import { z } from "zod";
import { createTRPCRouter, protectedProcedure, permissionProtectedProcedure } from "@/server/api/trpc";
import { configService } from "@/lib/config/configService";
import { TRPCError } from "@trpc/server";

export const configRouter = createTRPCRouter({
  getAll: permissionProtectedProcedure(["list:config"]).query(async ({ ctx }) => {
    // Check for admin permission

    await configService.ensureLoaded();

    const configs = await ctx.db.config.findMany({
      orderBy: [{ category: "asc" }, { key: "asc" }],
    });

    return configs;
  }),

  update: permissionProtectedProcedure(["update:config"])
    .input(
      z.object({
        key: z.string(),
        value: z.string(),
        category: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check for admin permission

      await configService.set(
        input.key,
        input.value,
        input.category ?? 'default' // Use 'default' as fallback category
      );

      return { success: true };
    }),

  resetToDefaults: permissionProtectedProcedure(["update:config"]).mutation(async ({ ctx }) => {
    await configService.initializeDefaults();

    return { success: true };
  }),
});
