import { z } from "zod";
import { createTRPCRouter, protectedProcedure, permissionProtectedProcedure } from "@/server/api/trpc";
import { configService } from "@/lib/config/configService";
import { TRPCError } from "@trpc/server";
import { logApiMutationAsync, extractIpAddress, extractUserAgent } from "@/server/utils/mutationLogger";

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
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        // Check for admin permission

        await configService.set(
          input.key,
          input.value,
          input.category ?? 'default' // Use 'default' as fallback category
        );

        result = { success: true };
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "config.update",
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

  resetToDefaults: permissionProtectedProcedure(["update:config"]).mutation(async ({ ctx }) => {
    const startTime = Date.now();
    let success = false;
    let result: any = null;
    let error: Error | null = null;

    try {
      await configService.initializeDefaults();

      result = { success: true };
      success = true;
      return result;
    } catch (err) {
      error = err as Error;
      success = false;
      throw err;
    } finally {
      logApiMutationAsync({
        db: ctx.db,
        endpoint: "config.resetToDefaults",
        method: "POST",
        userId: ctx.session?.user?.id,
        requestData: {},
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
