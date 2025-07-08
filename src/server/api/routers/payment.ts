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
import { dokuPaymentService } from "@/lib/payment/doku";

export const paymentRouter = createTRPCRouter({
  createTransaction: protectedProcedure
    .input(
      z.object({
        orderId: z.string(),
        amount: z.number(),
        subscriptionId: z.string(),
        customerName: z.string().optional(),
        customerEmail: z.string().optional(),
        itemDetails: z
          .array(
            z.object({
              id: z.string(),
              price: z.number(),
              quantity: z.number(),
              name: z.string(),
              category: z.string().optional(),
              sku: z.string().optional(),
            }),
          )
          .optional(),
        callbackUrl: z.string().optional(),
        paymentGateway: z.enum(["midtrans", "doku", "shopee", "kredivo", "akulaku", "qr"]).default("midtrans"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if payment already exists, if not create it
        let payment = await ctx.db.payment.findFirst({
          where: { orderReference: input.orderId },
        });

        const user = await ctx.db.user.findUnique({
          where: { id: ctx.session.user.id },
        });

        if (!user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not found",
          });
        }

        if (!payment) {
          payment = await ctx.db.payment.create({
            data: {
              subscriptionId: input.subscriptionId,
              orderReference: input.orderId,
              method: input.paymentGateway,
              totalPayment: input.amount,
              status: "PENDING",
            },
          });
        }

        // Handle different payment gateways
        switch (input.paymentGateway) {
          case "midtrans": {
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

            const transaction = await snap.createTransaction(parameter);

            // Update payment record with token
            await ctx.db.payment.update({
              where: { id: payment.id },
              data: {
                token: transaction.token,
                tokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
                gatewayResponse: {
                  redirect_url: transaction.redirect_url,
                },
              },
            });

            return {
              token: transaction.token,
              redirect_url: transaction.redirect_url,
            };
          }

          case "shopee": {
            try {
              const response = await dokuPaymentService.createShopeePayment({
                amount: input.amount,
                orderId: input.orderId,
                callbackUrl: input.callbackUrl || `${process.env.NEXTAUTH_URL}/checkout/confirmation`,
              });

              // Update payment record with response
              await ctx.db.payment.update({
                where: { id: payment.id },
                data: {
                  gatewayResponse: response as any,
                },
              });

              return {
                redirect_url: response.webRedirectUrl,
              };
            } catch (error) {
              // Update payment status to failed
              await ctx.db.payment.update({
                where: { id: payment.id },
                data: { status: "FAILED" },
              });
              
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: error instanceof Error && (error.message.includes('Private key') || error.message.includes('private key') || error.message.includes('Invalid private key')) 
                  ? "ShopeePay is not available. Please contact administrator to configure the payment method or choose another option."
                  : `ShopeePay payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              });
            }
          }

          case "kredivo": {
            if (!input.customerName || !input.customerEmail) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Customer name and email are required for Kredivo",
              });
            }

            const response = await dokuPaymentService.createKredivoPayment({
              amount: input.amount,
              orderId: input.orderId,
              customerName: input.customerName,
              customerEmail: input.customerEmail,
              callbackUrl: input.callbackUrl || `${process.env.NEXTAUTH_URL}/checkout/confirmation`,
            });

            // Update payment record with response
            await ctx.db.payment.update({
              where: { id: payment.id },
              data: {
                gatewayResponse: response as any,
              },
            });

            return {
              redirect_url: response.webRedirectUrl,
            };
          }

          // case "akulaku": {
          //   if (!input.customerName || !input.customerEmail) {
          //     throw new TRPCError({
          //       code: "BAD_REQUEST",
          //       message: "Customer name and email are required for Akulaku",
          //     });
          //   }

          //   const response = await dokuPaymentService.createAkulakuPayment({
          //     amount: input.amount,
          //     orderId: input.orderId,
          //     customerName: input.customerName,
          //     customerEmail: input.customerEmail,
          //     callbackUrl: input.callbackUrl || `${process.env.NEXTAUTH_URL}/checkout/confirmation`,
          //   });

          //   // Update payment record with response
          //   await ctx.db.payment.update({
          //     where: { id: payment.id },
          //     data: {
          //       gatewayResponse: response as any,
          //     },
          //   });

          //   return {
          //     redirect_url: response.webRedirectUrl,
          //   };
          // }

          case "doku": {
            const response = await dokuPaymentService.createPayment({
              amount: input.amount,
              orderId: input.orderId,
              customerId: user.id,
              customerName: user.name || "",
              customerPhone: user.phone || "",
              callbackUrl: input.callbackUrl || `${process.env.NEXTAUTH_URL}/checkout/confirmation`,
              items: input.itemDetails,
            });

            console.log("Doku payment response:", response);

            // Update payment record with response
            await ctx.db.payment.update({
              where: { id: payment.id },
              data: {
                gatewayResponse: response as any,
                paymentUrl: response.payment.url,
              },
            });

            return {
              redirect_url: response.payment.url,
            };
          }


          case "qr": {
            // Validate required fields for QRIS
            if (
              !input.amount ||
              !input.orderId ||
              !input.callbackUrl
            ) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Amount, orderId, and callbackUrl are required for QRIS",
              });
            }

            // You may want to adjust these fields as needed for your business logic
            const qrisParams = {
              partnerReferenceNo: input.orderId,
              amount: { value: input.amount.toFixed(2), currency: "IDR" },
              // feeAmount: { value: "0.00", currency: "IDR" },
                feeAmount: { value: (input.amount * 0.007).toFixed(2), currency: "IDR" },
              merchantId: process.env.DOKU_CLIENT_ID || 0,
              terminalId: "k45",
              // validityPeriod: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min from now
              additionalInfo: { postalCode: 13120, feeType: 2 },
            };

            try {
              const response = await dokuPaymentService.createQrisPayment(qrisParams);
              console.log("QRIS payment response:", response);
              await ctx.db.payment.update({
                where: { id: payment.id },
                data: {
                  gatewayResponse: response as any,
                },
              });

              return {
                qrString: response.qrString,
                partnerReferenceNo: response.partnerReferenceNo,
                responseCode: response.responseCode,
                responseMessage: response.responseMessage,
              };
            } catch (error) {
              await ctx.db.payment.update({
                where: { id: payment.id },
                data: { status: "FAILED" },
              });

              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message:
                  error instanceof Error
                    ? `QRIS payment failed: ${error.message}`
                    : "QRIS payment failed",
              });
            }
          }

          default:
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Unsupported payment gateway",
            });
        }
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

  // handleNotification: publicProcedure
  //   .input(z.record(z.any()))
  //   .mutation(async ({ input, ctx }) => {
  //     const apiClient = new midtransClient.Snap({
  //       isProduction: false,
  //       serverKey: process.env.MIDTRANS_SERVER_KEY,
  //     });

  //     try {
  //       const statusResponse = await apiClient.transaction.notification(input);
  //       const orderId = statusResponse.order_id;
  //       const transactionStatus = statusResponse.transaction_status;
  //       const fraudStatus = statusResponse.fraud_status;

  //       // Find the payment by order reference
  //       const payment = await ctx.db.payment.findFirst({
  //         where: { orderReference: orderId },
  //         include: { subscription: true },
  //       });

  //       if (!payment) {
  //         throw new Error(`Payment with order reference ${orderId} not found`);
  //       }

  //       // Determine the payment status based on Midtrans response
  //       let status: PaymentStatus = "PENDING";
  //       let paidAt: Date | null = null;

  //       if (
  //         transactionStatus === "capture" ||
  //         transactionStatus === "settlement"
  //       ) {
  //         if (fraudStatus === "challenge") {
  //           status = "CHALLENGED";
  //         } else if (fraudStatus === "accept") {
  //           status = "SUCCESS";
  //           paidAt = new Date();
  //         }
  //       } else if (
  //         transactionStatus === "cancel" ||
  //         transactionStatus === "deny" ||
  //         transactionStatus === "expire"
  //       ) {
  //         status =
  //           transactionStatus === "cancel"
  //             ? "CANCELED"
  //             : transactionStatus === "deny"
  //               ? "FAILED"
  //               : "EXPIRED";
  //       } else if (transactionStatus === "pending") {
  //         status = "PENDING";
  //       } else if (transactionStatus === "refund") {
  //         status = "REFUNDED";
  //       }

  //       // Update payment record with status and response data
  //       const updatedPayment = await ctx.db.payment.update({
  //         where: { id: payment.id },
  //         data: {
  //           status,
  //           paidAt: status === "SUCCESS" ? new Date() : paidAt,
  //           gatewayResponse: statusResponse as any,
  //           updatedAt: new Date(),
  //         },
  //         include: { subscription: true },
  //       });

  //       // If payment is successful, activate the membership
  //       if (status === "SUCCESS" && payment.subscription) {
  //         // Find membership and package details
  //         const membership = await ctx.db.membership.findUnique({
  //           where: { id: payment.subscription.memberId },
  //           include: {
  //             user: true,
  //           },
  //         });

  //         // Get trainer info if it's a trainer subscription
  //         const trainer = payment.subscription.trainerId 
  //           ? await ctx.db.personalTrainer.findUnique({
  //               where: { id: payment.subscription.trainerId },
  //               include: { user: true },
  //             })
  //           : null;

  //         const packageDetails = await ctx.db.package.findUnique({
  //           where: { id: payment.subscription.packageId },
  //         });

  //         if (!membership || !packageDetails) {
  //           throw new Error("Membership or package details not found");
  //         }

  //         // Update membership to active
  //         await ctx.db.membership.update({
  //           where: { id: membership.id },
  //           data: { isActive: true },
  //         });

  //         // Award points to the member's user account
  //         if (packageDetails.point > 0) {
  //           await ctx.db.user.update({
  //             where: { id: membership.userId },
  //             data: {
  //               point: { increment: packageDetails.point },
  //             },
  //           });
  //         }

  //         // Send payment receipt email
  //         const paymentTemplate = await ctx.db.emailTemplate.findFirst({
  //           where: { type: EmailType.PAYMENT_RECEIPT },
  //         });

  //         if (paymentTemplate) {
  //           await emailService.sendTemplateEmail({
  //             to: membership.user.email!,
  //             templateId: paymentTemplate.id,
  //             templateData: {
  //               memberName: membership.user.name,
  //               packageName: packageDetails.name,
  //               receiptNumber: payment.orderReference,
  //               totalAmount: payment.totalPayment,
  //               paymentStatus: PaymentStatus.SUCCESS,
  //               statusClass: PaymentStatus.SUCCESS.toLowerCase(),
  //               paymentDate: format(new Date(), "PPP"),
  //               paymentMethod: payment.method,
  //               duration: `${packageDetails.day ?? 0} days`,
  //               currency: "Rp",
  //               memberEmail: membership.user.email,
  //               portalUrl: siteConfig.portalUrl,
  //               supportEmail: siteConfig.supportEmail,
  //               supportPhone: siteConfig.supportPhone,
  //               logoUrl: siteConfig.logoUrl,
  //               currentYear: new Date().getFullYear(),
  //               address: siteConfig.address,
  //               // Conditional trainer data
  //               ...(trainer && {
  //                 personalTrainer: true,
  //                 trainerName: trainer.user.name,
  //               }),
  //               // Optional discount data if voucher was used
  //               ...(packageDetails.price > payment.totalPayment && {
  //                 subtotal: packageDetails.price,
  //                 discount: packageDetails.price - payment.totalPayment,
  //               }),
  //             },
  //           });
  //         }

  //         // Send membership confirmation email
  //         const membershipTemplate = await ctx.db.emailTemplate.findFirst({
  //           where: { type: EmailType.MEMBERSHIP_CONFIRMATION },
  //         });

  //         if (membershipTemplate) {
  //           await emailService.sendTemplateEmail({
  //             to: membership.user.email!,
  //             templateId: membershipTemplate.id,
  //             templateData: {
  //               memberName: membership.user.name,
  //               membershipId: membership.id,
  //               packageName: packageDetails.name,
  //               startDate: format(payment.subscription.startDate, "PPP"),
  //               endDate: payment.subscription.endDate
  //                 ? format(payment.subscription.endDate, "PPP")
  //                 : "N/A",
  //               personalTrainer: trainer ? true : false,
  //               trainerName: trainer?.user.name,
  //               memberEmail: membership.user.email,
  //               portalUrl: siteConfig.portalUrl,
  //               supportEmail: siteConfig.supportEmail,
  //               supportPhone: siteConfig.supportPhone,
  //               logoUrl: siteConfig.logoUrl,
  //               currentYear: new Date().getFullYear(),
  //               address: siteConfig.address,
  //               currency: "Rp",
  //               paymentMethod: payment.method,
  //               totalAmount: payment.totalPayment,
  //               // Include other standard fields that might be needed
  //               receiptNumber: payment.orderReference,
  //               paymentStatus: PaymentStatus.SUCCESS,
  //               statusClass: PaymentStatus.SUCCESS.toLowerCase(),
  //               paymentDate: format(new Date(), "PPP"),
  //             },
  //           });
  //         }
  //       }

  //       return {
  //         status: status.toLowerCase(),
  //         orderId,
  //         subscriptionId: payment.subscription.id,
  //       };
  //     } catch (error) {
  //       console.error("Notification error:", error);
  //       throw new Error("Failed to process payment notification");
  //     }
  //   }),


  handleNotification: publicProcedure
  .input(z.record(z.any()))
  .mutation(async ({ input, ctx }) => {
    try {
      console.log("Received DOKU Notification:", input);

      const orderId = input.order?.invoice_number;
      const transactionStatus = input.transaction?.status; // Biasanya di DOKU ada status ini (cek payload DOKU kamu ya)
      const paymentChannel = input.payment?.channel;

      if (!orderId) {
        throw new Error("Missing order ID from DOKU notification");
      }

      // Find the payment by order reference
      const payment = await ctx.db.payment.findFirst({
        where: { orderReference: orderId },
        include: { subscription: true },
      });

      if (!payment) {
        throw new Error(`Payment with order reference ${orderId} not found`);
      }

      // Mapping DOKU transaction status → internal status
      let status: PaymentStatus = "PENDING";
      let paidAt: Date | null = null;

      if (transactionStatus === "SUCCESS" || transactionStatus === "SETTLED") {
        status = "SUCCESS";
        paidAt = new Date();
      } else if (
        transactionStatus === "CANCELED" ||
        transactionStatus === "FAILED" ||
        transactionStatus === "EXPIRED"
      ) {
        status =
          transactionStatus === "CANCELED"
            ? "CANCELED"
            : transactionStatus === "FAILED"
            ? "FAILED"
            : "EXPIRED";
      } else if (transactionStatus === "PENDING") {
        status = "PENDING";
      } else if (transactionStatus === "REFUNDED") {
        status = "REFUNDED";
      }

      // Update payment record with status and response data
      const updatedPayment = await ctx.db.payment.update({
        where: { id: payment.id },
        data: {
          status,
          paidAt: status === "SUCCESS" ? new Date() : paidAt,
          gatewayResponse: input as any,
          updatedAt: new Date(),
        },
        include: { subscription: true },
      });

      // Handle membership activation (Same as your Midtrans flow)
      if (status === "SUCCESS" && payment.subscription) {
        // Find membership and package details
          const membership = await ctx.db.membership.findUnique({
            where: { id: payment.subscription.memberId },
            include: {
              user: true,
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


  // checkStatus: publicProcedure
  //   .input(z.object({ orderId: z.string() }))
  //   .query(async ({ input }) => {
  //     const apiClient = new midtransClient.Snap({
  //       isProduction: false,
  //       serverKey: process.env.MIDTRANS_SERVER_KEY,
  //     });

  //     try {
  //       const status = await apiClient.transaction.status(input.orderId);
  //       return status;
  //     } catch (error) {
  //       console.error("Status check error:", error);
  //       throw new Error("Failed to check payment status");
  //     }
  //   }),
    

  checkStatus: publicProcedure
  .input(z.object({ orderId: z.string() }))
  .query(async ({ input }) => {
    try {
      const result = await dokuPaymentService.inquirePayment(input.orderId);
      return result;
    } catch (error) {
      console.error("DOKU status check error:", error);
      throw new Error("Failed to check payment status");
    }
  }),
});
