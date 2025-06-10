// src/server/api/routers/payment.ts
import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";

import { TRPCError } from "@trpc/server";
// @ts-ignore
import midtransClient from "midtrans-client";
import { PaymentStatus, EmailType } from "@prisma/client"; // Import the correct enum types
import { emailService } from "@/lib/email/emailService";
import { format } from "date-fns";
import { siteConfig } from "@/lib/config/siteConfig";

export const paymentRouter = createTRPCRouter({
  createTransaction: publicProcedure
    .input(
      z.object({
        orderId: z.string(),
        amount: z.number(),
        customerName: z.string().optional(),
        customerEmail: z.string().optional(),
        itemDetails: z
          .array(
            z.object({
              id: z.string(),
              price: z.number(),
              quantity: z.number(),
              name: z.string(),
            }),
          )
          .optional(),
        callbackUrl: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
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
        customer_details: input.customerName
          ? {
              first_name: input.customerName,
              email: input.customerEmail,
            }
          : undefined,
        item_details: input.itemDetails,
        callbacks: input.callbackUrl
          ? {
              finish: input.callbackUrl,
            }
          : undefined,
      };

      try {
        const transaction = await snap.createTransaction(parameter);

        // Find existing payment record and update it with the token
        const payment = await ctx.db.payment.findFirst({
          where: { orderReference: input.orderId },
        });

        if (payment) {
          // Store token directly in the payment record
          await ctx.db.payment.update({
            where: { id: payment.id },
            data: {
              token: transaction.token,
              tokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
              gatewayResponse: {
                ...(typeof payment.gatewayResponse === "object" &&
                payment.gatewayResponse !== null
                  ? payment.gatewayResponse
                  : {}),
                redirect_url: transaction.redirect_url,
              },
            },
          });
        }

        return {
          token: transaction.token,
          redirect_url: transaction.redirect_url,
        };
      } catch (error) {
        console.error("Error creating transaction:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to create transaction",
        });
      }
    }),

  getByOrderReference: protectedProcedure
    .input(z.object({ orderReference: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const payment = await ctx.db.payment.findFirst({
        where: {
          orderReference: input.orderReference,
          // Only get tokens that haven't expired
          OR: [{ tokenExpiry: { gt: new Date() } }, { tokenExpiry: null }],
        },
      });

      if (!payment?.token) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment token not found or expired",
        });
      }

      // Return the token directly from the payment record
      return { token: payment.token };
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
          include: { subscription: true },
        });

        if (!payment) {
          throw new Error(`Payment with order reference ${orderId} not found`);
        }

        // Determine the payment status based on Midtrans response
        let status: PaymentStatus = "PENDING";
        let paidAt: Date | null = null;

        if (
          transactionStatus === "capture" ||
          transactionStatus === "settlement"
        ) {
          if (fraudStatus === "challenge") {
            status = "CHALLENGED";
          } else if (fraudStatus === "accept") {
            status = "SUCCESS";
            paidAt = new Date();
          }
        } else if (
          transactionStatus === "cancel" ||
          transactionStatus === "deny" ||
          transactionStatus === "expire"
        ) {
          status =
            transactionStatus === "cancel"
              ? "CANCELED"
              : transactionStatus === "deny"
                ? "FAILED"
                : "EXPIRED";
        } else if (transactionStatus === "pending") {
          status = "PENDING";
        } else if (transactionStatus === "refund") {
          status = "REFUNDED";
        }

        // Update payment record with status and response data
        const updatedPayment = await ctx.db.payment.update({
          where: { id: payment.id },
          data: {
            status,
            paidAt: status === "SUCCESS" ? new Date() : paidAt,
            gatewayResponse: statusResponse as any,
            updatedAt: new Date(),
          },
          include: { subscription: true },
        });

        // If payment is successful, activate the membership
        if (status === "SUCCESS" && payment.subscription) {
          // Find membership and package details
          const membership = await ctx.db.membership.findUnique({
            where: { id: payment.subscription.memberId },
            include: {
              user: true,
              personalTrainer: {
                include: { user: true },
              },
            },
          });

          const packageDetails = await ctx.db.package.findUnique({
            where: { id: payment.subscription.packageId },
          });

          if (!membership || !packageDetails) {
            throw new Error("Membership or package details not found");
          }

          // Update membership to active
          await ctx.db.membership.update({
            where: { id: membership.id },
            data: { isActive: true },
          });

          // Award points to the member's user account
          if (packageDetails.point > 0) {
            await ctx.db.user.update({
              where: { id: membership.userId },
              data: {
                point: { increment: packageDetails.point },
              },
            });
          }

          // Send payment receipt email
          const paymentTemplate = await ctx.db.emailTemplate.findFirst({
            where: { type: EmailType.PAYMENT_RECEIPT },
          });

          if (paymentTemplate) {
            await emailService.sendTemplateEmail({
              to: membership.user.email!,
              templateId: paymentTemplate.id,
              templateData: {
                memberName: membership.user.name,
                packageName: packageDetails.name,
                receiptNumber: payment.orderReference,
                totalAmount: payment.totalPayment,
                paymentStatus: PaymentStatus.SUCCESS,
                statusClass: PaymentStatus.SUCCESS.toLowerCase(),
                paymentDate: format(new Date(), "PPP"),
                paymentMethod: payment.method,
                duration: `${packageDetails.day ?? 0} days`,
                currency: "Rp",
                memberEmail: membership.user.email,
                portalUrl: siteConfig.portalUrl,
                supportEmail: siteConfig.supportEmail,
                supportPhone: siteConfig.supportPhone,
                logoUrl: siteConfig.logoUrl,
                currentYear: new Date().getFullYear(),
                address: siteConfig.address,
                // Conditional trainer data
                ...(membership.personalTrainer && {
                  personalTrainer: true,
                  trainerName: membership.personalTrainer.user.name,
                }),
                // Optional discount data if voucher was used
                ...(packageDetails.price > payment.totalPayment && {
                  subtotal: packageDetails.price,
                  discount: packageDetails.price - payment.totalPayment,
                }),
              },
            });
          }

          // Send membership confirmation email
          const membershipTemplate = await ctx.db.emailTemplate.findFirst({
            where: { type: EmailType.MEMBERSHIP_CONFIRMATION },
          });

          if (membershipTemplate) {
            await emailService.sendTemplateEmail({
              to: membership.user.email!,
              templateId: membershipTemplate.id,
              templateData: {
                memberName: membership.user.name,
                membershipId: membership.id,
                packageName: packageDetails.name,
                startDate: format(payment.subscription.startDate, "PPP"),
                endDate: payment.subscription.endDate
                  ? format(payment.subscription.endDate, "PPP")
                  : "N/A",
                personalTrainer: membership.personalTrainer ? true : false,
                trainerName: membership.personalTrainer?.user.name,
                memberEmail: membership.user.email,
                portalUrl: siteConfig.portalUrl,
                supportEmail: siteConfig.supportEmail,
                supportPhone: siteConfig.supportPhone,
                logoUrl: siteConfig.logoUrl,
                currentYear: new Date().getFullYear(),
                address: siteConfig.address,
                currency: "Rp",
                paymentMethod: payment.method,
                totalAmount: payment.totalPayment,
                // Include other standard fields that might be needed
                receiptNumber: payment.orderReference,
                paymentStatus: PaymentStatus.SUCCESS,
                statusClass: PaymentStatus.SUCCESS.toLowerCase(),
                paymentDate: format(new Date(), "PPP"),
              },
            });
          }
        }

        return {
          status: status.toLowerCase(),
          orderId,
          subscriptionId: payment.subscription.id,
        };
      } catch (error) {
        console.error("Notification error:", error);
        throw new Error("Failed to process payment notification");
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
        console.error("Status check error:", error);
        throw new Error("Failed to check payment status");
      }
    }),
});
