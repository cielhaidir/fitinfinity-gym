import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { PaymentValidationStatus } from "@prisma/client";

export const paymentValidationRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        memberId: z.string(),
        packageId: z.string(),
        trainerId: z.string().nullish(),
        subsType: z.string(), // "gym" or "trainer"
        duration: z.number(),
        totalPayment: z.number(),
        paymentMethod: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { memberId, packageId, trainerId, subsType, duration, totalPayment, paymentMethod } = input;

      const paymentValidation = await ctx.prisma.paymentValidation.create({
        data: {
          memberId,
          packageId,
          trainerId: trainerId ?? undefined, // Handle nullish to undefined
          subsType,
          duration,
          totalPayment,
          paymentMethod,
          paymentStatus: PaymentValidationStatus.WAITING,
        },
      });
      return paymentValidation;
    }),

  // Placeholder for list procedure (for admin)
  list: protectedProcedure
    .input(z.object({
      // Add pagination, filtering options here if needed
      paymentStatus: z.nativeEnum(PaymentValidationStatus).optional(),
    }))
    .query(async ({ ctx, input }) => {
      // TODO: Implement actual query
      return { items: [], total: 0 }; 
    }),

  // Placeholder for getById procedure (for user to view their validation and upload proof)
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // TODO: Implement actual query, ensure user owns this validation
      return null;
    }),
  
  // Placeholder for uploadProof procedure
  uploadProof: protectedProcedure
    .input(z.object({
      id: z.string(),
      filePath: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Implement actual mutation, ensure user owns this validation
      // Potentially update paymentStatus if needed, or just filePath
      return null;
    }),

  // Placeholder for updateStatus procedure (for admin to accept/decline)
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: z.nativeEnum(PaymentValidationStatus),
    }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Implement actual mutation
      // If ACCEPTED, create Subscription and Payment records
      return null;
    }),
}); 