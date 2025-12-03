import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

// Purchase order status enum values for validation
const purchaseOrderStatuses = [
  "DRAFT",
  "PENDING",
  "ORDERED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CANCELLED",
] as const;

// Helper function to generate order number
async function generateOrderNumber(
  db: Parameters<Parameters<typeof protectedProcedure.mutation>[0]>["ctx"]["db"]
): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD

  // Find the latest order number for today
  const latestOrder = await db.purchaseOrder.findFirst({
    where: {
      orderNumber: {
        startsWith: `PO-${dateStr}`,
      },
    },
    orderBy: {
      orderNumber: "desc",
    },
    select: {
      orderNumber: true,
    },
  });

  let sequence = 1;
  if (latestOrder) {
    // Extract the sequence number from the latest order
    const match = latestOrder.orderNumber.match(/PO-\d{8}-(\d{4})$/);
    if (match?.[1]) {
      sequence = parseInt(match[1], 10) + 1;
    }
  }

  return `PO-${dateStr}-${sequence.toString().padStart(4, "0")}`;
}

export const purchaseOrderRouter = createTRPCRouter({
  // List purchase orders with filters
  list: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(purchaseOrderStatuses).optional(),
          supplierId: z.string().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          search: z.string().optional(), // search by orderNumber
          page: z.number().default(1),
          limit: z.number().default(10),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const {
        status,
        supplierId,
        startDate,
        endDate,
        search,
        page = 1,
        limit = 10,
      } = input ?? {};
      const skip = (page - 1) * limit;

      const where = {
        ...(status && { status }),
        ...(supplierId && { supplierId }),
        ...(search && {
          orderNumber: { contains: search, mode: "insensitive" as const },
        }),
        ...(startDate &&
          endDate && {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
      };

      const [data, total] = await Promise.all([
        ctx.db.purchaseOrder.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            _count: {
              select: { items: true },
            },
          },
        }),
        ctx.db.purchaseOrder.count({ where }),
      ]);

      return {
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }),

  // Get single purchase order with items
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const purchaseOrder = await ctx.db.purchaseOrder.findUnique({
        where: { id: input.id },
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              code: true,
              contactName: true,
              email: true,
              phone: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          updater: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: {
            include: {
              item: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  cost: true,
                  stock: true,
                  category: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!purchaseOrder) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Purchase order not found",
        });
      }

      return purchaseOrder;
    }),

  // Create new purchase order
  create: protectedProcedure
    .input(
      z.object({
        supplierId: z.string().optional(),
        orderDate: z.date().optional(),
        expectedDate: z.date().optional(),
        tax: z.number().default(0),
        discount: z.number().default(0),
        notes: z.string().optional(),
        items: z
          .array(
            z.object({
              itemId: z.string(),
              quantity: z.number().positive(),
              unitCost: z.number().nonnegative(),
              notes: z.string().optional(),
            })
          )
          .min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { supplierId, orderDate, expectedDate, tax, discount, notes, items } =
        input;

      // Generate order number
      const orderNumber = await generateOrderNumber(ctx.db);

      // Calculate subtotal from items
      const subtotal = items.reduce(
        (acc, item) => acc + item.quantity * item.unitCost,
        0
      );

      // Calculate total
      const total = subtotal + tax - discount;

      // Create purchase order with items
      const purchaseOrder = await ctx.db.purchaseOrder.create({
        data: {
          orderNumber,
          supplierId,
          orderDate,
          expectedDate,
          subtotal,
          tax,
          discount,
          total,
          notes,
          createdBy: userId,
          items: {
            create: items.map((item) => ({
              itemId: item.itemId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              subtotal: item.quantity * item.unitCost,
              notes: item.notes,
            })),
          },
        },
        include: {
          supplier: true,
          items: {
            include: {
              item: true,
            },
          },
        },
      });

      return purchaseOrder;
    }),

  // Update purchase order (only if status is DRAFT or PENDING)
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        supplierId: z.string().optional(),
        orderDate: z.date().optional(),
        expectedDate: z.date().optional(),
        tax: z.number().optional(),
        discount: z.number().optional(),
        notes: z.string().optional(),
        items: z
          .array(
            z.object({
              id: z.string().optional(), // existing item id for update
              itemId: z.string(),
              quantity: z.number().positive(),
              unitCost: z.number().nonnegative(),
              notes: z.string().optional(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { id, items, ...updateData } = input;

      // Check if purchase order exists and status allows update
      const existingPO = await ctx.db.purchaseOrder.findUnique({
        where: { id },
      });

      if (!existingPO) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Purchase order not found",
        });
      }

      if (!["DRAFT", "PENDING"].includes(existingPO.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot update purchase order with status: ${existingPO.status}`,
        });
      }

      // Calculate new totals if items provided
      let subtotal = existingPO.subtotal;
      const tax = updateData.tax ?? existingPO.tax;
      const discount = updateData.discount ?? existingPO.discount;

      if (items) {
        subtotal = items.reduce(
          (acc, item) => acc + item.quantity * item.unitCost,
          0
        );
      }

      const total = subtotal + tax - discount;

      // Update purchase order
      return ctx.db.$transaction(async (tx) => {
        // Delete old items if new items provided
        if (items) {
          await tx.purchaseOrderItem.deleteMany({
            where: { purchaseOrderId: id },
          });
        }

        // Update purchase order
        const updatedPO = await tx.purchaseOrder.update({
          where: { id },
          data: {
            ...updateData,
            subtotal,
            tax,
            discount,
            total,
            updatedBy: userId,
            ...(items && {
              items: {
                create: items.map((item) => ({
                  itemId: item.itemId,
                  quantity: item.quantity,
                  unitCost: item.unitCost,
                  subtotal: item.quantity * item.unitCost,
                  notes: item.notes,
                })),
              },
            }),
          },
          include: {
            supplier: true,
            items: {
              include: {
                item: true,
              },
            },
          },
        });

        return updatedPO;
      });
    }),

  // Update status (submit order, mark as ordered, cancel)
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["PENDING", "ORDERED", "CANCELLED"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { id, status } = input;

      // Get current purchase order
      const existingPO = await ctx.db.purchaseOrder.findUnique({
        where: { id },
      });

      if (!existingPO) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Purchase order not found",
        });
      }

      // Validate status transition
      const currentStatus = existingPO.status;

      // Cannot change status if RECEIVED or PARTIALLY_RECEIVED
      if (["RECEIVED", "PARTIALLY_RECEIVED"].includes(currentStatus)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot change status from ${currentStatus}`,
        });
      }

      // Validate allowed transitions
      const validTransitions: Record<string, string[]> = {
        DRAFT: ["PENDING", "CANCELLED"],
        PENDING: ["ORDERED", "CANCELLED"],
        ORDERED: [], // Cannot change from ORDERED using this endpoint
        CANCELLED: [], // Cannot change from CANCELLED
      };

      if (!validTransitions[currentStatus]?.includes(status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot transition from ${currentStatus} to ${status}`,
        });
      }

      // Update the status
      return ctx.db.purchaseOrder.update({
        where: { id },
        data: {
          status,
          updatedBy: userId,
          ...(status === "ORDERED" && { orderDate: new Date() }),
        },
        include: {
          supplier: true,
          items: {
            include: {
              item: true,
            },
          },
        },
      });
    }),

  // Receive items from purchase order
  receiveItems: protectedProcedure
    .input(
      z.object({
        id: z.string(), // PurchaseOrder id
        items: z.array(
          z.object({
            itemId: z.string(), // PurchaseOrderItem id
            receivedQuantity: z.number().nonnegative(),
            notes: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { id, items } = input;

      return ctx.db.$transaction(async (tx) => {
        // 1. Verify PO status is ORDERED or PARTIALLY_RECEIVED
        const purchaseOrder = await tx.purchaseOrder.findUnique({
          where: { id },
          include: {
            items: {
              include: {
                item: true,
              },
            },
          },
        });

        if (!purchaseOrder) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Purchase order not found",
          });
        }

        if (!["ORDERED", "PARTIALLY_RECEIVED"].includes(purchaseOrder.status)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot receive items for purchase order with status: ${purchaseOrder.status}`,
          });
        }

        // 2. Process each item
        let allFullyReceived = true;
        let anyReceived = false;

        for (const receiveItem of items) {
          // Find the PurchaseOrderItem
          const poItem = purchaseOrder.items.find(
            (item) => item.id === receiveItem.itemId
          );

          if (!poItem) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Purchase order item ${receiveItem.itemId} not found`,
            });
          }

          // Skip if no quantity to receive
          if (receiveItem.receivedQuantity <= 0) {
            if (poItem.receivedQuantity < poItem.quantity) {
              allFullyReceived = false;
            }
            continue;
          }

          anyReceived = true;

          // Calculate new received quantity
          const newReceivedQuantity =
            poItem.receivedQuantity + receiveItem.receivedQuantity;

          // Validate not over-receiving
          if (newReceivedQuantity > poItem.quantity) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Cannot receive more than ordered quantity for item ${poItem.item.name}. Ordered: ${poItem.quantity}, Already received: ${poItem.receivedQuantity}, Trying to receive: ${receiveItem.receivedQuantity}`,
            });
          }

          // Determine item status
          let itemStatus: "PENDING" | "PARTIALLY_RECEIVED" | "RECEIVED" = "PENDING";
          if (newReceivedQuantity >= poItem.quantity) {
            itemStatus = "RECEIVED";
          } else if (newReceivedQuantity > 0) {
            itemStatus = "PARTIALLY_RECEIVED";
            allFullyReceived = false;
          } else {
            allFullyReceived = false;
          }

          // a. Update PurchaseOrderItem.receivedQuantity and status
          await tx.purchaseOrderItem.update({
            where: { id: poItem.id },
            data: {
              receivedQuantity: newReceivedQuantity,
              status: itemStatus,
              notes: receiveItem.notes ?? poItem.notes,
            },
          });

          // b. Get current POSItem stock
          const posItem = await tx.pOSItem.findUnique({
            where: { id: poItem.itemId },
          });

          if (!posItem) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `POS Item ${poItem.itemId} not found`,
            });
          }

          const quantityBefore = posItem.stock;
          const quantityAfter = quantityBefore + receiveItem.receivedQuantity;

          // c. Update POSItem.stock (increment)
          await tx.pOSItem.update({
            where: { id: poItem.itemId },
            data: {
              stock: quantityAfter,
            },
          });

          // d. Create InventoryTransaction (type: PURCHASE_RECEIVE)
          await tx.inventoryTransaction.create({
            data: {
              itemId: poItem.itemId,
              type: "PURCHASE_RECEIVE",
              quantity: receiveItem.receivedQuantity,
              quantityBefore,
              quantityAfter,
              referenceType: "PurchaseOrder",
              referenceId: id,
              reason: `Received from PO ${purchaseOrder.orderNumber}`,
              note: receiveItem.notes,
              userId,
            },
          });
        }

        // Check remaining items that weren't in the receive request
        for (const poItem of purchaseOrder.items) {
          const wasProcessed = items.some((i) => i.itemId === poItem.id);
          if (!wasProcessed && poItem.receivedQuantity < poItem.quantity) {
            allFullyReceived = false;
          }
        }

        // 3. Update PO status (PARTIALLY_RECEIVED or RECEIVED)
        let newStatus = purchaseOrder.status;
        if (anyReceived) {
          if (allFullyReceived) {
            newStatus = "RECEIVED";
          } else {
            newStatus = "PARTIALLY_RECEIVED";
          }
        }

        // 4. If fully received, set receivedDate
        const updatedPO = await tx.purchaseOrder.update({
          where: { id },
          data: {
            status: newStatus,
            updatedBy: userId,
            ...(newStatus === "RECEIVED" && { receivedDate: new Date() }),
          },
          include: {
            supplier: true,
            items: {
              include: {
                item: true,
              },
            },
          },
        });

        return updatedPO;
      });
    }),

  // Delete purchase order (only DRAFT status)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id } = input;

      // Check if purchase order exists and status allows deletion
      const existingPO = await ctx.db.purchaseOrder.findUnique({
        where: { id },
      });

      if (!existingPO) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Purchase order not found",
        });
      }

      if (existingPO.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete purchase order with status: ${existingPO.status}. Only DRAFT orders can be deleted.`,
        });
      }

      // Delete PO (cascade will delete items due to onDelete: Cascade)
      return ctx.db.purchaseOrder.delete({
        where: { id },
      });
    }),

  // Get dashboard stats
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const [draft, pending, ordered, partiallyReceived] = await Promise.all([
      ctx.db.purchaseOrder.count({ where: { status: "DRAFT" } }),
      ctx.db.purchaseOrder.count({ where: { status: "PENDING" } }),
      ctx.db.purchaseOrder.count({ where: { status: "ORDERED" } }),
      ctx.db.purchaseOrder.count({ where: { status: "PARTIALLY_RECEIVED" } }),
    ]);

    return {
      draft,
      pending,
      ordered,
      partiallyReceived,
    };
  }),

  // Generate next order number (for preview)
  getNextOrderNumber: protectedProcedure.query(async ({ ctx }) => {
    return generateOrderNumber(ctx.db);
  }),

  // Get purchase order report data
  getReportData: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate } = input;

      // Build date filter
      const dateFilter = startDate && endDate
        ? {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }
        : {};

      // Get all purchase orders in the period
      const purchaseOrders = await ctx.db.purchaseOrder.findMany({
        where: dateFilter,
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
            },
          },
          items: {
            include: {
              item: {
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

      // Calculate summary statistics
      let totalPOs = purchaseOrders.length;
      let totalValue = 0;
      const statusCounts: Record<string, number> = {};
      const supplierStats = new Map<
        string,
        {
          supplierId: string;
          supplierName: string;
          totalPOs: number;
          totalValue: number;
          totalDeliveryDays: number;
          completedPOs: number;
        }
      >();
      const itemStats = new Map<
        string,
        {
          itemId: string;
          itemName: string;
          totalQuantity: number;
          totalValue: number;
        }
      >();

      for (const po of purchaseOrders) {
        totalValue += po.total;

        // Count by status
        statusCounts[po.status] = (statusCounts[po.status] ?? 0) + 1;

        // Aggregate by supplier
        if (po.supplierId && po.supplier) {
          if (!supplierStats.has(po.supplierId)) {
            supplierStats.set(po.supplierId, {
              supplierId: po.supplierId,
              supplierName: po.supplier.name,
              totalPOs: 0,
              totalValue: 0,
              totalDeliveryDays: 0,
              completedPOs: 0,
            });
          }

          const supplierData = supplierStats.get(po.supplierId)!;
          supplierData.totalPOs++;
          supplierData.totalValue += po.total;

          // Calculate delivery time if both dates are available
          if (po.orderDate && po.receivedDate) {
            const deliveryDays = Math.ceil(
              (po.receivedDate.getTime() - po.orderDate.getTime()) /
                (1000 * 60 * 60 * 24)
            );
            supplierData.totalDeliveryDays += deliveryDays;
            supplierData.completedPOs++;
          }
        }

        // Aggregate by item
        for (const poItem of po.items) {
          if (!itemStats.has(poItem.itemId)) {
            itemStats.set(poItem.itemId, {
              itemId: poItem.itemId,
              itemName: poItem.item.name,
              totalQuantity: 0,
              totalValue: 0,
            });
          }

          const itemData = itemStats.get(poItem.itemId)!;
          itemData.totalQuantity += poItem.quantity;
          itemData.totalValue += poItem.subtotal;
        }
      }

      // Calculate averages and prepare supplier data
      const supplierPerformance = Array.from(supplierStats.values())
        .map((s) => ({
          ...s,
          averageDeliveryDays:
            s.completedPOs > 0
              ? Math.round(s.totalDeliveryDays / s.completedPOs)
              : null,
        }))
        .sort((a, b) => b.totalValue - a.totalValue);

      // Top items ordered
      const topItems = Array.from(itemStats.values())
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 20);

      // Status breakdown for chart
      const statusBreakdown = Object.entries(statusCounts).map(
        ([status, count]) => ({
          status,
          count,
          percentage: totalPOs > 0 ? Math.round((count / totalPOs) * 100) : 0,
        })
      );

      return {
        summary: {
          totalPOs,
          totalValue,
          averageValue: totalPOs > 0 ? Math.round(totalValue / totalPOs) : 0,
          statusCounts,
        },
        supplierPerformance,
        topItems,
        statusBreakdown,
        purchaseOrders: purchaseOrders.slice(0, 100), // Limit for display
      };
    }),
});