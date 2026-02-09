import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { logApiMutationAsync, extractIpAddress, extractUserAgent } from "@/server/utils/mutationLogger";

export const supplierRouter = createTRPCRouter({
  // List all suppliers with optional filters
  list: protectedProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          isActive: z.boolean().optional(),
          page: z.number().default(1),
          limit: z.number().default(10),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { search, isActive, page = 1, limit = 10 } = input ?? {};
      const skip = (page - 1) * limit;

      const where = {
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { code: { contains: search, mode: "insensitive" as const } },
          ],
        }),
        ...(isActive !== undefined && { isActive }),
      };

      const [data, total] = await Promise.all([
        ctx.db.supplier.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.supplier.count({ where }),
      ]);

      return {
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }),

  // Get single supplier by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const supplier = await ctx.db.supplier.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: { purchaseOrders: true },
          },
        },
      });

      if (!supplier) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Supplier not found",
        });
      }

      return supplier;
    }),

  // Create new supplier
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        code: z.string().optional(),
        contactName: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().optional(),
        address: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        // Validate unique code if provided
        if (input.code) {
          const existingSupplier = await ctx.db.supplier.findUnique({
            where: { code: input.code },
          });

          if (existingSupplier) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "A supplier with this code already exists",
            });
          }
        }

        // Handle empty email string
        const data = {
          ...input,
          email: input.email === "" ? null : input.email,
        };

        result = await ctx.db.supplier.create({
          data,
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
          endpoint: "supplier.create",
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

  // Update supplier
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        code: z.string().optional(),
        contactName: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().optional(),
        address: z.string().optional(),
        notes: z.string().optional(),
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

        // Check if supplier exists
        const existingSupplier = await ctx.db.supplier.findUnique({
          where: { id },
        });

        if (!existingSupplier) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Supplier not found",
          });
        }

        // Validate unique code if changed
        if (updateData.code && updateData.code !== existingSupplier.code) {
          const supplierWithCode = await ctx.db.supplier.findUnique({
            where: { code: updateData.code },
          });

          if (supplierWithCode) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "A supplier with this code already exists",
            });
          }
        }

        // Handle empty email string
        const data = {
          ...updateData,
          email: updateData.email === "" ? null : updateData.email,
        };

        result = await ctx.db.supplier.update({
          where: { id },
          data,
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
          endpoint: "supplier.update",
          method: "PUT",
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

  // Delete supplier (soft delete by setting isActive to false, or hard delete if no orders)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        // Check if supplier exists
        const supplier = await ctx.db.supplier.findUnique({
          where: { id: input.id },
          include: {
            _count: {
              select: { purchaseOrders: true },
            },
          },
        });

        if (!supplier) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Supplier not found",
          });
        }

        // If supplier has purchase orders, soft delete
        if (supplier._count.purchaseOrders > 0) {
          result = await ctx.db.supplier.update({
            where: { id: input.id },
            data: { isActive: false },
          });
        } else {
          // If no purchase orders, hard delete
          result = await ctx.db.supplier.delete({
            where: { id: input.id },
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
          endpoint: "supplier.delete",
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

  // Get all active suppliers (for dropdowns)
  getAllActive: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.supplier.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: { name: "asc" },
    });
  }),
});