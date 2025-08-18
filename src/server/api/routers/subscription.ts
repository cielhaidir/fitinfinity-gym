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

// Fungsi untuk mengupdate subscription yang sudah expired
async function updateExpiredSubscriptions(ctx: any) {
  const now = new Date();
  await ctx.db.subscription.updateMany({
    where: {
      isActive: true,
      endDate: { lt: now },
    },
    data: {
      isActive: false,
    },
  });
}

export const subscriptionRouter = createTRPCRouter({
  // Get combined sales list (PersonalTrainer + FC)
  getSalesList: permissionProtectedProcedure(["list:subscription"])
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
        subsType: z.enum(["gym", "trainer", "group"]),
        paymentMethod: z.string(),
        totalPayment: z.number(),
        status: z
          .enum(["SUCCESS", "PENDING", "FAILED"])
          .optional()
          .default("SUCCESS"),
        orderReference: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.db.membership.findUnique({
        where: { id: input.memberId },
      });

      if (!member) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Member with ID ${input.memberId} does not exist.`,
        });
      }

      const data = {
        memberId: input.memberId,
        packageId: input.packageId,
        startDate: input.startDate,
        salesId: input.salesId || null,
        salesType: input.salesType || null,
        ...(input.subsType === "gym"
          ? {
              endDate: new Date(
                new Date(input.startDate).setDate(
                  new Date(input.startDate).getDate() + input.duration,
                ),
              ),
            }
          : {
              trainerId: input.trainerId || null, // Ensure null is used if trainerId is undefined
              remainingSessions: input.duration,
              endDate: new Date(
                new Date(input.startDate).setDate(
                  new Date(input.startDate).getDate() + 30,
                ),
              ),
            }),
      };

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

      await ctx.db.payment.create({
        data: {
          subscriptionId: subscription.id,
          status: input.status || "SUCCESS",
          method: input.paymentMethod,
          totalPayment: input.totalPayment,
          orderReference: input.orderReference,
        },
      });

      if (input.status === "SUCCESS") {
        await ctx.db.membership.update({
          where: { id: input.memberId },
          data: { isActive: true },
        });

        // If it's a group training package, create GroupSubscription and GroupMember
        if (input.subsType === "group") {
          const packageDetails = await ctx.db.package.findUnique({
            where: { id: input.packageId },
          });

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

      return subscription;
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

      // If status is SUCCESS and wasn't before, set the paidAt timestamp
      if (input.status === "SUCCESS" && payment.status !== "SUCCESS") {
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
      if (input.status === "SUCCESS" && payment.subscription) {
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
        }

        // Send email notifications if this is a new successful payment
        if (updatedPayment.subscription.member?.user?.email) {
          // Send payment receipt email
          const paymentTemplate = await ctx.db.emailTemplate.findFirst({
            where: { type: EmailType.PAYMENT_RECEIPT },
          });

          if (paymentTemplate) {
            await emailService.sendTemplateEmail({
              to: updatedPayment.subscription.member.user.email,
              templateId: paymentTemplate.id,
              templateData: {
                memberName: updatedPayment.subscription.member.user.name,
                packageName: updatedPayment.subscription.package.name,
                receiptNumber:
                  updatedPayment.orderReference || updatedPayment.id,
                totalAmount: updatedPayment.totalPayment,
                paymentStatus: PaymentStatus.SUCCESS,
                statusClass: PaymentStatus.SUCCESS.toLowerCase(),
                paymentDate: format(new Date(), "PPP"),
                paymentMethod: updatedPayment.method,
                duration: updatedPayment.subscription.remainingSessions
                  ? `${updatedPayment.subscription.remainingSessions} sessions`
                  : `${
                      updatedPayment.subscription.endDate
                        ? Math.ceil(
                            (updatedPayment.subscription.endDate.getTime() -
                              updatedPayment.subscription.startDate.getTime()) /
                              (1000 * 60 * 60 * 24),
                          )
                        : 0
                    } days`,
                currency: "Rp",
                memberEmail: updatedPayment.subscription.member.user.email,
                supportEmail: siteConfig.supportEmail,
                supportPhone: siteConfig.supportPhone,
                logoUrl: siteConfig.logoUrl,
                portalUrl: siteConfig.portalUrl,
                currentYear: new Date().getFullYear(),
                address: siteConfig.address,
                // Conditional trainer data
                ...(updatedPayment.subscription.trainer && {
                  personalTrainer: true,
                  trainerName: updatedPayment.subscription.trainer.user.name,
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
              to: updatedPayment.subscription.member.user.email,
              templateId: membershipTemplate.id,
              templateData: {
                memberName: updatedPayment.subscription.member.user.name,
                membershipId: updatedPayment.subscription.member.id,
                packageName: updatedPayment.subscription.package.name,
                startDate: format(updatedPayment.subscription.startDate, "PPP"),
                endDate: updatedPayment.subscription.endDate
                  ? format(updatedPayment.subscription.endDate, "PPP")
                  : "N/A",
                personalTrainer: updatedPayment.subscription.trainer
                  ? true
                  : false,
                trainerName: updatedPayment.subscription.trainer?.user.name,
                memberEmail: updatedPayment.subscription.member.user.email,
                portalUrl: siteConfig.portalUrl,
                supportEmail: siteConfig.supportEmail,
                supportPhone: siteConfig.supportPhone,
                logoUrl: siteConfig.logoUrl,
                currentYear: new Date().getFullYear(),
                address: siteConfig.address,
                currency: "Rp",
                paymentMethod: updatedPayment.method,
                totalAmount: updatedPayment.totalPayment,
                receiptNumber:
                  updatedPayment.orderReference || updatedPayment.id,
                paymentStatus: PaymentStatus.SUCCESS,
                statusClass: PaymentStatus.SUCCESS.toLowerCase(),
                paymentDate: format(new Date(), "PPP"),
              },
            });
          }
        }
      }

      return updatedPayment;
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
      }),
    )
    .query(async ({ ctx, input }) => {
      // Update expired subscriptions sebelum query
      await updateExpiredSubscriptions(ctx);

     const whereClause: any = {
  isActive: true,
  OR: [
    { groupMembers: { none: {} } }, // bukan member group
    { leadGroupSubscriptions: { some: {} } }, // leader group
  ],
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
      // Update expired subscriptions sebelum query
      await updateExpiredSubscriptions(ctx);

      const whereClause: any = input.search
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
        : {};

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
      // Update expired subscriptions sebelum query
      await updateExpiredSubscriptions(ctx);

      const items = await ctx.db.subscription.findMany({
        where: { memberId: input.memberId },
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
          payments: true,
        },
      });

      const total = await ctx.db.subscription.count({
        where: { memberId: input.memberId },
      });

      return {
        items,
        total,
        page: input.page,
        limit: input.limit,
      };
    }),

  getById: permissionProtectedProcedure(["show:subscription"])
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Update expired subscriptions sebelum query
      await updateExpiredSubscriptions(ctx);

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
      return ctx.db.subscription.update({
        where: { id: input.id },
        data: {
          memberId: input.memberId,
          startDate: input.startDate,
          endDate: input.endDate,
        },
      });
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

        const subscription = await ctx.db.subscription.create({
          data: {
            memberId: member.id,
            packageId: packageData.id,
            startDate: new Date(),
            ...(packageData.type === "GYM_MEMBERSHIP"
              ? {
                  endDate: new Date(
                    new Date().setDate(new Date().getDate() + input.duration),
                  ),
                }
              : {
                  remainingSessions: input.duration,
                }),
          },
        });

        const paymentStatus =
          input.paymentMethod === "CASH" ? "SUCCESS" : "PENDING";

        await ctx.db.payment.create({
          data: {
            subscriptionId: subscription.id,
            status: paymentStatus,
            method: input.paymentMethod,
            totalPayment: packageData.price * input.duration,
            orderReference: input.orderReference,
          },
        });

        if (paymentStatus === "SUCCESS") {
          await ctx.db.user.update({
            where: {
              id: ctx.session.user.id,
            },
            data: {
              point: {
                increment: packageData.point * input.duration,
              },
            },
          });
        }

        return {
          success: true,
          subscription,
          message:
            paymentStatus === "SUCCESS"
              ? `Checkout successful! You earned ${packageData.point * input.duration} points.`
              : "Checkout initiated. Please complete the payment to activate your subscription.",
        };
      } catch (error) {
        console.error("Checkout error:", error);
        throw error;
      }
    }),

  delete: permissionProtectedProcedure(["delete:subscription"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        const subscription = await tx.subscription.findUnique({
          where: { id: input.id },
          include: {
            member: true,
            payments: true,
          },
        });

        if (!subscription) {
          throw new Error("Subscription not found");
        }

        if (subscription.payments && subscription.payments.length > 0) {
          await tx.payment.deleteMany({
            where: { subscriptionId: input.id },
          });
        }

        const deletedSubscription = await tx.subscription.delete({
          where: { id: input.id },
        });

        const remainingSubscriptions = await tx.subscription.count({
          where: {
            memberId: subscription.memberId,
            endDate: {
              gt: new Date(),
            },
          },
        });

        if (remainingSubscriptions === 0) {
          await tx.membership.update({
            where: { id: subscription.memberId },
            data: { isActive: false },
          });
        }

        return deletedSubscription;
      });
    }),

  // Tambahkan procedure untuk menonaktifkan subscription yang sudah expired
  deactivateExpired: permissionProtectedProcedure(["update:subscription"])
    .mutation(async ({ ctx }) => {
      const now = new Date();
      const result = await ctx.db.subscription.updateMany({
        where: {
          isActive: true,
          endDate: { lt: now },
        },
        data: {
          isActive: false,
        },
      });
      return { count: result.count };
    }),

  freeze: permissionProtectedProcedure(["update:subscription"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const subscription = await ctx.db.subscription.findUnique({
        where: { id: input.id },
        include: { member: { include: { user: true } } },
      });

      if (!subscription) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscription not found",
        });
      }

      if (subscription.isFrozen) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Subscription is already frozen",
        });
      }

      if (!subscription.endDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot freeze subscription without end date",
        });
      }

      const updatedSubscription = await ctx.db.subscription.update({
        where: { id: input.id },
        data: { 
          isFrozen: true,
          frozenAt: new Date()
        },
        include: { member: { include: { user: true } } },
      });

      return updatedSubscription;
    }),

  unfreeze: permissionProtectedProcedure(["update:subscription"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const subscription = await ctx.db.subscription.findUnique({
        where: { id: input.id },
        include: { member: { include: { user: true } } },
      });

      if (!subscription) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscription not found",
        });
      }

      if (!subscription.isFrozen) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Subscription is not frozen",
        });
      }

      if (!subscription.frozenAt || !subscription.endDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot unfreeze subscription: missing freeze date or end date",
        });
      }

      // Calculate remaining days when it was frozen
      const remainingDaysWhenFrozen = Math.ceil(
        (subscription.endDate.getTime() - subscription.frozenAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Calculate new end date by adding remaining days to current date
      const newEndDate = new Date();
      newEndDate.setDate(newEndDate.getDate() + remainingDaysWhenFrozen);

      const updatedSubscription = await ctx.db.subscription.update({
        where: { id: input.id },
        data: { 
          isFrozen: false,
          frozenAt: null,
          endDate: newEndDate
        },
        include: { member: { include: { user: true } } },
      });

      return updatedSubscription;
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

      return updatedSubscription;
    }),

  // Transfer subscription to another user
  transfer: permissionProtectedProcedure(["update:subscription"])
    .input(
      z.object({
        subscriptionId: z.string(),
        newUserId: z.string(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
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

      // // Check if target user already has a membership
      const existingMembership = await ctx.db.membership.findFirst({
        where: { userId: input.newUserId },
      });

      // if (existingMembership) {
      //   throw new TRPCError({
      //     code: "CONFLICT",
      //     message: "Target user already has a membership",
      //   });
      // }

      return ctx.db.$transaction(async (tx) => {
        // Create new membership for the target user

          let membershipId: string;

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
          } else {
            membershipId = existingMembership.id;
          }


        // Update the subscription to point to the new membership
        const updatedSubscription = await tx.subscription.update({
          where: { id: input.subscriptionId },
          data: { memberId: membershipId },
          include: {
            member: {
              include: {
                user: true,
              },
            },
            package: true,
          },
        });

        // Transfer points: Remove from old user, add to new user
        if (subscription.package.point > 0) {
          // Remove points from old user
          await tx.user.update({
            where: { id: subscription.member.userId },
            data: {
              point: { decrement: subscription.package.point },
            },
          });

          // Add points to new user
          await tx.user.update({
            where: { id: input.newUserId },
            data: {
              point: { increment: subscription.package.point },
            },
          });
        }
        
        return updatedSubscription;
      });
    }),
});
