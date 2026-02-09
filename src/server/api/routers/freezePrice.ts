import { z } from "zod";
import {
  createTRPCRouter,
  permissionProtectedProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { logApiMutationAsync, extractIpAddress, extractUserAgent } from "@/server/utils/mutationLogger";

export const freezePriceRouter = createTRPCRouter({
  /**
   * List all freeze prices with optional filtering by isActive
   */
  list: permissionProtectedProcedure(["list:subscription"])
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        isActive: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const whereClause: any = {};
      
      if (input.isActive !== undefined) {
        whereClause.isActive = input.isActive;
      }

      whereClause.price = { gt: 0 };

      const items = await ctx.db.freezePrice.findMany({
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        where: whereClause,
        orderBy: [
          { isActive: "desc" }, // Active items first
          { freezeDays: "asc" }, // Then by freeze days ascending
        ],
      });

      const total = await ctx.db.freezePrice.count({ where: whereClause });

      return {
        items,
        total,
        page: input.page,
        limit: input.limit,
      };
    }),

  /**
   * Get all active freeze prices (for member selection)
   */
  getActive: permissionProtectedProcedure(["list:subscription"])
    .query(async ({ ctx }) => {
      return ctx.db.freezePrice.findMany({
        where: { isActive: true, price: { gt: 0 } },
        orderBy: { freezeDays: "asc" },
      });
    }),

  /**
   * Get a single freeze price by ID
   */
  getById: permissionProtectedProcedure(["show:subscription"])
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const freezePrice = await ctx.db.freezePrice.findUnique({
        where: { id: input.id },
      });

      if (!freezePrice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Freeze price with ID ${input.id} not found`,
        });
      }

      return freezePrice;
    }),

  /**
   * Create a new freeze price (admin only)
   */
  create: permissionProtectedProcedure(["create:subscription"])
    .input(
      z.object({
        freezeDays: z.number().min(1).max(365),
        price: z.number().min(0),
        isActive: z.boolean().optional().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        // Check if a freeze price with the same freezeDays already exists
        const existing = await ctx.db.freezePrice.findFirst({
          where: { freezeDays: input.freezeDays },
        });

        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `A freeze price for ${input.freezeDays} days already exists`,
          });
        }

        result = await ctx.db.freezePrice.create({
          data: {
            freezeDays: input.freezeDays,
            price: input.price,
            isActive: input.isActive,
          },
        });
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "freezePrice.create",
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

  /**
   * Update an existing freeze price (admin only)
   */
  update: permissionProtectedProcedure(["update:subscription"])
    .input(
      z.object({
        id: z.string(),
        freezeDays: z.number().min(1).max(365).optional(),
        price: z.number().min(0).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const { id, ...updateData } = input;

        // Check if freeze price exists
        const existing = await ctx.db.freezePrice.findUnique({
          where: { id },
        });

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Freeze price with ID ${id} not found`,
          });
        }

        // If updating freezeDays, check for conflicts
        if (updateData.freezeDays && updateData.freezeDays !== existing.freezeDays) {
          const conflict = await ctx.db.freezePrice.findFirst({
            where: {
              freezeDays: updateData.freezeDays,
              id: { not: id },
            },
          });

          if (conflict) {
            throw new TRPCError({
              code: "CONFLICT",
              message: `A freeze price for ${updateData.freezeDays} days already exists`,
            });
          }
        }

        result = await ctx.db.freezePrice.update({
          where: { id },
          data: updateData,
        });
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "freezePrice.update",
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

  /**
   * Delete a freeze price (soft delete by setting isActive to false, or hard delete)
   */
  delete: permissionProtectedProcedure(["delete:subscription"])
    .input(
      z.object({
        id: z.string(),
        hardDelete: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        // Check if freeze price exists
        const existing = await ctx.db.freezePrice.findUnique({
          where: { id: input.id },
        });

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Freeze price with ID ${input.id} not found`,
          });
        }

        // Check if any freeze operations are using this price
        const usageCount = await ctx.db.freezeOperation.count({
          where: { freezePriceId: input.id },
        });

        if (usageCount > 0 && input.hardDelete) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Cannot delete freeze price with ${usageCount} associated freeze operations. Use soft delete instead.`,
          });
        }

        if (input.hardDelete) {
          // Hard delete - only if no operations reference it
          result = await ctx.db.freezePrice.delete({
            where: { id: input.id },
          });
        } else {
          // Soft delete - set isActive to false
          result = await ctx.db.freezePrice.update({
            where: { id: input.id },
            data: { isActive: false },
          });
        }
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "freezePrice.delete",
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

  /**
   * Get freeze operation history for a member
   */
  getMemberFreezeHistory: permissionProtectedProcedure(["list:subscription"])
    .input(
      z.object({
        memberId: z.string(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.freezeOperation.findMany({
        where: { memberId: input.memberId },
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        orderBy: { createdAt: "desc" },
        include: {
          freezePrice: true,
          transaction: {
            select: {
              id: true,
              totalAmount: true,
              status: true,
              createdAt: true,
            },
          },
        },
      });

      const total = await ctx.db.freezeOperation.count({
        where: { memberId: input.memberId },
      });

      return {
        items,
        total,
        page: input.page,
        limit: input.limit,
      };
    }),

  /**
   * Get freeze operations statistics
   */
  getStatistics: permissionProtectedProcedure(["list:subscription"])
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const whereClause: any = {};

      if (input.startDate || input.endDate) {
        whereClause.createdAt = {};
        if (input.startDate) {
          whereClause.createdAt.gte = input.startDate;
        }
        if (input.endDate) {
          whereClause.createdAt.lte = input.endDate;
        }
      }

      const [totalOperations, freezeOperations, unfreezeOperations, totalRevenue] = await Promise.all([
        ctx.db.freezeOperation.count({ where: whereClause }),
        ctx.db.freezeOperation.count({
          where: { ...whereClause, operationType: "FREEZE" },
        }),
        ctx.db.freezeOperation.count({
          where: { ...whereClause, operationType: "UNFREEZE" },
        }),
        ctx.db.freezeOperation.aggregate({
          where: {
            ...whereClause,
            operationType: "FREEZE",
            freezePrice: { isNot: null },
          },
          _sum: {
            freezePriceId: true, // This is a workaround; we'll calculate revenue differently
          },
        }),
      ]);

      // Calculate actual revenue by joining with freezePrice
      const operationsWithPrice = await ctx.db.freezeOperation.findMany({
        where: {
          ...whereClause,
          operationType: "FREEZE",
          freezePrice: { isNot: null },
        },
        include: {
          freezePrice: {
            select: { price: true },
          },
        },
      });

      const revenue = operationsWithPrice.reduce(
        (sum, op) => sum + (op.freezePrice?.price || 0),
        0
      );

      return {
        totalOperations,
        freezeOperations,
        unfreezeOperations,
        totalRevenue: revenue,
      };
    }),
});