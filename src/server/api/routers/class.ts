import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  permissionProtectedProcedure,
} from "@/server/api/trpc";
import { createClassSchema, createBulkClassSchema } from "@/app/(authenticated)/management/class/schema";

export const classRouter = createTRPCRouter({
  create: permissionProtectedProcedure(["create:classes"])
    .input(createClassSchema)
    .mutation(async ({ ctx, input }) => {
      console.log("Creating class with input:", input); // Debug log
      try {
        const newClass = await ctx.db.class.create({
          data: {
            name: input.name,
            limit: input.limit,
            instructorName: input.instructorName,
            schedule: input.schedule,
            duration: input.duration,
            price: input.price,
          },
          // No trainer relation to include
        });
        return newClass;
      } catch (error) {
        throw new Error("Failed to create class");
      }
    }),

  createBulk: permissionProtectedProcedure(["create:classes"])
    .input(createBulkClassSchema)
    .mutation(async ({ ctx, input }) => {
      console.log("Creating bulk classes with input:", input); // Debug log
      try {
        const { schedules, ...classData } = input;
        
        // Create multiple classes with different schedules
        const createdClasses = await Promise.all(
          schedules.map(schedule =>
            ctx.db.class.create({
              data: {
                name: classData.name,
                limit: classData.limit,
                instructorName: classData.instructorName,
                schedule: schedule,
                duration: classData.duration,
                price: classData.price,
              },
            })
          )
        );
        
        return createdClasses;
      } catch (error) {
        console.error("Failed to create bulk classes:", error);
        throw new Error("Failed to create bulk classes");
      }
    }),

  list: permissionProtectedProcedure(["list:classes"])
    .input(
      z.object({
        page: z.number().min(1),
        limit: z.number().min(1),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, search } = input;
      const skip = (page - 1) * limit;

      try {
        // Calculate date threshold - exclude classes older than 1 day
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        oneDayAgo.setHours(0, 0, 0, 0); // Set to start of yesterday

        const whereConditions: any = {
          schedule: {
            gte: oneDayAgo, // Only show classes from yesterday onwards
          },
        };

        // Add search condition if provided
        if (search) {
          whereConditions.name = { contains: search, mode: "insensitive" as const };
        }

        const where = whereConditions;

        const [items, total] = await Promise.all([
          ctx.db.class.findMany({
            skip,
            take: limit,
            where,
            // No trainer relation to include
            orderBy: { createdAt: "desc" },
          }),
          ctx.db.class.count({ where }),
        ]);

        return {
          items,
          total,
          page,
          limit,
        };
      } catch (error) {
        throw new Error("Failed to fetch classes");
      }
    }),

  update: permissionProtectedProcedure(["update:classes"])
    .input(
      createClassSchema.extend({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      try {
        const updatedClass = await ctx.db.class.update({
          where: { id },
          data: {
            name: data.name,
            limit: data.limit,
            instructorName: data.instructorName,
            schedule: data.schedule,
            duration: data.duration,
          },
          // No trainer relation to include
        });
        return updatedClass;
      } catch (error) {
        throw new Error("Failed to update class");
      }
    }),

  remove: permissionProtectedProcedure(["delete:classes"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const deletedClass = await ctx.db.class.delete({
          where: { id: input.id },
          // No trainer relation to include
        });
        return deletedClass;
      } catch (error) {
        throw new Error("Failed to delete class");
      }
    }),
});
