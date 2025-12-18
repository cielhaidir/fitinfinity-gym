import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

// Inventory transaction type enum values for validation
const inventoryTransactionTypes = [
  "SALE",
  "SALE_VOID",
  "PURCHASE_RECEIVE",
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT",
  "RETURN",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "INITIAL",
] as const;

export const inventoryRouter = createTRPCRouter({
  // Get inventory transaction history with filters
  getTransactions: protectedProcedure
    .input(
      z
        .object({
          itemId: z.string().optional(),
          type: z.enum(inventoryTransactionTypes).optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          page: z.number().default(1),
          limit: z.number().default(20),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { itemId, type, startDate, endDate, page = 1, limit = 20 } = input ?? {};
      const skip = (page - 1) * limit;

      const where = {
        ...(itemId && { itemId }),
        ...(type && { type }),
        ...(startDate &&
          endDate && {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
      };

      const [data, total] = await Promise.all([
        ctx.db.inventoryTransaction.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            item: {
              select: {
                id: true,
                name: true,
                stock: true,
                warehouseStock: true,
                showcaseStock: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
        ctx.db.inventoryTransaction.count({ where }),
      ]);

      return {
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }),

  // Create stock adjustment (manual increase or decrease)
  createAdjustment: protectedProcedure
    .input(
      z.object({
        itemId: z.string(),
        type: z.enum(["ADJUSTMENT_IN", "ADJUSTMENT_OUT"]),
        stockType: z.enum(["warehouse", "showcase"]),
        quantity: z.number().positive(),
        reason: z.string().min(1),
        note: z.string().optional(),
        idempotencyKey: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { itemId, type, stockType, quantity, reason, note, idempotencyKey } = input;
      const userId = ctx.session.user.id;

      return ctx.db.$transaction(async (tx) => {
        // Check idempotencyKey if provided (prevent duplicates)
        if (idempotencyKey) {
          const existingTransaction = await tx.inventoryTransaction.findUnique({
            where: { idempotencyKey },
          });

          if (existingTransaction) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Duplicate adjustment request detected",
            });
          }
        }

        // Get current stock
        const item = await tx.pOSItem.findUnique({
          where: { id: itemId },
          select: {
            id: true,
            name: true,
            stock: true,
            warehouseStock: true,
            showcaseStock: true,
          },
        });

        if (!item) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Item not found",
          });
        }

        // Determine which stock field to use
        const stockField = stockType === "warehouse" ? "warehouseStock" : "showcaseStock";
        const currentStock = item[stockField];
        let quantityAfter: number;
        let adjustedQuantity: number;

        if (type === "ADJUSTMENT_OUT") {
          // For ADJUSTMENT_OUT, verify sufficient stock
          if (currentStock < quantity) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Insufficient ${stockType} stock. Available: ${currentStock}, Requested: ${quantity}`,
            });
          }
          quantityAfter = currentStock - quantity;
          adjustedQuantity = -quantity; // Negative for decrease
        } else {
          // ADJUSTMENT_IN
          quantityAfter = currentStock + quantity;
          adjustedQuantity = quantity; // Positive for increase
        }

        // Update the specific stock field (and legacy stock field)
        await tx.pOSItem.update({
          where: { id: itemId },
          data: {
            [stockField]: quantityAfter,
            stock: type === "ADJUSTMENT_IN"
              ? { increment: quantity }
              : { decrement: quantity },
          },
        });

        // Create InventoryTransaction record
        const transaction = await tx.inventoryTransaction.create({
          data: {
            itemId,
            type,
            quantity: adjustedQuantity,
            quantityBefore: currentStock,
            quantityAfter,
            referenceType: "Adjustment",
            stockType,
            reason,
            note,
            userId,
            idempotencyKey,
          },
          include: {
            item: {
              select: {
                id: true,
                name: true,
                stock: true,
                warehouseStock: true,
                showcaseStock: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        return transaction;
      });
    }),

  // Transfer stock from warehouse to showcase
  transferStock: protectedProcedure
    .input(
      z.object({
        itemId: z.string(),
        quantity: z.number().positive(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        const item = await tx.pOSItem.findUnique({
          where: { id: input.itemId },
          select: { 
            id: true, 
            name: true, 
            warehouseStock: true, 
            showcaseStock: true 
          },
        });

        if (!item) {
          throw new TRPCError({ 
            code: "NOT_FOUND", 
            message: "Item not found" 
          });
        }

        if (item.warehouseStock < input.quantity) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Insufficient warehouse stock. Available: ${item.warehouseStock}`,
          });
        }

        // Decrease warehouse, increase showcase
        await tx.pOSItem.update({
          where: { id: input.itemId },
          data: {
            warehouseStock: { decrement: input.quantity },
            showcaseStock: { increment: input.quantity },
          },
        });

        // Create two inventory transactions
        await tx.inventoryTransaction.createMany({
          data: [
            {
              itemId: input.itemId,
              type: "TRANSFER_OUT",
              quantity: -input.quantity,
              quantityBefore: item.warehouseStock,
              quantityAfter: item.warehouseStock - input.quantity,
              stockType: "warehouse",
              note: input.note ?? "Transfer to showcase",
              userId: ctx.session.user.id,
            },
            {
              itemId: input.itemId,
              type: "TRANSFER_IN",
              quantity: input.quantity,
              quantityBefore: item.showcaseStock,
              quantityAfter: item.showcaseStock + input.quantity,
              stockType: "showcase",
              note: input.note ?? "Transfer from warehouse",
              userId: ctx.session.user.id,
            },
          ],
        });

        return { success: true };
      });
    }),

  // Get current stock levels with low stock alerts
  getStockLevels: protectedProcedure
    .input(
      z
        .object({
          categoryId: z.string().optional(),
          lowStockOnly: z.boolean().optional(),
          search: z.string().optional(),
          page: z.number().default(1),
          limit: z.number().default(20),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { categoryId, lowStockOnly, search, page = 1, limit = 20 } = input ?? {};
      const skip = (page - 1) * limit;

      // Build where clause
      const where: {
        categoryId?: string;
        isActive?: boolean;
        OR?: Array<{ name?: { contains: string; mode: "insensitive" } }>;
        AND?: Array<{
          stock?: { lte: unknown };
          minStock?: { not: null };
        }>;
      } = {
        isActive: true,
        ...(categoryId && { categoryId }),
        ...(search && {
          OR: [{ name: { contains: search, mode: "insensitive" as const } }],
        }),
      };

      // For low stock filter, we need to compare stock <= minStock
      if (lowStockOnly) {
        where.AND = [
          {
            stock: { lte: ctx.db.pOSItem.fields.minStock },
          },
          {
            minStock: { not: null },
          },
        ];
      }

      // Use raw query for lowStockOnly since Prisma doesn't support field comparison directly
      let data;
      let total;

      if (lowStockOnly) {
        // Query items where stock <= minStock
        const baseWhere = {
          isActive: true,
          ...(categoryId && { categoryId }),
          ...(search && {
            OR: [{ name: { contains: search, mode: "insensitive" as const } }],
          }),
        };

        const allItems = await ctx.db.pOSItem.findMany({
          where: baseWhere,
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        // Filter items where stock <= minStock
        const lowStockItems = allItems.filter(
          (item) => item.minStock !== null && item.stock <= (item.minStock ?? 0)
        );

        total = lowStockItems.length;
        data = lowStockItems.slice(skip, skip + limit);
      } else {
        const simpleWhere = {
          isActive: true,
          ...(categoryId && { categoryId }),
          ...(search && {
            OR: [{ name: { contains: search, mode: "insensitive" as const } }],
          }),
        };

        [data, total] = await Promise.all([
          ctx.db.pOSItem.findMany({
            where: simpleWhere,
            skip,
            take: limit,
            orderBy: { name: "asc" },
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          }),
          ctx.db.pOSItem.count({ where: simpleWhere }),
        ]);
      }

      return {
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }),

  // Get low stock items count (for dashboard badge)
  getLowStockCount: protectedProcedure.query(async ({ ctx }) => {
    // Get all active items and filter in memory since Prisma doesn't support field comparison
    const items = await ctx.db.pOSItem.findMany({
      where: {
        isActive: true,
      },
      select: {
        stock: true,
        minStock: true,
      },
    });

    // Count items where stock <= minStock
    const count = items.filter(
      (item) => item.minStock !== null && item.stock <= (item.minStock ?? 0)
    ).length;

    return { count };
  }),

  // Get stock summary for a specific item
  getItemStockSummary: protectedProcedure
    .input(z.object({ itemId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { itemId } = input;

      // Get item details with current stock
      const item = await ctx.db.pOSItem.findUnique({
        where: { id: itemId },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item not found",
        });
      }

      // Get recent transactions (last 10)
      const recentTransactions = await ctx.db.inventoryTransaction.findMany({
        where: { itemId },
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Calculate movement summary for this month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const monthlyTransactions = await ctx.db.inventoryTransaction.findMany({
        where: {
          itemId,
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        select: {
          type: true,
          quantity: true,
        },
      });

      // Aggregate totals
      let totalIn = 0;
      let totalOut = 0;

      for (const tx of monthlyTransactions) {
        if (tx.quantity > 0) {
          totalIn += tx.quantity;
        } else {
          totalOut += Math.abs(tx.quantity);
        }
      }

      return {
        item,
        recentTransactions,
        monthlyMovement: {
          totalIn,
          totalOut,
          netChange: totalIn - totalOut,
          startOfMonth,
          endOfMonth,
        },
      };
    }),

  // Bulk stock take / initial count
  bulkStockTake: protectedProcedure
    .input(
      z.object({
        items: z.array(
          z.object({
            itemId: z.string(),
            actualStock: z.number().int().nonnegative(),
            note: z.string().optional(),
          })
        ),
        reason: z.string().default("Stock Take"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { items, reason } = input;
      const userId = ctx.session.user.id;

      return ctx.db.$transaction(async (tx) => {
        const transactions = [];
        let updatedCount = 0;

        for (const itemInput of items) {
          const { itemId, actualStock, note } = itemInput;

          // Get current stock
          const item = await tx.pOSItem.findUnique({
            where: { id: itemId },
          });

          if (!item) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Item with ID ${itemId} not found`,
            });
          }

          const quantityBefore = item.stock;
          const difference = actualStock - quantityBefore;

          // Skip if no difference
          if (difference === 0) {
            continue;
          }

          // Determine transaction type based on difference
          const type = difference > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT";

          // Update POSItem.stock to actualStock
          await tx.pOSItem.update({
            where: { id: itemId },
            data: { stock: actualStock },
          });

          // Create InventoryTransaction
          const transaction = await tx.inventoryTransaction.create({
            data: {
              itemId,
              type,
              quantity: difference,
              quantityBefore,
              quantityAfter: actualStock,
              referenceType: "Adjustment",
              reason,
              note,
              userId,
            },
            include: {
              item: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          });

          transactions.push(transaction);
          updatedCount++;
        }

        return {
          updated: updatedCount,
          transactions,
        };
      });
    }),

  // Get stock report aggregated by category
  getStockReport: protectedProcedure.query(async ({ ctx }) => {
    // Get all active items with their categories
    const items = await ctx.db.pOSItem.findMany({
      where: { isActive: true },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Calculate summary
    let totalItems = 0;
    let totalStockValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    // Aggregate by category
    const categoryMap = new Map<
      string,
      {
        id: string;
        name: string;
        itemCount: number;
        totalStock: number;
        totalValue: number;
      }
    >();

    // Low stock items
    const lowStockItems: Array<{
      id: string;
      name: string;
      categoryName: string;
      stock: number;
      minStock: number;
      shortage: number;
      price: number;
    }> = [];

    for (const item of items) {
      totalItems++;
      const stockValue = item.stock * item.price;
      totalStockValue += stockValue;

      // Check low stock
      if (item.minStock !== null && item.stock <= item.minStock) {
        lowStockCount++;
        lowStockItems.push({
          id: item.id,
          name: item.name,
          categoryName: item.category?.name ?? "Uncategorized",
          stock: item.stock,
          minStock: item.minStock,
          shortage: item.minStock - item.stock,
          price: item.price,
        });
      }

      // Check out of stock
      if (item.stock === 0) {
        outOfStockCount++;
      }

      // Aggregate by category
      const categoryId = item.categoryId ?? "uncategorized";
      const categoryName = item.category?.name ?? "Uncategorized";

      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          id: categoryId,
          name: categoryName,
          itemCount: 0,
          totalStock: 0,
          totalValue: 0,
        });
      }

      const catData = categoryMap.get(categoryId)!;
      catData.itemCount++;
      catData.totalStock += item.stock;
      catData.totalValue += stockValue;
    }

    // Sort low stock items by shortage (descending)
    lowStockItems.sort((a, b) => b.shortage - a.shortage);

    return {
      summary: {
        totalItems,
        totalStockValue,
        lowStockCount,
        outOfStockCount,
      },
      byCategory: Array.from(categoryMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
      lowStockItems,
    };
  }),

  // Get movement report (for date range)
  getMovementReport: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        itemId: z.string().optional(),
        categoryId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate, itemId, categoryId } = input;

      // Build where clause
      const where: {
        createdAt: { gte: Date; lte: Date };
        itemId?: string;
        item?: { categoryId: string };
      } = {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(itemId && { itemId }),
        ...(categoryId && {
          item: {
            categoryId,
          },
        }),
      };

      // Get all transactions in the period
      const transactions = await ctx.db.inventoryTransaction.findMany({
        where,
        include: {
          item: {
            select: {
              id: true,
              name: true,
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Aggregate by type
      const summaryByType: Record<
        string,
        { count: number; totalQuantity: number }
      > = {};

      for (const tx of transactions) {
        if (!summaryByType[tx.type]) {
          summaryByType[tx.type] = { count: 0, totalQuantity: 0 };
        }
        summaryByType[tx.type].count += 1;
        summaryByType[tx.type].totalQuantity += Math.abs(tx.quantity);
      }

      // Aggregate by item if no specific item
      const summaryByItem: Record<
        string,
        {
          itemId: string;
          itemName: string;
          categoryName: string;
          totalIn: number;
          totalOut: number;
          netChange: number;
        }
      > = {};

      for (const tx of transactions) {
        const key = tx.item.id;
        if (!summaryByItem[key]) {
          summaryByItem[key] = {
            itemId: tx.item.id,
            itemName: tx.item.name,
            categoryName: tx.item.category?.name ?? "Unknown",
            totalIn: 0,
            totalOut: 0,
            netChange: 0,
          };
        }

        if (tx.quantity > 0) {
          summaryByItem[key].totalIn += tx.quantity;
        } else {
          summaryByItem[key].totalOut += Math.abs(tx.quantity);
        }
        summaryByItem[key].netChange += tx.quantity;
      }

      // Calculate overall totals
      let overallTotalIn = 0;
      let overallTotalOut = 0;

      for (const tx of transactions) {
        if (tx.quantity > 0) {
          overallTotalIn += tx.quantity;
        } else {
          overallTotalOut += Math.abs(tx.quantity);
        }
      }

      return {
        period: {
          startDate,
          endDate,
        },
        totalTransactions: transactions.length,
        overallTotalIn,
        overallTotalOut,
        netChange: overallTotalIn - overallTotalOut,
        summaryByType,
        summaryByItem: Object.values(summaryByItem),
        transactions,
      };
    }),
});