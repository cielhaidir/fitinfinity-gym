import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { uploadFile } from "@/lib/upload"

export const profileRouter = createTRPCRouter({
  get: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          phone: true,
          address: true,
          birthDate: true,
          point: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        })
      }

      return user
    }),

  update: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        birthDate: z.date().optional(),
        image: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          name: input.name,
          phone: input.phone,
          address: input.address,
          birthDate: input.birthDate,
          image: input.image,
        },
      })
    }),

  uploadImage: protectedProcedure
    .input(z.object({ file: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const imageUrl = await uploadFile(input.file)
        await ctx.db.user.update({
          where: { id: ctx.session.user.id },
          data: { image: imageUrl },
        })
        return { imageUrl }
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to upload image",
        })
      }
    }),
}) 