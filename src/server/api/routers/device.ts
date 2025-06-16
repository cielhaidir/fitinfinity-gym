import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

const createDeviceSchema = z.object({
  name: z.string(),
  accessKey: z.string()
});

export const deviceRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.device.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        name: 'asc'
      }
    });
  }),

  create: protectedProcedure
    .input(createDeviceSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.device.create({
        data: {
          name: input.name,
          accessKey: input.accessKey
        }
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      accessKey: z.string().optional(),
      isActive: z.boolean().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.device.update({
        where: { id },
        data
      });
    }),

  delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      return ctx.db.device.delete({
        where: { id: input }
      });
    }),

  updateLastSeen: protectedProcedure
    .input(z.object({
      id: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.device.update({
        where: { id: input.id },
        data: {
          lastSeen: new Date()
        }
      });
    })
});