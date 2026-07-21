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

  memberProfile: createTRPCRouter({
    search: permissionProtectedProcedure(["report:member-profile"])
      .input(
        z.object({
          search: z.string().optional(),
          enrollmentFrom: z.date().optional(),
          enrollmentTo: z.date().optional(),
          status: z.enum(["ACTIVE", "EXPIRED", "REVOKED"]).optional(),
          gender: z.string().optional(),
          ageMin: z.number().min(0).optional(),
          ageMax: z.number().min(0).optional(),
          membershipFrom: z.date().optional(),
          membershipTo: z.date().optional(),
          membershipPackageId: z.string().optional(),
          page: z.number().min(1).optional().default(1),
          pageSize: z.number().min(1).max(100).optional().default(25),
          sortBy: z.enum(["point", "registerDate", "birthDate"]).optional().default("registerDate"),
          sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
        }),
      )
      .query(async ({ ctx, input }) => {
        const skip = (input.page - 1) * input.pageSize;

        const where: any = {
          user: {
            roles: {
              some: { name: "Member" },
            },
          },
        };

        if (input.search) {
          where.OR = [
            { user: { name: { contains: input.search, mode: "insensitive" as const } } },
            { user: { email: { contains: input.search, mode: "insensitive" as const } } },
            { user: { phone: { contains: input.search, mode: "insensitive" as const } } },
            { rfidNumber: { contains: input.search, mode: "insensitive" as const } },
          ];
        }

        if (input.enrollmentFrom || input.enrollmentTo) {
          where.registerDate = {};
          if (input.enrollmentFrom) {
            where.registerDate.gte = toGMT8StartOfDay(input.enrollmentFrom);
          }
          if (input.enrollmentTo) {
            where.registerDate.lte = toGMT8EndOfDay(input.enrollmentTo);
          }
        }

        // Combined subscription filter (ACTIVE status + membership date range)
        const subFilter: any = {};
        if (input.status === "ACTIVE") {
          subFilter.isActive = true;
          subFilter.deletedAt = null;
        }
        if (input.membershipFrom || input.membershipTo) {
          subFilter.deletedAt = null;
          subFilter.startDate = {};
          if (input.membershipFrom) subFilter.startDate.gte = toGMT8StartOfDay(input.membershipFrom);
          if (input.membershipTo) subFilter.startDate.lte = toGMT8EndOfDay(input.membershipTo);
        }
        if (input.membershipPackageId) {
          subFilter.packageId = input.membershipPackageId;
          subFilter.deletedAt = null;
        }
        if (Object.keys(subFilter).length > 0) {
          where.subscriptions = { some: subFilter };
        }
        if (input.status === "EXPIRED") {
          where.isActive = false;
          where.revokedAt = null;
        } else if (input.status === "REVOKED") {
          where.revokedAt = { not: null };
        }

        if (input.gender) {
          where.user.gender = input.gender;
        }

        if (input.ageMin !== undefined || input.ageMax !== undefined) {
          if (!where.user.birthDate) where.user.birthDate = {};
          const now = new Date();
          if (input.ageMin !== undefined) {
            const maxBirthDate = new Date(now);
            maxBirthDate.setFullYear(maxBirthDate.getFullYear() - input.ageMin);
            where.user.birthDate.lte = maxBirthDate;
          }
          if (input.ageMax !== undefined) {
            const minBirthDate = new Date(now);
            minBirthDate.setFullYear(minBirthDate.getFullYear() - (input.ageMax + 1));
            minBirthDate.setDate(minBirthDate.getDate() + 1);
            where.user.birthDate.gte = minBirthDate;
          }
        }

        const [items, totalCount] = await Promise.all([
          ctx.db.membership.findMany({
            where,
            skip,
            take: input.pageSize,
            orderBy: input.sortBy === "point"
              ? { user: { point: input.sortOrder } }
              : input.sortBy === "birthDate"
                ? { user: { birthDate: input.sortOrder === "asc" ? "desc" : "asc" } }
                : { registerDate: input.sortOrder },
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
              subscriptions: {
                where: { deletedAt: null },
                orderBy: { startDate: "desc" as const },
                take: 20,
                select: {
                  id: true,
                  isActive: true,
                  startDate: true,
                  endDate: true,
                  package: { select: { name: true, type: true } },
                },
              },
            },
          }),
          ctx.db.membership.count({ where }),
        ]);

        return {
          items: items.map((membership) => ({
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
            isActive: membership.subscriptions.some((s) => s.isActive),
            lastMembership: (() => {
              const gym = membership.subscriptions.find(
                (s) => s.package.type === "GYM_MEMBERSHIP"
              );
              return gym
                ? { name: gym.package.name, startDate: gym.startDate, endDate: gym.endDate, isActive: gym.isActive }
                : null;
            })(),
          })),
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
          gender: z.string().optional(),
          ageMin: z.number().min(0).optional(),
          ageMax: z.number().min(0).optional(),
          membershipFrom: z.date().optional(),
          membershipTo: z.date().optional(),
          membershipPackageId: z.string().optional(),
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

        // Combined subscription filter (ACTIVE status + membership date range)
        const subFilterExport: any = {};
        if (input.status === "ACTIVE") {
          subFilterExport.isActive = true;
          subFilterExport.deletedAt = null;
        }
        if (input.membershipFrom || input.membershipTo) {
          subFilterExport.deletedAt = null;
          subFilterExport.startDate = {};
          if (input.membershipFrom) subFilterExport.startDate.gte = toGMT8StartOfDay(input.membershipFrom);
          if (input.membershipTo) subFilterExport.startDate.lte = toGMT8EndOfDay(input.membershipTo);
        }
        if (input.membershipPackageId) {
          subFilterExport.packageId = input.membershipPackageId;
          subFilterExport.deletedAt = null;
        }
        if (Object.keys(subFilterExport).length > 0) {
          where.subscriptions = { some: subFilterExport };
        }
        if (input.status === "EXPIRED") {
          where.isActive = false;
          where.revokedAt = null;
        } else if (input.status === "REVOKED") {
          where.revokedAt = { not: null };
        }

        // Gender filter
        if (input.gender) {
          where.user.gender = input.gender;
        }

        // Age filter (convert age range to birthDate range)
        if (input.ageMin !== undefined || input.ageMax !== undefined) {
          if (!where.user.birthDate) where.user.birthDate = {};
          const now = new Date();
          if (input.ageMin !== undefined) {
            const maxBirthDate = new Date(now);
            maxBirthDate.setFullYear(maxBirthDate.getFullYear() - input.ageMin);
            where.user.birthDate.lte = maxBirthDate;
          }
          if (input.ageMax !== undefined) {
            const minBirthDate = new Date(now);
            minBirthDate.setFullYear(minBirthDate.getFullYear() - (input.ageMax + 1));
            minBirthDate.setDate(minBirthDate.getDate() + 1);
            where.user.birthDate.gte = minBirthDate;
          }
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
            subscriptions: {
              where: { deletedAt: null },
              orderBy: { startDate: "desc" as const },
              take: 20,
              select: {
                id: true,
                isActive: true,
                startDate: true,
                endDate: true,
                package: { select: { name: true, type: true } },
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
          isActive: membership.subscriptions.some((s) => s.isActive),
          lastMembershipName: (() => {
            const gym = membership.subscriptions.find((s) => s.package.type === "GYM_MEMBERSHIP");
            return gym?.package.name ?? null;
          })(),
          lastMembershipStart: (() => {
            const gym = membership.subscriptions.find((s) => s.package.type === "GYM_MEMBERSHIP");
            return gym?.startDate ?? null;
          })(),
          lastMembershipEnd: (() => {
            const gym = membership.subscriptions.find((s) => s.package.type === "GYM_MEMBERSHIP");
            return gym?.endDate ?? null;
          })(),
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

        // Fetch subscription history (include soft-deleted for full history)
        const subscriptions = await ctx.db.subscription.findMany({
          where: {
            memberId: input.membershipId,
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

        // Batch-resolve sales person names from salesId + salesType
        const fcSalesIds = [...new Set(subscriptions
          .filter((s) => s.salesType === "FC" && s.salesId)
          .map((s) => s.salesId!))];
        const ptSalesIds = [...new Set(subscriptions
          .filter((s) => s.salesType === "PersonalTrainer" && s.salesId)
          .map((s) => s.salesId!))];

        const [fcSalesList, ptSalesList] = await Promise.all([
          fcSalesIds.length > 0
            ? ctx.db.fC.findMany({
                where: { id: { in: fcSalesIds } },
                select: { id: true, user: { select: { name: true } } },
              })
            : Promise.resolve([]),
          ptSalesIds.length > 0
            ? ctx.db.personalTrainer.findMany({
                where: { id: { in: ptSalesIds } },
                select: { id: true, user: { select: { name: true } } },
              })
            : Promise.resolve([]),
        ]);

        const fcSalesMap = new Map(fcSalesList.map((fc) => [fc.id, fc.user?.name ?? "Unknown"]));
        const ptSalesMap = new Map(ptSalesList.map((pt) => [pt.id, pt.user?.name ?? "Unknown"]));

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
            isActive: subscriptions.some((sub) => sub.isActive && !sub.deletedAt),
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
            deletedAt: sub.deletedAt,
            package: sub.package,
            trainer: sub.trainer
              ? {
                  id: sub.trainer.id,
                  name: sub.trainer.user?.name || "Unknown",
                  email: sub.trainer.user?.email || "",
                }
              : null,
            salesName: sub.salesId
              ? sub.salesType === "FC"
                ? (fcSalesMap.get(sub.salesId) ?? null)
                : sub.salesType === "PersonalTrainer"
                  ? (ptSalesMap.get(sub.salesId) ?? null)
                  : null
              : null,
            salesType: sub.salesType ?? null,
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
      const minRem = input.minRemaining ?? 0;
      const where: any = {
        isActive: true,
        deletedAt: null,
        OR: [
          { remainingSessions: { gt: minRem } },
          { remainingBonusSessions: { gt: minRem } },
        ],
        package: {
          type: { in: ["PERSONAL_TRAINER", "GROUP_TRAINING"] },
        },
      };

      if (input.trainerId) {
        where.trainerId = input.trainerId;
      } else {
        where.trainerId = { not: null };
      }

      if (input.search) {
        where.member = {
          user: {
            OR: [
              { name: { contains: input.search, mode: "insensitive" as const } },
              { phone: { contains: input.search, mode: "insensitive" as const } },
            ],
          },
        };
      }

      const subscriptions = await ctx.db.subscription.findMany({
        where,
        include: {
          member: {
            include: {
              user: { select: { id: true, name: true, phone: true } },
            },
          },
          trainer: {
            include: {
              user: { select: { id: true, name: true, phone: true } },
            },
          },
          package: {
            select: { id: true, name: true, sessions: true, bonusSessions: true },
          },
        },
        orderBy: [
          { trainerId: "asc" },
          { remainingSessions: "desc" },
        ],
      });

      if (input.groupByTrainer) {
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
              package: { id: string; name: string; sessions: number | null; bonusSessions: number };
              remainingSessions: number | null;
              remainingBonusSessions: number;
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
              bonusSessions: (sub.package as any).bonusSessions ?? 0,
            },
            remainingSessions: sub.remainingSessions,
            remainingBonusSessions: (sub as any).remainingBonusSessions ?? 0,
            startDate: sub.startDate,
            endDate: sub.endDate,
          });
        });

        const items = Array.from(trainerMap.values());
        const skip = (input.page - 1) * input.pageSize;
        const paginatedItems = items.slice(skip, skip + input.pageSize);

        return {
          items: paginatedItems,
          totalCount: items.length,
        };
      } else {
        const skip = (input.page - 1) * input.pageSize;
        const totalCount = await ctx.db.subscription.count({ where });

        const paginatedSubscriptions = await ctx.db.subscription.findMany({
          where,
          skip,
          take: input.pageSize,
          include: {
            member: {
              include: {
                user: { select: { id: true, name: true, phone: true } },
              },
            },
            trainer: {
              include: {
                user: { select: { id: true, name: true, phone: true } },
              },
            },
            package: {
              select: { id: true, name: true, sessions: true, bonusSessions: true },
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
                  bonusSessions: (sub.package as any).bonusSessions ?? 0,
                },
                remainingSessions: sub.remainingSessions,
                remainingBonusSessions: (sub as any).remainingBonusSessions ?? 0,
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

  /**
   * Attendance Summary Report
   * Returns total check-ins per member for a given period, sorted by most attended.
   */
  attendanceSummary: permissionProtectedProcedure(["report:member-attendance"])
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        search: z.string().optional(),
        corporateId: z.string().optional(),
        page: z.number().min(1).optional().default(1),
        pageSize: z.number().min(1).max(100).optional().default(25),
      }),
    )
    .query(async ({ ctx, input }) => {
      // If search is provided, first resolve matching memberIds
      let memberIdFilter: string[] | undefined;
      if (input.search) {
        const matchingMembers = await ctx.db.membership.findMany({
          where: {
            user: {
              name: { contains: input.search, mode: "insensitive" },
            },
          },
          select: { id: true },
        });
        memberIdFilter = matchingMembers.map((m) => m.id);
        if (memberIdFilter.length === 0) {
          return { items: [], totalCount: 0 };
        }
      }

      // If corporateId is provided, resolve matching memberIds from subscriptions
      if (input.corporateId) {
        const corporateSubs = await ctx.db.subscription.findMany({
          where: {
            corporateId: input.corporateId === "NONE" ? null : input.corporateId,
            deletedAt: null,
          },
          select: { memberId: true },
        });
        const corporateMemberIds = [...new Set(corporateSubs.map((s) => s.memberId))];
        if (corporateMemberIds.length === 0) return { items: [], totalCount: 0 };
        // Intersect with search filter if both are present
        memberIdFilter = memberIdFilter
          ? memberIdFilter.filter((id) => corporateMemberIds.includes(id))
          : corporateMemberIds;
        if (memberIdFilter.length === 0) return { items: [], totalCount: 0 };
      }

      // Build where clause for groupBy
      const where: any = {};
      if (memberIdFilter) where.memberId = { in: memberIdFilter };
      if (input.startDate || input.endDate) {
        where.checkin = {};
        if (input.startDate) where.checkin.gte = toGMT8StartOfDay(input.startDate);
        if (input.endDate) where.checkin.lte = toGMT8EndOfDay(input.endDate);
      }

      // Group by memberId, count check-ins, sort desc
      const grouped = await ctx.db.attendanceMember.groupBy({
        by: ["memberId"],
        where: Object.keys(where).length > 0 ? where : undefined,
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      });

      const totalCount = grouped.length;
      const pageItems = grouped.slice(
        (input.page - 1) * input.pageSize,
        input.page * input.pageSize,
      );
      const memberIds = pageItems.map((g) => g.memberId);

      // Fetch member + user info
      const members = await ctx.db.membership.findMany({
        where: { id: { in: memberIds } },
        include: {
          user: { select: { name: true, email: true, phone: true } },
        },
      });
      const memberMap = new Map(members.map((m) => [m.id, m]));

      const items = pageItems.map((g, i) => ({
        rank: (input.page - 1) * input.pageSize + i + 1,
        memberId: g.memberId,
        memberName: memberMap.get(g.memberId)?.user.name ?? null,
        memberEmail: memberMap.get(g.memberId)?.user.email ?? null,
        memberPhone: memberMap.get(g.memberId)?.user.phone ?? null,
        totalCheckins: g._count.id,
      }));

      return { items, totalCount };
    }),
});