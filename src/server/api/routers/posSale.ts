import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, permissionProtectedProcedure } from "@/server/api/trpc";

export const posSaleRouter = createTRPCRouter({
  list: permissionProtectedProcedure(["list:pos-sale"])
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        cashierId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, search, dateFrom, dateTo, cashierId } = input;
      const skip = (page - 1) * limit;

      const where = {
        ...(search && {
          OR: [
            { saleNumber: { contains: search, mode: "insensitive" as const } },
            { notes: { contains: search, mode: "insensitive" as const } },
          ],
        }),
        ...(dateFrom && dateTo && {
          saleDate: {
            gte: dateFrom,
            lte: dateTo,
          },
        }),
        ...(cashierId && {
          cashierId: cashierId,
        }),
      };

      const [items, total] = await Promise.all([
        ctx.db.pOSSale.findMany({
          where,
          skip,
          take: limit,
          orderBy: { saleDate: "desc" },
          include: {
            cashier: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            balanceAccount: true,
            items: {
              include: {
                item: {
                  include: {
                    category: true,
                  },
                },
              },
            },
          },
        }),
        ctx.db.pOSSale.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }),

  getById: permissionProtectedProcedure(["show:pos-sale"])
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.pOSSale.findUnique({
        where: { id: input.id },
        include: {
          cashier: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          balanceAccount: true,
          items: {
            include: {
              item: {
                include: {
                  category: true,
                },
              },
            },
          },
        },
      });
    }),

  create: permissionProtectedProcedure(["create:pos-sale"])
  .input(
    z.object({
      items: z.array(
        z.object({
          itemId: z.string(),
          quantity: z.number().int().min(1),
          price: z.number().min(0),
        })
      ),
      subtotal: z.number().min(0),
      tax: z.number().min(0).default(0),
      discount: z.number().min(0).default(0),
      total: z.number().min(0),
      amountPaid: z.number().min(0),
      paymentMethod: z.string(),
      balanceId: z.number().optional(),
      notes: z.string().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { items, ...saleData } = input;
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]?.replace(/-/g, '') || '';
    const change = saleData.amountPaid - saleData.total;

    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      try {
        return await ctx.db.$transaction(async (tx) => {
          // Validate stock availability for all items first
          const itemsWithStock: Array<{
            itemId: string;
            quantity: number;
            price: number;
            currentShowcaseStock: number;
            name: string;
          }> = [];

          for (const item of items) {
            const posItem = await tx.pOSItem.findUnique({
              where: { id: item.itemId },
              select: { id: true, name: true, showcaseStock: true },
            });

            if (!posItem) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: `Item not found: ${item.itemId}`,
              });
            }

            if (posItem.showcaseStock < item.quantity) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Insufficient showcase stock for "${posItem.name}". Available: ${posItem.showcaseStock}, Requested: ${item.quantity}`,
              });
            }

            itemsWithStock.push({
              itemId: item.itemId,
              quantity: item.quantity,
              price: item.price,
              currentShowcaseStock: posItem.showcaseStock,
              name: posItem.name,
            });
          }

          // Hitung jumlah sale hari ini
          const count = await tx.pOSSale.count({
            where: {
              saleDate: {
                gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
                lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
              },
            },
          });

          // Generate saleNumber
          let saleNumber = `POS${dateStr}${String(count + 1).padStart(4, '0')}`;

          // Jika bukan percobaan pertama, gunakan random number
          if (attempt > 0) {
            const randomNum = Math.floor(Math.random() * 10000);
            saleNumber = `POS${dateStr}${String(randomNum).padStart(4, '0')}`;
          }

          // Buat sale
          const sale = await tx.pOSSale.create({
            data: {
              saleNumber,
              ...saleData,
              change,
              cashierId: ctx.session.user.id,
            },
          });

          // Buat sale items, update stock & create inventory transactions
          for (const item of itemsWithStock) {
            await tx.pOSSaleItem.create({
              data: {
                saleId: sale.id,
                itemId: item.itemId,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.quantity * item.price,
              },
            });

            // Update showcase stock (and legacy stock field)
            await tx.pOSItem.update({
              where: { id: item.itemId },
              data: {
                showcaseStock: {
                  decrement: item.quantity,
                },
                stock: {
                  decrement: item.quantity,
                },
              },
            });

            // Create inventory transaction record for audit trail
            await tx.inventoryTransaction.create({
              data: {
                itemId: item.itemId,
                type: "SALE",
                quantity: -item.quantity, // Negative because stock decreases
                quantityBefore: item.currentShowcaseStock,
                quantityAfter: item.currentShowcaseStock - item.quantity,
                referenceType: "POSSale",
                referenceId: sale.id,
                stockType: "showcase",
                userId: ctx.session.user.id,
              },
            });
          }

          return sale;
        });
      } catch (e: any) {
        if (e.code === "P2002" && attempt < maxAttempts - 1) {
          // Duplicate saleNumber, retry with new transaction
          attempt++;
          continue;
        } else {
          throw e;
        }
      }
    }

    throw new Error("Failed to create sale with unique saleNumber after maximum attempts");
  }),


  getSalesReport: permissionProtectedProcedure(["list:pos-sale"])
    .input(
      z.object({
        dateFrom: z.date(),
        dateTo: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { dateFrom, dateTo } = input;

      const sales = await ctx.db.pOSSale.findMany({
        where: {
          saleDate: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
        include: {
          items: {
            include: {
              item: {
                include: {
                  category: true,
                },
              },
            },
          },
          cashier: {
            select: {
              name: true,
            },
          },
        },
      });

      const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
      const totalDiscount = sales.reduce((sum, sale) => sum + sale.discount, 0);
      const totalTax = sales.reduce((sum, sale) => sum + sale.tax, 0);

      // Group by payment method
      const paymentMethods = sales.reduce((acc, sale) => {
        acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + sale.total;
        return acc;
      }, {} as Record<string, number>);

      // Top selling items
      const itemSales = sales.flatMap(sale => sale.items);
      const topItems = itemSales.reduce((acc, saleItem) => {
        const key = saleItem.item.name;
        if (!acc[key]) {
          acc[key] = {
            name: saleItem.item.name,
            category: saleItem.item.category.name,
            quantity: 0,
            revenue: 0,
          };
        }
        acc[key].quantity += saleItem.quantity;
        acc[key].revenue += saleItem.subtotal;
        return acc;
      }, {} as Record<string, any>);

      return {
        summary: {
          totalSales,
          totalDiscount,
          totalTax,
          totalTransactions: sales.length,
        },
        paymentMethods,
        topItems: Object.values(topItems).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 10),
        sales,
      };
    }),

  update: permissionProtectedProcedure(["update:pos-sale"])
    .input(
      z.object({
        id: z.string(),
        items: z.array(
          z.object({
            itemId: z.string(),
            quantity: z.number().int().min(1),
            price: z.number().min(0),
          })
        ),
        subtotal: z.number().min(0),
        tax: z.number().min(0).default(0),
        discount: z.number().min(0).default(0),
        total: z.number().min(0),
        amountPaid: z.number().min(0),
        paymentMethod: z.string(),
        balanceId: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, items, ...saleData } = input;
      
      return ctx.db.$transaction(async (tx) => {
        // Get the existing sale to restore stock
        const existingSale = await tx.pOSSale.findUnique({
          where: { id },
          include: { items: true },
        });

        if (!existingSale) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Sale not found",
          });
        }

        // Restore stock for existing items and create SALE_VOID inventory transactions
        for (const existingItem of existingSale.items) {
          // Get current stock before restoration
          const posItem = await tx.pOSItem.findUnique({
            where: { id: existingItem.itemId },
            select: { showcaseStock: true },
          });

          const currentShowcaseStock = posItem?.showcaseStock ?? 0;

          await tx.pOSItem.update({
            where: { id: existingItem.itemId },
            data: {
              showcaseStock: {
                increment: existingItem.quantity,
              },
              stock: {
                increment: existingItem.quantity,
              },
            },
          });

          // Create inventory transaction for void/restoration
          await tx.inventoryTransaction.create({
            data: {
              itemId: existingItem.itemId,
              type: "SALE_VOID",
              quantity: existingItem.quantity, // Positive because stock increases
              quantityBefore: currentShowcaseStock,
              quantityAfter: currentShowcaseStock + existingItem.quantity,
              referenceType: "POSSale",
              referenceId: id,
              stockType: "showcase",
              reason: "Sale updated - restoring old quantities",
              userId: ctx.session.user.id,
            },
          });
        }

        // Validate stock availability for new items (after restoration)
        const itemsWithStock: Array<{
          itemId: string;
          quantity: number;
          price: number;
          currentShowcaseStock: number;
          name: string;
        }> = [];

        for (const item of items) {
          const posItem = await tx.pOSItem.findUnique({
            where: { id: item.itemId },
            select: { id: true, name: true, showcaseStock: true },
          });

          if (!posItem) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Item not found: ${item.itemId}`,
            });
          }

          if (posItem.showcaseStock < item.quantity) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Insufficient showcase stock for "${posItem.name}". Available: ${posItem.showcaseStock}, Requested: ${item.quantity}`,
            });
          }

          itemsWithStock.push({
            itemId: item.itemId,
            quantity: item.quantity,
            price: item.price,
            currentShowcaseStock: posItem.showcaseStock,
            name: posItem.name,
          });
        }

        // Delete existing sale items
        await tx.pOSSaleItem.deleteMany({
          where: { saleId: id },
        });

        // Calculate change
        const change = saleData.amountPaid - saleData.total;

        // Update the sale
        const updatedSale = await tx.pOSSale.update({
          where: { id },
          data: {
            ...saleData,
            change,
          },
        });

        // Create new sale items, update stock & create inventory transactions
        for (const item of itemsWithStock) {
          await tx.pOSSaleItem.create({
            data: {
              saleId: id,
              itemId: item.itemId,
              quantity: item.quantity,
              price: item.price,
              subtotal: item.quantity * item.price,
            },
          });

          // Update item showcase stock (and legacy stock field)
          await tx.pOSItem.update({
            where: { id: item.itemId },
            data: {
              showcaseStock: {
                decrement: item.quantity,
              },
              stock: {
                decrement: item.quantity,
              },
            },
          });

          // Create inventory transaction record for audit trail
          await tx.inventoryTransaction.create({
            data: {
              itemId: item.itemId,
              type: "SALE",
              quantity: -item.quantity, // Negative because stock decreases
              quantityBefore: item.currentShowcaseStock,
              quantityAfter: item.currentShowcaseStock - item.quantity,
              referenceType: "POSSale",
              referenceId: id,
              stockType: "showcase",
              userId: ctx.session.user.id,
            },
          });
        }

        return updatedSale;
      });
    }),

  delete: permissionProtectedProcedure(["delete:pos-sale"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        // Get sale items to restore stock
        const sale = await tx.pOSSale.findUnique({
          where: { id: input.id },
          include: { items: true },
        });

        if (!sale) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Sale not found",
          });
        }

        // Restore stock for each item and create inventory transactions
        for (const item of sale.items) {
          // Get current stock before restoration
          const posItem = await tx.pOSItem.findUnique({
            where: { id: item.itemId },
            select: { showcaseStock: true },
          });

          const currentShowcaseStock = posItem?.showcaseStock ?? 0;

          await tx.pOSItem.update({
            where: { id: item.itemId },
            data: {
              showcaseStock: {
                increment: item.quantity,
              },
              stock: {
                increment: item.quantity,
              },
            },
          });

          // Create inventory transaction for void/restoration
          await tx.inventoryTransaction.create({
            data: {
              itemId: item.itemId,
              type: "SALE_VOID",
              quantity: item.quantity, // Positive because stock increases
              quantityBefore: currentShowcaseStock,
              quantityAfter: currentShowcaseStock + item.quantity,
              referenceType: "POSSale",
              referenceId: input.id,
              stockType: "showcase",
              reason: "Sale deleted/voided",
              userId: ctx.session.user.id,
            },
          });
        }

        // Delete the sale (cascade will delete sale items)
        return tx.pOSSale.delete({
          where: { id: input.id },
        });
      });
    }),

  export: permissionProtectedProcedure(["list:pos-sale"])
    .input(
      z.object({
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        paymentMethod: z.string().optional(),
        cashierId: z.string().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { dateFrom, dateTo, paymentMethod, cashierId, search } = input;

      const where = {
        ...(search && {
          OR: [
            { saleNumber: { contains: search, mode: "insensitive" as const } },
            { notes: { contains: search, mode: "insensitive" as const } },
          ],
        }),
        ...(dateFrom && dateTo && {
          saleDate: {
            gte: dateFrom,
            lte: dateTo,
          },
        }),
        ...(paymentMethod && {
          paymentMethod: paymentMethod,
        }),
        ...(cashierId && {
          cashierId: cashierId,
        }),
      };

      const sales = await ctx.db.pOSSale.findMany({
        where,
        orderBy: { saleDate: "desc" },
        include: {
          cashier: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          balanceAccount: {
            select: {
              name: true,
            },
          },
          items: {
            include: {
              item: {
                include: {
                  category: true,
                },
              },
            },
          },
        },
      });

      // Transform data for Excel export
      const exportData = sales.flatMap(sale => 
        sale.items.map(item => ({
          saleNumber: sale.saleNumber,
          saleDate: sale.saleDate,
          cashier: sale.cashier?.name || "Unknown",
          paymentMethod: sale.paymentMethod,
          balanceAccount: sale.balanceAccount?.name || "N/A",
          itemName: item.item.name,
          itemCategory: item.item.category.name,
          quantity: item.quantity,
          unitPrice: item.price,
          itemSubtotal: item.subtotal,
          saleSubtotal: sale.subtotal,
          tax: sale.tax,
          discount: sale.discount,
          saleTotal: sale.total,
          amountPaid: sale.amountPaid,
          change: sale.change,
          notes: sale.notes || "",
        }))
      );

      return {
        data: exportData,
        summary: {
          totalSales: sales.reduce((sum, sale) => sum + sale.total, 0),
          totalTransactions: sales.length,
          totalItems: sales.reduce((sum, sale) => sum + sale.items.length, 0),
        },
      };
    }),
});