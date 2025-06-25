import { z } from "zod";
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
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, search, dateFrom, dateTo } = input;
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
      
      // Generate sale number
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0]?.replace(/-/g, '') || '';
      const count = await ctx.db.pOSSale.count({
        where: {
          saleDate: {
            gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
            lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
          },
        },
      });
      
      const saleNumber = `POS${dateStr}${String(count + 1).padStart(4, '0')}`;
      const change = saleData.amountPaid - saleData.total;

      return ctx.db.$transaction(async (tx) => {
        // Create the sale
        const sale = await tx.pOSSale.create({
          data: {
            saleNumber,
            ...saleData,
            change,
            cashierId: ctx.session.user.id,
          },
        });

        // Create sale items and update stock
        for (const item of items) {
          await tx.pOSSaleItem.create({
            data: {
              saleId: sale.id,
              itemId: item.itemId,
              quantity: item.quantity,
              price: item.price,
              subtotal: item.quantity * item.price,
            },
          });

          // Update item stock
          await tx.pOSItem.update({
            where: { id: item.itemId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
        }

        return sale;
      });
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
          throw new Error("Sale not found");
        }

        // Restore stock for existing items
        for (const existingItem of existingSale.items) {
          await tx.pOSItem.update({
            where: { id: existingItem.itemId },
            data: {
              stock: {
                increment: existingItem.quantity,
              },
            },
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

        // Create new sale items and update stock
        for (const item of items) {
          await tx.pOSSaleItem.create({
            data: {
              saleId: id,
              itemId: item.itemId,
              quantity: item.quantity,
              price: item.price,
              subtotal: item.quantity * item.price,
            },
          });

          // Update item stock
          await tx.pOSItem.update({
            where: { id: item.itemId },
            data: {
              stock: {
                decrement: item.quantity,
              },
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
          throw new Error("Sale not found");
        }

        // Restore stock for each item
        for (const item of sale.items) {
          await tx.pOSItem.update({
            where: { id: item.itemId },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });
        }

        // Delete the sale (cascade will delete sale items)
        return tx.pOSSale.delete({
          where: { id: input.id },
        });
      });
    }),
});