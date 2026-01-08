import { z } from "zod";
import {
  createTRPCRouter,
  permissionProtectedProcedure,
} from "@/server/api/trpc";
import { PaymentStatus } from "@prisma/client";

export const financeRouter = createTRPCRouter({
  getFinanceMetrics: permissionProtectedProcedure(["list:payment"])
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate } = input;
      
      // Default to last 30 days if no dates provided
      const now = new Date();
      const defaultStart = new Date();
      defaultStart.setDate(now.getDate() - 30);
      
      const start = startDate || defaultStart;
      const end = endDate || now;

      // 1. Total Membership Sales (from subscription.payment.totalAmount where payment status = SUCCESS)
      const membershipSales = await ctx.db.payment.findMany({
        where: {
          status: PaymentStatus.SUCCESS,
          createdAt: {
            gte: start,
            lte: end,
          },
                  deletedAt: null,
        subscription: {
          deletedAt: null
        },
        },
        include: {
          subscription: {
            include: {
              package: true,
            },
          },
        },
      });

      const totalMembershipSales = membershipSales.reduce(
        (sum, payment) => sum + payment.totalPayment,
        0
      );

      // 2. Total Expenses (from Transaction table)
      const transactions = await ctx.db.transaction.findMany({
        where: {
          transaction_date: {
            gte: start,
            lte: end,
          },
          // Assuming expenses are transactions with specific account types
          // You might need to adjust this based on your chart of accounts structure
          account: {
            flow: "outcome", // Expenses typically have "outcome" flow
          },
        },
        include: {
          account: true,
        },
      });

      const totalExpenses = transactions.reduce(
        (sum, transaction) => sum + transaction.amount,
        0
      );

      // 3. Total POS Sales (from POSSale table)
      const posSales = await ctx.db.pOSSale.findMany({
        where: {
          saleDate: {
            gte: start,
            lte: end,
          },
        },
      });

      const totalPosSales = posSales.reduce(
        (sum, sale) => sum + sale.total,
        0
      );

      return {
        membershipSales: {
          total: totalMembershipSales,
          count: membershipSales.length,
          transactions: membershipSales,
        },
        expenses: {
          total: totalExpenses,
          count: transactions.length,
          transactions: transactions,
        },
        posSales: {
          total: totalPosSales,
          count: posSales.length,
          sales: posSales,
        },
        dateRange: {
          startDate: start,
          endDate: end,
        },
      };
    }),

  getMembershipSales: permissionProtectedProcedure(["list:payment"])
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate } = input;
      
      const now = new Date();
      const defaultStart = new Date();
      defaultStart.setDate(now.getDate() - 30);
      
      const start = startDate || defaultStart;
      const end = endDate || now;

      const membershipSales = await ctx.db.payment.findMany({
        where: {
          status: PaymentStatus.SUCCESS,
          createdAt: {
            gte: start,
            lte: end,
          },
                  deletedAt: null,
        subscription: {
          deletedAt: null
        },
        },
        include: {
          subscription: {
            include: {
              package: true,
              member: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const total = membershipSales.reduce(
        (sum, payment) => sum + payment.totalPayment,
        0
      );

      return {
        total,
        count: membershipSales.length,
        payments: membershipSales,
      };
    }),

  getExpenses: permissionProtectedProcedure(["list:transaction"])
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate } = input;
      
      const now = new Date();
      const defaultStart = new Date();
      defaultStart.setDate(now.getDate() - 30);
      
      const start = startDate || defaultStart;
      const end = endDate || now;

      const expenses = await ctx.db.transaction.findMany({
        where: {
          transaction_date: {
            gte: start,
            lte: end,
          },
          account: {
            flow: "outcome",
          },
        },
        include: {
          account: true,
          bank: true,
        },
        orderBy: {
          transaction_date: "desc",
        },
      });

      const total = expenses.reduce(
        (sum, transaction) => sum + transaction.amount,
        0
      );

      return {
        total,
        count: expenses.length,
        transactions: expenses,
      };
    }),

  getPosSales: permissionProtectedProcedure(["list:pos-sale"])
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate } = input;
      
      const now = new Date();
      const defaultStart = new Date();
      defaultStart.setDate(now.getDate() - 30);
      
      const start = startDate || defaultStart;
      const end = endDate || now;

      const posSales = await ctx.db.pOSSale.findMany({
        where: {
          saleDate: {
            gte: start,
            lte: end,
          },
        },
        include: {
          cashier: {
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
        orderBy: {
          saleDate: "desc",
        },
      });

      const total = posSales.reduce(
        (sum, sale) => sum + sale.total,
        0
      );

      return {
        total,
        count: posSales.length,
        sales: posSales,
      };
    }),
});