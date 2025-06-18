import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  permissionProtectedProcedure,
} from "@/server/api/trpc";

export const personalTrainerRouter = createTRPCRouter({
  create: permissionProtectedProcedure(["create:trainers"])
    .input(
      z.object({
        userId: z.string(),
        description: z.string().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.personalTrainer.create({
        data: {
          userId: input.userId,
          description: input.description,
        },
      });
    }),

  edit: permissionProtectedProcedure(["update:trainers"])
    .input(
      z.object({
        id: z.string(),
        userId: z.string().nullable(),
        description: z.string().nullable(),
        isActive: z.boolean().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.personalTrainer.update({
        where: { id: input.id },
        data: {
          userId: input.userId ?? undefined,
          description: input.description ?? undefined,
          isActive: input.isActive ?? undefined,
        },
      });
    }),

  detail: permissionProtectedProcedure(["show:trainers"])
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.personalTrainer.findUnique({
        where: { id: input.id },
      });
    }),

  list: permissionProtectedProcedure(["list:trainers"])
    .input(
      z.object({
        page: z.number().min(1),
        pageSize: z.number().min(1).max(100),
      }),
    )
    .query(async ({ ctx, input }) => {
      const personalTrainers = await ctx.db.personalTrainer.findMany({
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        orderBy: { createdAt: "desc" },
      });

      const total = await ctx.db.personalTrainer.count();

      return {
        personalTrainers,
        total,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  getById: permissionProtectedProcedure(["show:trainers"])
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.personalTrainer.findUnique({
        where: { id: input.id },
      });
    }),

  update: permissionProtectedProcedure(["update:trainers"])
    .input(
      z.object({
        id: z.string(),
        userId: z.string().nullable(),
        description: z.string().nullable(),
        isActive: z.boolean().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.personalTrainer.update({
        where: { id: input.id },
        data: {
          userId: input.userId ?? undefined,
          description: input.description ?? undefined,
          isActive: input.isActive ?? undefined,
        },
      });
    }),
});
