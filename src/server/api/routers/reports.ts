import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  permissionProtectedProcedure,
} from "@/server/api/trpc";
import { toGMT8StartOfDay, toGMT8EndOfDay } from "@/lib/timezone";

/**
 * Reports Router
 * 
 * This router provides three membership report endpoints:
 * 1. Active Membership Report - List of members with active memberships
 * 2. Member Profile Report - Detailed member profiles with history
 * 3. PT Remaining Sessions Report - Members' remaining PT sessions grouped by trainer
 * 
 * Recommended database indexes for optimal performance:
 * - Membership: (isActive, registerDate)
 * - Membership: (userId)
 * - Subscription: (memberId, isActive)
 * - Subscription: (trainerId, isActive, remainingSessions)
 * - Package: (type)
 * - User: (name, email)
 */
export const reportsRouter = createTRPCRouter({
  /**
   * Active Membership Report
   * 
   * Returns a paginated list of members with their active memberships.
   * Supports filtering by active status, date range, package type, FC, trainer, and search.
   */
  activeMembership: createTRPCRouter({
    list: permissionProtectedProcedure(["report:active-membership"])
      .input(
        z.object({
          isActive: z.boolean().optional().default(true),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          dateFilterType: z.enum(["payment", "startDate", "endDate"]).optional().default("payment"),
          packageType: z
            .enum(["GYM_MEMBERSHIP", "PERSONAL_TRAINER", "GROUP_TRAINING"])
            .optional(),
          fcId: z.string().optional(),
          trainerId: z.string().optional(),
          salesId: z.string().optional(),
          search: z.string().optional(),
          page: z.number().min(1).optional().default(1),
          pageSize: z.number().min(1).max(100).optional().default(25),
          sortBy: z.string().optional().default("name"),
          sortDir: z.enum(["asc", "desc"]).optional().default("asc"),
        }),
      )
      .query(async ({ ctx, input }) => {
        const skip = (input.page - 1) * input.pageSize;

        // Build where clause for memberships
        // A member is considered active if they have at least one active subscription
        const membershipWhere: any = {};

        // Base subscription condition for active/inactive filter
        const activeSubCondition = { isActive: true, deletedAt: null };
        
        // Only include memberships that have at least one active subscription
        if (input.isActive) {
          membershipWhere.subscriptions = {
            some: activeSubCondition,
          };
        } else {
          // If filtering for inactive, show memberships without active subscriptions
          membershipWhere.subscriptions = {
            none: activeSubCondition,
          };
        }

        // Add date filter if provided (convert to GMT+8)
        // Filter based on dateFilterType: payment (default), startDate, or endDate
        if (input.startDate || input.endDate) {
          if (input.dateFilterType === "payment") {
            // Filter by membership register date (payment creation date)
            membershipWhere.registerDate = {};
            if (input.startDate) {
              membershipWhere.registerDate.gte = toGMT8StartOfDay(input.startDate);
            }
            if (input.endDate) {
              membershipWhere.registerDate.lte = toGMT8EndOfDay(input.endDate);
            }
          } else if (input.dateFilterType === "startDate") {
            // Filter by subscription start date
            const dateFilter: any = {};
            if (input.startDate) {
              dateFilter.gte = toGMT8StartOfDay(input.startDate);
            }
            if (input.endDate) {
              dateFilter.lte = toGMT8EndOfDay(input.endDate);
            }
            // Combine with active/inactive condition
            if (input.isActive) {
              membershipWhere.subscriptions = {
                some: { ...activeSubCondition, startDate: dateFilter },
              };
            } else {
              membershipWhere.subscriptions = {
                none: activeSubCondition,
                some: { deletedAt: null, startDate: dateFilter },
              };
            }
          } else if (input.dateFilterType === "endDate") {
            // Filter by subscription end date
            const dateFilter: any = {};
            if (input.startDate) {
              dateFilter.gte = toGMT8StartOfDay(input.startDate);
            }
            if (input.endDate) {
              dateFilter.lte = toGMT8EndOfDay(input.endDate);
            }
            // Combine with active/inactive condition
            if (input.isActive) {
              membershipWhere.subscriptions = {
                some: { ...activeSubCondition, endDate: dateFilter },
              };
            } else {
              membershipWhere.subscriptions = {
                none: activeSubCondition,
                some: { deletedAt: null, endDate: dateFilter },
              };
            }
          }
        }

        // Add FC filter if provided
        if (input.fcId) {
          membershipWhere.fcId = input.fcId;
        }

        // Add search filter (search on user name, email, or rfidNumber)
        if (input.search) {
          membershipWhere.OR = [
            {
              user: {
                name: {
                  contains: input.search,
                  mode: "insensitive" as const,
                },
              },
            },
            {
              user: {
                email: {
                  contains: input.search,
                  mode: "insensitive" as const,
                },
              },
            },
            {
              rfidNumber: {
                contains: input.search,
                mode: "insensitive" as const,
              },
            },
          ];
        }

        // Build additional subscription filter conditions (packageType, trainerId, salesId)
        const extraSubConditions: any = {};
        if (input.packageType) {
          extraSubConditions.package = { type: input.packageType };
        }
        if (input.trainerId) {
          extraSubConditions.trainerId = input.trainerId;
        }
        if (input.salesId) {
          extraSubConditions.salesId = input.salesId;
        }

        if (Object.keys(extraSubConditions).length > 0) {
          if (input.isActive) {
            // Override subscriptions filter to require matching active subscriptions
            membershipWhere.subscriptions = {
              some: { ...activeSubCondition, ...extraSubConditions },
            };
          } else {
            // For inactive: must have no active subs AND must have had a sub matching filters
            membershipWhere.subscriptions = {
              none: activeSubCondition,
              some: { deletedAt: null, ...extraSubConditions },
            };
          }
        }

        // The include subscription where differs by active/inactive:
        // - active: fetch the most recent active subscription
        // - inactive: fetch the most recent subscription (any status)
        const includeSubWhere: any = input.isActive
          ? {
              isActive: true,
              deletedAt: null,
              ...(input.packageType && { package: { type: input.packageType } }),
              ...(input.trainerId && { trainerId: input.trainerId }),
              ...(input.salesId && { salesId: input.salesId }),
            }
          : {
              deletedAt: null,
              ...(input.packageType && { package: { type: input.packageType } }),
              ...(input.trainerId && { trainerId: input.trainerId }),
              ...(input.salesId && { salesId: input.salesId }),
            };

        // Fetch memberships with pagination
        const [items, totalCount] = await Promise.all([
          ctx.db.membership.findMany({
            where: membershipWhere,
            skip,
            take: input.pageSize,
            orderBy:
              input.sortBy === "name"
                ? { user: { name: input.sortDir } }
                : input.sortBy === "registerDate"
                  ? { registerDate: input.sortDir }
                  : { registerDate: input.sortDir },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  birthDate: true,
                  image: true,
                },
              },
              subscriptions: {
                where: includeSubWhere,
                orderBy: {
                  startDate: "desc",
                },
                take: 1,
                include: {
                  package: {
                    select: {
                      id: true,
                      name: true,
                      type: true,
                      sessions: true,
                      day: true,
                    },
                  },
                },
              },
            },
          }),
          ctx.db.membership.count({ where: membershipWhere }),
        ]);

        // Resolve sales person names for subscriptions
        const subWithSales = items.map(m => m.subscriptions[0]);
        const fcIds = [...new Set(
          subWithSales
            .filter(s => s?.salesType === "FC" && s?.salesId)
            .map(s => s!.salesId!)
        )];
        const ptIds = [...new Set(
          subWithSales
            .filter(s => s?.salesType === "PersonalTrainer" && s?.salesId)
            .map(s => s!.salesId!)
        )];

        const [fcList, ptList] = await Promise.all([
          fcIds.length > 0
            ? ctx.db.fC.findMany({
                where: { id: { in: fcIds } },
                select: { id: true, user: { select: { name: true } } },
              })
            : Promise.resolve([]),
          ptIds.length > 0
            ? ctx.db.personalTrainer.findMany({
                where: { id: { in: ptIds } },
                select: { id: true, user: { select: { name: true } } },
              })
            : Promise.resolve([]),
        ]);

        const fcMap = new Map(fcList.map(fc => [fc.id, fc.user?.name ?? null]));
        const ptMap = new Map(ptList.map(pt => [pt.id, pt.user?.name ?? null]));

        const getSalesName = (sub: { salesId?: string | null; salesType?: string | null } | undefined) => {
          if (!sub?.salesId || !sub?.salesType) return null;
          if (sub.salesType === "FC") return fcMap.get(sub.salesId) ?? null;
          if (sub.salesType === "PersonalTrainer") return ptMap.get(sub.salesId) ?? null;
          return null;
        };

        // Transform the data to match the expected return type
        const transformedItems = items.map((membership) => {
          const sub = membership.subscriptions[0];
          return {
            membershipId: membership.id,
            isActive: membership.isActive,
            registerDate: membership.registerDate,
            revokedAt: membership.revokedAt,
            user: {
              id: membership.user.id,
              name: membership.user.name,
              email: membership.user.email,
              phone: membership.user.phone,
              birthDate: membership.user.birthDate,
              image: membership.user.image,
            },
            subscription: sub
              ? {
                  id: sub.id,
                  startDate: sub.startDate,
                  endDate: sub.endDate,
                  remainingSessions: sub.remainingSessions,
                  isActive: sub.isActive,
                  salesId: sub.salesId ?? null,
                  salesType: sub.salesType ?? null,
                  salesName: getSalesName(sub),
                  package: {
                    id: sub.package.id,
                    name: sub.package.name,
                    type: sub.package.type,
                    sessions: sub.package.sessions,
                    day: sub.package.day,
                  },
                }
              : null,
          };
        });

        return {
          items: transformedItems,
          totalCount,
          page: input.page,
          pageSize: input.pageSize,
        };
      }),
  }),

  /**
   * Member Profile Report
   * 
   * Provides detailed member profiles including:
   * - Member search functionality
   * - Individual member profile with full history
   * - Subscription history
   * - Trainer sessions summary
   * - Attendance summary
   */
  memberProfile: createTRPCRouter({
    /**
     * Search for members
     */
    search: permissionProtectedProcedure(["report:member-profile"])
      .input(
        z.object({
          search: z.string().optional(),
          enrollmentFrom: z.date().optional(),
          enrollmentTo: z.date().optional(),
          status: z.enum(["ACTIVE", "EXPIRED", "REVOKED"]).optional(),
          page: z.number().min(1).optional().default(1),
          pageSize: z.number().min(1).max(100).optional().default(25),
        }),
      )
      .query(async ({ ctx, input }) => {
        const skip = (input.page - 1) * input.pageSize;

        // Build where clause
        // Only show users who have the "Member" role
    const where: any = {
  user: {
    roles: {
      some: { name: "Member" },         // minimal harus punya role Member
      every: { name: "Member" },        // semua role yg dimiliki harus Member
    },
  },
};

        // Search filter
        if (input.search) {
          where.OR = [
            {
              user: {
                name: {
                  contains: input.search,
                  mode: "insensitive" as const,
                },
              },
            },
            {
              user: {
                email: {
                  contains: input.search,
                  mode: "insensitive" as const,
                },
              },
            },
            {
              user: {
                phone: {
                  contains: input.search,
                  mode: "insensitive" as const,
                },
              },
            },
            {
              rfidNumber: {
                contains: input.search,
                mode: "insensitive" as const,
              },
            },
          ];
        }

        // Date range filter (convert to GMT+8)
        if (input.enrollmentFrom || input.enrollmentTo) {
          where.registerDate = {};
          if (input.enrollmentFrom) {
            where.registerDate.gte = toGMT8StartOfDay(input.enrollmentFrom);
          }
          if (input.enrollmentTo) {
            where.registerDate.lte = toGMT8EndOfDay(input.enrollmentTo);
          }
        }

        // Status filter
        if (input.status === "ACTIVE") {
          where.subscriptions = {
            some: {
              isActive: true,
              deletedAt: null,
            },
          };
        } else if (input.status === "EXPIRED") {
          where.isActive = false;
          where.revokedAt = null;
        } else if (input.status === "REVOKED") {
          where.revokedAt = { not: null };
        }

        const [items, totalCount] = await Promise.all([
          ctx.db.membership.findMany({
            where,
            skip,
            take: input.pageSize,
            orderBy: { registerDate: "desc" },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  birthDate: true,
                  gender: true,
                  address: true,
                  image: true,
                  point: true,
                },
              },
            },
          }),
          ctx.db.membership.count({ where }),
        ]);

        const transformedItems = items.map((membership) => ({
          membershipId: membership.id,
          user: {
            id: membership.user.id,
            name: membership.user.name,
            email: membership.user.email,
            phone: membership.user.phone,
            birthDate: membership.user.birthDate,
            gender: membership.user.gender,
            address: membership.user.address,
            image: membership.user.image,
            point: membership.user.point,
          },
          registerDate: membership.registerDate,
          isActive: membership.isActive,
        }));

        return {
          items: transformedItems,
          totalCount,
        };
      }),

    /**
     * Export all members (no pagination)
     */
    exportAll: permissionProtectedProcedure(["report:member-profile"])
      .input(
        z.object({
          search: z.string().optional(),
          enrollmentFrom: z.date().optional(),
          enrollmentTo: z.date().optional(),
          status: z.enum(["ACTIVE", "EXPIRED", "REVOKED"]).optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        // Build where clause
        // Only show users who have the "Member" role
        const where: any = {
          user: {
            roles: {
              some: { name: "Member" },         // minimal harus punya role Member
              every: { name: "Member" },        // semua role yg dimiliki harus Member
            },
          },
        };

        // Search filter
        if (input.search) {
          where.OR = [
            {
              user: {
                name: {
                  contains: input.search,
                  mode: "insensitive" as const,
                },
              },
            },
            {
              user: {
                email: {
                  contains: input.search,
                  mode: "insensitive" as const,
                },
              },
            },
            {
              user: {
                phone: {
                  contains: input.search,
                  mode: "insensitive" as const,
                },
              },
            },
            {
              rfidNumber: {
                contains: input.search,
                mode: "insensitive" as const,
              },
            },
          ];
        }

        // Date range filter (convert to GMT+8)
        if (input.enrollmentFrom || input.enrollmentTo) {
          where.registerDate = {};
          if (input.enrollmentFrom) {
            where.registerDate.gte = toGMT8StartOfDay(input.enrollmentFrom);
          }
          if (input.enrollmentTo) {
            where.registerDate.lte = toGMT8EndOfDay(input.enrollmentTo);
          }
        }

        // Status filter
        if (input.status === "ACTIVE") {
          where.isActive = true;
          where.revokedAt = null;
        } else if (input.status === "EXPIRED") {
          where.isActive = false;
          where.revokedAt = null;
        } else if (input.status === "REVOKED") {
          where.revokedAt = { not: null };
        }

        // Fetch ALL members without pagination
        const items = await ctx.db.membership.findMany({
          where,
          orderBy: { registerDate: "desc" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                birthDate: true,
                gender: true,
                point: true,
              },
            },
          },
        });

        // Return simplified data for export
        return items.map((membership) => ({
          name: membership.user.name,
          email: membership.user.email,
          phone: membership.user.phone,
          birthDate: membership.user.birthDate,
          registerDate: membership.registerDate,
          gender: membership.user.gender,
          point: membership.user.point,
          isActive: membership.isActive,
        }));
      }),

    /**
     * Get detailed member profile
     */
    get: permissionProtectedProcedure(["report:active-membership"])
      .input(
        z.object({
          membershipId: z.string(),
        }),
      )
      .query(async ({ ctx, input }) => {
        // Fetch member with all related data
        const membership = await ctx.db.membership.findUnique({
          where: { id: input.membershipId },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                birthDate: true,
                gender: true,
                address: true,
                idNumber: true,
                image: true,
                height: true,
                weight: true,
                point: true,
              },
            },
            fc: {
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

        if (!membership) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Member not found",
          });
        }

        // Fetch subscription history
        const subscriptions = await ctx.db.subscription.findMany({
          where: {
            memberId: input.membershipId,
            deletedAt: null,
          },
          orderBy: { startDate: "desc" },
          include: {
            package: {
              select: {
                id: true,
                name: true,
                type: true,
                price: true,
                sessions: true,
                day: true,
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
            payments: {
              where: {
                status: "SUCCESS",
                deletedAt: null,
              },
              select: {
                id: true,
                totalPayment: true,
                method: true,
                paidAt: true,
              },
              orderBy: { paidAt: "desc" },
              take: 1,
            },
          },
        });

        // Fetch trainer sessions summary
        const trainerSessions = await ctx.db.trainerSession.findMany({
          where: { memberId: input.membershipId },
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
          orderBy: { date: "desc" },
        });

        const sessionsSummary = {
          totalSessions: trainerSessions.length,
          completedSessions: trainerSessions.filter(
            (s) => s.status === "ENDED",
          ).length,
          canceledSessions: trainerSessions.filter(
            (s) => s.status === "CANCELED",
          ).length,
          upcomingSessions: trainerSessions.filter(
            (s) => s.status === "NOT_YET",
          ).length,
        };

        // Fetch attendance summary
        const attendances = await ctx.db.attendanceMember.findMany({
          where: { memberId: input.membershipId },
          orderBy: { checkin: "desc" },
        });

        const attendanceSummary = {
          totalVisits: attendances.length,
          lastVisit: attendances[0]?.checkin || null,
          averageVisitsPerMonth: attendances.length > 0 
            ? Math.round(
                (attendances.length /
                  Math.max(
                    1,
                    Math.ceil(
                      (new Date().getTime() -
                        membership.registerDate.getTime()) /
                        (1000 * 60 * 60 * 24 * 30),
                    ),
                  )) * 10,
              ) / 10
            : 0,
        };

        return {
          membership: {
            id: membership.id,
            registerDate: membership.registerDate,
            isActive: membership.isActive,
            revokedAt: membership.revokedAt,
            rfidNumber: membership.rfidNumber,
            user: membership.user,
            fc: membership.fc
              ? {
                  id: membership.fc.id,
                  name: membership.fc.user?.name || "Unknown",
                  email: membership.fc.user?.email || "",
                }
              : null,
          },
          subscriptions: subscriptions.map((sub) => ({
            id: sub.id,
            startDate: sub.startDate,
            endDate: sub.endDate,
            remainingSessions: sub.remainingSessions,
            isActive: sub.isActive,
            isFrozen: sub.isFrozen,
            package: sub.package,
            trainer: sub.trainer
              ? {
                  id: sub.trainer.id,
                  name: sub.trainer.user?.name || "Unknown",
                  email: sub.trainer.user?.email || "",
                }
              : null,
            payment: sub.payments[0] || null,
          })),
          trainerSessionsSummary: sessionsSummary,
          attendanceSummary,
          recentSessions: trainerSessions.slice(0, 10).map((session) => ({
            id: session.id,
            date: session.date,
            startTime: session.startTime,
            endTime: session.endTime,
            status: session.status,
            trainerName: session.trainer?.user?.name || "Unknown",
            isGroup: session.isGroup,
          })),
          recentAttendances: attendances.slice(0, 10).map((att) => ({
            id: att.id,
            checkin: att.checkin,
            checkout: att.checkout,
            facilityDescription: att.facilityDescription,
          })),
        };
      }),
  }),

  /**
   * PT Remaining Sessions Report
   * 
   * Returns members with remaining PT sessions, grouped by trainer.
   * Useful for tracking PT package usage and scheduling.
   */
  ptRemainingSessions: createTRPCRouter({
    list: permissionProtectedProcedure(["report:pt-remaining-sessions"])
      .input(
        z.object({
          trainerId: z.string().optional(),
          minRemaining: z.number().min(0).optional(),
          search: z.string().optional(),
          groupByTrainer: z.boolean().optional().default(true),
          page: z.number().min(1).optional().default(1),
          pageSize: z.number().min(1).max(100).optional().default(25),
        }),
      )
      .query(async ({ ctx, input }) => {
        // Build where clause for subscriptions
        const where: any = {
          isActive: true,
          deletedAt: null,
          remainingSessions: {
            gt: input.minRemaining ?? 0,
          },
          package: {
            type: {
              in: ["PERSONAL_TRAINER", "GROUP_TRAINING"],
            },
          },
        };

        // Filter by trainer
        if (input.trainerId) {
          where.trainerId = input.trainerId;
        } else {
          // Exclude subscriptions without a trainer
          where.trainerId = { not: null };
        }

        // Add search filter on member name or phone
        if (input.search) {
          where.member = {
            user: {
              OR: [
                {
                  name: {
                    contains: input.search,
                    mode: "insensitive" as const,
                  },
                },
                {
                  phone: {
                    contains: input.search,
                    mode: "insensitive" as const,
                  },
                },
              ],
            },
          };
        }

        // Fetch subscriptions with remaining sessions
        const subscriptions = await ctx.db.subscription.findMany({
          where,
          include: {
            member: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                  },
                },
              },
            },
            trainer: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                  },
                },
              },
            },
            package: {
              select: {
                id: true,
                name: true,
                sessions: true,
              },
            },
          },
          orderBy: [
            { trainerId: "asc" },
            { remainingSessions: "desc" },
          ],
        });

        if (input.groupByTrainer) {
          // Group by trainer
          const trainerMap = new Map<
            string,
            {
              trainerId: string;
              trainerUser: { id: string; name: string | null; phone: string | null };
              totalMembersWithRemaining: number;
              members: Array<{
                membershipId: string;
                user: { id: string; name: string | null; phone: string | null };
                subscriptionId: string;
                package: { id: string; name: string; sessions: number | null };
                remainingSessions: number | null;
                startDate: Date;
                endDate: Date | null;
              }>;
            }
          >();

          subscriptions.forEach((sub) => {
            if (!sub.trainerId || !sub.trainer) return;

            if (!trainerMap.has(sub.trainerId)) {
              trainerMap.set(sub.trainerId, {
                trainerId: sub.trainerId,
                trainerUser: {
                  id: sub.trainer.user.id,
                  name: sub.trainer.user.name,
                  phone: sub.trainer.user.phone,
                },
                totalMembersWithRemaining: 0,
                members: [],
              });
            }

            const trainerData = trainerMap.get(sub.trainerId)!;
            trainerData.totalMembersWithRemaining += 1;
            trainerData.members.push({
              membershipId: sub.memberId,
              user: {
                id: sub.member.user.id,
                name: sub.member.user.name,
                phone: sub.member.user.phone,
              },
              subscriptionId: sub.id,
              package: {
                id: sub.package.id,
                name: sub.package.name,
                sessions: sub.package.sessions,
              },
              remainingSessions: sub.remainingSessions,
              startDate: sub.startDate,
              endDate: sub.endDate,
            });
          });

          const items = Array.from(trainerMap.values());
          
          // Apply pagination
          const skip = (input.page - 1) * input.pageSize;
          const paginatedItems = items.slice(skip, skip + input.pageSize);

          return {
            items: paginatedItems,
            totalCount: items.length,
          };
        } else {
          // Return flat list without grouping
          const skip = (input.page - 1) * input.pageSize;
          const totalCount = await ctx.db.subscription.count({ where });
          
          const paginatedSubscriptions = await ctx.db.subscription.findMany({
            where,
            skip,
            take: input.pageSize,
            include: {
              member: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      phone: true,
                    },
                  },
                },
              },
              trainer: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      phone: true,
                    },
                  },
                },
              },
              package: {
                select: {
                  id: true,
                  name: true,
                  sessions: true,
                },
              },
            },
            orderBy: { remainingSessions: "desc" },
          });

          const items = paginatedSubscriptions
            .filter((sub) => sub.trainer)
            .map((sub) => ({
              trainerId: sub.trainerId!,
              trainerUser: {
                id: sub.trainer!.user.id,
                name: sub.trainer!.user.name,
                phone: sub.trainer!.user.phone,
              },
              totalMembersWithRemaining: 1,
              members: [
                {
                  membershipId: sub.memberId,
                  user: {
                    id: sub.member.user.id,
                    name: sub.member.user.name,
                    phone: sub.member.user.phone,
                  },
                  subscriptionId: sub.id,
                  package: {
                    id: sub.package.id,
                    name: sub.package.name,
                    sessions: sub.package.sessions,
                  },
                  remainingSessions: sub.remainingSessions,
                  startDate: sub.startDate,
                  endDate: sub.endDate,
                },
              ],
            }));

          return {
            items,
            totalCount,
          };
        }
      }),
  }),
});