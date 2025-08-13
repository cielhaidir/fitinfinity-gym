import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { Prisma } from "@prisma/client";
import { subDays, startOfDay, endOfDay } from "date-fns";

// Sales report input schema
const salesReportInputSchema = z.object({
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  groupBy: z.enum(["day", "week", "month", "year"]).default("day"),
  paymentMethod: z.string().optional(),
  includePos: z.boolean().default(true),
  includeSubscriptions: z.boolean().default(true),
  salesId: z.string().optional(),
});

// Type definitions for sales data
interface SalesSummary {
  totalRevenue: number;
  totalTransactions: number;
  averageTransactionValue: number;
  posRevenue: number;
  subscriptionRevenue: number;
}

interface PaymentMethodBreakdown {
  method: string;
  count: number;
  amount: number;
}

interface DailyBreakdown {
  date: string;
  revenue: number;
  transactions: number;
}

interface TopSellingItem {
  name: string;
  quantity: number;
  revenue: number;
}

interface SalesReportResponse {
  summary: SalesSummary;
  paymentMethodBreakdown: PaymentMethodBreakdown[];
  dailyBreakdown: DailyBreakdown[];
  topSellingItems: TopSellingItem[];
  posSales: any[];
  subscriptionPayments: any[];
}

export const salesReportRouter = createTRPCRouter({
  getSalesList: protectedProcedure.query(async ({ ctx }) => {
    // Get unique sales persons from PaymentValidation records
    const uniqueSales = await ctx.db.subscription.findMany({
      where: {
        AND: [
          { salesId: { not: null } },
          { salesType: { not: null } },
        ],
      },
      select: {
        salesId: true,
        salesType: true,
      },
      distinct: ['salesId', 'salesType'],
    });

    // Get sales persons details based on salesType
    const salesList = [];
    
    for (const sale of uniqueSales) {
      if (sale.salesId && sale.salesType) {
        if (sale.salesType === 'FC') {
          const fc = await ctx.db.fC.findUnique({
            where: { id: sale.salesId },
            select: { id: true, user: { select: { name: true } } },
          });
          if (fc?.user?.name) {
            salesList.push({ id: fc.id, name: fc.user.name, type: 'FC' });
          }
        } else if (sale.salesType === 'PersonalTrainer') {
          const pt = await ctx.db.personalTrainer.findUnique({
            where: { id: sale.salesId },
            select: { id: true, user: { select: { name: true } } },
          });
          if (pt?.user?.name) {
            salesList.push({ id: pt.id, name: pt.user.name, type: 'PT' });
          }
        }
      }
    }

    return salesList;
  }),

getRevenueBySales: protectedProcedure
  .input(z.object({
    startDate: z.date(),
    endDate: z.date(),
    salesId: z.string().optional(),
  }))
  .query(async ({ ctx, input }) => {
    const { startDate, endDate, salesId } = input;

    // Ambil semua subscription yang punya payment di rentang waktu
    const allAcceptedPayments = await ctx.db.subscription.findMany({
     where: {
  isActive: true,
  salesId: salesId ? salesId : undefined,
  AND: [
    {
      OR: [
        { groupMembers: { none: {} } },
        { leadGroupSubscriptions: { some: {} } },
      ],
    },
    {
      payments: {
        some: {
          createdAt: {
            gte: startOfDay(startDate),
            lte: endOfDay(endDate),
          },
        },
      },
    },
  ],
},

      select: {
        id: true,
        salesId: true,
        salesType: true,
        member: {
          select: {
            user: { select: { name: true } }
          }
        },
        package: {
          select: {
            name: true,
            type: true
          }
        },
        payments: {
          where: {
            createdAt: {
              gte: startOfDay(startDate),
              lte: endOfDay(endDate),
            },
          },
          select: {
            totalPayment: true,
            createdAt: true,
          },
        },
      },
    });

    // Ambil semua salesId unik untuk query nama sales sekaligus
    const fcIds = [...new Set(allAcceptedPayments
      .filter(pv => pv.salesType === 'FC' && pv.salesId)
      .map(pv => pv.salesId!))];

    const ptIds = [...new Set(allAcceptedPayments
      .filter(pv => pv.salesType === 'PersonalTrainer' && pv.salesId)
      .map(pv => pv.salesId!))];

    const fcList = await ctx.db.fC.findMany({
      where: { id: { in: fcIds } },
      select: { id: true, user: { select: { name: true } } },
    });

    const ptList = await ctx.db.personalTrainer.findMany({
      where: { id: { in: ptIds } },
      select: { id: true, user: { select: { name: true } } },
    });

    const fcMap = new Map(fcList.map(fc => [fc.id, fc.user?.name || 'Unknown FC']));
    const ptMap = new Map(ptList.map(pt => [pt.id, pt.user?.name || 'Unknown PT']));

    // Hitung summary per sales
    const salesSummaryMap = new Map<string, { salesName: string; salesType: string; totalRevenue: number }>();

    for (const pv of allAcceptedPayments) {
      const totalPaymentForSub = pv.payments.reduce((sum, p) => sum + p.totalPayment, 0);

      if (pv.salesId && pv.salesType) {
        let salesName = '';
        if (pv.salesType === 'FC') {
          salesName = fcMap.get(pv.salesId) || 'Unknown FC';
        } else if (pv.salesType === 'PersonalTrainer') {
          salesName = ptMap.get(pv.salesId) || 'Unknown PT';
        }

        if (salesName) {
          const existing = salesSummaryMap.get(pv.salesId) || {
            salesName,
            salesType: pv.salesType === 'PersonalTrainer' ? 'PT' : pv.salesType,
            totalRevenue: 0,
          };
          existing.totalRevenue += totalPaymentForSub;
          salesSummaryMap.set(pv.salesId, existing);
        }
      }
    }

    // Filter by salesId jika diminta
    let finalPayments = allAcceptedPayments;
    if (salesId) {
      finalPayments = allAcceptedPayments.filter(pv => pv.salesId === salesId);
    }

    // Hitung totalRevenue dari semua subscription
    const totalRevenue = allAcceptedPayments.reduce(
      (acc, pv) => acc + pv.payments.reduce((sum, p) => sum + p.totalPayment, 0),
      0
    );

    const totalSubscriptions = allAcceptedPayments.length;

    return {
      summary: {
        totalRevenue,
        totalSubscriptions,
      },
      salesSummary: Array.from(salesSummaryMap.entries()).map(([salesId, data]) => ({
        salesId,
        ...data
      })),
      subscriptions: finalPayments,
    };
  }),

  // Get detailed sales report with filters
  getDetailedReport: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
      category: z.string().optional(),
      paymentMethod: z.string().optional(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const { startDate, endDate, category, paymentMethod, page, limit } = input;

      const skip = (page - 1) * limit;

      // Get POS sales with filtering
      const posSales = await ctx.db.pOSSale.findMany({
        where: {
          createdAt: {
            gte: startOfDay(startDate),
            lte: endOfDay(endDate),
          },
          ...(paymentMethod && { paymentMethod }),
          ...(category && {
            items: {
              some: {
                item: {
                  category: {
                    name: {
                      contains: category,
                      mode: 'insensitive',
                    },
                  },
                },
              },
            },
          }),
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
            select: { name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      });

      // Get subscription payments with filtering
      const subscriptionPayments = await ctx.db.payment.findMany({
        where: {
          createdAt: {
            gte: startOfDay(startDate),
            lte: endOfDay(endDate),
          },
          status: 'SUCCESS',
          ...(paymentMethod && { method: paymentMethod }),
        },
        include: {
          subscription: {
            include: {
              package: true,
              member: {
                include: {
                  user: {
                    select: { name: true, email: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      });

      // Get total counts for pagination
      const posTotal = await ctx.db.pOSSale.count({
        where: {
          createdAt: {
            gte: startOfDay(startDate),
            lte: endOfDay(endDate),
          },
          ...(paymentMethod && { paymentMethod }),
          ...(category && {
            items: {
              some: {
                item: {
                  category: {
                    name: {
                      contains: category,
                      mode: 'insensitive',
                    },
                  },
                },
              },
            },
          }),
        },
      });

      const subscriptionTotal = await ctx.db.payment.count({
        where: {
          createdAt: {
            gte: startOfDay(startDate),
            lte: endOfDay(endDate),
          },
          status: 'SUCCESS',
          ...(paymentMethod && { method: paymentMethod }),
        },
      });

      return {
        posSales: posSales.map((sale: any) => ({
          id: sale.id,
          saleNumber: sale.saleNumber,
          total: sale.total,
          paymentMethod: sale.paymentMethod,
          createdAt: sale.createdAt,
          cashier: sale.cashier?.name || 'Unknown',
          items: sale.items.map((item: any) => ({
            name: item.item.name,
            category: item.item.category?.name || 'Uncategorized',
            quantity: item.quantity,
            price: item.price,
            total: item.quantity * item.price,
          })),
        })),
        subscriptionPayments: subscriptionPayments.map((payment: any) => ({
          id: payment.id,
          total: payment.totalPayment || 0,
          method: payment.method,
          createdAt: payment.createdAt,
          packageName: payment.subscription?.package?.name || 'Unknown',
          memberName: payment.subscription?.member?.user?.name || 'Unknown',
          memberEmail: payment.subscription?.member?.user?.email || 'Unknown',
        })),
        pagination: {
          total: posTotal + subscriptionTotal,
          page,
          limit,
          totalPages: Math.ceil((posTotal + subscriptionTotal) / limit),
        },
      };
    }),

  // Get monthly summary for charting
  getMonthlySummary: protectedProcedure
    .input(z.object({
      year: z.number().min(2020).max(new Date().getFullYear()),
      includePos: z.boolean().default(true),
      includeSubscriptions: z.boolean().default(true),
    }))
    .query(async ({ ctx, input }) => {
      const { year, includePos, includeSubscriptions } = input;
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);

      const monthlyData = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        monthName: new Date(year, i, 1).toLocaleString('default', { month: 'short' }),
        revenue: 0,
        transactions: 0,
      }));

      if (includePos) {
        const posData = await ctx.db.pOSSale.findMany({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            total: true,
            createdAt: true,
          },
        });

        posData.forEach((sale: any) => {
          const month = sale.createdAt.getMonth();
          if (monthlyData[month]) {
            monthlyData[month].revenue += sale.total;
            monthlyData[month].transactions += 1;
          }
        });
      }

      if (includeSubscriptions) {
        const subscriptionData = await ctx.db.payment.findMany({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
            status: 'SUCCESS',
          },
          select: {
            totalPayment: true,
            createdAt: true,
          },
        });

        subscriptionData.forEach((payment: any) => {
          const month = payment.createdAt.getMonth();
          if (monthlyData[month]) {
            monthlyData[month].revenue += payment.totalPayment || 0;
            monthlyData[month].transactions += 1;
          }
        });
      }

      return monthlyData;
    }),

  // Get sales by category
  getSalesByCategory: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ ctx, input }) => {
      const { startDate, endDate } = input;

      // Get POS sales by category
      const categorySales = await ctx.db.pOSSale.findMany({
        where: {
          createdAt: {
            gte: startOfDay(startDate),
            lte: endOfDay(endDate),
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
        },
      });

      const categoryRevenue = new Map<string, number>();

      categorySales.forEach((sale: any) => {
        sale.items.forEach((item: any) => {
          const categoryName = item.item.category?.name || 'Uncategorized';
          const current = categoryRevenue.get(categoryName) || 0;
          categoryRevenue.set(categoryName, current + (item.quantity * item.price));
        });
      });

      // Get subscription revenue by package
      const subscriptionData = await ctx.db.payment.findMany({
        where: {
          createdAt: {
            gte: startOfDay(startDate),
            lte: endOfDay(endDate),
          },
          status: 'SUCCESS',
        },
        include: {
          subscription: {
            include: {
              package: true,
            },
          },
        },
      });

      const packageRevenue = new Map<string, number>();
      subscriptionData.forEach((payment: any) => {
        const packageName = payment.subscription?.package?.name || 'Subscription';
        const current = packageRevenue.get(packageName) || 0;
        packageRevenue.set(packageName, current + (payment.totalPayment || 0));
      });

      return {
        posCategories: Array.from(categoryRevenue.entries()).map(([name, revenue]) => ({
          name,
          revenue,
        })),
        packages: Array.from(packageRevenue.entries()).map(([name, revenue]) => ({
          name,
          revenue,
        })),
      };
    }),
});