import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  permissionProtectedProcedure,
} from "@/server/api/trpc";
import { logApiMutationAsync, extractIpAddress, extractUserAgent } from "@/server/utils/mutationLogger";
import { ACTIVE_SUB_WHERE } from "@/server/utils/subscriptionFilters";

// NOTE: updateExpiredSubscriptions logic has been moved to the cron job:
// /api/cron/deactivate-expired-subscriptions (runs every 6 hours)

export const memberRouter = createTRPCRouter({
  create: permissionProtectedProcedure(["create:member"])
    .input(
      z.object({
        userId: z.string(),
        registerDate: z.date(),
        rfidNumber: z.string().optional(),
        isActive: z.boolean().optional(),
        createdBy: z.string().optional(),
        revokedAt: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = true;
      let error: Error | null = null;
      let result;

      try {
        // Get the user data first
        const user = await ctx.db.user.findUnique({
          where: { id: input.userId },
        });

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        // Create membership with user data
        result = await ctx.db.membership.create({
          data: {
            userId: input.userId,
            registerDate: input.registerDate,
            rfidNumber: input.rfidNumber ?? null, // Allow null for rfidNumber
            isActive: true, // Always set to true by default
            createdBy: input.createdBy ?? ctx.session.user.id,
            revokedAt: input.revokedAt,
          },
          include: {
            user: true, // Include user data in response
          },
        });

        return result;
      } catch (e) {
        success = false;
        error = e as Error;
        throw e;
      } finally {
        // Log the mutation
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "member.create",
          method: "POST",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: result,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  edit: permissionProtectedProcedure(["update:member"])
    .input(
      z.object({
        id: z.string(),
        userId: z.string().optional(),
        registerDate: z.date().optional(),
        rfidNumber: z.string().optional(),
        isActive: z.boolean().optional(),
        createdBy: z.string().optional(),
        revokedAt: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = true;
      let error: Error | null = null;
      let result;

      try {
        result = await ctx.db.membership.update({
          where: { id: input.id },
          data: {
            userId: input.userId,
            registerDate: input.registerDate,
            rfidNumber: input.rfidNumber,
            isActive: input.isActive,
            createdBy: input.createdBy,
            revokedAt: input.revokedAt,
          },
        });

        return result;
      } catch (e) {
        success = false;
        error = e as Error;
        throw e;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "member.edit",
          method: "PUT",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: result,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  detail: permissionProtectedProcedure(["show:member"])
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      console.log("id", input.id);
      const member = await ctx.db.membership.findUnique({
        where: { id: input.id },
        include: {
          user: true,
          subscriptions: true,
        },
      });

      if (!member) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found",
        });
      }
      console.log("member", member);

      return member;
    }),

  list: permissionProtectedProcedure(["list:member"])
    .input(
      z.object({
        page: z.number().min(1),
        limit: z.number().min(1).max(100),
        search: z.string().optional(),
        searchColumn: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const whereClause = input.search
        ? input.searchColumn?.startsWith("user.")
          ? {
            user: {
              [input.searchColumn.replace("user.", "")]: {
                contains: input.search,
                mode: "insensitive" as const,
              }
            },
          }
          : {
            [input.searchColumn ?? "rfidNumber"]: {
              contains: input.search,
              mode: "insensitive" as const,
            },
          }
        : {};

      console.log("MEMBER SEARCH whereClause:", JSON.stringify(whereClause, null, 2));

      const items = await ctx.db.membership.findMany({
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        where: whereClause,
        orderBy: { createdAt: "desc" },
        include: {
          user: true,
          fc: {
            include: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
          subscriptions: {
            where: {
              deletedAt: null,
            },
            include: {
              package: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  sessions: true,
                },
              },
              trainer: {
                include: {
                  user: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
              groupMembers: {
                where: { status: "ACTIVE" },
                select: { id: true, groupSubscriptionId: true },
              },
              leadGroupSubscriptions: {
                where: { status: "ACTIVE" },
                select: { id: true },
              },
            },
            orderBy: {
              startDate: "desc",
            },
          },
        },
      });

      const total = await ctx.db.membership.count({ where: whereClause });

      return {
        items,
        total,
        page: input.page,
        limit: input.limit,
      };
    }),

  getById: permissionProtectedProcedure(["show:member"])
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.membership.findUnique({
        where: { id: input.id },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });
    }),

  getByUserid: permissionProtectedProcedure(["show:member"])
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.membership.findFirst({
        where: { userId: input.userId },
        include: {
          user: true,
          subscriptions: true,
        },
      });
    }),

  /** Accepts either membership ID or user ID — for checkout page */
  getByAnyId: permissionProtectedProcedure(["show:member"])
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const byMembershipId = await ctx.db.membership.findUnique({
        where: { id: input.id },
        include: { user: { select: { name: true, email: true, phone: true } } },
      });
      if (byMembershipId) return byMembershipId;

      return ctx.db.membership.findFirst({
        where: { userId: input.id },
        include: { user: { select: { name: true, email: true, phone: true } } },
      });
    }),

  update: permissionProtectedProcedure(["update:member"])
    .input(
      z.object({
        id: z.string(),
        registerDate: z.date().optional(),
        rfidNumber: z.string().optional(),
        isActive: z.boolean().optional(),
        revokedAt: z.date().optional(),
        fc: z
          .object({
            connect: z.object({ id: z.string() }).optional(),
            disconnect: z.boolean().optional(),
          })
          .optional(),
        personalTrainer: z.any(),
        user: z
          .object({
            name: z.string().min(1),
            email: z.string().email(),
            address: z.string().optional(),
            phone: z.string().optional(),
            birthDate: z.date().optional(),
            idNumber: z.string().optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get the membership first
      const membership = await ctx.db.membership.findUnique({
        where: { id: input.id },
        include: { user: true },
      });

      if (!membership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Membership not found",
        });
      }

      // Update personal trainer from the subscription if provided
      if (input.personalTrainer?.connect) {
        console.log("Updating personal trainer for membership:", input.personalTrainer);
        const subscription = await ctx.db.subscription.findFirst({
          where: {
            memberId: input.id,
            isActive: true,
            trainerId: { not: null },
          },
        });

        if (!subscription) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Active subscription not found for the member",
          });
        }

        if (input.personalTrainer.connect) {
          await ctx.db.subscription.update({
            where: { id: subscription.id },
            data: {
              trainerId: input.personalTrainer.connect.id,
            },
          });
        } else if (input.personalTrainer.disconnect) {
          await ctx.db.subscription.update({
            where: { id: subscription.id },
            data: {
              trainerId: null,
            },
          });
        }
      }
      // Update membership and user data
      return ctx.db.membership.update({
        where: { id: input.id },
        data: {
          registerDate: input.registerDate,
          rfidNumber: input.rfidNumber ?? null,
          isActive: input.isActive ?? true,
          revokedAt: input.revokedAt,
          fc: input.fc,
          user: input.user
            ? {
              update: {
                name: input.user.name,
                email: input.user.email,
                address: input.user.address ?? null,
                phone: input.user.phone ?? null,
                birthDate: input.user.birthDate ?? null,
                idNumber: input.user.idNumber ?? null,
              },
            }
            : undefined,
        },
        include: {
          user: true,
          fc: {
            include: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
          subscriptions: {
            where: {
              isActive: true,
            },
            include: {
              trainer: {
                include: {
                  user: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              startDate: "desc",
            },
            take: 1,
          },
        },
      });
    }),

  remove: permissionProtectedProcedure(["delete:member"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.membership.delete({
        where: { id: input.id },
      });
    }),

  getMembership: permissionProtectedProcedure(["show:member"]).query(
    async ({ ctx }) => {
      return await ctx.db.membership.findFirst({
        where: {
          userId: ctx.session.user.id,
          subscriptions: {
            some: {
              isActive: true
            }
          }
        },
      });
    },
  ),

  getActivePackageTypes: permissionProtectedProcedure(["show:member"]).query(
    async ({ ctx }) => {
      const membership = await ctx.db.membership.findFirst({
        where: { userId: ctx.session.user.id },
        include: {
          subscriptions: {
            where: { isActive: true, deletedAt: null },
            include: { package: { select: { type: true } } },
          },
        },
      });
      const types = membership?.subscriptions.map((s) => s.package.type) ?? [];
      return { packageTypes: [...new Set(types)] };
    },
  ),

  getAttendanceCount: permissionProtectedProcedure(["show:attedance"])
    .input(z.object({ memberId: z.string() }))
    .query(async ({ ctx, input }) => {
      const startOfYear = new Date(new Date().getFullYear(), 0, 1);
      const endOfYear = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59);

      const count = await ctx.db.attendanceMember.count({
        where: {
          memberId: input.memberId,
          checkin: {
            gte: startOfYear,
            lte: endOfYear,
          },
        },
      });

      return { count };
    }),

  getAll: permissionProtectedProcedure(["list:member"]).query(
    async ({ ctx }) => {
      return ctx.db.membership.findMany({
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
          subscriptions: true,
        },
      });
    },
  ),


  getAllActive: permissionProtectedProcedure(["list:member"]).query(
    async ({ ctx }) => {
      return await ctx.db.membership.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          user: true,
          fc: {
            include: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
          subscriptions: {
            where: {
              isActive: true,
              deletedAt: null,
            },
            include: {
              trainer: {
                include: {
                  user: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              startDate: "desc", // Replace with a valid field from SubscriptionOrderByWithRelationInput
            },
            take: 1,
          },
        },
      });

    },

  ),

  getByUserId: permissionProtectedProcedure(["show:member"])
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.membership.findFirst({
        where: { userId: input.userId },
        include: {
          user: true,
          subscriptions: true,
        },
      });
    }),

  createSession: permissionProtectedProcedure(["create:session"])
    .input(
      z.object({
        memberId: z.string(),
        date: z.date(),
        startTime: z.date(),
        endTime: z.date(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get the trainer ID for the current user
      const trainer = await ctx.db.personalTrainer.findFirst({
        where: {
          userId: ctx.session.user.id,
          isActive: true,
        },
      });

      if (!trainer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trainer not found or not active",
        });
      }

      // Create the training session
      return ctx.db.trainerSession.create({
        data: {
          trainerId: trainer.id,
          memberId: input.memberId,
          date: input.date,
          startTime: input.startTime,
          endTime: input.endTime,
          description: input.description,
        },
      });
    }),

  findByRFID: protectedProcedure
    .input(z.object({ rfidNumber: z.string() }))
    .query(async ({ ctx, input }) => {
      const member = await ctx.db.membership.findFirst({
        where: {
          rfidNumber: input.rfidNumber,
          // Member must have at least one active, non-frozen subscription
          subscriptions: {
            some: ACTIVE_SUB_WHERE,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              birthDate: true,
            },
          },
        },
      });

      return member;
    }),

  findByMembershipId: publicProcedure
    .input(z.object({ membershipId: z.string() }))
    .query(async ({ ctx, input }) => {
      const member = await ctx.db.membership.findFirst({
        where: {
          id: input.membershipId,
          // Member must have at least one active, non-frozen subscription
          subscriptions: {
            some: ACTIVE_SUB_WHERE,
          },
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              image: true,
              birthDate: true,
            },
          },
        },
      });

      return member;
    }),

  /**
   * Get members with birthdays today and in the next 3 days
   */
  getUpcomingBirthdays: permissionProtectedProcedure(["list:member"]).query(
    async ({ ctx }) => {
      // Get all members with birthDate set
      const members = await ctx.db.membership.findMany({
        where: {
          user: {
            birthDate: { not: null },
          },
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
              birthDate: true,
              image: true,
            },
          },
        },
      });

      const today = new Date();
      const todayMonth = today.getMonth();
      const todayDate = today.getDate();

      // Filter members whose birthday (month+day) is today or within the next 3 days
      const upcomingBirthdays = members
        .map((m) => {
          const bd = m.user.birthDate!;
          const bdMonth = bd.getMonth();
          const bdDate = bd.getDate();

          // Calculate this year's birthday
          let birthdayThisYear = new Date(today.getFullYear(), bdMonth, bdDate);
          // If birthday already passed this year, check next year
          if (birthdayThisYear < new Date(today.getFullYear(), todayMonth, todayDate)) {
            birthdayThisYear = new Date(today.getFullYear() + 1, bdMonth, bdDate);
          }

          const diffMs = birthdayThisYear.getTime() - new Date(today.getFullYear(), todayMonth, todayDate).getTime();
          const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

          return {
            id: m.id,
            name: m.user.name,
            email: m.user.email,
            phone: m.user.phone,
            image: m.user.image,
            birthDate: bd.toISOString(),
            daysUntilBirthday: diffDays,
            isToday: diffDays === 0,
          };
        })
        .filter((m) => m.daysUntilBirthday >= 0 && m.daysUntilBirthday <= 3)
        .sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);

      return upcomingBirthdays;
    },
  ),

});
