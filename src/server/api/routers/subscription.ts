import { z } from "zod";
import {
  createTRPCRouter,
  permissionProtectedProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { PaymentStatus, EmailType } from "@prisma/client";
import { emailService } from "@/lib/email/emailService"; // Add this import
import { format } from "date-fns"; // Add this import
import { siteConfig } from "@/lib/config/siteConfig"; // Add this import
import { subscriptionsCreatedTotal } from "@/server/metrics"; // Add metrics import
import { toGMT8StartOfDay, toGMT8EndOfDay } from "@/lib/timezone";
import { logApiMutationAsync, extractIpAddress, extractUserAgent } from "@/server/utils/mutationLogger";
import { applyPromosForSuccessfulPayment } from "@/server/utils/promoEngine";
import { syncPtEndDates } from "@/server/utils/ptSubscriptionUtils";
import { logPointHistory } from "@/server/helpers/pointHistory";

// NOTE: updateExpiredSubscriptions logic has been moved to the cron job:
// /api/cron/deactivate-expired-subscriptions (runs every 6 hours)

export const subscriptionRouter = createTRPCRouter({
  // Get combined sales list (PersonalTrainer + FC)
  getSalesList: permissionProtectedProcedure(["list:subscription"])
    .query(async ({ ctx }) => {
      const [personalTrainers, fcs] = await Promise.all([
        ctx.db.personalTrainer.findMany({
          // where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
        ctx.db.fC.findMany({
          // where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
      ]);

      // Combine and format the data
      const salesList = [
        ...personalTrainers.map((pt) => ({
          id: pt.id,
          name: pt.user?.name || "Unknown",
          email: pt.user?.email || "",
          type: "PersonalTrainer" as const,
          typeName: "Personal Trainer",
        })),
        ...fcs.map((fc) => ({
          id: fc.id,
          name: fc.user?.name || "Unknown",
          email: fc.user?.email || "",
          type: "FC" as const,
          typeName: "Fitness Consultant",
        })),
      ];

      return salesList.sort((a, b) => a.name.localeCompare(b.name));
    }),

      getSalesListActive: permissionProtectedProcedure(["list:subscription"])
    .query(async ({ ctx }) => {
      const [personalTrainers, fcs] = await Promise.all([
        ctx.db.personalTrainer.findMany({
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
        ctx.db.fC.findMany({
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
      ]);

      // Combine and format the data
      const salesList = [
        ...personalTrainers.map((pt) => ({
          id: pt.id,
          name: pt.user?.name || "Unknown",
          email: pt.user?.email || "",
          type: "PersonalTrainer" as const,
          typeName: "Personal Trainer",
        })),
        ...fcs.map((fc) => ({
          id: fc.id,
          name: fc.user?.name || "Unknown",
          email: fc.user?.email || "",
          type: "FC" as const,
          typeName: "Fitness Consultant",
        })),
      ];

      return salesList.sort((a, b) => a.name.localeCompare(b.name));
    }),
  create: permissionProtectedProcedure(["create:subscription"])
    .input(
      z.object({
        memberId: z.string(),
        startDate: z.date(),
        packageId: z.string(),
        trainerId: z.string().nullable().optional(), // Fixed: Make it both optional and nullable
        salesId: z.string().optional(), // ID of the sales person
        salesType: z.enum(["PersonalTrainer", "FC"]).optional(), // Type of sales person
        duration: z.number(),
        subsType: z.enum(["gym", "trainer", "group", "class"]),
        paymentMethod: z.string(),
        totalPayment: z.number(),
        status: z
          .enum(["SUCCESS", "PENDING", "FAILED"])
          .optional()
          .default("SUCCESS"),
        orderReference: z.string().optional(),
        freezeAtStart: z.boolean().optional(),
        freezeDays: z.number().min(0).max(365).optional(),
        corporateId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const member = await ctx.db.membership.findUnique({
          where: { userId: input.memberId },
        });

        if (!member) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Member with ID ${input.memberId} does not exist.`,
          });
        }

        // Validate package exists
        const packageDetails = await ctx.db.package.findUnique({
          where: { id: input.packageId },
        });

        if (!packageDetails) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Package with ID ${input.packageId} not found.`,
          });
        }

        // Validate trainer if provided
        if (input.trainerId) {
          const trainer = await ctx.db.personalTrainer.findUnique({
            where: { id: input.trainerId },
          });

          if (!trainer) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Trainer with ID ${input.trainerId} not found.`,
            });
          }
        }

        const data = {
          memberId: member.id,
          packageId: input.packageId,
          startDate: input.startDate,
          salesId: input.salesId || null,
          salesType: input.salesType || null,
          corporateId: input.corporateId ?? null,
          ...(input.subsType === "gym"
            ? {
                endDate: new Date(
                  new Date(input.startDate).setDate(
                    new Date(input.startDate).getDate() + input.duration + (input.freezeDays || 0),
                  ),
                ),
                freezeAtStart: input.freezeAtStart || false,
                freezeDays: input.freezeDays || null,
                isFrozen: input.freezeAtStart || false,
                frozenAt: input.freezeAtStart ? input.startDate : null,
              }
            : {
                trainerId: input.trainerId || null,
                remainingSessions: input.duration,
                bonusSessions: packageDetails?.bonusSessions ?? 0,
                remainingBonusSessions: packageDetails?.bonusSessions ?? 0,
                endDate: packageDetails?.day
                  ? new Date(
                      new Date(input.startDate).setDate(
                        new Date(input.startDate).getDate() + packageDetails.day,
                      ),
                    )
                  : new Date(
                      new Date(input.startDate).setDate(
                        new Date(input.startDate).getDate() + 30,
                      ),
                    ),
              }),
        };

        // Idempotency guard: if a subscription with identical
        // member+package+trainer+startDate already exists (not deleted), return it
        // instead of creating a duplicate. This protects against double-click / retry.
        // Real extensions use a different startDate so they are not blocked.
        const existingDuplicate = await ctx.db.subscription.findFirst({
          where: {
            memberId: member.id,
            packageId: input.packageId,
            trainerId: input.trainerId || null,
            startDate: input.startDate,
            deletedAt: null,
          },
          include: {
            member: {
              select: {
                id: true,
                userId: true,
                user: { select: { name: true } },
              },
            },
            package: true,
            payments: true,
          },
        });
        if (existingDuplicate) {
          console.warn(`[subscription.create] Idempotent hit - returning existing subscription ${existingDuplicate.id}`);
          success = true;
          result = existingDuplicate;
          return existingDuplicate;
        }

        const subscription = await ctx.db.subscription.create({
          data: data,
          include: {
            member: {
              select: {
                id: true,
                userId: true,
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            package: true,
            payments: true,
          },
        });

        // Sync endDate of older PT/group subscriptions for same member+trainer
        if (input.subsType !== "gym" && subscription.endDate && subscription.trainerId) {
          await syncPtEndDates({
            tx: ctx.db,
            memberId: member.id,
            trainerId: subscription.trainerId,
            newSubscriptionId: subscription.id,
            newEndDate: subscription.endDate,
          });
        }

        // Increment subscription creation metrics
        subscriptionsCreatedTotal.labels({
          package_type: packageDetails?.type || 'unknown',
          user_type: 'member',
        }).inc();

        await ctx.db.payment.create({
          data: {
            subscriptionId: subscription.id,
            status: input.status || "SUCCESS",
            method: input.paymentMethod,
            totalPayment: input.totalPayment,
            orderReference: input.orderReference,
            // Stamp paidAt on SUCCESS so it shows in subscription history & reports
            paidAt: (input.status || "SUCCESS") === "SUCCESS" ? new Date() : null,
          },
        });

        if (input.status === "SUCCESS") {
          await ctx.db.membership.update({
            where: { id: member.id },
            data: { isActive: true },
          });

          // If it's a group training package, create GroupSubscription and GroupMember
          if (input.subsType === "group") {
            if (packageDetails?.isGroupPackage) {
              // Check if group subscription already exists for this subscription
              const existingGroupMember = await ctx.db.groupMember.findFirst({
                where: { subscriptionId: subscription.id }
              });

              if (!existingGroupMember) {
                // Create group subscription
                const groupSubscription = await ctx.db.groupSubscription.create({
                  data: {
                    groupName: `${subscription.member?.user?.name || 'Member'}'s Group`,
                    leadSubscriptionId: subscription.id,
                    packageId: input.packageId,
                    totalMembers: 1,
                    maxMembers: packageDetails.maxUsers ?? 4,
                    status: "ACTIVE"
                  }
                });

                // Add lead as first member
                await ctx.db.groupMember.create({
                  data: {
                    groupSubscriptionId: groupSubscription.id,
                    subscriptionId: subscription.id,
                    status: "ACTIVE"
                  }
                });
              }
            }
          }
        }

        result = subscription;
        success = true;
        return subscription;
      } catch (err) {
        error = err as Error;
        success = false;
        // Log detailed error for debugging
        console.error("Subscription creation error:", {
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
          input: {
            memberId: input.memberId,
            packageId: input.packageId,
            trainerId: input.trainerId,
            subsType: input.subsType,
            orderReference: input.orderReference,
          }
        });

        // Re-throw TRPC errors as-is
        if (error instanceof TRPCError) {
          throw error;
        }

        // Handle Prisma errors
        if (error && typeof error === 'object' && 'code' in error) {
          const prismaError = error as { code: string; meta?: any };
          
          if (prismaError.code === 'P2002') {
            throw new TRPCError({
              code: "CONFLICT",
              message: "A subscription with this information already exists.",
            });
          }
          
          if (prismaError.code === 'P2003') {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invalid reference: One or more IDs do not exist.",
            });
          }
        }

        // Generic error
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to create subscription. Please try again.",
        });
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "subscription.create",
          method: "POST",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  updatePaymentStatus: permissionProtectedProcedure(["update:subscription"])
    .input(
      z.object({
        orderReference: z.string(),
        status: z.enum([
          "SUCCESS",
          "PENDING",
          "FAILED",
          "CANCELED",
          "EXPIRED",
          "CHALLENGED",
          "REFUNDED",
          "SETTLED",
        ]),
        gatewayResponse: z.any().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const payment = await ctx.db.payment.findFirst({
        where: { orderReference: input.orderReference },
        include: { subscription: true },
      });

      if (!payment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment not found",
        });
      }

      // Update payment with new status and gateway response if provided
      const updateData: any = {
        status: input.status as PaymentStatus,
        updatedAt: new Date(),
      };

      const isTransitionToSuccess =
        input.status === "SUCCESS" && payment.status !== "SUCCESS";

      // If status is SUCCESS and wasn't before, set the paidAt timestamp
      if (isTransitionToSuccess) {
        updateData.paidAt = new Date();

        // If subscription is available, also update the subscription status here
        if (payment.subscription) {
          await ctx.db.membership.update({
            where: { id: payment.subscription.memberId },
            data: { isActive: true },
          });
        }
      }
      
      // Store gateway response if provided
      if (input.gatewayResponse) {
        updateData.gatewayResponse = input.gatewayResponse;
      }

      const updatedPayment = await ctx.db.payment.update({
        where: { id: payment.id },
        data: updateData,
        include: {
          subscription: {
            include: {
              member: {
                include: {
                  user: true,
                },
              },
              trainer: {
                include: {
                  user: true,
                },
              },
              package: true,
            },
          },
        },
      });

      // If payment is now successful, apply all relevant benefits
      if (isTransitionToSuccess && payment.subscription) {
        // First, activate the membership
        await ctx.db.membership.update({
          where: { id: payment.subscription.memberId },
          data: { isActive: true },
        });

        // Get package details for points
        const packageDetails = await ctx.db.package.findUnique({
          where: { id: payment.subscription.packageId },
        });

        // Get membership to find user
        const membership = await ctx.db.membership.findUnique({
          where: { id: payment.subscription.memberId },
          include: { user: true },
        });

        // Award points if applicable
        if (
          packageDetails?.point &&
          packageDetails.point > 0 &&
          membership?.user
        ) {
          await ctx.db.user.update({
            where: { id: membership.user.id },
            data: {
              point: { increment: packageDetails.point },
            },
          });
          await logPointHistory(ctx.db, {
            userId: membership.user.id,
            amount: packageDetails.point,
            type: "EARN",
            source: "SUBSCRIPTION",
            description: `Poin dari subscription paket ${packageDetails.name}`,
            referenceId: payment.subscription.id,
          });
        }

        await ctx.db.$transaction(async (tx) => {
          await applyPromosForSuccessfulPayment({
            tx,
            paymentId: updatedPayment.id,
            subscriptionId: payment.subscription.id,
          });
        });

        // If it's a group package, create GroupSubscription + GroupMember if not already exists
        if (packageDetails?.type === "GROUP_TRAINING") {
          const existingGroupMember = await ctx.db.groupMember.findFirst({
            where: { subscriptionId: payment.subscription.id },
          });

          if (!existingGroupMember) {
            const groupSubscription = await ctx.db.groupSubscription.create({
              data: {
                groupName: `${membership?.user?.name || "Member"}'s Group`,
                leadSubscriptionId: payment.subscription.id,
                packageId: payment.subscription.packageId,
                totalMembers: 1,
                maxMembers: packageDetails.maxUsers ?? 4,
                status: "ACTIVE",
              },
            });

            await ctx.db.groupMember.create({
              data: {
                groupSubscriptionId: groupSubscription.id,
                subscriptionId: payment.subscription.id,
                status: "ACTIVE",
              },
            });
          }
        }

        // // Send email notifications if this is a new successful payment
        // if (updatedPayment.subscription.member?.user?.email) {
        //   // Send payment receipt email
        //   const paymentTemplate = await ctx.db.emailTemplate.findFirst({
        //     where: { type: EmailType.PAYMENT_RECEIPT },
        //   });

        //   if (paymentTemplate) {
        //     await emailService.sendTemplateEmail({
        //       to: updatedPayment.subscription.member.user.email,
        //       templateId: paymentTemplate.id,
        //       templateData: {
        //         memberName: updatedPayment.subscription.member.user.name,
        //         packageName: updatedPayment.subscription.package.name,
        //         receiptNumber:
        //           updatedPayment.orderReference || updatedPayment.id,
        //         totalAmount: updatedPayment.totalPayment,
        //         paymentStatus: PaymentStatus.SUCCESS,
        //         statusClass: PaymentStatus.SUCCESS.toLowerCase(),
        //         paymentDate: format(new Date(), "PPP"),
        //         paymentMethod: updatedPayment.method,
        //         duration: updatedPayment.subscription.remainingSessions
        //           ? `${updatedPayment.subscription.remainingSessions} sessions`
        //           : `${
        //               updatedPayment.subscription.endDate
        //                 ? Math.ceil(
        //                     (updatedPayment.subscription.endDate.getTime() -
        //                       updatedPayment.subscription.startDate.getTime()) /
        //                       (1000 * 60 * 60 * 24),
        //                   )
        //                 : 0
        //             } days`,
        //         currency: "Rp",
        //         memberEmail: updatedPayment.subscription.member.user.email,
        //         supportEmail: siteConfig.supportEmail,
        //         supportPhone: siteConfig.supportPhone,
        //         logoUrl: siteConfig.logoUrl,
        //         portalUrl: siteConfig.portalUrl,
        //         currentYear: new Date().getFullYear(),
        //         address: siteConfig.address,
        //         // Conditional trainer data
        //         ...(updatedPayment.subscription.trainer && {
        //           personalTrainer: true,
        //           trainerName: updatedPayment.subscription.trainer.user.name,
        //         }),
        //       },
        //     });
        //   }

        //   // Send membership confirmation email
        //   const membershipTemplate = await ctx.db.emailTemplate.findFirst({
        //     where: { type: EmailType.MEMBERSHIP_CONFIRMATION },
        //   });

        //   if (membershipTemplate) {
        //     await emailService.sendTemplateEmail({
        //       to: updatedPayment.subscription.member.user.email,
        //       templateId: membershipTemplate.id,
        //       templateData: {
        //         memberName: updatedPayment.subscription.member.user.name,
        //         membershipId: updatedPayment.subscription.member.id,
        //         packageName: updatedPayment.subscription.package.name,
        //         startDate: format(updatedPayment.subscription.startDate, "PPP"),
        //         endDate: updatedPayment.subscription.endDate
        //           ? format(updatedPayment.subscription.endDate, "PPP")
        //           : "N/A",
        //         personalTrainer: updatedPayment.subscription.trainer
        //           ? true
        //           : false,
        //         trainerName: updatedPayment.subscription.trainer?.user.name,
        //         memberEmail: updatedPayment.subscription.member.user.email,
        //         portalUrl: siteConfig.portalUrl,
        //         supportEmail: siteConfig.supportEmail,
        //         supportPhone: siteConfig.supportPhone,
        //         logoUrl: siteConfig.logoUrl,
        //         currentYear: new Date().getFullYear(),
        //         address: siteConfig.address,
        //         currency: "Rp",
        //         paymentMethod: updatedPayment.method,
        //         totalAmount: updatedPayment.totalPayment,
        //         receiptNumber:
        //           updatedPayment.orderReference || updatedPayment.id,
        //         paymentStatus: PaymentStatus.SUCCESS,
        //         statusClass: PaymentStatus.SUCCESS.toLowerCase(),
        //         paymentDate: format(new Date(), "PPP"),
        //       },
        //     });
        //   }
        // }
      }

        result = updatedPayment;
        success = true;
        return updatedPayment;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "subscription.updatePaymentStatus",
          method: "PATCH",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  detail: permissionProtectedProcedure(["show:subscription"])
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.subscription.findUnique({
        where: { id: input.id },
      });
    }),

      listActive: permissionProtectedProcedure(["list:subscription"])
    .input(
      z.object({
        page: z.number().min(1),
        limit: z.number().min(1).max(100),
        search: z.string().optional(),
        searchColumn: z.string().optional(),
        salesId: z.string().optional(),
        trainerId: z.string().optional(),
        packageId: z.string().optional(),
        corporateId: z.string().optional(),
        status: z.enum(["all", "active", "inactive"]).optional().default("all"),
        dateFilterType: z.enum(["payment", "startDate", "endDate", "createdAt"]).optional().default("payment"),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {

      // Dates are already converted to UTC in the frontend
      const start = input.startDate ? toGMT8StartOfDay(input.startDate) : undefined;
      const end = input.endDate ? toGMT8EndOfDay(input.endDate) : undefined;
      console.log("Input", input, start, end)

     const whereClause: any = {
  // Exclude soft deleted subscriptions
  deletedAt: null,

  // Filter by status if not "all"
  ...(input.status !== "all" && {
    isActive: input.status === "active",
  }),
  OR: [
    { groupMembers: { none: {} } }, // bukan member group
    { leadGroupSubscriptions: { some: {} } }, // leader group
  ],
  // Filter by salesId if provided
  ...(input.salesId && {
    salesId: input.salesId,
  }),
  // Filter by trainerId if provided
  ...(input.trainerId && {
    trainerId: input.trainerId,
  }),
  // Filter by packageId if provided
  ...(input.packageId && {
    packageId: input.packageId,
  }),
  // Filter by corporateId: "NONE" = no corporate, else filter by ID
  ...(input.corporateId === "NONE"
    ? { corporateId: null }
    : input.corporateId
    ? { corporateId: input.corporateId }
    : {}),
  // Filter by date range based on selected date field type
  ...((start || end) && (() => {
    const dateFilterType = input.dateFilterType || "payment";
    
    if (dateFilterType === "payment") {
      // Filter by payment paid date (when payment was actually completed)
      // Use 'some' to find subscriptions with at least one successful payment in the date range
      return {
        payments: {
          some: {
            status: "SUCCESS",
            ...((start || end) && {
              paidAt: {
                ...(start && { gte: start }),
                ...(end && { lte: end }),
              },
            }),
          },
        },
      };
    } else if (dateFilterType === "startDate") {
      // Filter by subscription start date
      return {
        startDate: {
          ...(start && { gte: start }),
          ...(end && { lte: end }),
        },
      };
    } else if (dateFilterType === "endDate") {
      // Filter by subscription end date
      return {
        endDate: {
          ...(start && { gte: start }),
          ...(end && { lte: end }),
        },
      };
    } else if (dateFilterType === "createdAt") {
      // Filter by subscription creation date
      return {
        createdAt: {
          ...(start && { gte: start }),
          ...(end && { lte: end }),
        },
      };
    }
    return {};
  })()),
  ...(input.search
    ? input.searchColumn === "member.user.name"
      ? {
          member: {
            user: {
              name: {
                contains: input.search,
                mode: "insensitive" as const,
              },
            },
          },
        }
      : input.searchColumn === "package.name"
      ? {
          package: {
            name: {
              contains: input.search,
              mode: "insensitive" as const,
            },
          },
        }
      : {
          [input.searchColumn || "name"]: {
            contains: input.search,
            mode: "insensitive" as const,
          },
        }
    : {}),
};


      const items = await ctx.db.subscription.findMany({
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        where: whereClause,
        orderBy: { id: "desc" },
        include: {
          member: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          package: {
            select: {
              id: true,
              name: true,
              price: true,
              type: true,
              point: true,
            },
          },
          corporate: {
            select: { id: true, name: true },
          },
          trainer: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          payments: {
            // Always attach the latest SUCCESS payment for display, regardless of the
            // date-range filter. The date range only decides WHICH subscriptions appear
            // (via whereClause); filtering this include by paidAt previously made
            // "Payment Total"/"Payment Created" go blank whenever the payment date fell
            // outside the selected window.
            where: { status: "SUCCESS", deletedAt: null },
            orderBy: { paidAt: "desc" },
            take: 1,
            select: {
              id: true,
              status: true,
              method: true,
              totalPayment: true,
              orderReference: true,
              paidAt: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });

      const total = await ctx.db.subscription.count({ where: whereClause });
      
      // Debug: Log payments for each subscription
      items.forEach((subscription, index) => {
        console.log(`Subscription #${index + 1} (${subscription.id}):`, {
          packageName: subscription.package.name,
          memberName: subscription.member.user.name,
          paymentsCount: subscription.payments.length,
          payments: subscription.payments
        });
      });

      return {
        items,
        total,
        page: input.page,
        limit: input.limit,
      };
    }),

  list: permissionProtectedProcedure(["list:subscription"])
    .input(
      z.object({
        page: z.number().min(1),
        limit: z.number().min(1).max(100),
        search: z.string().optional(),
        searchColumn: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const whereClause: any = {
        // Exclude soft deleted subscriptions
        deletedAt: null,
        ...(input.search
          ? input.searchColumn === "member.user.name"
            ? {
                member: {
                user: {
                  name: {
                    contains: input.search,
                    mode: "insensitive" as const,
                  },
                },
              },
            }
          : input.searchColumn === "package.name"
          ? {
              package: {
                name: {
                  contains: input.search,
                  mode: "insensitive" as const,
                },
              },
            }
            : {
                [input.searchColumn || "name"]: {
                  contains: input.search,
                  mode: "insensitive" as const,
                },
              }
          : {}),
      };

      const items = await ctx.db.subscription.findMany({
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        where: whereClause,
        orderBy: { id: "desc" },
        include: {
          member: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          package: {
            select: {
              id: true,
              name: true,
              price: true,
              type: true,
              point: true,
            },
          },
          payments: {
            where: { deletedAt: null }, // Exclude soft deleted payments
            select: {
              id: true,
              status: true,
              method: true,
              totalPayment: true,
              orderReference: true,
              paidAt: true,
              updatedAt: true,
            },
          },
        },
      });

      const total = await ctx.db.subscription.count({ where: whereClause });

      return {
        items,
        total,
        page: input.page,
        limit: input.limit,
      };
    }),

  getByIdMember: permissionProtectedProcedure(["list:subscription"])
    .input(
      z.object({
        memberId: z.string(),
        page: z.number().min(1),
        limit: z.number().min(1).max(100),
      }),
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.subscription.findMany({
        where: {
          memberId: input.memberId,
          deletedAt: null, // Exclude soft deleted subscriptions
        },
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        orderBy: { id: "desc" },
        include: {
          member: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          package: {
            select: {
              id: true,
              name: true,
              price: true,
              type: true,
              point: true,
            },
          },
          payments: {
            where: { deletedAt: null }, // Exclude soft deleted payments
          },
        },
      });

      const total = await ctx.db.subscription.count({
        where: {
          memberId: input.memberId,
          deletedAt: null, // Exclude soft deleted subscriptions
        },
      });

      return {
        items,
        total,
        page: input.page,
        limit: input.limit,
      };
    }),

  // Get subscription history for a specific member (for member profile view)
  getSubscriptionHistory: permissionProtectedProcedure(["list:subscription"])
    .input(
      z.object({
        memberId: z.string(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.subscription.findMany({
        where: {
          memberId: input.memberId,
          deletedAt: null, // Exclude soft deleted subscriptions
        },
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        orderBy: { id: "desc" },
        include: {
          package: {
            select: {
              id: true,
              name: true,
              price: true,
              type: true,
              point: true,
            },
          },
          payments: {
            where: {
              deletedAt: null, // Exclude soft deleted payments
            },
            select: {
              id: true,
              status: true,
              method: true,
              totalPayment: true,
              orderReference: true,
              paidAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 1, // Get only the latest non-deleted payment
          },
          trainer: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      // Get sales information for each subscription
      const subscriptionsWithSales = await Promise.all(
        items.map(async (subscription) => {
          let salesPerson = null;
          
          if (subscription.salesId && subscription.salesType) {
            if (subscription.salesType === "PersonalTrainer") {
              const pt = await ctx.db.personalTrainer.findUnique({
                where: { id: subscription.salesId },
                include: {
                  user: {
                    select: {
                      name: true,
                      email: true,
                    },
                  },
                },
              });
              if (pt) {
                salesPerson = {
                  id: pt.id,
                  name: pt.user?.name || "Unknown PT",
                  email: pt.user?.email || "",
                  type: "PersonalTrainer" as const,
                };
              }
            } else if (subscription.salesType === "FC") {
              const fc = await ctx.db.fC.findUnique({
                where: { id: subscription.salesId },
                include: {
                  user: {
                    select: {
                      name: true,
                      email: true,
                    },
                  },
                },
              });
              if (fc) {
                salesPerson = {
                  id: fc.id,
                  name: fc.user?.name || "Unknown FC",
                  email: fc.user?.email || "",
                  type: "FC" as const,
                };
              }
            }
          }

          return {
            ...subscription,
            salesPerson,
          };
        })
      );

      const total = await ctx.db.subscription.count({
        where: {
          memberId: input.memberId,
          deletedAt: null, // Exclude soft deleted subscriptions
        },
      });

      return {
        items: subscriptionsWithSales,
        total,
        page: input.page,
        limit: input.limit,
      };
    }),

  getById: permissionProtectedProcedure(["show:subscription"])
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const subscription = await ctx.db.subscription.findUnique({
        where: { id: input.id },
        include: {
          member: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          trainer: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          package: true,
          payments: {
            orderBy: { createdAt: 'desc' }, // ambil yang terbaru
          },
        },
      });

      if (!subscription) {
        throw new Error("Subscription not found");
      }

      return {
        subscription,
        payment: subscription.payments?.[0] ?? null,
      };
    }),

  getByOrderReference: permissionProtectedProcedure(["show:subscription"])
    .input(z.object({ orderReference: z.string() }))
    .query(async ({ ctx, input }) => {
      const payment = await ctx.db.payment.findFirst({
        where: { orderReference: input.orderReference },
        include: {
          subscription: {
            include: {
              member: {
                include: {
                  user: {
                    select: {
                      name: true,
                      email: true,
                    },
                  },
                },
              },
              trainer: {
                include: {
                  user: {
                    select: {
                      name: true,
                      email: true,
                    },
                  },
                },
              },
              package: true,
            },
          },
        },
      });

      if (!payment || !payment.subscription) {
        throw new Error("Subscription not found");
      }

      return {
        payment,
        subscription: payment.subscription,
      };
    }),

  update: permissionProtectedProcedure(["update:subscription"])
    .input(
      z.object({
        id: z.string(),
        memberId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const shouldBeActive = input.endDate
          ? input.endDate > new Date()
          : undefined;

        result = await ctx.db.subscription.update({
          where: { id: input.id },
          data: {
            memberId: input.memberId,
            startDate: input.startDate,
            endDate: input.endDate,
            ...(shouldBeActive !== undefined && { isActive: shouldBeActive }),
          },
        });
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "subscription.update",
          method: "PATCH",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  checkout: permissionProtectedProcedure(["create:subscription"])
    .input(
      z.object({
        packageId: z.string(),
        duration: z.number(),
        paymentMethod: z.string().optional().default("CASH"),
        orderReference: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const member = await ctx.db.membership.findFirst({
          where: {
            userId: ctx.session.user.id,
            isActive: true,
          },
        });

        if (!member) {
          throw new Error(
            "Active member not found. Please check your membership status.",
          );
        }

        const packageData = await ctx.db.package.findUnique({
          where: {
            id: input.packageId,
          },
        });

        if (!packageData) {
          throw new Error("Package not found");
        }

        const now = new Date();
        const ptEndDate = packageData.day
          ? new Date(new Date(now).setDate(now.getDate() + packageData.day))
          : new Date(new Date(now).setDate(now.getDate() + 30));

        const subscription = await ctx.db.subscription.create({
          data: {
            memberId: member.id,
            packageId: packageData.id,
            startDate: now,
            ...(packageData.type === "GYM_MEMBERSHIP"
              ? {
                  endDate: new Date(
                    new Date(now).setDate(now.getDate() + input.duration),
                  ),
                }
              : {
                  remainingSessions: input.duration,
                  endDate: ptEndDate,
                }),
          },
        });

        // Sync endDate of older PT/group subscriptions for same member+trainer
        if (
          packageData.type !== "GYM_MEMBERSHIP" &&
          subscription.endDate &&
          subscription.trainerId
        ) {
          await syncPtEndDates({
            tx: ctx.db,
            memberId: member.id,
            trainerId: subscription.trainerId,
            newSubscriptionId: subscription.id,
            newEndDate: subscription.endDate,
          });
        }

        // Increment subscription creation metrics for checkout
        subscriptionsCreatedTotal.labels({
          package_type: packageData.type || 'unknown',
          user_type: 'self_checkout',
        }).inc();

        const paymentStatus =
          input.paymentMethod === "CASH" ? "SUCCESS" : "PENDING";

        await ctx.db.payment.create({
          data: {
            subscriptionId: subscription.id,
            status: paymentStatus,
            method: input.paymentMethod,
            totalPayment: packageData.price * input.duration,
            orderReference: input.orderReference,
            // Stamp paidAt on SUCCESS (cash) so it shows in subscription history & reports
            paidAt: paymentStatus === "SUCCESS" ? new Date() : null,
          },
        });

        if (paymentStatus === "SUCCESS") {
          const earnedPoints = packageData.point * input.duration;
          await ctx.db.user.update({
            where: {
              id: ctx.session.user.id,
            },
            data: {
              point: {
                increment: earnedPoints,
              },
            },
          });
          if (earnedPoints > 0) {
            await logPointHistory(ctx.db, {
              userId: ctx.session.user.id,
              amount: earnedPoints,
              type: "EARN",
              source: "PACKAGE_PURCHASE",
              description: `Poin dari checkout paket ${packageData.name} (${input.duration} bulan)`,
              referenceId: subscription.id,
            });
          }
        }

        result = {
          success: true,
          subscription,
          message:
            paymentStatus === "SUCCESS"
              ? `Checkout successful! You earned ${packageData.point * input.duration} points.`
              : "Checkout initiated. Please complete the payment to activate your subscription.",
        };
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        console.error("Checkout error:", err);
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "subscription.checkout",
          method: "POST",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  delete: permissionProtectedProcedure(["delete:subscription"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        result = await ctx.db.$transaction(async (tx) => {
        const subscription = await tx.subscription.findUnique({
          where: { id: input.id },
          include: {
            member: {
              include: {
                user: true,
              },
            },
            payments: {
              where: {
                status: "SUCCESS",
                deletedAt: null,
              },
            },
            package: true,
          },
        });

        if (!subscription) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Subscription with id ${input.id} not found`,
          });
        }

        // Check if already soft deleted
        if (subscription.deletedAt) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Subscription has already been deleted",
          });
        }

        const now = new Date();

        // Decrement user points if the package awarded points and there was a successful payment
        if (
          subscription.package?.point &&
          subscription.package.point > 0 &&
          subscription.member?.user?.id &&
          subscription.payments.length > 0
        ) {
          // Get current user points to ensure we don't go below 0
          const user = await tx.user.findUnique({
            where: { id: subscription.member.user.id },
            select: { point: true },
          });

          if (user) {
            // Calculate how many points to deduct (don't go below 0)
            const pointsToDeduct = Math.min(
              subscription.package.point,
              user.point
            );

            await tx.user.update({
              where: { id: subscription.member.user.id },
              data: {
                point: { decrement: pointsToDeduct },
              },
            });
            if (pointsToDeduct > 0) {
              await logPointHistory(tx, {
                userId: subscription.member.user.id,
                amount: -pointsToDeduct,
                type: "DEDUCT",
                source: "CANCEL_SUBSCRIPTION",
                description: `Pengurangan poin karena pembatalan subscription paket ${subscription.package.name}`,
                referenceId: subscription.id,
              });
            }
          }
        }

        // Soft delete all related payments
        await tx.payment.updateMany({
          where: { subscriptionId: input.id },
          data: { deletedAt: now },
        });

        // Soft delete bonus subscriptions granted via promo when this subscription was the trigger
        const promoRedemptions = await tx.promoRedemption.findMany({
          where: { triggerSubscriptionId: input.id },
          select: { id: true, bonusSubscriptionId: true },
        });

        if (promoRedemptions.length > 0) {
          const bonusSubIds = promoRedemptions
            .map((r) => r.bonusSubscriptionId)
            .filter((id): id is string => id !== null);

          if (bonusSubIds.length > 0) {
            // Soft delete payments of bonus subscriptions
            await tx.payment.updateMany({
              where: { subscriptionId: { in: bonusSubIds }, deletedAt: null },
              data: { deletedAt: now },
            });

            // Soft delete the bonus subscriptions themselves
            await tx.subscription.updateMany({
              where: { id: { in: bonusSubIds }, deletedAt: null },
              data: { deletedAt: now, isActive: false },
            });
          }

          // Delete the promo redemption records
          await tx.promoRedemption.deleteMany({
            where: { triggerSubscriptionId: input.id },
          });
        }

        // Soft delete the subscription
        const deletedSubscription = await tx.subscription.update({
          where: { id: input.id },
          data: {
            deletedAt: now,
            isActive: false,
          },
        });

        // Check if member has any remaining active subscriptions (not soft deleted)
        const remainingSubscriptions = await tx.subscription.count({
          where: {
            memberId: subscription.memberId,
            isActive: true,
            deletedAt: null,
          },
        });

        // If no active subscriptions remain, deactivate the membership
        if (remainingSubscriptions === 0) {
          await tx.membership.update({
            where: { id: subscription.memberId },
            data: { isActive: false },
          });
        }

          return deletedSubscription;
        });
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "subscription.delete",
          method: "DELETE",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  // Tambahkan procedure untuk menonaktifkan subscription yang sudah expired
  deactivateExpired: permissionProtectedProcedure(["update:subscription"])
    .mutation(async ({ ctx }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const now = new Date();
        const updateResult = await ctx.db.subscription.updateMany({
          where: {
            isActive: true,
            endDate: { lt: now },
          },
          data: {
            isActive: false,
          },
        });
        result = { count: updateResult.count };
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "subscription.deactivateExpired",
          method: "PATCH",
          userId: ctx.session?.user?.id,
          requestData: {},
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  // Freeze all active subscriptions for a member
  freeze: permissionProtectedProcedure(["update:subscription"])
    .input(z.object({
      memberId: z.string(),
      freezePriceId: z.string().optional(),
      freezeDays: z.number().min(0).max(365).optional(),
      balanceAccountId: z.number().int().optional(),
      freezeStartAt: z.string().datetime().optional(), // ISO date string for scheduled freeze start
    }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        // Find member
        const member = await ctx.db.membership.findUnique({
        where: { id: input.memberId },
        include: { user: true },
      });

      if (!member) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found",
        });
      }

      // Handle freeze pricing
      let freezePrice = null;
      let actualFreezeDays = input.freezeDays || 0;
      let freezePaymentAmount = 0;

      if (input.freezePriceId) {
        // Look up the freeze price
        freezePrice = await ctx.db.freezePrice.findUnique({
          where: { id: input.freezePriceId },
        });

        if (!freezePrice) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Freeze price not found",
          });
        }

        if (!freezePrice.isActive) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Selected freeze price is not active",
          });
        }

        actualFreezeDays = freezePrice.freezeDays;
        freezePaymentAmount = freezePrice.price;
      } else if (input.freezeDays) {
        // Legacy: freezeDays provided directly (free freeze)
        actualFreezeDays = input.freezeDays;
      } else {
        // No freeze days specified, treat as UNTIL_UNFREEZE mode
        actualFreezeDays = 0;
      }

      const now = new Date();
      // Use provided freezeStartAt or fall back to now
      const freezeStartAt = input.freezeStartAt ? new Date(input.freezeStartAt) : now;

      // Find all active, non-frozen subscriptions for this member that haven't expired
      // Validation guards (as per improvement plan):
      // ❌ Cannot freeze if already frozen (filtered by isFrozen: false)
      // ❌ Cannot freeze expired subscriptions (filtered by endDate > now)
      // ❌ Cannot freeze subscriptions without endDate
      const activeSubscriptions = await ctx.db.subscription.findMany({
        where: {
          memberId: input.memberId,
          isActive: true,
          isFrozen: false,
          deletedAt: null,
          endDate: { gt: now }, // Only subscriptions that haven't expired
        },
        include: { package: true },
      });

      // Explicit validation: check if no active subscriptions found
      if (activeSubscriptions.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active subscriptions found to freeze. Subscriptions may already be frozen, expired, or not exist.",
        });
      }

      // Additional validation: check if any subscription is missing endDate
      const subscriptionsWithoutEndDate = activeSubscriptions.filter(sub => !sub.endDate);
      if (subscriptionsWithoutEndDate.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot freeze ${subscriptionsWithoutEndDate.length} subscription(s) without end date. Only gym memberships with end dates can be frozen.`,
        });
      }

      // Validate freezeDays is reasonable if provided
      if (actualFreezeDays === 0) {
        // Log warning but allow (treated as UNTIL_UNFREEZE)
        console.warn(`Freeze requested with freezeDays=0 for member ${input.memberId}, treating as UNTIL_UNFREEZE mode`);
      }

      // Validate balanceAccountId if there's a freeze fee
      if (freezePaymentAmount > 0) {
        if (!input.balanceAccountId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Balance account is required when freeze fee is applied",
          });
        }

        // Verify balance account exists
        const balanceAccount = await ctx.db.balanceAccount.findUnique({
          where: { id: input.balanceAccountId },
        });

        if (!balanceAccount) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Balance account not found",
          });
        }
      }

      // Create ONE transaction freeze record for the member (if there's a payment)
      let transactionFreezeId = null;
      if (freezePaymentAmount > 0 && freezePrice && input.balanceAccountId) {
        const transactionFreeze = await ctx.db.transactionFreeze.create({
          data: {
            balanceAccountId: input.balanceAccountId,
            amount: freezePaymentAmount,
            description: `Freeze fee for ${actualFreezeDays} days - ${activeSubscriptions.length} subscription(s)`,
            createdBy: ctx.session.user.id,
          },
        });
        transactionFreezeId = transactionFreeze.id;

        // Create freeze operation record for EACH subscription but link to the SAME TransactionFreeze
        for (const subscription of activeSubscriptions) {
          await ctx.db.freezeOperation.create({
            data: {
              subscriptionId: subscription.id,
              memberId: input.memberId,
              operationType: "FREEZE",
              freezePriceId: freezePrice.id,
              transactionFreezeId: transactionFreeze.id,
              freezeDays: actualFreezeDays,
              price: freezePaymentAmount, // Same price for all (member pays once)
              performedById: ctx.session.user.id,
            },
          });
        }
      } else {
        // Create freeze operation record without payment (free freeze) for each subscription
        // For custom freezes without a freezePriceId, create or find a FreezePrice entry
        let customFreezePriceId = input.freezePriceId;
        
        if (!customFreezePriceId && actualFreezeDays > 0) {
          // Try to find an existing FreezePrice for this duration (prefer free one)
          let customFreezePrice = await ctx.db.freezePrice.findFirst({
            where: {
              freezeDays: actualFreezeDays,
            },
          });

          // If no FreezePrice exists with these days, try to create one (might fail if not unique)
          if (!customFreezePrice) {
            try {
              customFreezePrice = await ctx.db.freezePrice.create({
                data: {
                  freezeDays: actualFreezeDays,
                  price: 0,
                  isActive: true,
                },
              });
            } catch (error) {
              // If creation fails (e.g., unique constraint), try to find again
              customFreezePrice = await ctx.db.freezePrice.findFirst({
                where: {
                  freezeDays: actualFreezeDays,
                },
              });
            }
          }

          customFreezePriceId = customFreezePrice?.id;
        }

        if (!customFreezePriceId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Freeze price ID is required",
          });
        }

        for (const subscription of activeSubscriptions) {
          await ctx.db.freezeOperation.create({
            data: {
              subscriptionId: subscription.id,
              memberId: input.memberId,
              operationType: "FREEZE",
              freezePriceId: customFreezePriceId,
              transactionFreezeId: null,
              freezeDays: actualFreezeDays,
              price: 0,
              performedById: ctx.session.user.id,
            },
          });
        }
      }

      // Freeze each subscription individually using transaction
      const results = await ctx.db.$transaction(
        activeSubscriptions.map((subscription) => {
          if (!subscription.endDate) {
            // Skip subscriptions without endDate (shouldn't happen given the query filter)
            return ctx.db.subscription.update({
              where: { id: subscription.id },
              data: {}, // No-op
            });
          }

          // Calculate remaining days from freezeStartAt until endDate
          // misalkan endate 30 januari, sekarang 8 januari, berarti remainingDays = 22
          const remainingMillis = subscription.endDate.getTime() - freezeStartAt.getTime();
          const remainingDays = Math.max(0, Math.floor(remainingMillis / (1000 * 60 * 60 * 24)));

          // Determine freeze mode
          const freezeMode = (actualFreezeDays && actualFreezeDays > 0)
            ? "FIXED_DAYS"
            : "UNTIL_UNFREEZE";

          // If freezeStartAt is in the future, mark as scheduled (not yet active freeze)
          const isFutureFreeze = freezeStartAt > now;

          return ctx.db.subscription.update({
            where: { id: subscription.id },
            data: {
              isFrozen: !isFutureFreeze, // Only set frozen now if not a future-dated freeze
              // isActive: false, // Subscription becomes inactive while frozen
              frozenAt: freezeStartAt,
              freezeDays: actualFreezeDays > 0 ? actualFreezeDays : null,
              freezeMode: freezeMode,
              remainingDays: remainingDays,
              // Do NOT modify endDate
            },
          });
        })
      );

        result = {
          message: `Successfully frozen ${results.length} subscription(s)${freezePaymentAmount > 0 ? ` with ${actualFreezeDays} days freeze fee of ${freezePaymentAmount}` : ""}`,
          count: results.length,
          memberId: input.memberId,
          memberName: member.user?.name || "Unknown",
          freezePaymentAmount,
          transactionFreezeId,
        };
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "subscription.freeze",
          method: "PATCH",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  // Unfreeze all frozen subscriptions for a member
  unfreeze: permissionProtectedProcedure(["update:subscription"])
    .input(z.object({ memberId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        // Find member
        const member = await ctx.db.membership.findUnique({
        where: { id: input.memberId },
        include: { user: true },
      });

      if (!member) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found",
        });
      }

      // Find all frozen subscriptions for this member
      // Validation guards (as per improvement plan):
      // ❌ Cannot unfreeze if not frozen (filtered by isFrozen: true)
      const frozenSubscriptions = await ctx.db.subscription.findMany({
        where: {
          memberId: input.memberId,
          isFrozen: true,
          deletedAt: null,
        },
        include: { package: true },
      });

      // Explicit validation: check if no frozen subscriptions found
      if (frozenSubscriptions.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No frozen subscriptions found to unfreeze. All subscriptions may already be active or not exist.",
        });
      }

      // Additional validation: check data integrity
      const subscriptionsWithoutFrozenAt = frozenSubscriptions.filter(sub => !sub.frozenAt);
      if (subscriptionsWithoutFrozenAt.length > 0) {
        console.error(`Data integrity issue: ${subscriptionsWithoutFrozenAt.length} frozen subscription(s) missing frozenAt timestamp for member ${input.memberId}`);
        // Don't throw error, let the transaction skip them with the existing logic
      }

      const now = new Date();
      let unfrozenCount = 0;

      // Get or create a FreezePrice entry for unfreeze operations (0 days, 0 price)
      let unfreezePrice = await ctx.db.freezePrice.findFirst({
        where: {
          freezeDays: 0,
          price: 0,
        },
      });

      if (!unfreezePrice) {
        unfreezePrice = await ctx.db.freezePrice.create({
          data: {
            freezeDays: 0,
            price: 0,
            isActive: true,
          },
        });
      }

      // Create a common performedAt timestamp for all unfreeze operations in this batch
      // This ensures they group together in the freeze history
      const batchPerformedAt = new Date();

      // Create unfreeze operation record for each subscription
      for (const subscription of frozenSubscriptions) {
        await ctx.db.freezeOperation.create({
          data: {
            subscriptionId: subscription.id,
            memberId: input.memberId,
            operationType: "UNFREEZE",
            freezePriceId: unfreezePrice.id,
            price: 0,
            transactionFreezeId: null,
            freezeDays: 0,
            performedById: ctx.session.user.id,
            performedAt: batchPerformedAt, // Use the same timestamp for all operations
          },
        });
      }

      // Unfreeze each subscription individually using transaction
      const results = await ctx.db.$transaction(
        frozenSubscriptions.map((subscription) => {
          if (!subscription.frozenAt) {
            // Skip subscriptions without frozenAt (data integrity issue)
            return ctx.db.subscription.update({
              where: { id: subscription.id },
              data: {}, // No-op
            });
          }

           // Calculate how long subscription has been frozen
          // misalkan frozenAt 1 januari, sekarang 8 januari, berarti frozenDaysSoFar = 7
          const frozenMillis = now.getTime() - subscription.frozenAt.getTime();
          const frozenDaysSoFar = Math.ceil(frozenMillis / (1000 * 60 * 60 * 24));

          // Infer freezeMode for backward compatibility (legacy data)
          const freezeMode = subscription.freezeMode ||
            (subscription.freezeDays && subscription.freezeDays > 0 ? "FIXED_DAYS" : "UNTIL_UNFREEZE");

          let extraDays: number;
          const remainingDays = subscription.remainingDays ?? 0;

          if (freezeMode === "FIXED_DAYS") {
            const freezeDays = subscription.freezeDays || 0;

            extraDays = remainingDays;
          } else {
 
            if (subscription.remainingDays !== null) {
              extraDays = subscription.remainingDays;
            } else if (subscription.endDate && subscription.frozenAt) {
              // Fallback for legacy data without remainingDays
              const legacyRemainingMillis = subscription.endDate.getTime() - subscription.frozenAt.getTime();
              extraDays = Math.max(0, Math.ceil(legacyRemainingMillis / (1000 * 60 * 60 * 24)));
            } else {
              extraDays = 0;
            }
          }

          // Calculate new end date
          const newEndDate = new Date(now);
          newEndDate.setDate(newEndDate.getDate() + extraDays);
          // Set to end of day for consistency
          newEndDate.setHours(23, 59, 59, 999);

          unfrozenCount++;

          return ctx.db.subscription.update({
            where: { id: subscription.id },
            data: {
              isFrozen: false,
              isActive: true, // Reactivate the subscription
              frozenAt: null,
              freezeDays: null,
              freezeMode: null,
              remainingDays: null,
              endDate: newEndDate,
              // endDate is intentionally NOT modified — it was never changed during freeze
            },
          });
        })
      );

        result = {
          message: `Successfully unfrozen ${unfrozenCount} subscription(s)`,
          count: unfrozenCount,
          memberId: input.memberId,
          memberName: member.user?.name || "Unknown",
        };
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "subscription.unfreeze",
          method: "PATCH",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  // Update sales information for a subscription
  updateSales: permissionProtectedProcedure(["update:subscription"])
    .input(
      z.object({
        subscriptionId: z.string(),
        salesId: z.string().nullable(),
        salesType: z.enum(["PersonalTrainer", "FC"]).nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        console.log("Updating sales information for subscription:", input.subscriptionId);
        const subscription = await ctx.db.subscription.findUnique({
        where: { id: input.subscriptionId },
      });

      if (!subscription) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscription not found",
        });
      }

      // Validate that salesId and salesType match
      if (input.salesId && input.salesType) {
        if (input.salesType === "PersonalTrainer") {
          const trainer = await ctx.db.personalTrainer.findUnique({
            where: { id: input.salesId },
          });
          if (!trainer) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Personal trainer not found",
            });
          }
        } else if (input.salesType === "FC") {
          const fc = await ctx.db.fC.findUnique({
            where: { id: input.salesId },
          });
          if (!fc) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Fitness consultant not found",
            });
          }
        }
      }

      const updatedSubscription = await ctx.db.subscription.update({
        where: { id: input.subscriptionId },
        data: {
          salesId: input.salesId,
          salesType: input.salesType,
        },
        include: {
          member: { include: { user: true } },
          package: true,
          // sales: { include: { user: true } },
          // fc: { include: { user: true } },
        },
      });

        result = updatedSubscription;
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "subscription.updateSales",
          method: "PATCH",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  // Update corporate assignment for a subscription
  updateCorporate: permissionProtectedProcedure(["update:subscription"])
    .input(
      z.object({
        subscriptionId: z.string(),
        corporateId: z.string().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const subscription = await ctx.db.subscription.findUnique({
          where: { id: input.subscriptionId },
        });
        if (!subscription) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Subscription tidak ditemukan" });
        }

        result = await ctx.db.subscription.update({
          where: { id: input.subscriptionId },
          data: { corporateId: input.corporateId },
          include: {
            member: { include: { user: { select: { name: true } } } },
            package: { select: { id: true, name: true } },
            corporate: { select: { id: true, name: true } },
          },
        });
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "subscription.updateCorporate",
          method: "PATCH",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  // Transfer subscription to another user
  transfer: permissionProtectedProcedure(["update:subscription"])
    .input(
      z.object({
        subscriptionId: z.string(),
        newUserId: z.string(),
        reason: z.string().optional(),
        transferPrice: z.number().optional(),
        balanceAccountId: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        // Verify the subscription exists and is active
        const subscription = await ctx.db.subscription.findUnique({
        where: { id: input.subscriptionId },
        include: {
          member: {
            include: {
              user: true,
            },
          },
          package: true,
          payments: {
            where: { status: "SUCCESS" },
          },
        },
      });

      if (!subscription) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscription not found",
        });
      }

      if (!subscription.isActive) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only active subscriptions can be transferred",
        });
      }

      // Block transfer if subscription is frozen
      if (subscription.isFrozen) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot transfer a frozen subscription. Please unfreeze it first.",
        });
      }

      // Verify the new user exists
      const newUser = await ctx.db.user.findUnique({
        where: { id: input.newUserId },
      });

      if (!newUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Target user not found",
        });
      }

      // Check if target user already has a membership
      const existingMembership = await ctx.db.membership.findFirst({
        where: { userId: input.newUserId },
        include: { user: true },
      });

      // Use provided transfer price or get from config
      let transferPrice: number;
      if (input.transferPrice !== undefined) {
        transferPrice = input.transferPrice;
      } else {
        const transferPriceConfig = await ctx.db.config.findUnique({
          where: { key: "transfer_price" },
        });
        transferPrice = transferPriceConfig ? parseFloat(transferPriceConfig.value) : 0;
      }

        result = await ctx.db.$transaction(async (tx) => {
          // Create or reuse membership for the target user
          let membershipId: string;
          let toMemberName: string;

          if (!existingMembership) {
            const newMembership = await tx.membership.create({
              data: {
                userId: input.newUserId,
                registerDate: new Date(),
                isActive: true,
                createdBy: ctx.session.user.id,
              },
            });
            membershipId = newMembership.id;
            toMemberName = newUser.name ?? "Unknown";
          } else {
            membershipId = existingMembership.id;
            toMemberName = existingMembership.user?.name ?? newUser.name ?? "Unknown";
          }

        // Create transfer history record with both from and to member info
        await tx.subscriptionTransferHistory.create({
          data: {
            subscriptionId: input.subscriptionId,
            transferredPoint: subscription.package.point,
            fromMemberId: subscription.memberId,
            fromMemberName: subscription.member.user?.name ?? "Unknown",
            toMemberId: membershipId,
            toMemberName,
            amount: transferPrice,
            reason: input.reason ?? null,
            file: null,
          },
        });

        // Update the subscription to point to the new membership
        const updatedSubscription = await tx.subscription.update({
          where: { id: input.subscriptionId },
          data: { memberId: membershipId },
          include: {
            member: { include: { user: true } },
            package: true,
          },
        });

        // Transfer points: Remove from old user, add to new user (with floor 0)
        if (subscription.package.point > 0) {
          const oldUser = await tx.user.findUnique({
            where: { id: subscription.member.userId },
            select: { point: true },
          });
          const safeDecrement = Math.min(subscription.package.point, oldUser?.point ?? 0);

          if (safeDecrement > 0) {
            await tx.user.update({
              where: { id: subscription.member.userId },
              data: { point: { decrement: safeDecrement } },
            });
            await logPointHistory(tx, {
              userId: subscription.member.userId,
              amount: -safeDecrement,
              type: "TRANSFER_OUT",
              source: "TRANSFER",
              description: `Transfer poin ke ${toMemberName} (subscription transfer)`,
              referenceId: input.subscriptionId,
            });
          }

          await tx.user.update({
            where: { id: input.newUserId },
            data: { point: { increment: subscription.package.point } },
          });
          await logPointHistory(tx, {
            userId: input.newUserId,
            amount: subscription.package.point,
            type: "TRANSFER_IN",
            source: "TRANSFER",
            description: `Terima poin dari ${subscription.member.user?.name ?? "Unknown"} (subscription transfer)`,
            referenceId: input.subscriptionId,
          });
        }

        // Create transaction record for transfer fee if payment account provided
        if (transferPrice > 0 && input.balanceAccountId) {
          // Get default COA from config, or fallback to first available COA
          const coaConfig = await ctx.db.config.findUnique({ where: { key: "default_coa_id" } });
          const coaId = coaConfig
            ? parseInt(coaConfig.value)
            : (await tx.chartAccount.findFirst({ orderBy: { id: "asc" } }))?.id;

          if (coaId) {
            const today = new Date();
            const yearPart = today.getFullYear().toString().slice(-2);
            const monthPart = String(today.getMonth() + 1).padStart(2, "0");
            const latestTx = await tx.transaction.findFirst({
              where: { transaction_number: { startsWith: `TR${yearPart}-${monthPart}` } },
              orderBy: { transaction_number: "desc" },
            });
            let increment = 1;
            if (latestTx) {
              const parts = latestTx.transaction_number.split("-");
              if (parts.length === 3) increment = parseInt(parts[2] ?? "0") + 1;
            }
            const transaction_number = `TR${yearPart}-${monthPart}-${increment.toString().padStart(3, "0")}`;
            await tx.transaction.create({
              data: {
                bank_id: input.balanceAccountId,
                account_id: coaId,
                type: "income",
                file: "",
                description: `Transfer fee: ${subscription.member.user?.name ?? ""} → ${toMemberName} (${subscription.package?.name ?? ""})`,
                transaction_date: today,
                transaction_number,
                amount: transferPrice,
              },
            });
          }
        }

        // Check if old member still has any active subscriptions; deactivate membership if not
        const remainingActiveSubs = await tx.subscription.count({
          where: {
            memberId: subscription.memberId,
            isActive: true,
            deletedAt: null,
          },
        });
        if (remainingActiveSubs === 0) {
          await tx.membership.update({
            where: { id: subscription.memberId },
            data: { isActive: false },
          });
        }

          return updatedSubscription;
        });
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "subscription.transfer",
          method: "PATCH",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  // Upgrade gym membership to a new package
  upgradeGymSimple: permissionProtectedProcedure(["update:subscription"])
    .input(
      z.object({
        subscriptionId: z.string(),
        newPackageId: z.string(),
        newEndDate: z.date(),
        paymentProofPath: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        result = await ctx.db.$transaction(async (tx) => {
        // Verify the subscription exists and is eligible for upgrade
        const subscription = await tx.subscription.findUnique({
          where: { id: input.subscriptionId },
          include: {
            member: {
              include: {
                user: true,
              },
            },
            package: true,
          },
        });

        if (!subscription) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Subscription not found",
          });
        }

        if (!subscription.isActive) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only active subscriptions can be upgraded",
          });
        }

        if (subscription.isFrozen) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot upgrade frozen subscription",
          });
        }

        if (subscription.package.type !== "GYM_MEMBERSHIP") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only gym memberships can be upgraded with this function",
          });
        }

        // Verify the new package exists and is a gym membership
        const newPackage = await tx.package.findUnique({
          where: { id: input.newPackageId },
        });

        if (!newPackage) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "New package not found",
          });
        }

        if (newPackage.type !== "GYM_MEMBERSHIP") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "New package must be a gym membership",
          });
        }

        if (!newPackage.isActive) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "New package is not active",
          });
        }

        if (newPackage.id === subscription.packageId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot upgrade to the same package",
          });
        }

        // Validate new end date
        if (input.newEndDate <= subscription.startDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "New end date must be after subscription start date",
          });
        }

        if (subscription.endDate && input.newEndDate <= subscription.endDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "New end date must be after current subscription end date",
          });
        }

        // Create upgrade record
        await tx.upgradePackage.create({
          data: {
            subscriptionId: subscription.id,
            oldPackageId: subscription.packageId,
            newPackageId: input.newPackageId,
            paymentProofPath: input.paymentProofPath,
            createdBy: ctx.session.user.id,
          },
        });

        // Update the subscription with new package and end date
        const updatedSubscription = await tx.subscription.update({
          where: { id: input.subscriptionId },
          data: {
            packageId: input.newPackageId,
            endDate: input.newEndDate,
          },
          include: {
            member: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
            package: {
              select: {
                id: true,
                name: true,
                price: true,
                type: true,
                point: true,
              },
            },
          },
        });

          return updatedSubscription;
        });
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "subscription.upgradeGymSimple",
          method: "PATCH",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  // Get gym packages for upgrade dropdown
  getGymPackages: permissionProtectedProcedure(["list:subscription"])
    .query(async ({ ctx }) => {
      return ctx.db.package.findMany({
        where: {
          type: "GYM_MEMBERSHIP",
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          price: true,
          point: true,
          day: true,
          description: true,
        },
        orderBy: {
          price: "asc",
        },
      });
    }),

  // List all subscriptions for export (no pagination)
  listAllForExport: permissionProtectedProcedure(["list:subscription"])
    .input(
      z.object({
        salesId: z.string().optional(),
        trainerId: z.string().optional(),
        packageId: z.string().optional(),
        corporateId: z.string().optional(),
        status: z.enum(["all", "active", "inactive"]).optional().default("all"),
        dateFilterType: z.enum(["payment", "startDate", "endDate", "createdAt"]).optional().default("payment"),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const start = input.startDate ? toGMT8StartOfDay(input.startDate) : undefined;
      const end = input.endDate ? toGMT8EndOfDay(input.endDate) : undefined;

      const whereClause: any = {
        // Exclude soft deleted subscriptions
        deletedAt: null,
        // Filter by status if not "all"
        ...(input.status !== "all" && {
          isActive: input.status === "active",
        }),
        OR: [
          { groupMembers: { none: {} } }, // not a group member
          { leadGroupSubscriptions: { some: {} } }, // group leader
        ],
        // Filter by salesId if provided
        ...(input.salesId && {
          salesId: input.salesId,
        }),
        // Filter by trainerId if provided
        ...(input.trainerId && {
          trainerId: input.trainerId,
        }),
        // Filter by packageId if provided
        ...(input.packageId && {
          packageId: input.packageId,
        }),
        // Filter by corporateId: "NONE" = no corporate, else filter by ID
        ...(input.corporateId === "NONE"
          ? { corporateId: null }
          : input.corporateId
          ? { corporateId: input.corporateId }
          : {}),
        // Filter by date range based on selected date field type
        ...((start || end) && (() => {
          const dateFilterType = input.dateFilterType || "payment";
          
          if (dateFilterType === "payment") {
            // Filter by payment paid date (when payment was actually completed)
            return {
              payments: {
                some: {
                  ...(start && {
                    paidAt: { gte: start },
                  }),
                  ...(end && {
                    paidAt: { lte: end },
                  }),
                },
              },
            };
          } else if (dateFilterType === "startDate") {
            // Filter by subscription start date
            return {
              startDate: {
                ...(start && { gte: start }),
                ...(end && { lte: end }),
              },
            };
          } else if (dateFilterType === "endDate") {
            // Filter by subscription end date
            return {
              endDate: {
                ...(start && { gte: start }),
                ...(end && { lte: end }),
              },
            };
          } else if (dateFilterType === "createdAt") {
            // Filter by subscription creation date
            return {
              createdAt: {
                ...(start && { gte: start }),
                ...(end && { lte: end }),
              },
            };
          }
          return {};
        })()),
      };

      const items = await ctx.db.subscription.findMany({
        where: whereClause,
        orderBy: { id: "desc" },
        include: {
          member: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          package: {
            select: {
              id: true,
              name: true,
              price: true,
              type: true,
              point: true,
            },
          },
          corporate: {
            select: { id: true, name: true },
          },
          trainer: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          payments: {
            select: {
              id: true,
              status: true,
              method: true,
              totalPayment: true,
              orderReference: true,
              paidAt: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });

      return items;
    }),

  // Update remaining sessions for a subscription
  updateRemainingSessions: permissionProtectedProcedure(["update:subscription"])
    .input(
      z.object({
        subscriptionId: z.string(),
        remainingSessions: z.number().min(0),
        remainingBonusSessions: z.number().min(0).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        // Verify the subscription exists
        const subscription = await ctx.db.subscription.findUnique({
        where: { id: input.subscriptionId },
        include: {
          package: true,
          member: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!subscription) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscription not found",
        });
      }

      // Check if the package is a personal trainer package
      if (subscription.package.type !== "PERSONAL_TRAINER" && subscription.package.type !== "GROUP_TRAINING" && subscription.package.type !== "CLASS_SESSION") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only session-based packages have remaining sessions",
        });
      }

      // Update the subscription with the new remaining sessions
      const updatedSubscription = await ctx.db.subscription.update({
        where: { id: input.subscriptionId },
        data: {
          remainingSessions: input.remainingSessions,
          ...(input.remainingBonusSessions !== undefined && {
            remainingBonusSessions: input.remainingBonusSessions,
          }),
        },
        include: {
          member: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          package: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          trainer: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

        result = updatedSubscription;
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "subscription.updateRemainingSessions",
          method: "PATCH",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  // Update personal trainer for a subscription
  updateTrainer: permissionProtectedProcedure(["update:subscription"])
    .input(
      z.object({
        subscriptionId: z.string(),
        trainerId: z.string().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        // Verify the subscription exists
        const subscription = await ctx.db.subscription.findUnique({
        where: { id: input.subscriptionId },
        include: {
          package: true,
          member: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!subscription) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscription not found",
        });
      }

      // Check if the package is a personal trainer package
      if (subscription.package.type !== "PERSONAL_TRAINER" && subscription.package.type !== "GROUP_TRAINING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only personal trainer packages can have their trainer updated",
        });
      }

      // Validate that the trainer exists if trainerId is provided
      if (input.trainerId) {
        const trainer = await ctx.db.personalTrainer.findUnique({
          where: { id: input.trainerId },
          include: {
            user: true,
          },
        });

        if (!trainer) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Personal trainer not found",
          });
        }

        if (!trainer.isActive) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Personal trainer is not active",
          });
        }
      }

      // Update the subscription with the new trainer
      const updatedSubscription = await ctx.db.subscription.update({
        where: { id: input.subscriptionId },
        data: {
          trainerId: input.trainerId,
        },
        include: {
          member: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          package: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          trainer: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

        result = updatedSubscription;
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "subscription.updateTrainer",
          method: "PATCH",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  // Count subscriptions with optional filter
  count: permissionProtectedProcedure(["list:subscription"])
    .input(
      z.object({
        where: z.any().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.subscription.count({
        where: input.where,
      });
    }),

  // Get freeze statistics with date filtering
  getFreezeStats: permissionProtectedProcedure(["list:subscription"])
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const start = input.startDate ? toGMT8StartOfDay(input.startDate) : undefined;
      const end = input.endDate ? toGMT8EndOfDay(input.endDate) : undefined;

      const dateFilter = start && end
        ? {
            performedAt: {
              gte: start,
              lte: end,
            },
          }
        : {};

      // Query TransactionFreeze directly — each record is one freeze payment batch.
      // Exclude cancelled freezes: those whose FreezeOperations include a CANCEL_FREEZE.
      const dateFilter2 = start && end
        ? { createdAt: { gte: start, lte: end } }
        : {};

      const freezeTransactions = await ctx.db.transactionFreeze.findMany({
        where: {
          ...dateFilter2,
          freezeOperations: {
            none: {
              operationType: "CANCEL_FREEZE",
            },
          },
        },
        select: {
          amount: true,
        },
      });

      const freezeCount = freezeTransactions.length;
      const totalRevenue = freezeTransactions.reduce((sum, t) => sum + t.amount, 0);

      return {
        freezeCount,
        totalRevenue,
      };
    }),

  // Get admin dashboard statistics with date filtering
  getAdminDashboardStats: permissionProtectedProcedure(["list:subscription"])
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Apply GMT+8 timezone adjustments to dates
      const start = input.startDate ? toGMT8StartOfDay(input.startDate) : undefined;
      const end = input.endDate ? toGMT8EndOfDay(input.endDate) : undefined;

      // Build date filter for payments (consistent with salesReport.ts)
      const paymentDateFilter = start && end
        ? {
            createdAt: {
              gte: start,
              lte: end,
            },
          }
        : {};

      // 1. Active Memberships Count: subscriptions with endDate AFTER filter's end date (excluding frozen)
      const activeMembershipsCount = await ctx.db.subscription.count({
        where: {
          deletedAt: null,
          isActive: true,
          isFrozen: false,
          ...(end && {
            endDate: {
              gt: end,
            },
          }),
        },
      });

      // 2. Get all subscriptions with payments within date range for further analysis
      const subscriptionsInRange = await ctx.db.subscription.findMany({
        where: {
          deletedAt: null,
          payments: {
            some: {
              status: "SUCCESS",
              deletedAt: null,
              ...paymentDateFilter,
            },
          },
        },
        distinct: ['id'], // Ensure we only get unique subscriptions
        include: {
          member: {
            select: {
              id: true,
              userId: true,
            },
          },
          package: {
            select: {
              type: true,
              price: true,
            },
          },
          payments: {
            where: {
              status: "SUCCESS",
              deletedAt: null,
              ...paymentDateFilter,
            },
            select: {
              totalPayment: true,
              createdAt: true,
            },
          },
        },
      });

      // 3. Count Total New Members and Total Renewals
      // Logic: For each subscription in range, check if it's the member's first purchase or a renewal
      let totalNewMembers = 0;
      let totalRenewals = 0;
      
      for (const sub of subscriptionsInRange) {
        const memberId = sub.member.id;
        
        if (sub.package.type !== "GYM_MEMBERSHIP") {
    continue;
  }
  
        // Get all subscriptions for this member before the current one (by startDate)
        const previousSubscriptionsCount = await ctx.db.subscription.count({
          where: {
            memberId: memberId,
            deletedAt: null,
            package:{
              type: "GYM_MEMBERSHIP",
            },
            startDate: {
              lt: sub.startDate, // All subscriptions that started before this one
            },
          },
        });
        
        if (previousSubscriptionsCount === 0) {
          // This is the member's first subscription (new member)
          totalNewMembers++;
        } else {
          // This member has purchased before (renewal)
          totalRenewals++;
        }
      }

      // 5. Subscription Type Breakdown
      const subscriptionTypeBreakdown = {
        MEMBERSHIP: { count: 0, revenue: 0 },
        PERSONAL_TRAINER: { count: 0, revenue: 0 },
        GROUP_TRAINER: { count: 0, revenue: 0 },
        CLASS_SESSION: { count: 0, revenue: 0 },
      };

      for (const sub of subscriptionsInRange) {
        const packageType = sub.package.type;
        const revenue = sub.payments.reduce((sum, payment) => sum + payment.totalPayment, 0);

        if (packageType === "GYM_MEMBERSHIP") {
          subscriptionTypeBreakdown.MEMBERSHIP.count++;
          subscriptionTypeBreakdown.MEMBERSHIP.revenue += revenue;
        } else if (packageType === "PERSONAL_TRAINER") {
          subscriptionTypeBreakdown.PERSONAL_TRAINER.count++;
          subscriptionTypeBreakdown.PERSONAL_TRAINER.revenue += revenue;
        } else if (packageType === "GROUP_TRAINING") {
          subscriptionTypeBreakdown.GROUP_TRAINER.count++;
          subscriptionTypeBreakdown.GROUP_TRAINER.revenue += revenue;
        } else if (packageType === "CLASS_SESSION") {
          subscriptionTypeBreakdown.CLASS_SESSION.count++;
          subscriptionTypeBreakdown.CLASS_SESSION.revenue += revenue;
        }
      }

      return {
        activeMembershipsCount,
        totalRenewals,
        totalNewMembers,
        subscriptionTypeBreakdown,
      };
    }),

  // Get transfer history for a specific subscription
  getTransferHistory: permissionProtectedProcedure(["list:subscription"])
    .input(z.object({ subscriptionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const transferHistory = await ctx.db.subscriptionTransferHistory.findMany({
        where: {
          subscriptionId: input.subscriptionId,
        },
        include: {
          fromMember: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return transferHistory;
    }),

  // List all transfer history with pagination and filters (for admin page)
  listAllTransferHistory: permissionProtectedProcedure(["list:subscription"])
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        memberId: z.string().optional(),
        memberSearch: z.string().optional(),
        showCancelled: z.boolean().optional().default(true),
      }),
    )
    .query(async ({ ctx, input }) => {
      const whereClause: any = {
        ...(input.memberId && {
          fromMemberId: input.memberId,
        }),
        ...(input.startDate && {
          createdAt: {
            gte: input.startDate,
          },
        }),
        ...(input.endDate && {
          createdAt: {
            ...((input.startDate && { gte: input.startDate }) || {}),
            lte: input.endDate,
          },
        }),
        // Filter by cancelled status
        ...(!input.showCancelled && {
          isCancelled: false,
        }),
        // Search by member name or email
        ...(input.memberSearch && {
          OR: [
            {
              fromMemberName: {
                contains: input.memberSearch,
                mode: "insensitive" as const,
              },
            },
            {
              fromMember: {
                user: {
                  email: {
                    contains: input.memberSearch,
                    mode: "insensitive" as const,
                  },
                },
              },
            },
            {
              subscription: {
                member: {
                  user: {
                    OR: [
                      {
                        name: {
                          contains: input.memberSearch,
                          mode: "insensitive" as const,
                        },
                      },
                      {
                        email: {
                          contains: input.memberSearch,
                          mode: "insensitive" as const,
                        },
                      },
                    ],
                  },
                },
              },
            },
          ],
        }),
      };

      const items = await ctx.db.subscriptionTransferHistory.findMany({
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        where: whereClause,
        include: {
          subscription: {
            include: {
              package: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  price: true,
                },
              },
              member: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      phone: true,
                    },
                  },
                },
              },
            },
          },
          fromMember: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const total = await ctx.db.subscriptionTransferHistory.count({
        where: whereClause,
      });

      // Add fromMemberEmail to each item for easier access
      const itemsWithEmail = items.map(item => ({
        ...item,
        fromMemberEmail: item.fromMember?.user?.email || "",
      }));

      return {
        items: itemsWithEmail,
        total,
        page: input.page,
        limit: input.limit,
      };
    }),

  // Cancel a subscription transfer
  cancelTransfer: permissionProtectedProcedure(["update:subscription"])
    .input(
      z.object({
        transferHistoryId: z.string(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        result = await ctx.db.$transaction(async (tx) => {
        // Find the transfer history record
        const transferHistory = await tx.subscriptionTransferHistory.findUnique({
          where: { id: input.transferHistoryId },
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
            fromMember: {
              include: {
                user: true,
              },
            },
          },
        });

        if (!transferHistory) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Transfer history record not found",
          });
        }

        // Check if already cancelled
        if (transferHistory.isCancelled) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This transfer has already been cancelled",
          });
        }

        // Block cancel if subscription was transferred again AFTER this transfer
        const laterTransfer = await tx.subscriptionTransferHistory.findFirst({
          where: {
            subscriptionId: transferHistory.subscriptionId,
            isCancelled: false,
            createdAt: { gt: transferHistory.createdAt },
          },
        });
        if (laterTransfer) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot cancel this transfer because the subscription has been transferred again afterwards. Cancel the latest transfer first.",
          });
        }

        // Transfer the subscription BACK to the original member (fromMemberId)
        await tx.subscription.update({
          where: { id: transferHistory.subscriptionId },
          data: {
            memberId: transferHistory.fromMemberId,
          },
        });

        // Transfer points back: Remove from current owner (with floor 0), add back to original owner
        if (transferHistory.transferredPoint > 0) {
          const currentMemberUserId = transferHistory.subscription.member.userId;
          const currentUser = await tx.user.findUnique({
            where: { id: currentMemberUserId },
            select: { point: true },
          });
          const safeDecrement = Math.min(transferHistory.transferredPoint, currentUser?.point ?? 0);
          if (safeDecrement > 0) {
            await tx.user.update({
              where: { id: currentMemberUserId },
              data: { point: { decrement: safeDecrement } },
            });
          }

          const originalMemberUserId = transferHistory.fromMember.userId;
          await tx.user.update({
            where: { id: originalMemberUserId },
            data: { point: { increment: transferHistory.transferredPoint } },
          });
        }

        // Reactivate original member's membership if it was deactivated
        const originalMembership = await tx.membership.findUnique({
          where: { id: transferHistory.fromMemberId },
          select: { isActive: true },
        });
        if (originalMembership && !originalMembership.isActive) {
          await tx.membership.update({
            where: { id: transferHistory.fromMemberId },
            data: { isActive: true },
          });
        }

        // Check if current holder still has other active subs; if not, deactivate their membership
        const toMemberId = (transferHistory as any).toMemberId as string | null;
        if (toMemberId) {
          const remainingActiveSubs = await tx.subscription.count({
            where: {
              memberId: toMemberId,
              isActive: true,
              deletedAt: null,
            },
          });
          if (remainingActiveSubs === 0) {
            await tx.membership.update({
              where: { id: toMemberId },
              data: { isActive: false },
            });
          }
        }

        // Mark the transfer history as cancelled
        const updatedTransferHistory = await tx.subscriptionTransferHistory.update({
          where: { id: input.transferHistoryId },
          data: {
            isCancelled: true,
            cancelledAt: new Date(),
            cancelledBy: ctx.session.user.id,
            cancelReason: input.reason || null,
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
            fromMember: {
              include: {
                user: true,
              },
            },
          },
        });

          return {
            success: true,
            message: "Transfer cancelled successfully. Subscription returned to original member.",
            transferHistory: updatedTransferHistory,
          };
        });
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "subscription.cancelTransfer",
          method: "PATCH",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  // List all freeze operations grouped by member (for admin freeze history page)
  listFreezeHistory: permissionProtectedProcedure(["list:subscription"])
    .input(
      z.object({
        memberId: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        operationType: z.enum(["all", "FREEZE", "UNFREEZE", "CANCEL_FREEZE"]).optional().default("all"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const hasManageMemberPermission =
        ctx.permissions?.includes("manage:member") ||
        ctx.permissions?.includes("list:member") ||
        ctx.permissions?.includes("update:member");

      let effectiveMemberId = input.memberId;

      if (!hasManageMemberPermission) {
        const ownMembership = await ctx.db.membership.findFirst({
          where: {
            userId: ctx.session.user.id,
          },
          select: {
            id: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        });

        if (!ownMembership) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Membership not found for current user",
          });
        }

        if (input.memberId && input.memberId !== ownMembership.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized to view freeze history for this member",
          });
        }

        effectiveMemberId = ownMembership.id;
      }

      // Build the where clause for freeze operations
      const whereClause: any = {
        ...(effectiveMemberId && {
          memberId: effectiveMemberId,
        }),
        ...(input.operationType !== "all" && {
          operationType: input.operationType,
        }),
      };

      // Apply date filter on performedAt
      if (input.startDate || input.endDate) {
        whereClause.performedAt = {};
        if (input.startDate) {
          whereClause.performedAt.gte = input.startDate;
        }
        if (input.endDate) {
          whereClause.performedAt.lte = input.endDate;
        }
      }

      // Get all freeze operations with member info
      const allOperations = await ctx.db.freezeOperation.findMany({
        where: whereClause,
        include: {
          member: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          subscription: {
            include: {
              package: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
          transactionFreeze: true,
          performedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          performedAt: "desc",
        },
      });

      // Group operations by member and transactionFreezeId (or by member + performedAt for free freezes)
      const groupedMap = new Map<string, any>();

      for (const operation of allOperations) {
        // Create a unique key for grouping:
        // - If there's a transactionFreeze, group by memberId + transactionFreezeId (paid freezes)
        // - Otherwise, group by memberId + operationType + performedAt (rounded to second) for free freezes/unfreezes
        let groupKey: string;
        if (operation.transactionFreezeId) {
          groupKey = `${operation.memberId}_${operation.transactionFreezeId}`;
        } else {
          // Round performedAt to the second to group operations that happened at nearly the same time
          const roundedTime = new Date(operation.performedAt);
          roundedTime.setMilliseconds(0);
          groupKey = `${operation.memberId}_${operation.operationType}_${roundedTime.toISOString()}`;
        }

        if (!groupedMap.has(groupKey)) {
          groupedMap.set(groupKey, {
            id: groupKey,
            memberId: operation.memberId,
            memberName: operation.member.user?.name || "Unknown",
            memberEmail: operation.member.user?.email || "",
            operationType: operation.operationType,
            performedAt: operation.performedAt,
            performedBy: operation.performedBy,
            freezeDays: operation.freezeDays,
            price: operation.price,
            transactionFreeze: operation.transactionFreeze,
            subscriptions: [],
          });
        }

        // Add this subscription to the group
        groupedMap.get(groupKey)!.subscriptions.push({
          id: operation.subscription.id,
          packageName: operation.subscription.package.name,
          packageType: operation.subscription.package.type,
          startDate: operation.subscription.startDate,
          endDate: operation.subscription.endDate,
          isFrozen: operation.subscription.isFrozen,
          frozenAt: operation.subscription.frozenAt,
          freezeDays: operation.subscription.freezeDays,
          freezeMode: operation.subscription.freezeMode,
        });
      }

      // Convert map to array and sort by performedAt
      const grouped = Array.from(groupedMap.values()).sort(
        (a, b) => b.performedAt.getTime() - a.performedAt.getTime()
      );

      // Apply pagination
      const total = grouped.length;
      const startIndex = (input.page - 1) * input.limit;
      const endIndex = startIndex + input.limit;
      const items = grouped.slice(startIndex, endIndex);

      return {
        items,
        total,
        page: input.page,
        limit: input.limit,
      };
    }),

  // Cancel freeze operation - reverse/undo freeze
  cancelFreeze: permissionProtectedProcedure(["update:subscription"])
    .input(
      z.object({
        memberId: z.string(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        result = await ctx.db.$transaction(async (tx) => {
        // Find member
        const member = await tx.membership.findUnique({
          where: { id: input.memberId },
          include: { user: true },
        });

        if (!member) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Member not found",
          });
        }

        // Find all subscriptions with freeze data (either currently frozen OR have freeze history)
        const subscriptionsWithFreeze = await tx.subscription.findMany({
          where: {
            memberId: input.memberId,
            deletedAt: null,
            OR: [
              { isFrozen: true }, // Currently frozen
              { freezeAtStart: true }, // Was frozen at start
              { freezeDays: { gt: 0 } }, // Has freeze days
            ],
          },
          include: {
            package: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        });

        if (subscriptionsWithFreeze.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No subscriptions with freeze data found for this member",
          });
        }

        const now = new Date();
        let cancelledCount = 0;
        const affectedSubscriptions: any[] = [];

        // Process each subscription
        for (const subscription of subscriptionsWithFreeze) {
          // Only process if it has freeze data
          const hasFreezeDays = subscription.freezeDays && subscription.freezeDays > 0;
          const hasFreezeAtStart = subscription.freezeAtStart === true;
          
          if (!hasFreezeDays && !hasFreezeAtStart) {
            continue; // Skip subscriptions without freeze data
          }

          // Determine if the freeze is scheduled (future start) or already active
          const isFutureFreeze = subscription.frozenAt && subscription.frozenAt > now && !subscription.isFrozen;

          // Calculate original end date by subtracting freeze days
          // Only applicable if the freeze is ACTIVE (isFrozen: true) and endDate was already extended
          let originalEndDate = subscription.endDate;
          if (!isFutureFreeze && originalEndDate && subscription.freezeDays && subscription.freezeDays > 0 && subscription.isFrozen) {
            originalEndDate = new Date(originalEndDate);
            originalEndDate.setDate(originalEndDate.getDate() - subscription.freezeDays);
          }

          // Update the subscription - reset all freeze fields
          const updatedSubscription = await tx.subscription.update({
            where: { id: subscription.id },
            data: {
              freezeAtStart: false,
              freezeDays: null,
              isFrozen: false,
              frozenAt: null,
              freezeMode: null,
              remainingDays: null,
              // Restore original end date only if freeze was active (not future-scheduled)
              // ...(!isFutureFreeze && originalEndDate && { endDate: originalEndDate }),
            },
          });

          affectedSubscriptions.push({
            id: updatedSubscription.id,
            packageName: subscription.package.name,
            originalEndDate,
            previousEndDate: subscription.endDate,
          });

          cancelledCount++;
        }

        // Update the existing FREEZE FreezeOperation records to CANCEL_FREEZE
        // instead of creating new records — so history shows a single updated entry
        for (const sub of affectedSubscriptions) {
          // Find the most recent FREEZE operation for this subscription
          const existingFreezeOp = await tx.freezeOperation.findFirst({
            where: {
              subscriptionId: sub.id,
              memberId: input.memberId,
              operationType: "FREEZE",
            },
            orderBy: { performedAt: "desc" },
          });

          if (existingFreezeOp) {
            // Update the existing freeze operation to CANCEL_FREEZE
            await tx.freezeOperation.update({
              where: { id: existingFreezeOp.id },
              data: {
                operationType: "CANCEL_FREEZE",
              },
            });
          }
        }

          return {
            success: true,
            message: `Successfully cancelled freeze for ${cancelledCount} subscription(s)`,
            count: cancelledCount,
            memberId: input.memberId,
            memberName: member.user?.name || "Unknown",
            affectedSubscriptions,
          };
        });
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "subscription.cancelFreeze",
          method: "PATCH",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  // Get aggregate transfer statistics for admin dashboard
  getTransferStats: permissionProtectedProcedure(["list:subscription"])
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const whereClause: any = {
        isCancelled: false, // Only count non-cancelled transfers
      };

      // Apply date filters
      if (input.startDate || input.endDate) {
        whereClause.createdAt = {};
        if (input.startDate) {
          whereClause.createdAt.gte = input.startDate;
        }
        if (input.endDate) {
          whereClause.createdAt.lte = input.endDate;
        }
      }

      // Get total count of transfers
      const totalTransfers = await ctx.db.subscriptionTransferHistory.count({
        where: whereClause,
      });

      // Get aggregate data
      const aggregateData = await ctx.db.subscriptionTransferHistory.aggregate({
        where: whereClause,
        _sum: {
          transferredPoint: true,
          amount: true,
        },
        _avg: {
          amount: true,
        },
      });

      // Get date range of transfers
      const dateRange = await ctx.db.subscriptionTransferHistory.findMany({
        where: whereClause,
        select: {
          createdAt: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: 1,
      });

      const latestTransfer = await ctx.db.subscriptionTransferHistory.findMany({
        where: whereClause,
        select: {
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      });

      return {
        totalTransfers,
        totalPoints: aggregateData._sum.transferredPoint ?? 0,
        totalRevenue: aggregateData._sum.amount ?? 0,
        averageAmount: aggregateData._avg.amount ?? 0,
        earliestTransfer: dateRange[0]?.createdAt ?? null,
        latestTransfer: latestTransfer[0]?.createdAt ?? null,
      };
    }),

  // List subscriptions expiring within the next N days
  getExpiringSubscriptions: permissionProtectedProcedure(["list:subscription"])
    .input(z.object({ days: z.number().min(1).max(30).default(7) }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const cutoff = new Date(now.getTime() + input.days * 24 * 60 * 60 * 1000);

      const subs = await ctx.db.subscription.findMany({
        where: {
          isActive: true,
          isFrozen: false,
          deletedAt: null,
          endDate: { gte: now, lte: cutoff },
        },
        orderBy: { endDate: "asc" },
        select: {
          id: true,
          endDate: true,
          isReminder: true,
          reminderStage: true,
          reminderAt: true,
          salesId: true,
          salesType: true,
          member: {
            select: {
              id: true,
              user: { select: { name: true, email: true } },
            },
          },
          package: { select: { name: true, type: true } },
          trainer: {
            select: { user: { select: { name: true } } },
          },
        },
      });

      // Batch-resolve sales names (salesId can be PT id or FC id)
      const ptSalesIds = subs
        .filter((s) => s.salesType === "PersonalTrainer" && s.salesId)
        .map((s) => s.salesId!);
      const fcSalesIds = subs
        .filter((s) => s.salesType === "FC" && s.salesId)
        .map((s) => s.salesId!);

      const [ptSales, fcSales] = await Promise.all([
        ptSalesIds.length
          ? ctx.db.personalTrainer.findMany({
              where: { id: { in: ptSalesIds } },
              select: { id: true, user: { select: { name: true } } },
            })
          : [],
        fcSalesIds.length
          ? ctx.db.fC.findMany({
              where: { id: { in: fcSalesIds } },
              select: { id: true, user: { select: { name: true } } },
            })
          : [],
      ]);

      const ptMap = new Map(ptSales.map((pt) => [pt.id, pt.user.name]));
      const fcMap = new Map(fcSales.map((fc) => [fc.id, fc.user.name]));

      return subs.map((s) => {
        let salesName: string | null = null;
        if (s.salesType === "PersonalTrainer" && s.salesId) {
          salesName = ptMap.get(s.salesId) ?? null;
        } else if (s.salesType === "FC" && s.salesId) {
          salesName = fcMap.get(s.salesId) ?? null;
        }
        return {
          ...s,
          trainerName: s.trainer?.user?.name ?? null,
          salesName,
        };
      });
    }),

  // Send H-7 expiry reminder email for a specific subscription (manual trigger)
  sendExpiryReminderForSub: permissionProtectedProcedure(["list:subscription"])
    .input(z.object({ subscriptionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sub = await ctx.db.subscription.findUnique({
        where: { id: input.subscriptionId },
        select: {
          id: true,
          endDate: true,
          member: {
            select: {
              id: true,
              user: { select: { name: true, email: true } },
            },
          },
          package: { select: { name: true } },
        },
      });

      if (!sub) throw new TRPCError({ code: "NOT_FOUND", message: "Subscription tidak ditemukan" });

      const memberEmail = sub.member?.user?.email;
      if (!memberEmail) throw new TRPCError({ code: "BAD_REQUEST", message: "Member tidak memiliki email" });

      const memberName = sub.member?.user?.name ?? "Member";
      const packageName = sub.package?.name ?? "Gym Membership";
      const expiryDate = sub.endDate
        ? format(sub.endDate, "d MMMM yyyy")
        : "-";

      const emailConfig = await ctx.db.emailConfig.findFirst({ where: { isActive: true } });
      const baseUrl = process.env.NEXTAUTH_URL ?? "https://fitinfinity.com";
      const supportEmail = emailConfig?.supportEmail ?? "support@fitinfinity.com";
      const supportPhone = emailConfig?.supportPhone ?? "-";
      const logoUrl = emailConfig?.logoUrl ?? "";
      const address = emailConfig?.businessAddress ?? "";

      const waDigits = supportPhone.replace(/\D/g, "");
      const waIntl = waDigits.startsWith("0") ? "62" + waDigits.slice(1) : waDigits;
      const waMessage = `Halo Admin, saya\nNama : ${memberName}\nEmail : ${memberEmail}\nPaket yang akan expired : ${packageName}\n\nIngin melakukan renewal, apakah bisa dibantu?`;
      const waUrl = `https://wa.me/${waIntl}?text=${encodeURIComponent(waMessage)}`;

      const dbTemplate = await ctx.db.emailTemplate.findFirst({
        where: { type: "SUBSCRIPTION_EXPIRY", isActive: true },
      });

      if (dbTemplate?.id) {
        await emailService.sendEmail({
          to: memberEmail,
          templateId: dbTemplate.id,
          templateData: {
            memberName,
            memberEmail,
            packageName,
            expiryDate,
            renewalUrl: `${baseUrl}/member/payment-history`,
            waUrl,
            logoUrl,
            supportEmail,
            supportPhone,
            address,
            currentYear: new Date().getFullYear().toString(),
          },
        });
      } else {
        // Render template dari file
        const { readFileSync } = await import("fs");
        const { join } = await import("path");
        let templateHtml = "";
        try {
          templateHtml = readFileSync(
            join(process.cwd(), "src/lib/email/templates/subscription-expiry.html"),
            "utf-8",
          );
        } catch {
          templateHtml = `<p>Halo <strong>{{memberName}}</strong>, membership <strong>{{packageName}}</strong> akan berakhir pada <strong>{{expiryDate}}</strong>. <a href="{{renewalUrl}}">Perpanjang sekarang</a>.</p>`;
        }
        const vars: Record<string, string> = {
          memberName,
          memberEmail,
          packageName,
          expiryDate,
          renewalUrl: `${baseUrl}/member/payment-history`,
          waUrl,
          logoUrl,
          supportEmail,
          supportPhone,
          address,
          currentYear: new Date().getFullYear().toString(),
        };
        const html = templateHtml.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
        await emailService.sendEmail({
          to: memberEmail,
          subject: `⏰ Membership kamu akan habis dalam 7 hari — ${packageName}`,
          html,
        });
      }

      // Update reminder flag
      await ctx.db.subscription.update({
        where: { id: sub.id },
        data: { isReminder: true, reminderAt: new Date(), reminderStage: 1 },
      });

      return { success: true, sentTo: memberEmail };
    }),

  // List subscriptions that were unfrozen today
  getUnfrozenToday: permissionProtectedProcedure(["list:subscription"])
    .query(async ({ ctx }) => {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const ops = await ctx.db.freezeOperation.findMany({
        where: {
          operationType: "UNFREEZE",
          performedAt: { gte: startOfDay, lte: endOfDay },
        },
        orderBy: { performedAt: "desc" },
        select: {
          id: true,
          performedAt: true,
          freezeDays: true,
          subscription: {
            select: {
              id: true,
              endDate: true,
              package: { select: { name: true, type: true } },
              member: {
                select: {
                  id: true,
                  user: { select: { name: true, email: true } },
                },
              },
            },
          },
        },
      });

      // Deduplicate per member — satu member bisa punya banyak paket terunfreeze
      const memberMap = new Map<string, {
        memberId: string;
        memberName: string;
        memberEmail: string;
        latestOpId: string;
        performedAt: Date;
        totalFreezeDays: number;
        packages: { name: string; type: string; freezeDays: number; endDate: Date | null }[];
      }>();

      for (const op of ops) {
        const memberId = op.subscription?.member?.id;
        if (!memberId) continue;
        const existing = memberMap.get(memberId);
        const pkg = op.subscription?.package
          ? {
              name: op.subscription.package.name,
              type: op.subscription.package.type,
              freezeDays: op.freezeDays,
              endDate: op.subscription.endDate ?? null,
            }
          : null;
        if (existing) {
          if (pkg) existing.packages.push(pkg);
          existing.totalFreezeDays += op.freezeDays;
        } else {
          memberMap.set(memberId, {
            memberId,
            memberName: op.subscription?.member?.user?.name ?? "-",
            memberEmail: op.subscription?.member?.user?.email ?? "-",
            latestOpId: op.id,
            performedAt: op.performedAt,
            totalFreezeDays: op.freezeDays,
            packages: pkg ? [pkg] : [],
          });
        }
      }

      return Array.from(memberMap.values());
    }),

  // Send unfreeze notification email
  sendUnfreezeNotification: permissionProtectedProcedure(["list:subscription"])
    .input(z.object({ freezeOperationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const op = await ctx.db.freezeOperation.findUnique({
        where: { id: input.freezeOperationId },
        select: {
          freezeDays: true,
          performedAt: true,
          subscription: {
            select: {
              id: true,
              endDate: true,
              package: { select: { name: true } },
              member: {
                select: {
                  id: true,
                  user: { select: { name: true, email: true } },
                },
              },
            },
          },
        },
      });

      if (!op) throw new TRPCError({ code: "NOT_FOUND", message: "Data tidak ditemukan" });

      const memberEmail = op.subscription?.member?.user?.email;
      if (!memberEmail) throw new TRPCError({ code: "BAD_REQUEST", message: "Member tidak memiliki email" });

      const memberName = op.subscription?.member?.user?.name ?? "Member";
      const unfreezedAt = format(op.performedAt, "d MMMM yyyy");

      // Ambil semua paket terunfreeze hari ini untuk member yang sama
      const memberId = op.subscription?.member?.id;
      const startOfDay = new Date(op.performedAt.getFullYear(), op.performedAt.getMonth(), op.performedAt.getDate(), 0, 0, 0);
      const endOfDay   = new Date(op.performedAt.getFullYear(), op.performedAt.getMonth(), op.performedAt.getDate(), 23, 59, 59, 999);

      const allOps = memberId
        ? await ctx.db.freezeOperation.findMany({
            where: { operationType: "UNFREEZE", performedAt: { gte: startOfDay, lte: endOfDay }, memberId },
            select: {
              freezeDays: true,
              subscription: { select: { endDate: true, package: { select: { name: true } } } },
            },
          })
        : [{ freezeDays: op.freezeDays, subscription: op.subscription }];

      const totalFreezeDays = allOps.reduce((sum, o) => sum + o.freezeDays, 0);

      // Build HTML rows untuk setiap paket
      const packagesHtml = allOps.map((o) => {
        const pkgName = o.subscription?.package?.name ?? "-";
        const endDate = o.subscription?.endDate
          ? format(o.subscription.endDate, "d MMMM yyyy")
          : "-";
        return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:10px;">
          <tr>
            <td width="50%" style="padding:0 8px 0 0;vertical-align:top;">
              <p style="margin:0 0 4px;color:#666666;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Paket</p>
              <p style="margin:0;color:#ffffff;font-size:14px;font-weight:700;">${pkgName}</p>
            </td>
            <td width="25%" style="padding:0 8px 0 0;vertical-align:top;">
              <p style="margin:0 0 4px;color:#666666;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Freeze</p>
              <p style="margin:0;color:#ffffff;font-size:14px;font-weight:700;">${o.freezeDays} hari</p>
            </td>
            <td width="25%" style="vertical-align:top;text-align:right;">
              <p style="margin:0 0 4px;color:#666666;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Aktif Hingga</p>
              <p style="margin:0;color:#C9D953;font-size:14px;font-weight:700;">${endDate}</p>
            </td>
          </tr>
        </table>`;
      }).join(`<div style="height:1px;background:#2a2a2a;margin:4px 0 10px;"></div>`);

      const emailConfig = await ctx.db.emailConfig.findFirst({ where: { isActive: true } });
      const supportEmail = emailConfig?.supportEmail ?? "support@fitinfinity.com";
      const supportPhone = emailConfig?.supportPhone ?? "-";
      const logoUrl = emailConfig?.logoUrl ?? "";
      const address = emailConfig?.businessAddress ?? "";

      const { readFileSync } = await import("fs");
      const { join } = await import("path");
      let templateHtml = "";
      try {
        templateHtml = readFileSync(
          join(process.cwd(), "src/lib/email/templates/subscription-unfreeze.html"),
          "utf-8",
        );
      } catch {
        templateHtml = `<p>Halo <strong>{{memberName}}</strong>, membership kamu telah aktif kembali per <strong>{{unfreezedAt}}</strong>.</p>{{packagesHtml}}`;
      }
      const vars: Record<string, string> = {
        memberName,
        memberEmail,
        unfreezedAt,
        freezeDays: String(totalFreezeDays),
        packagesHtml,
        logoUrl,
        supportEmail,
        supportPhone,
        address,
        currentYear: new Date().getFullYear().toString(),
      };
      const html = templateHtml.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");

      await emailService.sendEmail({
        to: memberEmail,
        subject: `✅ Membership kamu telah aktif kembali — ${memberName}`,
        html,
      });

      return { success: true, sentTo: memberEmail };
    }),

  // Chart data: monthly revenue, new members, and package distribution for last N months
  getChartData: permissionProtectedProcedure(["list:subscription"])
    .input(z.object({ months: z.number().min(1).max(24).default(6) }))
    .query(async ({ ctx, input }) => {
      const { months } = input;
      const now = new Date();

      // Build array of month buckets (oldest → newest)
      const buckets = Array.from({ length: months }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
        return {
          label: d.toLocaleString("id-ID", { month: "short", year: "2-digit" }),
          start: new Date(d.getFullYear(), d.getMonth(), 1),
          end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
        };
      });

      const since = buckets[0]!.start;

      // Fetch all successful payments in window
      const payments = await ctx.db.payment.findMany({
        where: {
          status: "SUCCESS",
          createdAt: { gte: since },
          subscription: { deletedAt: null },
        },
        select: {
          totalPayment: true,
          createdAt: true,
          subscription: { select: { package: { select: { type: true } } } },
        },
      });

      // New members = members whose FIRST GYM_MEMBERSHIP subscription (by startDate)
      // falls within the month. Matches the "Total New Members" stat card definition
      // (first-ever gym membership; excludes renewals and mere account registration).
      // Note: query all-time (not just `since`) so we can correctly detect the FIRST one.
      const firstGymSubs = await ctx.db.subscription.groupBy({
        by: ["memberId"],
        where: { deletedAt: null, package: { type: "GYM_MEMBERSHIP" } },
        _min: { startDate: true },
      });

      // Aggregate into buckets
      const monthlyRevenue = buckets.map((b) => {
        const total = payments
          .filter((p) => p.createdAt >= b.start && p.createdAt <= b.end)
          .reduce((sum, p) => sum + p.totalPayment, 0);
        return { month: b.label, revenue: total };
      });

      const monthlyNewMembers = buckets.map((b) => {
        const count = firstGymSubs.filter((s) => {
          const first = s._min.startDate;
          return first != null && first >= b.start && first <= b.end;
        }).length;
        return {
          month: b.label,
          members: count,
          year: b.start.getFullYear(),
          monthIndex: b.start.getMonth(),
        };
      });

      // Package type distribution (all time active)
      const packageDist = await ctx.db.subscription.groupBy({
        by: ["packageId"],
        where: { isActive: true, deletedAt: null },
        _count: { id: true },
      });

      const packageDetails = await ctx.db.package.findMany({
        where: { id: { in: packageDist.map((p) => p.packageId) } },
        select: { id: true, type: true, name: true },
      });

      const typeMap: Record<string, number> = {};
      for (const p of packageDist) {
        const pkg = packageDetails.find((d) => d.id === p.packageId);
        const type = pkg?.type ?? "OTHER";
        typeMap[type] = (typeMap[type] ?? 0) + p._count.id;
      }

      const packageDistribution = Object.entries(typeMap).map(([type, count]) => ({
        type,
        count,
      }));

      return { monthlyRevenue, monthlyNewMembers, packageDistribution };
    }),

  // Monthly retention / renewal breakdown for the last N months.
  // For each GYM_MEMBERSHIP subscription that STARTED in a month we classify it:
  //   - "new"     → it is the member's first-ever gym subscription
  //   - "renewal" → member perpanjang dalam 30 hari setelah expire (continuous)
  //   - "rejoin" → member kembali setelah >30 hari expire (win-back)
  // renewalRate = (renewals + rejoin) / total * 100 for that month.
  getRetentionByMonth: permissionProtectedProcedure(["list:subscription"])
    .input(z.object({ months: z.number().min(1).max(24).default(6) }))
    .query(async ({ ctx, input }) => {
      const { months } = input;
      const now = new Date();
      const REJOIN_THRESHOLD_DAYS = 30;

      const buckets = Array.from({ length: months }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
        return {
          label: d.toLocaleString("id-ID", { month: "short", year: "2-digit" }),
          start: new Date(d.getFullYear(), d.getMonth(), 1),
          end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
          year: d.getFullYear(),
          monthIndex: d.getMonth(),
          newMembers: 0,
          renewals: 0,
          rejoin: 0,
        };
      });

      const bucketFor = (date: Date) =>
        buckets.find((b) => date >= b.start && date <= b.end);

      // All gym subscriptions (all-time) with start + end dates.
      const gymSubs = await ctx.db.subscription.findMany({
        where: { deletedAt: null, package: { type: "GYM_MEMBERSHIP" } },
        select: { memberId: true, startDate: true, endDate: true },
      });

      // Group subs per member, sorted by startDate.
      const byMember = new Map<string, { startDate: Date; endDate: Date | null }[]>();
      for (const s of gymSubs) {
        if (!s.startDate) continue;
        const arr = byMember.get(s.memberId) ?? [];
        arr.push({ startDate: s.startDate, endDate: s.endDate });
        byMember.set(s.memberId, arr);
      }

      for (const subs of byMember.values()) {
        subs.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
        subs.forEach((sub, idx) => {
          const bucket = bucketFor(sub.startDate);
          if (!bucket) return;
          if (idx === 0) {
            bucket.newMembers += 1;
          } else {
            // Check gap between previous sub's endDate and this sub's startDate
            const prevEnd = subs[idx - 1]!.endDate;
            if (prevEnd) {
              const gapDays = Math.floor(
                (sub.startDate.getTime() - prevEnd.getTime()) / (24 * 60 * 60 * 1000),
              );
              if (gapDays > REJOIN_THRESHOLD_DAYS) {
                bucket.rejoin += 1;
              } else {
                bucket.renewals += 1;
              }
            } else {
              bucket.renewals += 1;
            }
          }
        });
      }

      return buckets.map((b) => {
        const total = b.newMembers + b.renewals + b.rejoin;
        return {
          month: b.label,
          year: b.year,
          monthIndex: b.monthIndex,
          newMembers: b.newMembers,
          renewals: b.renewals,
          rejoin: b.rejoin,
          total,
          renewalRate: total > 0 ? Math.round((b.renewals / total) * 1000) / 10 : 0,
          rejoinRate: total > 0 ? Math.round((b.rejoin / total) * 1000) / 10 : 0,
          newMemberRate: total > 0 ? Math.round((b.newMembers / total) * 1000) / 10 : 0,
        };
      });
    }),

  // Monthly Churn Rate (based on expiry).
  //   For each month, find unique members whose GYM subscription expired.
  //   A member is "churned" only if they have NO subsequent GYM subscription
  //   after the expired one (truly gone — never came back).
  //   churnRate = churned / totalExpiring * 100
  //   Deduplicated per member per month.
  getTrueRetentionByMonth: permissionProtectedProcedure(["list:subscription"])
    .input(
      z.object({
        months: z.number().min(1).max(24).default(6),
        graceDays: z.number().min(0).max(120).default(45),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { months } = input;
      const now = new Date();

      const buckets = Array.from({ length: months }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
        return {
          label: d.toLocaleString("id-ID", { month: "short", year: "2-digit" }),
          start: new Date(d.getFullYear(), d.getMonth(), 1),
          end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
          year: d.getFullYear(),
          monthIndex: d.getMonth(),
          totalExpiring: 0,
          churned: 0,
        };
      });

      const bucketFor = (date: Date) =>
        buckets.find((b) => date >= b.start && date <= b.end);

      const gymSubs = await ctx.db.subscription.findMany({
        where: { deletedAt: null, package: { type: "GYM_MEMBERSHIP" } },
        select: { memberId: true, startDate: true, endDate: true, isFrozen: true, isActive: true },
      });

      // Exclude members who still have active or frozen sub
      const membersWithActiveOrFrozen = new Set<string>();
      for (const s of gymSubs) {
        if (s.isActive || s.isFrozen) {
          membersWithActiveOrFrozen.add(s.memberId);
        }
      }

      // Group start dates per member for follow-up lookup.
      const startsByMember = new Map<string, number[]>();
      for (const s of gymSubs) {
        if (!s.startDate) continue;
        const arr = startsByMember.get(s.memberId) ?? [];
        arr.push(s.startDate.getTime());
        startsByMember.set(s.memberId, arr);
      }

      // Track per member per bucket to avoid double counting
      const counted = new Map<string, Set<string>>(); // bucketLabel -> Set<memberId>

      // For each subscription that expires in a bucket month, check if renewed
      for (const s of gymSubs) {
        if (!s.endDate || !s.startDate) continue;
        if (s.endDate > now) continue; // only past expiries
        // Skip members who still have active or frozen sub
        if (membersWithActiveOrFrozen.has(s.memberId)) continue;
        const bucket = bucketFor(s.endDate);
        if (!bucket) continue;

        // Deduplicate: count each member only once per expiry month
        const key = bucket.label;
        if (!counted.has(key)) counted.set(key, new Set());
        if (counted.get(key)!.has(s.memberId)) continue;
        counted.get(key)!.add(s.memberId);

        bucket.totalExpiring += 1;

        const thisStart = s.startDate.getTime();
        const starts = startsByMember.get(s.memberId) ?? [];
        // Check if there's ANY follow-up sub that started after this one (no time limit)
        const hasFollowUp = starts.some((t) => t > thisStart);

        if (!hasFollowUp) {
          bucket.churned += 1;
        }
      }

      return buckets.map((b) => {
        return {
          month: b.label,
          year: b.year,
          monthIndex: b.monthIndex,
          totalExpiring: b.totalExpiring,
          churned: b.churned,
          churnRate: b.totalExpiring > 0 ? Math.round((b.churned / b.totalExpiring) * 1000) / 10 : 0,
        };
      });
    }),

  // Detail: list of NEW members (first GYM_MEMBERSHIP by startDate) for a given month.
  // Used by the dashboard "Member Baru per Bulan" chart drill-down popup.
  getNewMembersByMonth: permissionProtectedProcedure(["list:subscription"])
    .input(z.object({ year: z.number(), month: z.number().min(0).max(11) }))
    .query(async ({ ctx, input }) => {
      const start = new Date(input.year, input.month, 1);
      const end = new Date(input.year, input.month + 1, 0, 23, 59, 59, 999);

      // First-ever GYM_MEMBERSHIP subscription per member (by startDate)
      const firstGymSubs = await ctx.db.subscription.groupBy({
        by: ["memberId"],
        where: { deletedAt: null, package: { type: "GYM_MEMBERSHIP" } },
        _min: { startDate: true },
      });

      const memberIds = firstGymSubs
        .filter((s) => {
          const first = s._min.startDate;
          return first != null && first >= start && first <= end;
        })
        .map((s) => s.memberId);

      if (memberIds.length === 0) return [];

      const members = await ctx.db.membership.findMany({
        where: { id: { in: memberIds } },
        select: {
          id: true,
          registerDate: true,
          user: { select: { name: true, email: true, phone: true } },
          subscriptions: {
            where: { deletedAt: null, package: { type: "GYM_MEMBERSHIP" } },
            orderBy: { startDate: "asc" },
            take: 1,
            select: {
              id: true,
              startDate: true,
              endDate: true,
              isActive: true,
              salesId: true,
              salesType: true,
              package: { select: { name: true, price: true } },
              payments: {
                where: { status: "SUCCESS", deletedAt: null },
                orderBy: { paidAt: "desc" },
                take: 1,
                select: { totalPayment: true, method: true, paidAt: true },
              },
            },
          },
        },
      });

      // Resolve sales person names in bulk (salesType: "PersonalTrainer" | "FC")
      const ptIds = new Set<string>();
      const fcIds = new Set<string>();
      for (const m of members) {
        const sub = m.subscriptions[0];
        if (sub?.salesId && sub.salesType === "PersonalTrainer") ptIds.add(sub.salesId);
        if (sub?.salesId && sub.salesType === "FC") fcIds.add(sub.salesId);
      }
      const [pts, fcs] = await Promise.all([
        ptIds.size
          ? ctx.db.personalTrainer.findMany({
              where: { id: { in: Array.from(ptIds) } },
              select: { id: true, user: { select: { name: true } } },
            })
          : Promise.resolve([]),
        fcIds.size
          ? ctx.db.fC.findMany({
              where: { id: { in: Array.from(fcIds) } },
              select: { id: true, user: { select: { name: true } } },
            })
          : Promise.resolve([]),
      ]);
      const ptMap = new Map(pts.map((p) => [p.id, p.user?.name ?? null]));
      const fcMap = new Map(fcs.map((f) => [f.id, f.user?.name ?? null]));
      const resolveSalesName = (sub: { salesId: string | null; salesType: string | null } | undefined) => {
        if (!sub?.salesId || !sub.salesType) return null;
        if (sub.salesType === "PersonalTrainer") return ptMap.get(sub.salesId) ?? null;
        if (sub.salesType === "FC") return fcMap.get(sub.salesId) ?? null;
        return null;
      };

      const rows = members.map((m) => {
        const first = m.subscriptions[0];
        const payment = first?.payments[0];
        return {
          memberId: m.id,
          name: m.user?.name ?? "Unknown",
          email: m.user?.email ?? "-",
          phone: m.user?.phone ?? "-",
          packageName: first?.package?.name ?? "-",
          startDate: first?.startDate ?? null,
          endDate: first?.endDate ?? null,
          isActive: first?.isActive ?? false,
          amount: payment?.totalPayment ?? first?.package?.price ?? 0,
          method: payment?.method ?? null,
          paidAt: payment?.paidAt ?? null,
          salesId: first?.salesId ?? null,
          salesType: first?.salesType ?? null,
          salesName: resolveSalesName(first) ?? "-",
        };
      });

      rows.sort((a, b) => {
        const da = a.startDate ? a.startDate.getTime() : 0;
        const dbb = b.startDate ? b.startDate.getTime() : 0;
        return da - dbb;
      });

      return rows;
    }),

  // Detail: list of RENEWAL or REJOIN members for a given month.
  // type "renewal" = gap ≤30 days from previous endDate, "rejoin" = gap >30 days.
  // Used by the "Retensi / Renewal Rate" chart drill-down popup.
  getRenewalMembersByMonth: permissionProtectedProcedure(["list:subscription"])
    .input(z.object({
      year: z.number(),
      month: z.number().min(0).max(11),
      type: z.enum(["renewal", "rejoin"]).default("renewal"),
    }))
    .query(async ({ ctx, input }) => {
      const start = new Date(input.year, input.month, 1);
      const end = new Date(input.year, input.month + 1, 0, 23, 59, 59, 999);
      const REJOIN_THRESHOLD_DAYS = 30;

      // All gym subscriptions (all-time) to detect first vs renewal
      const allGym = await ctx.db.subscription.findMany({
        where: { deletedAt: null, package: { type: "GYM_MEMBERSHIP" } },
        select: { id: true, memberId: true, startDate: true, endDate: true },
      });

      // Group subs per member
      const byMember = new Map<string, { startDate: Date; endDate: Date | null; subId: string }[]>();
      for (const s of allGym) {
        if (!s.startDate) continue;
        const arr = byMember.get(s.memberId) ?? [];
        arr.push({ startDate: s.startDate, endDate: s.endDate, subId: s.id });
        byMember.set(s.memberId, arr);
      }

      // Find subscription IDs that match the type and started in the month
      const matchingSubIds: string[] = [];
      for (const [, subs] of byMember.entries()) {
        subs.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
        subs.forEach((s, idx) => {
          if (idx === 0) return; // first sub = new member
          if (s.startDate >= start && s.startDate <= end) {
            const prevEnd = subs[idx - 1]!.endDate;
            if (prevEnd) {
              const gapDays = Math.floor(
                (s.startDate.getTime() - prevEnd.getTime()) / (24 * 60 * 60 * 1000),
              );
              if (input.type === "rejoin" && gapDays > REJOIN_THRESHOLD_DAYS) {
                matchingSubIds.push(s.subId);
              } else if (input.type === "renewal" && gapDays <= REJOIN_THRESHOLD_DAYS) {
                matchingSubIds.push(s.subId);
              }
            } else if (input.type === "renewal") {
              matchingSubIds.push(s.subId);
            }
          }
        });
      }

      if (matchingSubIds.length === 0) return [];

      // Fetch detailed subscription data
      const subs = await ctx.db.subscription.findMany({
        where: { id: { in: matchingSubIds } },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          isActive: true,
          member: {
            select: {
              id: true,
              user: { select: { name: true, email: true, phone: true } },
            },
          },
          package: { select: { name: true, price: true } },
          payments: {
            where: { status: "SUCCESS", deletedAt: null },
            orderBy: { paidAt: "desc" },
            take: 1,
            select: { totalPayment: true, method: true, paidAt: true },
          },
        },
      });

      const rows = subs.map((s) => {
        const payment = s.payments[0];
        return {
          memberId: s.member.id,
          name: s.member.user?.name ?? "Unknown",
          email: s.member.user?.email ?? "-",
          phone: s.member.user?.phone ?? "-",
          packageName: s.package?.name ?? "-",
          startDate: s.startDate,
          endDate: s.endDate,
          isActive: s.isActive,
          amount: payment?.totalPayment ?? s.package?.price ?? 0,
          method: payment?.method ?? null,
          paidAt: payment?.paidAt ?? null,
        };
      });

      rows.sort((a, b) => {
        const da = a.startDate ? a.startDate.getTime() : 0;
        const dbb = b.startDate ? b.startDate.getTime() : 0;
        return da - dbb;
      });

      return rows;
    }),

  // Detail: list of CHURNED members for a given expiry month (drill-down for the
  // "Retensi Member (berdasarkan Expiry)" chart). A member is churned if their
  // GYM subscription ended in the month and they did NOT start another gym sub
  // within `graceDays` after that expiry. Deduped by member (latest expiry kept).
  getChurnedMembersByMonth: permissionProtectedProcedure(["list:subscription"])
    .input(
      z.object({
        year: z.number(),
        month: z.number().min(0).max(11),
        graceDays: z.number().min(0).max(120).default(45),
      }),
    )
    .query(async ({ ctx, input }) => {
      const start = new Date(input.year, input.month, 1);
      const end = new Date(input.year, input.month + 1, 0, 23, 59, 59, 999);
      const now = new Date();
      const graceMs = input.graceDays * 24 * 60 * 60 * 1000;

      // All gym-sub start times per member (to detect follow-up renewals).
      const allGym = await ctx.db.subscription.findMany({
        where: { deletedAt: null, package: { type: "GYM_MEMBERSHIP" } },
        select: { memberId: true, startDate: true },
      });
      const startsByMember = new Map<string, number[]>();
      for (const s of allGym) {
        if (!s.startDate) continue;
        const arr = startsByMember.get(s.memberId) ?? [];
        arr.push(s.startDate.getTime());
        startsByMember.set(s.memberId, arr);
      }

      // Subscriptions that expired within the month.
      const expiring = await ctx.db.subscription.findMany({
        where: {
          deletedAt: null,
          package: { type: "GYM_MEMBERSHIP" },
          endDate: { gte: start, lte: end },
        },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          salesId: true,
          salesType: true,
          member: {
            select: {
              id: true,
              user: { select: { name: true, email: true, phone: true } },
            },
          },
          package: { select: { name: true, price: true } },
          payments: {
            where: { status: "SUCCESS", deletedAt: null },
            orderBy: { paidAt: "desc" },
            take: 1,
            select: { totalPayment: true, method: true, paidAt: true },
          },
        },
      });

      // Keep only truly churned: no subsequent GYM sub at all after this one.
      const seen = new Set<string>(); // deduplicate per member
      const churned = expiring.filter((s) => {
        if (!s.endDate || !s.startDate) return false;
        if (s.endDate > now) return false;
        // Deduplicate: only count each member once
        if (seen.has(s.member.id)) return false;
        const thisStart = s.startDate.getTime();
        const starts = startsByMember.get(s.member.id) ?? [];
        const hasFollowUp = starts.some((t) => t > thisStart);
        if (!hasFollowUp) {
          seen.add(s.member.id);
          return true;
        }
        return false;
      });

      // Resolve sales person names in bulk.
      const ptIds = new Set<string>();
      const fcIds = new Set<string>();
      for (const s of churned) {
        if (s.salesId && s.salesType === "PersonalTrainer") ptIds.add(s.salesId);
        if (s.salesId && s.salesType === "FC") fcIds.add(s.salesId);
      }
      const [pts, fcs] = await Promise.all([
        ptIds.size
          ? ctx.db.personalTrainer.findMany({
              where: { id: { in: Array.from(ptIds) } },
              select: { id: true, user: { select: { name: true } } },
            })
          : Promise.resolve([]),
        fcIds.size
          ? ctx.db.fC.findMany({
              where: { id: { in: Array.from(fcIds) } },
              select: { id: true, user: { select: { name: true } } },
            })
          : Promise.resolve([]),
      ]);
      const ptMap = new Map(pts.map((p) => [p.id, p.user?.name ?? null]));
      const fcMap = new Map(fcs.map((f) => [f.id, f.user?.name ?? null]));
      const resolveSalesName = (s: { salesId: string | null; salesType: string | null }) => {
        if (!s.salesId || !s.salesType) return "-";
        if (s.salesType === "PersonalTrainer") return ptMap.get(s.salesId) ?? "-";
        if (s.salesType === "FC") return fcMap.get(s.salesId) ?? "-";
        return "-";
      };

      // Dedupe by member, keeping the latest expiry.
      const byMember = new Map<string, (typeof churned)[number]>();
      for (const s of churned) {
        const prev = byMember.get(s.member.id);
        if (!prev || (s.endDate! > prev.endDate!)) byMember.set(s.member.id, s);
      }

      const rows = Array.from(byMember.values()).map((s) => {
        const payment = s.payments[0];
        const daysExpired = s.endDate
          ? Math.floor((now.getTime() - s.endDate.getTime()) / (24 * 60 * 60 * 1000))
          : null;
        return {
          memberId: s.member.id,
          name: s.member.user?.name ?? "Unknown",
          email: s.member.user?.email ?? "-",
          phone: s.member.user?.phone ?? "-",
          packageName: s.package?.name ?? "-",
          startDate: s.startDate ?? null,
          endDate: s.endDate ?? null,
          daysExpired,
          amount: payment?.totalPayment ?? s.package?.price ?? 0,
          method: payment?.method ?? null,
          salesName: resolveSalesName(s),
        };
      });

      rows.sort((a, b) => {
        const da = a.endDate ? a.endDate.getTime() : 0;
        const dbb = b.endDate ? b.endDate.getTime() : 0;
        return dbb - da;
      });

      return rows;
    }),

  // Report: All churned members — members who had GYM membership and never renewed.
  // Returns the last GYM subscription for each churned member.
  getChurnedMembersAll: permissionProtectedProcedure(["list:subscription"])
    .query(async ({ ctx }) => {
      const now = new Date();

      const gymSubs = await ctx.db.subscription.findMany({
        where: { deletedAt: null, package: { type: "GYM_MEMBERSHIP" } },
        select: { id: true, memberId: true, startDate: true, endDate: true, isFrozen: true, isActive: true },
      });

      // Exclude members who have ANY active or frozen GYM sub (they haven't truly left)
      const membersWithActiveOrFrozen = new Set<string>();
      for (const s of gymSubs) {
        if (s.isActive || s.isFrozen) {
          membersWithActiveOrFrozen.add(s.memberId);
        }
      }

      // Group start dates per member
      const startsByMember = new Map<string, number[]>();
      for (const s of gymSubs) {
        if (!s.startDate) continue;
        const arr = startsByMember.get(s.memberId) ?? [];
        arr.push(s.startDate.getTime());
        startsByMember.set(s.memberId, arr);
      }

      // Find each member's LAST expired sub that has no follow-up
      const lastSubByMember = new Map<string, { subId: string; startDate: Date; endDate: Date }>();
      for (const s of gymSubs) {
        if (!s.endDate || !s.startDate) continue;
        if (s.endDate > now) continue; // only past expiries
        // Skip members who still have active or frozen sub
        if (membersWithActiveOrFrozen.has(s.memberId)) continue;
        const thisStart = s.startDate.getTime();
        const starts = startsByMember.get(s.memberId) ?? [];
        const hasFollowUp = starts.some((t) => t > thisStart);
        if (!hasFollowUp) {
          const prev = lastSubByMember.get(s.memberId);
          if (!prev || s.endDate > prev.endDate) {
            lastSubByMember.set(s.memberId, { subId: s.id, startDate: s.startDate, endDate: s.endDate });
          }
        }
      }

      if (lastSubByMember.size === 0) return [];

      // Fetch detailed data for the churned subs
      const subIds = Array.from(lastSubByMember.values()).map((v) => v.subId);
      const subs = await ctx.db.subscription.findMany({
        where: { id: { in: subIds } },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          member: {
            select: {
              id: true,
              registerDate: true,
              user: { select: { name: true, email: true, phone: true, image: true } },
            },
          },
          salesId: true,
          salesType: true,
          package: { select: { name: true, price: true, day: true } },
          payments: {
            where: { status: "SUCCESS", deletedAt: null },
            orderBy: { paidAt: "desc" },
            take: 1,
            select: { totalPayment: true, method: true },
          },
        },
      });

      // Resolve sales names
      const ptIds = new Set<string>();
      const fcIds = new Set<string>();
      for (const s of subs) {
        if (s.salesId && s.salesType === "PersonalTrainer") ptIds.add(s.salesId);
        if (s.salesId && s.salesType === "FC") fcIds.add(s.salesId);
      }
      const [pts, fcs] = await Promise.all([
        ptIds.size
          ? ctx.db.personalTrainer.findMany({
              where: { id: { in: Array.from(ptIds) } },
              select: { id: true, user: { select: { name: true } } },
            })
          : Promise.resolve([]),
        fcIds.size
          ? ctx.db.fC.findMany({
              where: { id: { in: Array.from(fcIds) } },
              select: { id: true, user: { select: { name: true } } },
            })
          : Promise.resolve([]),
      ]);
      const ptMap = new Map(pts.map((p) => [p.id, p.user?.name ?? null]));
      const fcMap = new Map(fcs.map((f) => [f.id, f.user?.name ?? null]));
      const resolveSalesName = (salesId: string | null, salesType: string | null) => {
        if (!salesId || !salesType) return "-";
        if (salesType === "PersonalTrainer") return ptMap.get(salesId) ?? "-";
        if (salesType === "FC") return fcMap.get(salesId) ?? "-";
        return "-";
      };

      const rows = subs.map((s) => {
        const daysExpired = s.endDate
          ? Math.floor((now.getTime() - s.endDate.getTime()) / (24 * 60 * 60 * 1000))
          : null;
        const payment = s.payments[0];
        return {
          memberId: s.member.id,
          name: s.member.user?.name ?? "Unknown",
          email: s.member.user?.email ?? "-",
          phone: s.member.user?.phone ?? "-",
          image: s.member.user?.image ?? null,
          registerDate: s.member.registerDate,
          salesName: resolveSalesName(s.salesId, s.salesType),
          packageName: s.package?.name ?? "-",
          packageDays: s.package?.day ?? null,
          startDate: s.startDate,
          endDate: s.endDate,
          daysExpired,
          lastPayment: payment?.totalPayment ?? s.package?.price ?? 0,
          paymentMethod: payment?.method ?? "-",
        };
      });

      // Sort by most recently expired first
      rows.sort((a, b) => {
        const da = a.endDate ? a.endDate.getTime() : 0;
        const dbb = b.endDate ? b.endDate.getTime() : 0;
        return dbb - da;
      });

      return rows;
    }),

  // Revenue per sales person (PersonalTrainer + FC) within a date range.
  // Grouped by the underlying USER so a person registered as both PT and FC
  // (e.g. INDAR ADIL MAHIRA) is merged into a single entry.
  getSalesPerformance: permissionProtectedProcedure(["list:subscription"])
    .input(z.object({ startDate: z.date(), endDate: z.date() }))
    .query(async ({ ctx, input }) => {
      const payments = await ctx.db.payment.findMany({
        where: {
          status: "SUCCESS",
          deletedAt: null,
          createdAt: { gte: input.startDate, lte: input.endDate },
          subscription: { deletedAt: null, salesId: { not: null } },
        },
        select: {
          totalPayment: true,
          subscription: { select: { id: true, salesId: true, salesType: true } },
        },
      });

      // Resolve salesId -> { userId, name } for both PT and FC
      const ptIds = new Set<string>();
      const fcIds = new Set<string>();
      for (const p of payments) {
        const s = p.subscription;
        if (s?.salesId && s.salesType === "PersonalTrainer") ptIds.add(s.salesId);
        if (s?.salesId && s.salesType === "FC") fcIds.add(s.salesId);
      }
      const [pts, fcs] = await Promise.all([
        ptIds.size
          ? ctx.db.personalTrainer.findMany({
              where: { id: { in: Array.from(ptIds) } },
              select: { id: true, user: { select: { id: true, name: true, email: true } } },
            })
          : Promise.resolve([]),
        fcIds.size
          ? ctx.db.fC.findMany({
              where: { id: { in: Array.from(fcIds) } },
              select: { id: true, referralCode: true, user: { select: { id: true, name: true, email: true } } },
            })
          : Promise.resolve([]),
      ]);
      // Fallback so sales with an empty user profile are still identifiable
      // (name -> email -> FC referralCode -> "FC/PT …<last 4 of id>").
      const displayName = (
        name: string | null | undefined,
        email: string | null | undefined,
        type: "PT" | "FC",
        id: string,
        code?: string | null,
      ) => name?.trim() || email?.trim() || code?.trim() || `${type} …${id.slice(-4)}`;
      const salesMeta = new Map<string, { userId: string; name: string }>();
      pts.forEach((p) =>
        salesMeta.set(p.id, {
          userId: p.user?.id ?? p.id,
          name: displayName(p.user?.name, p.user?.email, "PT", p.id),
        }),
      );
      fcs.forEach((f) =>
        salesMeta.set(f.id, {
          userId: f.user?.id ?? f.id,
          name: displayName(f.user?.name, f.user?.email, "FC", f.id, f.referralCode),
        }),
      );

      // Aggregate by person (userId)
      const agg = new Map<
        string,
        { userId: string; name: string; revenue: number; subs: Set<string>; salesIds: Set<string> }
      >();
      for (const p of payments) {
        const s = p.subscription;
        if (!s?.salesId) continue;
        const person = salesMeta.get(s.salesId);
        if (!person) continue;
        let a = agg.get(person.userId);
        if (!a) {
          a = { userId: person.userId, name: person.name, revenue: 0, subs: new Set(), salesIds: new Set() };
          agg.set(person.userId, a);
        }
        a.revenue += p.totalPayment;
        a.subs.add(s.id);
        a.salesIds.add(s.salesId);
      }

      return Array.from(agg.values())
        .map((a) => ({
          userId: a.userId,
          name: a.name,
          revenue: a.revenue,
          count: a.subs.size,
          salesIds: Array.from(a.salesIds),
        }))
        .sort((x, y) => y.revenue - x.revenue);
    }),

  // Transaction-level drill-down for a given sales person (by their salesIds).
  getSalesDetail: permissionProtectedProcedure(["list:subscription"])
    .input(
      z.object({
        salesIds: z.array(z.string()).min(1),
        startDate: z.date(),
        endDate: z.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const payments = await ctx.db.payment.findMany({
        where: {
          status: "SUCCESS",
          deletedAt: null,
          createdAt: { gte: input.startDate, lte: input.endDate },
          subscription: { deletedAt: null, salesId: { in: input.salesIds } },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          totalPayment: true,
          method: true,
          paidAt: true,
          createdAt: true,
          subscription: {
            select: {
              salesType: true,
              package: { select: { name: true, type: true } },
              member: { select: { user: { select: { name: true, email: true } } } },
            },
          },
        },
      });

      return payments.map((p) => ({
        id: p.id,
        memberName: p.subscription?.member?.user?.name ?? "Unknown",
        memberEmail: p.subscription?.member?.user?.email ?? "-",
        packageName: p.subscription?.package?.name ?? "-",
        packageType: p.subscription?.package?.type ?? "-",
        salesType: p.subscription?.salesType ?? "-",
        amount: p.totalPayment,
        method: p.method,
        date: p.paidAt ?? p.createdAt,
      }));
    }),

  // Best selling packages — ranked by subscription count in a given date range
  // Consistent with getAdminDashboardStats: filters by Payment.createdAt + SUCCESS status
  bestSellingPackages: permissionProtectedProcedure(["menu:dashboard-admin"])
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().min(1).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const start = input.startDate ? toGMT8StartOfDay(input.startDate) : undefined;
      const end = input.endDate ? toGMT8EndOfDay(input.endDate) : undefined;

      const paymentDateFilter = start && end
        ? { createdAt: { gte: start, lte: end } }
        : {};

      // Get subscriptions that have at least one successful payment in the date range
      const subscriptionsInRange = await ctx.db.subscription.findMany({
        where: {
          deletedAt: null,
          payments: {
            some: {
              status: "SUCCESS",
              deletedAt: null,
              ...paymentDateFilter,
            },
          },
        },
        select: {
          id: true,
          packageId: true,
          payments: {
            where: {
              status: "SUCCESS",
              deletedAt: null,
              ...paymentDateFilter,
            },
            select: { totalPayment: true },
          },
        },
      });

      // Aggregate by packageId
      const packageMap: Record<string, { count: number; revenue: number }> = {};
      for (const sub of subscriptionsInRange) {
        const pid = sub.packageId;
        if (!packageMap[pid]) packageMap[pid] = { count: 0, revenue: 0 };
        packageMap[pid]!.count++;
        packageMap[pid]!.revenue += sub.payments.reduce((s, p) => s + p.totalPayment, 0);
      }

      // Sort by count desc, take top N
      const sorted = Object.entries(packageMap)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, input.limit);

      const packageIds = sorted.map(([pid]) => pid);
      const packages = await ctx.db.package.findMany({
        where: { id: { in: packageIds } },
        select: { id: true, name: true, type: true, price: true },
      });

      return sorted.map(([pid, data]) => {
        const pkg = packages.find((p) => p.id === pid);
        return {
          packageId: pid,
          packageName: pkg?.name ?? "Unknown",
          packageType: pkg?.type ?? "OTHER",
          unitPrice: pkg?.price ?? 0,
          totalSold: data.count,
          totalRevenue: data.revenue,
        };
      });
    }),
});
