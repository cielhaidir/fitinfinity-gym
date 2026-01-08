import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { toGMT8StartOfDay, toGMT8EndOfDay } from "@/lib/timezone";

// Cash bank report input schema
const cashBankReportInputSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  balanceAccountId: z.number().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(50),
  sortBy: z.enum(['date', 'debit', 'credit']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// Export schema - no pagination, higher limits
const cashBankExportInputSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  balanceAccountId: z.number().optional(),
  sortBy: z.enum(['date', 'debit', 'credit']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// TypeScript interfaces for cash bank report data
export interface CashBankReportItem {
  referenceId: string;
  date: Date;
  type: 'Payment' | 'POS' | 'Transaction' | 'Initial Balance';
  description: string;
  debit: number;
  credit: number;
  balanceAccount: string | null;
  endingBalance?: number; // Running balance for filtered account
}

export interface CashBankReportSummary {
  totalCredits: number;
  totalDebits: number;
  netBalance: number;
  totalRecords: number;
}

export interface CashBankReportResponse {
  items: CashBankReportItem[];
  summary: CashBankReportSummary;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    total: number;
  };
}

export const cashBankReportRouter = createTRPCRouter({
  // Get balance accounts for filtering
  getBalanceAccounts: protectedProcedure.query(async ({ ctx }) => {
    const balanceAccounts = await ctx.db.balanceAccount.findMany({
      select: {
        id: true,
        name: true,
        account_number: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return balanceAccounts;
  }),
// Get cash bank report data
getCashBankReport: protectedProcedure
  .input(cashBankReportInputSchema)
  .query(async ({ ctx, input }): Promise<CashBankReportResponse> => {
    const { startDate, endDate, balanceAccountId, page, limit, sortBy, sortOrder } = input;
    const skip = (page - 1) * limit;

    // Convert dates to GMT+8
    const start = toGMT8StartOfDay(startDate);
    const end = toGMT8EndOfDay(endDate);

    // --- Fetch Payment Records (Credits)
    const paymentRecords = await ctx.db.payment.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        status: 'SUCCESS',
        deletedAt: null,
        subscription: {
          deletedAt: null
        },
        ...(balanceAccountId && {
          subscription: {
            member: {
              paymentValidations: { some: { balanceId: balanceAccountId } },
            },
          },
        }),
      },
      include: {
        subscription: {
          include: {
            package: { select: { name: true } },
            member: {
              include: {
                paymentValidations: {
                  include: { balanceAccount: { select: { name: true } } },
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // --- Fetch POS Sale Records (Credits)
    const posSaleRecords = await ctx.db.pOSSale.findMany({
      where: {
        saleDate: { gte: start, lte: end },
        ...(balanceAccountId && { balanceId: balanceAccountId }),
      },
      include: {
        balanceAccount: { select: { name: true } },
        items: { include: { item: { select: { name: true } } } },
      },
      orderBy: { saleDate: 'desc' },
    });

    // --- Fetch Transaction Records (Debits)
    const transactionRecords = await ctx.db.transaction.findMany({
      where: {
        transaction_date: { gte: start, lte: end },
        ...(balanceAccountId && { bank_id: balanceAccountId }),
      },
      include: { bank: { select: { name: true } } },
      orderBy: { transaction_date: 'desc' },
    });

    // --- Transform to unified format
    const allRecords: CashBankReportItem[] = [];

    paymentRecords.forEach((payment) => {
      const balanceAccount = payment.subscription?.member?.paymentValidations?.[0]?.balanceAccount?.name || null;
      allRecords.push({
        referenceId: payment.id,
        date: payment.createdAt,
        type: 'Payment',
        description: `Payment for ${payment.subscription?.package?.name || 'Unknown Package'}`,
        debit: payment.totalPayment,
        credit: 0,
        balanceAccount,
      });
    });

    posSaleRecords.forEach((sale) => {
      const itemNames = sale.items.map(i => i.item.name).join(', ');
      allRecords.push({
        referenceId: sale.saleNumber,
        date: sale.saleDate,
        type: 'POS',
        description: `POS Sale - ${itemNames || 'No items'}`,
        debit: sale.total,
        credit: 0,
        balanceAccount: sale.balanceAccount?.name || null,
      });
    });

    transactionRecords.forEach((tx) => {
      allRecords.push({
        referenceId: tx.transaction_number,
        date: tx.transaction_date,
        type: 'Transaction',
        description: tx.description,
        debit: tx.type === 'expenses' ? 0 : tx.amount,
        credit: tx.type === 'expenses' ? tx.amount : 0,
        balanceAccount: tx.bank.name,
      });
    });

    // --- Get initial balance if specific account selected
    let runningBalance = 0;
    if (balanceAccountId) {
      const balanceAccount = await ctx.db.balanceAccount.findUnique({ where: { id: balanceAccountId } });

      // Ambil lastBalance, jika kosong pakai initialBalance
      runningBalance = balanceAccount?.lastBalance == 0
        ? (balanceAccount?.initialBalance ?? 0)
        : (balanceAccount?.lastBalance ?? 0);

      console.log(`Initial balance for account ${balanceAccountId}: ${runningBalance}`);
      console.log('balance account:', balanceAccount);
    }

    // --- Sort records by date ascending for running balance calculation
    const recordsForBalance = [...allRecords].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // --- Hitung ending balance sesuai aturan: debit +, credit -
    recordsForBalance.forEach((record) => {
      if (record.credit !== 0) runningBalance -= record.credit;
      if (record.debit !== 0) runningBalance += record.debit;
      record.endingBalance = runningBalance;
    });

    console.log("Cash Bank Report Ending Balances:", recordsForBalance.map(r => ({
      credit: r.credit,
      debit: r.debit,
      endingBalance: r.endingBalance,
    })));

   
    // --- Sort back based on user preference
    const sortedRecords = recordsForBalance.sort((a, b) => {
      if (!sortBy) return new Date(b.date).getTime() - new Date(a.date).getTime();

      let cmp = 0;
      if (sortBy === 'date') cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      else if (sortBy === 'debit') cmp = a.debit - b.debit;
      else if (sortBy === 'credit') cmp = a.credit - b.credit;

      return sortOrder === 'desc' ? -cmp : cmp;
    });

    // --- Summary (exclude initial balance row)
    const summaryRecords = sortedRecords.filter(r => r.type !== 'Initial Balance');
    const totalCredits = summaryRecords.reduce((sum, r) => sum + r.credit, 0);
    const totalDebits = summaryRecords.reduce((sum, r) => sum + r.debit, 0);
    const netBalance = totalCredits - totalDebits;
    const totalRecords = sortedRecords.length;

    // --- Pagination
    const paginatedRecords = sortedRecords.slice(skip, skip + limit);

    return {
      items: paginatedRecords,
      summary: { totalCredits, totalDebits, netBalance, totalRecords },
      pagination: { page, limit, totalPages: Math.ceil(totalRecords / limit), total: totalRecords },
    };
  }),

  // Get cash bank report summary (for cards/overview)
  getCashBankSummary: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
      balanceAccountId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { startDate, endDate, balanceAccountId } = input;

      // Convert dates to GMT+8
      const start = toGMT8StartOfDay(startDate);
      const end = toGMT8EndOfDay(endDate);

      // Get successful payments total
      const paymentsTotal = await ctx.db.payment.aggregate({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
          status: 'SUCCESS',
          ...(balanceAccountId && {
            subscription: {
              member: {
                paymentValidations: {
                  some: {
                    balanceId: balanceAccountId,
                  },
                },
              },
            },
          }),
        },
        _sum: {
          totalPayment: true,
        },
        _count: true,
      });

      // Get POS sales total
      const posSalesTotal = await ctx.db.pOSSale.aggregate({
        where: {
          saleDate: {
            gte: start,
            lte: end,
          },
          ...(balanceAccountId && {
            balanceId: balanceAccountId,
          }),
        },
        _sum: {
          total: true,
        },
        _count: true,
      });

      // Get transactions total
      const transactionsTotal = await ctx.db.transaction.aggregate({
        where: {
          transaction_date: {
            gte: start,
            lte: end,
          },
          ...(balanceAccountId && {
            bank_id: balanceAccountId,
          }),
        },
        _sum: {
          amount: true,
        },
        _count: true,
      });

      const totalCredits = (paymentsTotal._sum.totalPayment || 0) + (posSalesTotal._sum.total || 0);
      const totalDebits = transactionsTotal._sum.amount || 0;
      const netBalance = totalCredits - totalDebits;
      const totalTransactions = paymentsTotal._count + posSalesTotal._count + transactionsTotal._count;

      return {
        totalCredits,
        totalDebits,
        netBalance,
        totalTransactions,
        paymentsCount: paymentsTotal._count,
        posSalesCount: posSalesTotal._count,
        transactionsCount: transactionsTotal._count,
      };
    }),

  // Check if a period is already closed
  isPeriodClosed: protectedProcedure
    .input(z.object({
      balanceAccountId: z.number(),
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ ctx, input }) => {
      const { balanceAccountId, startDate, endDate } = input;
      
      const existingClosing = await ctx.db.balanceAccountPeriodClosing.findFirst({
        where: {
          balanceAccountId,
          startDate: {
            lte: startDate,
          },
          endDate: {
            gte: endDate,
          },
        },
      });

      return {
        isClosed: !!existingClosing,
        closingData: existingClosing,
      };
    }),

  // Get period closing history
  getPeriodClosingHistory: protectedProcedure
    .input(z.object({
      balanceAccountId: z.number().optional(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const { balanceAccountId, page, limit } = input;
      const skip = (page - 1) * limit;

      const where = balanceAccountId ? { balanceAccountId } : {};

      const [closings, total] = await Promise.all([
        ctx.db.balanceAccountPeriodClosing.findMany({
          where,
          include: {
            balanceAccount: {
              select: {
                name: true,
                account_number: true,
              },
            },
          },
          orderBy: {
            closedAt: 'desc',
          },
          skip,
          take: limit,
        }),
        ctx.db.balanceAccountPeriodClosing.count({ where }),
      ]);

      return {
        items: closings,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          total,
        },
      };
    }),

  // Close a period
  closePeriod: protectedProcedure
    .input(z.object({
      balanceAccountId: z.number(),
      startDate: z.date(),
      endDate: z.date(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { balanceAccountId, startDate, endDate } = input;

      // Check if period is already closed
      const existingClosing = await ctx.db.balanceAccountPeriodClosing.findFirst({
        where: {
          balanceAccountId,
          startDate: {
            lte: endDate,
          },
          endDate: {
            gte: startDate,
          },
        },
      });

      if (existingClosing) {
        throw new Error('This period overlaps with an already closed period');
      }

      // Get initial balance from previous closing or account's initial balance
      const previousClosing = await ctx.db.balanceAccountPeriodClosing.findFirst({
        where: {
          balanceAccountId,
          endDate: {
            lt: startDate,
          },
        },
        orderBy: {
          endDate: 'desc',
        },
      });

      const balanceAccount = await ctx.db.balanceAccount.findUnique({
        where: { id: balanceAccountId },
      });

      if (!balanceAccount) {
        throw new Error('Balance account not found');
      }

      const initialBalance = previousClosing?.closingBalance || balanceAccount.initialBalance;

      // Convert dates to GMT+8 for calculations
      const start = toGMT8StartOfDay(startDate);
      const end = toGMT8EndOfDay(endDate);

      // Calculate period totals
      const paymentsTotal = await ctx.db.payment.aggregate({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
          status: 'SUCCESS',
          subscription: {
            member: {
              paymentValidations: {
                some: {
                  balanceId: balanceAccountId,
                },
              },
            },
          },
        },
        _sum: {
          totalPayment: true,
        },
      });

      const posSalesTotal = await ctx.db.pOSSale.aggregate({
        where: {
          saleDate: {
            gte: start,
            lte: end,
          },
          balanceId: balanceAccountId,
        },
        _sum: {
          total: true,
        },
      });

      const transactionsTotal = await ctx.db.transaction.aggregate({
        where: {
          transaction_date: {
            gte: start,
            lte: end,
          },
          bank_id: balanceAccountId,
        },
        _sum: {
          amount: true,
        },
      });

      const totalCredits = (paymentsTotal._sum.totalPayment || 0) + (posSalesTotal._sum.total || 0);
      const totalDebits = transactionsTotal._sum.amount || 0;
      const closingBalance = initialBalance + totalCredits - totalDebits;

      // Create period closing record
      const periodClosing = await ctx.db.balanceAccountPeriodClosing.create({
        data: {
          balanceAccountId,
          startDate,
          endDate,
          initialBalance,
          totalCredits,
          totalDebits,
          closingBalance,
          closedBy: ctx.session.user.id,
        },
        include: {
          balanceAccount: {
            select: {
              name: true,
              account_number: true,
            },
          },
        },
      });

      // Update balance account's last balance
      await ctx.db.balanceAccount.update({
        where: { id: balanceAccountId },
        data: { lastBalance: closingBalance },
      });

      return periodClosing;
    }),

  // Reopen a closed period (delete closing record)
  reopenPeriod: protectedProcedure
    .input(z.object({
      periodClosingId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { periodClosingId } = input;

      const periodClosing = await ctx.db.balanceAccountPeriodClosing.findUnique({
        where: { id: periodClosingId },
        include: {
          balanceAccount: true,
        },
      });

      if (!periodClosing) {
        throw new Error('Period closing not found');
      }

      // Check if there are newer closings that depend on this one
      const newerClosings = await ctx.db.balanceAccountPeriodClosing.findMany({
        where: {
          balanceAccountId: periodClosing.balanceAccountId,
          startDate: {
            gt: periodClosing.endDate,
          },
        },
      });

      if (newerClosings.length > 0) {
        throw new Error('Cannot reopen this period as there are newer closed periods that depend on it');
      }

      // Delete the closing record
      await ctx.db.balanceAccountPeriodClosing.delete({
        where: { id: periodClosingId },
      });

      // Recalculate the balance account's last balance
      const lastClosing = await ctx.db.balanceAccountPeriodClosing.findFirst({
        where: {
          balanceAccountId: periodClosing.balanceAccountId,
        },
        orderBy: {
          endDate: 'desc',
        },
      });

      const newLastBalance = lastClosing?.closingBalance || periodClosing.balanceAccount.initialBalance;

      await ctx.db.balanceAccount.update({
        where: { id: periodClosing.balanceAccountId },
        data: { lastBalance: newLastBalance },
      });

      return { success: true };
    }),

  // Get cash bank report data for export (no pagination)
  getCashBankReportForExport: protectedProcedure
    .input(cashBankExportInputSchema)
    .query(async ({ ctx, input }): Promise<CashBankReportResponse> => {
      const { startDate, endDate, balanceAccountId, sortBy, sortOrder } = input;

      // Convert dates to GMT+8
      const start = toGMT8StartOfDay(startDate);
      const end = toGMT8EndOfDay(endDate);

      // Get Payment records (Credits - successful payments only)
      const paymentRecords = await ctx.db.payment.findMany({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
                  deletedAt: null,
        subscription: {
          deletedAt: null
        },
          status: 'SUCCESS',
          ...(balanceAccountId && {
            subscription: {
              // We need to join through PaymentValidation to get balance account
              member: {
                paymentValidations: {
                  some: {
                    balanceId: balanceAccountId,
                  },
                },
              },
            },
          }),
        },
        include: {
          subscription: {
            include: {
              package: {
                select: {
                  name: true,
                },
              },
              member: {
                include: {
                  paymentValidations: {
                    include: {
                      balanceAccount: {
                        select: {
                          name: true,
                        },
                      },
                    },
                    orderBy: {
                      createdAt: 'desc',
                    },
                    take: 1,
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Get POS Sale records (Credits)
      const posSaleRecords = await ctx.db.pOSSale.findMany({
        where: {
          saleDate: {
            gte: start,
            lte: end,
          },
          ...(balanceAccountId && {
            balanceId: balanceAccountId,
          }),
        },
        include: {
          balanceAccount: {
            select: {
              name: true,
            },
          },
          items: {
            include: {
              item: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          saleDate: 'desc',
        },
      });

      // Get Transaction records (Debits)
      const transactionRecords = await ctx.db.transaction.findMany({
        where: {
          transaction_date: {
            gte: start,
            lte: end,
          },
          ...(balanceAccountId && {
            bank_id: balanceAccountId,
          }),
        },
        include: {
          bank: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          transaction_date: 'desc',
        },
      });

      // Transform data to unified format
      const allRecords: CashBankReportItem[] = [];

      // Add Payment records (Credits - money coming in)
      paymentRecords.forEach((payment) => {
        const balanceAccount = payment.subscription?.member?.paymentValidations?.[0]?.balanceAccount?.name || null;
        allRecords.push({
          referenceId: payment.id,
          date: payment.createdAt,
          type: 'Payment',
          description: `Payment for ${payment.subscription?.package?.name || 'Unknown Package'}`,
          debit: 0,
          credit: payment.totalPayment,
          balanceAccount,
        });
      });

      // Add POS Sale records (Credits - money coming in)
      posSaleRecords.forEach((sale) => {
        const itemNames = sale.items.map(item => item.item.name).join(', ');
        allRecords.push({
          referenceId: sale.saleNumber,
          date: sale.saleDate,
          type: 'POS',
          description: `POS Sale - ${itemNames || 'No items'}`,
          debit: 0,
          credit: sale.total,
          balanceAccount: sale.balanceAccount?.name || null,
        });
      });

      // Add Transaction records (Debits - money going out)
      transactionRecords.forEach((transaction) => {
        allRecords.push({
          referenceId: transaction.transaction_number,
          date: transaction.transaction_date,
          type: 'Transaction',
          description: transaction.description,
          debit: transaction.amount,
          credit: 0,
          balanceAccount: transaction.bank.name,
        });
      });

      // Apply sorting if specified
      const sortedRecords = allRecords.sort((a, b) => {
        if (!sortBy) return new Date(b.date).getTime() - new Date(a.date).getTime(); // Default sort by date desc

        let comparison = 0;
        if (sortBy === 'date') {
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        } else if (sortBy === 'debit') {
          comparison = a.debit - b.debit;
        } else if (sortBy === 'credit') {
          comparison = a.credit - b.credit;
        }

        return sortOrder === 'desc' ? -comparison : comparison;
      });

      // Add initial balance and calculate running balance if specific account is selected
      let recordsWithBalance = [...sortedRecords];
      if (balanceAccountId) {
        // Get initial balance for the account
        const balanceAccount = await ctx.db.balanceAccount.findUnique({
          where: { id: balanceAccountId },
        });

        // Get the most recent closing balance before the start date
        const previousClosing = await ctx.db.balanceAccountPeriodClosing.findFirst({
          where: {
            balanceAccountId,
            endDate: {
              lt: startDate,
            },
          },
          orderBy: {
            endDate: 'desc',
          },
        });

        const initialBalance = previousClosing?.closingBalance || balanceAccount?.initialBalance || 0;

        // Sort records by date (oldest first) for balance calculation
        const recordsForBalance = [...sortedRecords].sort((a, b) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        // Calculate running balance for all records based on date order
        let runningBalance = initialBalance;
        recordsForBalance.forEach((record) => {
          // Credit increases balance (money coming in), debit decreases balance (money going out)
          runningBalance = runningBalance + record.credit - record.debit;
          record.endingBalance = runningBalance;
        });

        // Add initial balance row if there are transactions
        if (recordsForBalance.length > 0) {
          const initialBalanceRow: CashBankReportItem = {
            referenceId: 'INITIAL_BALANCE',
            date: startDate,
            type: 'Initial Balance',
            description: 'Opening Balance',
            debit: 0,
            credit: 0,
            balanceAccount: balanceAccount?.name || null,
            endingBalance: initialBalance,
          };

          recordsForBalance.unshift(initialBalanceRow);
        }

        // Sort back to user's preferred order for display
        recordsWithBalance = recordsForBalance.sort((a, b) => {
          if (!sortBy) return new Date(b.date).getTime() - new Date(a.date).getTime();

          let comparison = 0;
          if (sortBy === 'date') {
            comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          } else if (sortBy === 'debit') {
            comparison = a.debit - b.debit;
          } else if (sortBy === 'credit') {
            comparison = a.credit - b.credit;
          }

          return sortOrder === 'desc' ? -comparison : comparison;
        });
      }

      // Calculate summary (excluding initial balance row)
      const summaryRecords = recordsWithBalance.filter(r => r.type !== 'Initial Balance');
      const totalCredits = summaryRecords.reduce((sum, record) => sum + record.credit, 0);
      const totalDebits = summaryRecords.reduce((sum, record) => sum + record.debit, 0);
      const netBalance = totalCredits - totalDebits;
      const totalRecords = recordsWithBalance.length;

      return {
        items: recordsWithBalance,
        summary: {
          totalCredits,
          totalDebits,
          netBalance,
          totalRecords,
        },
        pagination: {
          page: 1,
          limit: totalRecords,
          totalPages: 1,
          total: totalRecords,
        },
      };
    }),
});