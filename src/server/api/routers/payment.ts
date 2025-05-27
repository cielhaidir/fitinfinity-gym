// src/server/api/routers/payment.ts
import { z } from "zod";
import {
    createTRPCRouter,
    protectedProcedure,
    publicProcedure
} from "@/server/api/trpc";

// @ts-ignore
import midtransClient from "midtrans-client";
import { PaymentStatus } from "@prisma/client";  // Import the correct enum type

export const paymentRouter = createTRPCRouter({
  createTransaction: publicProcedure
    .input(
      z.object({
        orderId: z.string(),
        amount: z.number(),
        customerName: z.string().optional(),
        customerEmail: z.string().optional(),
        itemDetails: z.array(z.object({
          id: z.string(),
          price: z.number(),
          quantity: z.number(),
          name: z.string(),
        })).optional(),
        callbackUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const snap = new midtransClient.Snap({
        isProduction: false, // true di production
        serverKey: process.env.MIDTRANS_SERVER_KEY,
      });

      const parameter = {
        transaction_details: {
          order_id: input.orderId,
          gross_amount: input.amount,
        },
        credit_card: {
          secure: true,
        },
        customer_details: input.customerName ? {
          first_name: input.customerName,
          email: input.customerEmail,
        } : undefined,
        item_details: input.itemDetails,
        callbacks: input.callbackUrl ? {
          finish: input.callbackUrl,
        } : undefined,
      };

      const transaction = await snap.createTransaction(parameter);
      return { token: transaction.token, redirect_url: transaction.redirect_url };
    }),

  handleNotification: publicProcedure
    .input(z.record(z.any()))
    .mutation(async ({ input, ctx }) => {
      const apiClient = new midtransClient.Snap({
        isProduction: false,
        serverKey: process.env.MIDTRANS_SERVER_KEY,
      });

      try {
        const statusResponse = await apiClient.transaction.notification(input);
        const orderId = statusResponse.order_id;
        const transactionStatus = statusResponse.transaction_status;
        const fraudStatus = statusResponse.fraud_status;

        // Find the payment by order reference
        const payment = await ctx.db.payment.findFirst({
          where: { orderReference: orderId },
          include: { subscription: true }
        });

        if (!payment) {
          throw new Error(`Payment with order reference ${orderId} not found`);
        }

        // Determine the payment status based on Midtrans response
        let status: PaymentStatus = "PENDING";
        let paidAt: Date | null = null;
        
        if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
          if (fraudStatus === 'challenge') {
            status = "CHALLENGED";
          } else if (fraudStatus === 'accept') {
            status = "SUCCESS";
            paidAt = new Date();
          }
        } else if (transactionStatus === 'cancel' || transactionStatus === 'deny' || transactionStatus === 'expire') {
          status = transactionStatus === 'cancel' ? "CANCELED" : 
                  transactionStatus === 'deny' ? "FAILED" : "EXPIRED";
        } else if (transactionStatus === 'pending') {
          status = "PENDING";
        } else if (transactionStatus === 'refund') {
          status = "REFUNDED";
        }

        // Update payment record with status and response data
        const updatedPayment = await ctx.db.payment.update({
          where: { id: payment.id },
          data: { 
            status, 
            paidAt: status === "SUCCESS" ? new Date() : paidAt,
            gatewayResponse: statusResponse as any,
            updatedAt: new Date()
          },
          include: { subscription: true }
        });

        // If payment is successful, activate the membership
        if (status === "SUCCESS" && payment.subscription) {
          // Update membership to active
          await ctx.db.membership.update({
            where: { id: payment.subscription.memberId },
            data: { isActive: true }
          });
          
          // Find the package details
          const packageDetails = await ctx.db.package.findUnique({
            where: { id: payment.subscription.packageId }
          });
          
          // Award points to the member's user account
          if (packageDetails && packageDetails.point > 0) {
            const membership = await ctx.db.membership.findUnique({
              where: { id: payment.subscription.memberId },
              select: { userId: true }
            });
            
            if (membership) {
              await ctx.db.user.update({
                where: { id: membership.userId },
                data: {
                  point: { increment: packageDetails.point }
                }
              });
            }
          }
        }

        return { 
          status: status.toLowerCase(), 
          orderId,
          subscriptionId: payment.subscription.id
        };
      } catch (error) {
        console.error('Notification error:', error);
        throw new Error('Failed to process payment notification');
      }
    }),

  checkStatus: publicProcedure
    .input(z.object({ orderId: z.string() }))
    .query(async ({ input }) => {
      const apiClient = new midtransClient.Snap({
        isProduction: false,
        serverKey: process.env.MIDTRANS_SERVER_KEY,
      });

      try {
        const status = await apiClient.transaction.status(input.orderId);
        return status;
      } catch (error) {
        console.error('Status check error:', error);
        throw new Error('Failed to check payment status');
      }
    }),
});
