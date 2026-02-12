import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { Prisma } from "@prisma/client";
import { subDays } from "date-fns";
import { toGMT8StartOfDay, toGMT8EndOfDay } from "@/lib/timezone";

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
  gymMembershipRevenue: number;
  personalTrainerRevenue: number;
  groupTrainingRevenue: number;
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
               { deletedAt: null },
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

    // Get all subscriptions with payments in date range (convert to GMT+8)
    const allAcceptedPayments = await ctx.db.subscription.findMany({
     where: {
  deletedAt: null,
  ...(salesId && { salesId }),
  payments: {
    some: {
      status: 'SUCCESS',
      deletedAt: null,
      createdAt: {
        gte: toGMT8StartOfDay(startDate),
        lte: toGMT8EndOfDay(endDate),
      },
    },
  },
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
            status: 'SUCCESS',
            deletedAt: null,
            createdAt: {
              gte: toGMT8StartOfDay(startDate),
              lte: toGMT8EndOfDay(endDate),
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

      // Get POS sales with filtering (convert to GMT+8)
      const posSales = await ctx.db.pOSSale.findMany({
        where: {
          createdAt: {
            gte: toGMT8StartOfDay(startDate),
            lte: toGMT8EndOfDay(endDate),
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

      // Get subscription payments with filtering (convert to GMT+8)
      const subscriptionPayments = await ctx.db.payment.findMany({
        where: {
          createdAt: {
            gte: toGMT8StartOfDay(startDate),
            lte: toGMT8EndOfDay(endDate),
          },
          deletedAt: null,
          status: 'SUCCESS',
          ...(paymentMethod && { method: paymentMethod }),
                  subscription: {
              deletedAt: null
            }
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

      // Get total counts for pagination (convert to GMT+8)
      const posTotal = await ctx.db.pOSSale.count({
        where: {
          createdAt: {
            gte: toGMT8StartOfDay(startDate),
            lte: toGMT8EndOfDay(endDate),
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
            gte: toGMT8StartOfDay(startDate),
            lte: toGMT8EndOfDay(endDate),
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
      const startDate = toGMT8StartOfDay(new Date(year, 0, 1));
      const endDate = toGMT8EndOfDay(new Date(year, 11, 31));

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
            deletedAt: null,
            status: 'SUCCESS',
                    subscription: {
              deletedAt: null
            }
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

      // Get POS sales by category (convert to GMT+8)
      const categorySales = await ctx.db.pOSSale.findMany({
        where: {
          createdAt: {
            gte: toGMT8StartOfDay(startDate),
            lte: toGMT8EndOfDay(endDate),
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

      // Get subscription revenue by package (convert to GMT+8)
      const subscriptionData = await ctx.db.payment.findMany({
        where: {
          createdAt: {
            gte: toGMT8StartOfDay(startDate),
            lte: toGMT8EndOfDay(endDate),
          },
          deletedAt: null,
          status: 'SUCCESS',
                  subscription: {
              deletedAt: null
            }
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

     getSalesSummary: protectedProcedure
    .input(salesReportInputSchema)
    .query(async ({ ctx, input }) => {
      const { startDate, endDate, paymentMethod, includePos, includeSubscriptions } = input;

      // Default to last 30 days if no dates provided (convert to GMT+8)
      const start = startDate ? toGMT8StartOfDay(startDate) : toGMT8StartOfDay(subDays(new Date(), 30));
      const end = endDate ? toGMT8EndOfDay(endDate) : toGMT8EndOfDay(new Date());

      let posSales: any[] = [];
      let subscriptionPayments: any[] = [];
      let posTotal = 0;
      let subscriptionTotal = 0;

      // Get POS sales
      if (includePos) {
        posSales = await ctx.db.pOSSale.findMany({
          where: {
            createdAt: {
              gte: start,
              lte: end,
            },
            ...(paymentMethod && { paymentMethod }),
          },
          select: {
            id: true,
            saleNumber: true,
            total: true,
            paymentMethod: true,
            createdAt: true,
            saleDate: true,
            items: {
              select: {
                quantity: true,
                price: true,
                item: {
                  select: {
                    name: true,
                    category: {
                      select: { name: true }
                    }
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
        });
        posTotal = posSales.reduce((sum: number, sale: any) => sum + sale.total, 0);
      }

      // Get subscription payments
      if (includeSubscriptions) {
        subscriptionPayments = await ctx.db.payment.findMany({
          where: {
            deletedAt: null,
            createdAt: {
              gte: start,
              lte: end,
            },
            status: 'SUCCESS',
            ...(paymentMethod && { method: paymentMethod }),
            subscription: {
              deletedAt: null
            }
          },
          select: {
            id: true,
            totalPayment: true,
            method: true,
            createdAt: true,
            subscription: {
              select: {
                package: {
                  select: {
                    name: true,
                    type: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
        });
        subscriptionTotal = subscriptionPayments.reduce((sum: number, payment: any) => sum + (payment.totalPayment || 0), 0);
      }

      // Calculate totals by package type
      let gymMembershipRevenue = 0;
      let personalTrainerRevenue = 0;
      let groupTrainingRevenue = 0;

      subscriptionPayments.forEach((payment: any) => {
        const packageType = payment.subscription?.package?.type;
        const amount = payment.totalPayment || 0;
        
        if (packageType === 'GYM_MEMBERSHIP') {
          gymMembershipRevenue += amount;
        } else if (packageType === 'PERSONAL_TRAINER') {
          personalTrainerRevenue += amount;
        } else if (packageType === 'GROUP_TRAINING') {
          groupTrainingRevenue += amount;
        }
      });

      // Calculate totals
      const totalRevenue = posTotal + subscriptionTotal;
      const totalTransactions = posSales.length + subscriptionPayments.length;
      const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

      // Payment method breakdown
      const paymentMethodBreakdown: PaymentMethodBreakdown[] = [];
      const methodMap = new Map<string, { count: number; amount: number }>();

      // Process POS sales
      posSales.forEach((sale: any) => {
        const method = sale.paymentMethod || 'Unknown';
        const current = methodMap.get(method) || { count: 0, amount: 0 };
        methodMap.set(method, {
          count: current.count + 1,
          amount: current.amount + sale.total,
        });
      });

      // Process subscription payments
      subscriptionPayments.forEach((payment: any) => {
        const method = payment.method || 'Unknown';
        const current = methodMap.get(method) || { count: 0, amount: 0 };
        methodMap.set(method, {
          count: current.count + 1,
          amount: current.amount + (payment.totalPayment || 0),
        });
      });

      methodMap.forEach((data, method) => {
        paymentMethodBreakdown.push({ method, ...data });
      });

      // Daily breakdown
      const dailyBreakdown: DailyBreakdown[] = [];
      const dailyMap = new Map<string, { revenue: number; transactions: number }>();

      [...posSales, ...subscriptionPayments].forEach((record: any) => {
        const date = record.createdAt.toISOString().split('T')[0];
        const amount = 'total' in record ? record.total : (record.totalPayment || 0);
        const current = dailyMap.get(date) || { revenue: 0, transactions: 0 };
        dailyMap.set(date, {
          revenue: current.revenue + amount,
          transactions: current.transactions + 1,
        });
      });

      dailyMap.forEach((data, date) => {
        dailyBreakdown.push({ date, ...data });
      });
      dailyBreakdown.sort((a, b) => a.date.localeCompare(b.date));

      // Get top selling items
      const itemSales = new Map<string, { quantity: number; revenue: number }>();
      posSales.forEach((sale: any) => {
        sale.items.forEach((item: any) => {
          const name = item.item.name;
          const current = itemSales.get(name) || { quantity: 0, revenue: 0 };
          itemSales.set(name, {
            quantity: current.quantity + item.quantity,
            revenue: current.revenue + (item.quantity * item.price),
          });
        });
      });

      const topSellingItems: TopSellingItem[] = Array.from(itemSales.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      return {
        summary: {
          totalRevenue,
          totalTransactions,
          averageTransactionValue,
          posRevenue: posTotal,
          subscriptionRevenue: subscriptionTotal,
          gymMembershipRevenue,
          personalTrainerRevenue,
          groupTrainingRevenue,
        },
        paymentMethodBreakdown,
        dailyBreakdown,
        topSellingItems,
        posSales: posSales.map((sale: any) => ({
          id: sale.id,
          saleNumber: sale.saleNumber,
          total: sale.total,
          paymentMethod: sale.paymentMethod,
          createdAt: sale.createdAt,
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
        })),
      };
    }),

});