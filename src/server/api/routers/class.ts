import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  permissionProtectedProcedure,
} from "@/server/api/trpc";
import { createClassSchema } from "@/app/(authenticated)/management/class/schema";

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
            trainerId: input.trainerId,
            schedule: input.schedule,
            duration: input.duration,
            price: input.price,
          },
          include: {
            trainer: {
              include: {
                user: true,
              },
            },
          },
        });
        return newClass;
      } catch (error) {
        throw new Error("Failed to create class");
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
        const where = search
          ? {
              name: { contains: search, mode: "insensitive" as const },
            }
          : undefined;

        const [items, total] = await Promise.all([
          ctx.db.class.findMany({
            skip,
            take: limit,
            where,
            include: {
              trainer: {
                include: {
                  user: true,
                },
              },
            },
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

  update: permissionProtectedProcedure(["edit:classes"])
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
            trainerId: data.trainerId,
            schedule: data.schedule,
            duration: data.duration,
          },
          include: {
            trainer: {
              include: {
                user: true,
              },
            },
          },
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
          include: {
            trainer: {
              include: {
                user: true,
              },
            },
          },
        });
        return deletedClass;
      } catch (error) {
        throw new Error("Failed to delete class");
      }
    }),
});
