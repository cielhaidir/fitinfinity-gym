import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  permissionProtectedProcedure,
} from "@/server/api/trpc";

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
      try {
        const classType = await ctx.db.classType.create({
          data: {
            ...input,
            name: input.name.toLowerCase(),
          },
        });
        return classType;
      } catch (error) {
        throw new Error("Failed to create class type");
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
      const { id, ...data } = input;
      try {
        const updateData = { ...data };
        if (data.name) {
          updateData.name = data.name.toLowerCase();
        }
        
        const classType = await ctx.db.classType.update({
          where: { id },
          data: updateData,
        });
        return classType;
      } catch (error) {
        throw new Error("Failed to update class type");
      }
    }),

  // Delete a class type (soft delete by setting isActive to false)
  delete: permissionProtectedProcedure(["delete:classes"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const classType = await ctx.db.classType.update({
          where: { id: input.id },
          data: { isActive: false },
        });
        return classType;
      } catch (error) {
        throw new Error("Failed to delete class type");
      }
    }),
});