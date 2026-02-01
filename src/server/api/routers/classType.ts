import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  permissionProtectedProcedure,
} from "@/server/api/trpc";
import { logApiMutation, extractIpAddress, extractUserAgent } from "@/server/utils/mutationLogger";

export const classTypeRouter = createTRPCRouter({
  // Public procedure to list all active class types
  list: publicProcedure
    .query(async ({ ctx }) => {
      try {
        const classTypes = await ctx.db.classType.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
        });
        return classTypes;
      } catch (error) {
        throw new Error("Failed to fetch class types");
      }
    }),

  // Protected procedure to get all class types (including inactive ones)
  listAll: permissionProtectedProcedure(["list:classes"])
    .query(async ({ ctx }) => {
      try {
        const classTypes = await ctx.db.classType.findMany({
          orderBy: { name: "asc" },
        });
        return classTypes;
      } catch (error) {
        throw new Error("Failed to fetch all class types");
      }
    }),

  // Get a specific class type by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const classType = await ctx.db.classType.findUnique({
          where: { id: input.id },
        });
        if (!classType) {
          throw new Error("Class type not found");
        }
        return classType;
      } catch (error) {
        throw new Error("Failed to fetch class type");
      }
    }),

  // Get a specific class type by name
  getByName: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const classType = await ctx.db.classType.findUnique({
          where: { name: input.name.toLowerCase() },
        });
        return classType;
      } catch (error) {
        throw new Error("Failed to fetch class type");
      }
    }),

  // Create a new class type
  create: permissionProtectedProcedure(["create:classes"])
    .input(
      z.object({
        name: z.string().min(1),
        icon: z.string().min(1),
        description: z.string().min(1),
        level: z.enum(["Easy", "Medium", "Hard"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const classType = await ctx.db.classType.create({
          data: {
            ...input,
            name: input.name.toLowerCase(),
          },
        });
        result = classType;
        success = true;
        return classType;
      } catch (err) {
        error = err as Error;
        success = false;
        throw new Error("Failed to create class type");
      } finally {
        await logApiMutation({
          db: ctx.db,
          endpoint: "classType.create",
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

  // Update an existing class type
  update: permissionProtectedProcedure(["update:classes"])
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        icon: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        level: z.enum(["Easy", "Medium", "Hard"]).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const { id, ...data } = input;
        const updateData = { ...data };
        if (data.name) {
          updateData.name = data.name.toLowerCase();
        }
        
        const classType = await ctx.db.classType.update({
          where: { id },
          data: updateData,
        });
        result = classType;
        success = true;
        return classType;
      } catch (err) {
        error = err as Error;
        success = false;
        throw new Error("Failed to update class type");
      } finally {
        await logApiMutation({
          db: ctx.db,
          endpoint: "classType.update",
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

  // Delete a class type (soft delete by setting isActive to false)
  delete: permissionProtectedProcedure(["delete:classes"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const classType = await ctx.db.classType.update({
          where: { id: input.id },
          data: { isActive: false },
        });
        result = classType;
        success = true;
        return classType;
      } catch (err) {
        error = err as Error;
        success = false;
        throw new Error("Failed to delete class type");
      } finally {
        await logApiMutation({
          db: ctx.db,
          endpoint: "classType.delete",
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