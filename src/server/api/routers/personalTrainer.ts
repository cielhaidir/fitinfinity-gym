import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  permissionProtectedProcedure,
  publicProcedure,
  protectedProcedure,
} from "@/server/api/trpc";
import { memberSchema } from "@/app/(authenticated)/personal-trainers/member-list/schema";
import { logApiMutationAsync, extractIpAddress, extractUserAgent } from "@/server/utils/mutationLogger";
import { decrementSessionFIFO } from "@/server/utils/ptSubscriptionUtils";

export const personalTrainerRouter = createTRPCRouter({
  create: permissionProtectedProcedure(["create:trainers"])
    .input(
      z.object({
        userId: z.string(),
        isActive: z.boolean().optional(),
        createdBy: z.string().optional(),
        description: z.string().optional(),
        expertise: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        result = await ctx.db.$transaction(async (tx) => {
          // Create the personal trainer record
          const personalTrainer = await tx.personalTrainer.create({
            data: {
              userId: input.userId,
              isActive: input.isActive ?? true,
              description: input.description,
              expertise: input.expertise,
            },
          });

          // Find the "Personal Trainer" role
          const personalTrainerRole = await tx.role.findFirst({
            where: {
              name: "Personal Trainer",
            },
          });


          if (personalTrainerRole) {
            await tx.user.update({
              where: { id: input.userId },
              data: { roles: { connect: { id: personalTrainerRole.id } } },
            });

          }

          

          return personalTrainer;
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
          endpoint: "personalTrainer.create",
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

  update: permissionProtectedProcedure(["update:trainers"])
    .input(
      z.object({
        id: z.string(),
        description: z.string().optional(),
        expertise: z.string().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        result = await ctx.db.personalTrainer.update({
          where: { id: input.id },
          data: {
            description: input.description,
            expertise: input.expertise,
            isActive: input.isActive,
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
          endpoint: "personalTrainer.update",
          method: "PUT",
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

  getById: permissionProtectedProcedure(["show:trainers"])
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.personalTrainer.findFirst({
        where: {
          userId: input.id,
          isActive: true,
        },
        include: {
          user: true,
        },
      });
    }),

  list: permissionProtectedProcedure(["list:trainers"])
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
                },
              },
            }
          : {
              [input.searchColumn ?? ""]: {
                contains: input.search,
                mode: "insensitive" as const,
              },
            }
        : {};

      const items = await ctx.db.personalTrainer.findMany({
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        where: whereClause,
        orderBy: { createdAt: "desc" },
        include: {
          user: true,
        },
      });

      const total = await ctx.db.personalTrainer.count({ where: whereClause });

      return {
        items,
        total,
        page: input.page,
        limit: input.limit,
      };
    }),

  remove: permissionProtectedProcedure(["delete:trainers"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        // Use a transaction to ensure all related data is deleted properly
        result = await ctx.db.$transaction(async (tx) => {
          // First delete all trainer sessions
          await tx.trainerSession.deleteMany({
            where: { trainerId: input.id },
          });

          // Note: Class model doesn't have trainerId field, so this deletion is not needed
          // Classes are not directly associated with trainers in the current schema

          // Update subscriptions to remove trainer reference
          await tx.subscription.updateMany({
            where: { trainerId: input.id },
            data: { trainerId: null },
          });

          // Finally delete the trainer
          return tx.personalTrainer.delete({
            where: { id: input.id },
          });
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
          endpoint: "personalTrainer.remove",
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

  listAll: permissionProtectedProcedure(["list:trainers"]).query(
    async ({ ctx }) => {
      return ctx.db.personalTrainer.findMany({
        include: {
          user: true,
        },
      });
    },
  ),
    listAllActive: permissionProtectedProcedure(["list:trainers"]).query(
    async ({ ctx }) => {
      return ctx.db.personalTrainer.findMany({
        where: {
          isActive: true,
        },
        include: {
          user: true,
        },
      });
    },
  ),

  createSession: permissionProtectedProcedure(["create:session"])
    .input(
      z.object({
        memberId: z.string(),
        date: z.date(),
        startTime: z.date(),
        endTime: z.date(),
        description: z.string().optional(),
        isGroup: z.boolean().optional(),
        groupId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        console.log("ctx.db:", ctx.db);

        const trainer = await ctx.db.personalTrainer.findFirst({
          where: {
            userId: ctx.session.user.id,
            isActive: true,
          },
        });

        console.log("Current user ID:", ctx.session.user.id);
        console.log("Found trainer:", trainer);

        if (!trainer) {
          throw new Error(
            "Trainer not found. Please make sure you are registered as an active trainer.",
          );
        }

        // Check if the member has an active gym membership
        const activeGymMembership = await ctx.db.subscription.findFirst({
          where: {
            memberId: input.memberId,
            isActive: true,
            isFrozen: false,
            deletedAt: null,
            package: { type: "GYM_MEMBERSHIP" },
          },
          select: { id: true },
        });

        if (!activeGymMembership) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Member tidak memiliki membership gym aktif. Pastikan membership gym aktif sebelum menginput sesi PT.",
          });
        }

        result = await ctx.db.$transaction(async (tx) => {
          let isBonusSession = false;
          let fifoSubscriptionId: string | undefined;

          // If it's a group session, decrease from lead subscription
          if (input.isGroup && input.groupId) {
            const groupSubscription = await tx.groupSubscription.findFirst({
              where: { id: input.groupId },
              include: { leadSubscription: true },
            });

            if (groupSubscription) {
              await tx.subscription.update({
                where: { id: groupSubscription.leadSubscriptionId },
                data: { remainingSessions: { decrement: 1 } },
              });
              fifoSubscriptionId = groupSubscription.leadSubscriptionId;
            }
          } else {
            // For individual sessions, use FIFO (expiry-first, paid before bonus)
            const fifoResult = await decrementSessionFIFO({
              tx,
              memberId: input.memberId,
              trainerId: trainer.id,
              isGroup: false,
            });
            isBonusSession = fifoResult.isBonusSession;
            fifoSubscriptionId = fifoResult.id;
          }

          const session = await tx.trainerSession.create({
            data: {
              trainerId: trainer.id,
              memberId: input.memberId,
              date: input.date,
              startTime: input.startTime,
              endTime: input.endTime,
              description: input.description,
              isBonusSession,
              subscriptionId: fifoSubscriptionId,
            },
          });

          return session;
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
          endpoint: "personalTrainer.createSession",
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

  // For management to get members by specific trainer ID
  getMembersByTrainerId: permissionProtectedProcedure(["list:trainers"])
    .input(z.object({ trainerId: z.string() }))
    .query(async ({ ctx, input }) => {
      console.log("Getting members for trainer ID:", input.trainerId);

      // Get all individual subscriptions for this personal trainer
      // Exclude subscriptions that are lead subscriptions for groups
      // AND exclude subscriptions that belong to group members (non-leaders)
      const subscriptions = await ctx.db.subscription.findMany({
        where: {
          trainerId: input.trainerId,
          isActive: true,
          deletedAt: null,
          OR: [
            { remainingSessions: { gt: 0 } },
            { remainingBonusSessions: { gt: 0 } },
          ],
          leadGroupSubscriptions: {
            none: {
              status: "ACTIVE",
            },
          },
          groupMembers: {
            none: {
              status: "ACTIVE",
            },
          },
        },
        orderBy: {
          remainingSessions: "desc",
        },
        include: {
          member: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  height: true,
                  weight: true,
                  birthDate: true,
                },
              },
            },
          },
          package: {
            select: {
              type: true,
            },
          },
        },
      });

      // Get all group subscriptions for this personal trainer
      const groupSubscriptions = await ctx.db.groupSubscription.findMany({
        where: {
          leadSubscription: {
            trainerId: input.trainerId,
            isActive: true,
            deletedAt: null,
            OR: [
              { remainingSessions: { gt: 0 } },
              { remainingBonusSessions: { gt: 0 } },
            ],
          },
          status: "ACTIVE",
        },
        include: {
          leadSubscription: {
            include: {
              member: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      phone: true,
                      height: true,
                      weight: true,
                      birthDate: true,
                    },
                  },
                },
              },
            },
          },
          groupMembers: {
            where: { status: "ACTIVE" },
            include: {
              subscription: {
                include: {
                  member: { include: { user: { select: { name: true } } } },
                },
              },
            },
          },
          package: {
            select: {
              type: true,
              sessions: true,
            },
          },
        },
      });

      // Transform individual subscriptions
      const individualMembers = subscriptions.map((subscription) => ({
        id: subscription.member.userId,
        membershipId: subscription.memberId,
        name: subscription.member.user.name || "",
        email: subscription.member.user.email || "",
        phone: subscription.member.user.phone || "",
        height: subscription.member.user.height ?? null,
        weight: subscription.member.user.weight ?? null,
        birthDate: subscription.member.user.birthDate?.toISOString() ?? null,
        remainingSessions: subscription.remainingSessions || 0,
        remainingBonusSessions: subscription.remainingBonusSessions ?? 0,
        subscriptionEndDate: subscription.endDate?.toISOString() || "",
        type: "individual" as const,
        isFrozen: subscription.isFrozen,
        frozenAt: subscription.frozenAt?.toISOString() ?? null,
        freezeDays: subscription.freezeDays ?? null,
        freezeMode: subscription.freezeMode ?? null,
      }));

      // Transform group subscriptions
      const groupMembers = groupSubscriptions.map((groupSubscription) => ({
        id: groupSubscription.id,
        membershipId: groupSubscription.leadSubscription.memberId,
        name: groupSubscription.groupName || `Group (${groupSubscription.leadSubscription.member.user.name})`,
        email: groupSubscription.leadSubscription.member.user.email || "",
        phone: groupSubscription.leadSubscription.member.user.phone || "",
        height: null,
        weight: null,
        birthDate: null,
        remainingSessions: groupSubscription.leadSubscription.remainingSessions || 0,
        remainingBonusSessions: groupSubscription.leadSubscription.remainingBonusSessions ?? 0,
        subscriptionEndDate: groupSubscription.leadSubscription.endDate?.toISOString() || "",
        type: "group" as const,
        isFrozen: groupSubscription.leadSubscription.isFrozen,
        frozenAt: groupSubscription.leadSubscription.frozenAt?.toISOString() ?? null,
        freezeDays: groupSubscription.leadSubscription.freezeDays ?? null,
        freezeMode: groupSubscription.leadSubscription.freezeMode ?? null,
        groupId: groupSubscription.id,
        groupMemberNames: groupSubscription.groupMembers
          .map(gm => gm.subscription.member.user.name || "Unknown")
          .filter(name => name !== (groupSubscription.leadSubscription.member.user.name || "")),
        totalGroupMembers: groupSubscription.totalMembers,
      }));

      // Combine both individual and group members
      return [...individualMembers, ...groupMembers];
    }),

  getMembers: permissionProtectedProcedure(["list:trainers"])
    .input(z.object({
      status: z.enum(["ACTIVE", "FROZEN", "INACTIVE"]).default("ACTIVE"),
    }).optional())
    .query(
    async ({ ctx, input }) => {
      const statusFilter = input?.status ?? "ACTIVE";

      // Get the personal trainer's ID
      const personalTrainer = await ctx.db.personalTrainer.findFirst({
        where: {
          userId: ctx.session.user.id,
          isActive: true,
        },
      });

      if (!personalTrainer) {
        return [];
      }

      // Build where clause based on status filter
      const individualWhere: any = {
        trainerId: personalTrainer.id,
        deletedAt: null,
        leadGroupSubscriptions: { none: {} },
        groupMembers: { none: {} },
      };

      const groupLeadWhere: any = {
        trainerId: personalTrainer.id,
        deletedAt: null,
      };
      let groupStatusFilter: any = undefined;

      if (statusFilter === "ACTIVE") {
        individualWhere.isActive = true;
        individualWhere.isFrozen = false;
        individualWhere.OR = [
          { remainingSessions: { gt: 0 } },
          { remainingBonusSessions: { gt: 0 } },
        ];
        groupLeadWhere.isActive = true;
        groupLeadWhere.isFrozen = false;
        groupLeadWhere.OR = [
          { remainingSessions: { gt: 0 } },
          { remainingBonusSessions: { gt: 0 } },
        ];
        groupStatusFilter = "ACTIVE";
      } else if (statusFilter === "FROZEN") {
        individualWhere.isFrozen = true;
        groupLeadWhere.isFrozen = true;
      } else {
        // INACTIVE: not frozen, and either not active or no sessions left
        individualWhere.isFrozen = false;
        individualWhere.OR = [
          { isActive: false },
          {
            AND: [
              { remainingSessions: { lte: 0 } },
              { remainingBonusSessions: { lte: 0 } },
            ],
          },
        ];
        groupLeadWhere.isFrozen = false;
        groupLeadWhere.OR = [
          { isActive: false },
          {
            AND: [
              { remainingSessions: { lte: 0 } },
              { remainingBonusSessions: { lte: 0 } },
            ],
          },
        ];
      }

      const subscriptions = await ctx.db.subscription.findMany({
        where: individualWhere,
        orderBy: { remainingSessions: "desc" },
        include: {
          member: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  height: true,
                  weight: true,
                  birthDate: true,
                },
              },
            },
          },
          package: { select: { type: true, name: true } },
        },
      });

      // Get group subscriptions
      const groupWhere: any = {
        leadSubscription: groupLeadWhere,
      };
      if (groupStatusFilter) {
        groupWhere.status = groupStatusFilter;
      }

      const groupSubscriptions = await ctx.db.groupSubscription.findMany({
        where: groupWhere,
        include: {
          leadSubscription: {
            include: {
              member: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      phone: true,
                      height: true,
                      weight: true,
                      birthDate: true,
                    },
                  },
                },
              },
            },
          },
          groupMembers: {
            include: {
              subscription: {
                include: {
                  member: { include: { user: { select: { name: true } } } },
                },
              },
            },
          },
          package: { select: { type: true, sessions: true, name: true } },
        },
      });

      // Transform individual subscriptions
      const individualMembers = subscriptions.map((subscription) => ({
        id: subscription.member.userId,
        membershipId: subscription.memberId,
        name: subscription.member.user.name || "",
        email: subscription.member.user.email || "",
        phone: subscription.member.user.phone || "",
        height: subscription.member.user.height ?? null,
        weight: subscription.member.user.weight ?? null,
        birthDate: subscription.member.user.birthDate?.toISOString() ?? null,
        remainingSessions: subscription.remainingSessions || 0,
        remainingBonusSessions: subscription.remainingBonusSessions ?? 0,
        subscriptionEndDate: subscription.endDate?.toISOString() || "",
        packageName: subscription.package.name || "",
        type: "individual" as const,
        isFrozen: subscription.isFrozen,
        frozenAt: subscription.frozenAt?.toISOString() ?? null,
        freezeDays: subscription.freezeDays ?? null,
        freezeMode: subscription.freezeMode ?? null,
      }));

      // Transform group subscriptions
      const groupMembers = groupSubscriptions.map((groupSubscription) => ({
        id: groupSubscription.id,
        membershipId: groupSubscription.leadSubscription.memberId,
        name: groupSubscription.groupName || `Group (${groupSubscription.leadSubscription.member.user.name})`,
        email: groupSubscription.leadSubscription.member.user.email || "",
        phone: groupSubscription.leadSubscription.member.user.phone || "",
        height: null,
        weight: null,
        birthDate: null,
        remainingSessions: groupSubscription.leadSubscription.remainingSessions || 0,
        remainingBonusSessions: groupSubscription.leadSubscription.remainingBonusSessions ?? 0,
        subscriptionEndDate: groupSubscription.leadSubscription.endDate?.toISOString() || "",
        packageName: groupSubscription.package.name || "",
        type: "group" as const,
        isFrozen: groupSubscription.leadSubscription.isFrozen,
        frozenAt: groupSubscription.leadSubscription.frozenAt?.toISOString() ?? null,
        freezeDays: groupSubscription.leadSubscription.freezeDays ?? null,
        freezeMode: groupSubscription.leadSubscription.freezeMode ?? null,
        groupId: groupSubscription.id,
        groupMemberNames: groupSubscription.groupMembers
          .map(gm => gm.subscription.member.user.name || "Unknown")
          .filter(name => name !== (groupSubscription.leadSubscription.member.user.name || "")),
        totalGroupMembers: groupSubscription.totalMembers,
      }));

      return [...individualMembers, ...groupMembers];
    },
  ),

  /**
   * Member statistics for PT dashboard
   *
   * - total: semua entitas unik (individual + group) yang pernah punya subscription ke PT ini
   * - active: entitas unik dengan remainingSessions > 0, endDate >= sekarang, dan subscription isActive (untuk individual)
   *           atau groupSubscription.status === 'ACTIVE' (untuk group) pada minimal satu subscription
   * - inactive: total - active
   *
   * Key keunikan:
   * - Individual: userId member
   * - Group: id groupSubscription
   */
  getMemberStats: permissionProtectedProcedure(["list:trainers"]).query(
    async ({ ctx }) => {
      const personalTrainer = await ctx.db.personalTrainer.findFirst({
        where: {
          userId: ctx.session.user.id,
          isActive: true,
        },
      });

      if (!personalTrainer) {
        return { total: 0, active: 0, inactive: 0 };
      }

      const now = new Date();

      // Ambil semua subscription individual untuk trainer ini
      // Exclude group leaders AND group members to match getMembers logic
      const subscriptions = await ctx.db.subscription.findMany({
        where: {
          trainerId: personalTrainer.id,
          deletedAt: null,
          leadGroupSubscriptions: {
            none: {},
          },
          groupMembers: {
            none: {},
          },
        },
        include: {
          member: {
            include: {
              user: true,
            },
          },
        },
      });

      // Ambil semua group subscription yang terkait trainer ini
      const groupSubscriptions = await ctx.db.groupSubscription.findMany({
        where: {
          leadSubscription: {
            trainerId: personalTrainer.id,
            deletedAt: null,
          },
        },
        include: {
          leadSubscription: {
            include: {
              member: {
                include: {
                  user: {
                    select: { name: true, phone: true },
                  },
                },
              },
            },
          },
        },
      });

      type StatEntry = {
        isActive: boolean;
        isFrozen: boolean;
        name: string;
        phone: string | null;
        frozenAt: Date | null;
        freezeDays: number | null;
        freezeMode: string | null;
      };
      const statsMap = new Map<string, StatEntry>();

      // Individual: key = userId
      for (const sub of subscriptions) {
        const userId = sub.member.userId;
        if (!userId) continue;

        const key = `individual:${userId}`;
        const entry = statsMap.get(key) ?? {
          isActive: false,
          isFrozen: false,
          name: sub.member.user.name || "Unknown",
          phone: sub.member.user.phone || null,
          frozenAt: null,
          freezeDays: null,
          freezeMode: null,
        };

        const hasEndDateValid = !sub.endDate || sub.endDate >= now;
        const hasSessions = (sub.remainingSessions ?? 0) > 0 || (sub.remainingBonusSessions ?? 0) > 0;

        if (sub.isFrozen) {
          entry.isFrozen = true;
          entry.frozenAt = sub.frozenAt;
          entry.freezeDays = sub.freezeDays;
          entry.freezeMode = sub.freezeMode;
        } else if (!!sub.isActive && hasSessions && hasEndDateValid) {
          entry.isActive = true;
        }

        statsMap.set(key, entry);
      }

      // Group: key = groupSubscription.id
      for (const gs of groupSubscriptions) {
        const key = `group:${gs.id}`;
        const lead = gs.leadSubscription;
        const entry = statsMap.get(key) ?? {
          isActive: false,
          isFrozen: false,
          name: gs.groupName || `Group (${lead.member.user.name || "Unknown"})`,
          phone: lead.member.user.phone || null,
          frozenAt: null,
          freezeDays: null,
          freezeMode: null,
        };

        const hasEndDateValid = !lead.endDate || lead.endDate >= now;
        const hasSessions = (lead.remainingSessions ?? 0) > 0 || (lead.remainingBonusSessions ?? 0) > 0;

        if (lead.isFrozen) {
          entry.isFrozen = true;
          entry.frozenAt = lead.frozenAt;
          entry.freezeDays = lead.freezeDays;
          entry.freezeMode = lead.freezeMode;
        } else if (gs.status === "ACTIVE" && hasSessions && hasEndDateValid) {
          entry.isActive = true;
        }

        statsMap.set(key, entry);
      }

      type MemberItem = { name: string; phone: string | null };
      type FrozenMemberItem = MemberItem & {
        frozenAt: string | null;
        freezeDays: number | null;
        freezeMode: string | null;
        unfreezeDate: string | null;
      };

      const total = statsMap.size;
      const activeList: MemberItem[] = [];
      const frozenList: FrozenMemberItem[] = [];
      const inactiveList: MemberItem[] = [];
      for (const value of statsMap.values()) {
        if (value.isFrozen) {
          let unfreezeDate: string | null = null;
          if (value.freezeMode === "FIXED_DAYS" && value.frozenAt && value.freezeDays) {
            const ud = new Date(value.frozenAt);
            ud.setDate(ud.getDate() + value.freezeDays);
            unfreezeDate = ud.toISOString();
          }
          frozenList.push({
            name: value.name,
            phone: value.phone,
            frozenAt: value.frozenAt?.toISOString() ?? null,
            freezeDays: value.freezeDays,
            freezeMode: value.freezeMode,
            unfreezeDate,
          });
        } else if (value.isActive) {
          activeList.push({ name: value.name, phone: value.phone });
        } else {
          inactiveList.push({ name: value.name, phone: value.phone });
        }
      }

      activeList.sort((a, b) => a.name.localeCompare(b.name));
      frozenList.sort((a, b) => a.name.localeCompare(b.name));
      inactiveList.sort((a, b) => a.name.localeCompare(b.name));

      const allMembers = [
        ...activeList,
        ...frozenList.map(({ name, phone }) => ({ name, phone })),
        ...inactiveList,
      ].sort((a, b) => a.name.localeCompare(b.name));

      return {
        total,
        active: activeList.length,
        frozen: frozenList.length,
        inactive: inactiveList.length,
        activeList,
        frozenList,
        inactiveList,
        allMembers,
      };
    },
  ),

  updateMember: protectedProcedure
    .input(memberSchema)
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const trainer = await ctx.db.personalTrainer.findFirst({
          where: {
            userId: ctx.session.user.id,
            isActive: true,
          },
        });

        if (!trainer) {
          throw new Error("Trainer not found or not active.");
        }

        result = await ctx.db.$transaction(async (prisma) => {
          // Update User details
          await prisma.user.update({
            where: { id: input.id },
            data: {
              name: input.name,
              email: input.email,
              phone: input.phone,
              height: input.height,
              weight: input.weight,
            },
          });

          // Find Membership record using User.id
          const membership = await prisma.membership.findUnique({
            where: {
              userId: input.id,
            },
            select: {
              id: true,
            },
          });

          if (!membership) {
            throw new Error("Membership not found for this user.");
          }

          // Update Subscription details
          // We need to find the specific subscription for this member (Membership.id) with this trainer
          const subscription = await prisma.subscription.findFirst({
            where: {
              memberId: membership.id,
              trainerId: trainer.id,
            },
          });

          if (!subscription) {
            throw new Error(
              "Subscription not found for this member with the current trainer.",
            );
          }

          await prisma.subscription.update({
            where: {
              id: subscription.id,
            },
            data: {
              remainingSessions: input.remainingSessions,
              endDate: new Date(input.subscriptionEndDate),
            },
          });

          return { success: true, message: "Member updated successfully" };
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
          endpoint: "personalTrainer.updateMember",
          method: "PUT",
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


      listWithUsers: permissionProtectedProcedure(["report:pt"])
        .query(async ({ ctx }) => {
          return ctx.db.personalTrainer.findMany({
            where: {
              isActive: true,
            },
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          });
        }),
        
  // Public endpoint to get active trainers for landing page
  getActiveTrainers: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.personalTrainer.findMany({
      where: {
        isActive: true,
      },
      include: {
        user: {
          select: {
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }),
});
