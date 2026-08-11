import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  permissionProtectedProcedure,
} from "@/server/api/trpc";
import { logApiMutationAsync, extractIpAddress, extractUserAgent } from "@/server/utils/mutationLogger";
import { decrementSessionFIFO, decrementGroupSessionFIFO } from "@/server/utils/ptSubscriptionUtils";

export const groupClassRouter = createTRPCRouter({
  /**
   * Admin: Create a Group Class for a GroupSubscription.
   * - Picks any active PersonalTrainer (not necessarily the group's trainer)
   * - Deducts 1 session from lead subscription, then syncs to all group members
   * - Creates attendance records for all active group members
   */
  create: permissionProtectedProcedure(["create:session"])
    .input(
      z.object({
        groupSubscriptionId: z.string(),
        classTypeId: z.string().optional(),
        trainerId: z.string(),
        schedule: z.date(),
        endTime: z.date(),
        duration: z.number().min(1),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        // Validate GroupSubscription exists and is ACTIVE
        const groupSub = await ctx.db.groupSubscription.findUnique({
          where: { id: input.groupSubscriptionId },
          include: {
            leadSubscription: {
              select: { id: true, memberId: true, trainerId: true, remainingSessions: true, remainingBonusSessions: true },
            },
            groupMembers: {
              where: { status: "ACTIVE" },
              include: {
                subscription: {
                  select: { id: true, memberId: true },
                },
              },
            },
          },
        });

        if (!groupSub) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Group subscription tidak ditemukan" });
        }
        if (groupSub.status !== "ACTIVE") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Group subscription tidak aktif" });
        }

        // Validate trainer exists and is active
        const trainer = await ctx.db.personalTrainer.findFirst({
          where: { id: input.trainerId, isActive: true },
        });
        if (!trainer) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Trainer tidak ditemukan atau tidak aktif" });
        }

        // Validate ClassType if provided
        if (input.classTypeId) {
          const classType = await ctx.db.classType.findUnique({
            where: { id: input.classTypeId },
          });
          if (!classType) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Jenis kelas tidak ditemukan" });
          }
        }

        // Check lead subscription has remaining sessions
        const leadSub = groupSub.leadSubscription;
        const totalRemaining = (leadSub.remainingSessions ?? 0) + (leadSub.remainingBonusSessions ?? 0);
        if (totalRemaining <= 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Sisa sesi group sudah habis" });
        }

        // Collect all member IDs (lead + group members)
        const allMemberIds: string[] = [];
        const leadMemberId = leadSub.memberId;
        allMemberIds.push(leadMemberId);

        for (const gm of groupSub.groupMembers) {
          if (gm.subscription.memberId !== leadMemberId) {
            allMemberIds.push(gm.subscription.memberId);
          }
        }

        // Transaction: deduct session + create group class + create attendances
        result = await ctx.db.$transaction(async (tx) => {
          // Deduct 1 session from lead subscription using Group FIFO (no trainerId needed)
          const fifoResult = await decrementGroupSessionFIFO({
            tx,
            memberId: leadMemberId,
          });

          // Sync remaining sessions to all group members
          const partnerSubIds = groupSub.groupMembers
            .filter((gm) => gm.subscriptionId !== fifoResult.id)
            .map((gm) => gm.subscriptionId);

          if (partnerSubIds.length > 0) {
            await tx.subscription.updateMany({
              where: { id: { in: partnerSubIds } },
              data: {
                remainingSessions: fifoResult.remainingSessions,
                remainingBonusSessions: fifoResult.remainingBonusSessions,
              },
            });
          }

          // Create the GroupClass
          const groupClass = await tx.groupClass.create({
            data: {
              groupSubscriptionId: input.groupSubscriptionId,
              classTypeId: input.classTypeId ?? null,
              trainerId: input.trainerId,
              schedule: input.schedule,
              endTime: input.endTime,
              duration: input.duration,
              description: input.description ?? null,
              status: "SCHEDULED",
              createdBy: ctx.session.user.id,
            },
            include: {
              classType: true,
              trainer: { include: { user: { select: { name: true } } } },
              groupSubscription: { select: { groupName: true } },
            },
          });

          // Create attendance records for all members
          await tx.groupClassAttendance.createMany({
            data: allMemberIds.map((memberId) => ({
              groupClassId: groupClass.id,
              memberId,
              subscriptionId: fifoResult.id,
              isBonusSession: fifoResult.isBonusSession,
            })),
          });

          return groupClass;
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
          endpoint: "groupClass.create",
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

  /**
   * List Group Classes with filters
   */
  list: permissionProtectedProcedure(["create:session"])
    .input(
      z.object({
        groupSubscriptionId: z.string().optional(),
        filter: z.enum(["all", "upcoming", "past"]).optional().default("upcoming"),
        page: z.number().min(1).optional().default(1),
        pageSize: z.number().min(1).max(100).optional().default(20),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();

      // Auto-mark SCHEDULED classes as ENDED when endTime has passed
      await ctx.db.groupClass.updateMany({
        where: {
          status: "SCHEDULED",
          endTime: { lte: now },
        },
        data: { status: "ENDED" },
      });

      const where: any = {};

      if (input.groupSubscriptionId) {
        where.groupSubscriptionId = input.groupSubscriptionId;
      }

      if (input.dateFrom || input.dateTo) {
        where.schedule = {};
        if (input.dateFrom) where.schedule.gte = input.dateFrom;
        if (input.dateTo) where.schedule.lte = input.dateTo;
      } else if (input.filter === "upcoming") {
        where.schedule = { gte: now };
        where.status = { not: "CANCELLED" };
      } else if (input.filter === "past") {
        where.schedule = { lt: now };
      }

      const [items, total] = await Promise.all([
        ctx.db.groupClass.findMany({
          where,
          orderBy: { schedule: input.filter === "past" ? "desc" : "asc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          include: {
            classType: true,
            trainer: { include: { user: { select: { name: true } } } },
            groupSubscription: {
              select: {
                groupName: true,
                totalMembers: true,
                maxMembers: true,
                leadSubscription: {
                  select: {
                    remainingSessions: true,
                    remainingBonusSessions: true,
                  },
                },
              },
            },
            attendances: {
              include: {
                member: {
                  include: { user: { select: { name: true } } },
                },
              },
            },
          },
        }),
        ctx.db.groupClass.count({ where }),
      ]);

      return {
        items: items.map((gc) => ({
          ...gc,
          attendanceSummary: {
            total: gc.attendances.length,
            attended: gc.attendances.filter((a) => a.attended === true).length,
            absent: gc.attendances.filter((a) => a.attended === false).length,
            pending: gc.attendances.filter((a) => a.attended === null).length,
          },
        })),
        total,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  /**
   * Get a single Group Class detail
   */
  getById: permissionProtectedProcedure(["create:session"])
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const groupClass = await ctx.db.groupClass.findUnique({
        where: { id: input.id },
        include: {
          classType: true,
          trainer: { include: { user: { select: { name: true, image: true } } } },
          groupSubscription: {
            select: {
              groupName: true,
              totalMembers: true,
              maxMembers: true,
              status: true,
              leadSubscription: {
                select: {
                  memberId: true,
                  remainingSessions: true,
                  remainingBonusSessions: true,
                },
              },
            },
          },
          attendances: {
            include: {
              member: {
                include: { user: { select: { name: true, email: true, phone: true, image: true } } },
              },
            },
            orderBy: { createdAt: "asc" },
          },
          creator: { select: { name: true } },
        },
      });

      if (!groupClass) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Group class tidak ditemukan" });
      }

      return groupClass;
    }),

  /**
   * Mark attendance for group class members
   * Also creates AttendanceMember (gym check-in) records with locker info for those who attend
   */
  markAttendance: permissionProtectedProcedure(["create:session"])
    .input(
      z.object({
        groupClassId: z.string(),
        attendances: z.array(
          z.object({
            memberId: z.string(),
            attended: z.boolean(),
            lokerNumber: z.string().optional(),
            handuk: z.string().optional(),
            checkInTime: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const groupClass = await ctx.db.groupClass.findUnique({
          where: { id: input.groupClassId },
        });

        if (!groupClass) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Group class tidak ditemukan" });
        }
        if (groupClass.status === "CANCELLED") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Group class sudah dibatalkan" });
        }

        // Update attendance for each member (including loker, handuk, checkInTime)
        const updates = await Promise.all(
          input.attendances.map((att) => {
            const checkIn = att.checkInTime ? new Date(att.checkInTime) : null;
            return ctx.db.groupClassAttendance.updateMany({
              where: {
                groupClassId: input.groupClassId,
                memberId: att.memberId,
              },
              data: {
                attended: att.attended,
                attendedAt: att.attended ? new Date() : null,
                lokerNumber: att.attended ? (att.lokerNumber?.trim() || null) : null,
                handukType: att.attended ? (att.handuk && att.handuk !== "None" ? att.handuk : null) : null,
                checkInTime: att.attended ? (checkIn ?? new Date()) : null,
              },
            });
          }),
        );

        // Create or update AttendanceMember (gym check-in) records for members who attend
        // Avoid duplicates when re-saving attendance
        const attendedMembers = input.attendances.filter((att) => att.attended);
        const newCheckIns: string[] = []; // Track new check-ins for point reward
        if (attendedMembers.length > 0) {
          await Promise.all(
            attendedMembers.map(async (att) => {
              const parts: string[] = [];
              if (att.lokerNumber?.trim()) parts.push(`Loker = ${att.lokerNumber.trim()}`);
              if (att.handuk && att.handuk !== "None") parts.push(`Handuk = ${att.handuk}`);
              const facilityDescription = parts.length > 0 ? parts.join(", ") : undefined;

              // Check if attendance record already exists for this member + schedule
              const existing = await ctx.db.attendanceMember.findFirst({
                where: {
                  memberId: att.memberId,
                  checkin: groupClass.schedule,
                },
              });

              if (existing) {
                // Update existing record (no points given again)
                return ctx.db.attendanceMember.update({
                  where: { id: existing.id },
                  data: { facilityDescription },
                });
              } else {
                // Create new record — mark for point reward
                newCheckIns.push(att.memberId);
                return ctx.db.attendanceMember.create({
                  data: {
                    memberId: att.memberId,
                    checkin: groupClass.schedule,
                    facilityDescription,
                  },
                });
              }
            }),
          );
        }

        // Award points to newly checked-in members
        if (newCheckIns.length > 0) {
          const config = await ctx.db.config.findUnique({
            where: { key: "rfid_point" },
          });
          const pointValue = config ? parseInt(config.value) || 1 : 1;

          // Get user IDs from membership IDs
          const memberships = await ctx.db.membership.findMany({
            where: { id: { in: newCheckIns } },
            select: { userId: true },
          });

          if (memberships.length > 0) {
            await ctx.db.user.updateMany({
              where: { id: { in: memberships.map((m) => m.userId) } },
              data: { point: { increment: pointValue } },
            });
          }
        }

        result = { updated: updates.length, checkedIn: attendedMembers.length, pointsAwarded: newCheckIns.length };
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "groupClass.markAttendance",
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

  /**
   * Cancel a Group Class → refund session to lead + sync to all members
   */
  cancel: permissionProtectedProcedure(["create:session"])
    .input(
      z.object({
        groupClassId: z.string(),
        cancelReason: z.string().optional(),
        refundSession: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const groupClass = await ctx.db.groupClass.findUnique({
          where: { id: input.groupClassId },
          include: {
            attendances: true,
            groupSubscription: {
              include: {
                groupMembers: {
                  where: { status: "ACTIVE" },
                  select: { subscriptionId: true },
                },
              },
            },
          },
        });

        if (!groupClass) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Group class tidak ditemukan" });
        }
        if (groupClass.status === "CANCELLED") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Group class sudah dibatalkan" });
        }
        if (groupClass.status === "ENDED") {
          // Check if user has special permission to cancel completed sessions
          const user = await ctx.db.user.findUnique({
            where: { id: ctx.session.user.id },
            include: {
              roles: {
                include: {
                  permissions: {
                    include: { permission: true },
                  },
                },
              },
            },
          });
          const userPermissions = user?.roles.flatMap((r: any) =>
            r.permissions.map((p: any) => p.permission.name)
          ) ?? [];
          if (!userPermissions.includes("cancel:completed-session")) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Anda tidak memiliki izin untuk membatalkan group class yang sudah selesai",
            });
          }
        }

        result = await ctx.db.$transaction(async (tx) => {
          // Only refund session if requested
          if (input.refundSession) {
            const firstAttendance = groupClass.attendances[0];
            if (firstAttendance?.subscriptionId) {
              await tx.subscription.update({
                where: { id: firstAttendance.subscriptionId },
                data: firstAttendance.isBonusSession
                  ? { remainingBonusSessions: { increment: 1 } }
                  : { remainingSessions: { increment: 1 } },
              });

              // Get updated session counts to sync partners
              const updatedSub = await tx.subscription.findUnique({
                where: { id: firstAttendance.subscriptionId },
                select: { remainingSessions: true, remainingBonusSessions: true },
              });

              // Sync all partner subscriptions
              if (updatedSub) {
                const partnerSubIds = groupClass.groupSubscription.groupMembers
                  .filter((gm) => gm.subscriptionId !== firstAttendance.subscriptionId)
                  .map((gm) => gm.subscriptionId);

                if (partnerSubIds.length > 0) {
                  await tx.subscription.updateMany({
                    where: { id: { in: partnerSubIds } },
                    data: {
                      remainingSessions: updatedSub.remainingSessions,
                      remainingBonusSessions: updatedSub.remainingBonusSessions,
                    },
                  });
                }
              }
            }
          }

          // Update group class status
          return tx.groupClass.update({
            where: { id: input.groupClassId },
            data: {
              status: "CANCELLED",
              cancelReason: input.cancelReason
                ? `${input.cancelReason} [${input.refundSession ? "Sesi dikembalikan" : "Sesi hangus"}]`
                : `[${input.refundSession ? "Sesi dikembalikan" : "Sesi hangus"}]`,
            },
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
          endpoint: "groupClass.cancel",
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

  /**
   * List active GroupSubscriptions (for dropdown when creating Group Class)
   */
  listGroupSubscriptions: permissionProtectedProcedure(["create:session"])
    .query(async ({ ctx }) => {
      const now = new Date();
      const groups = await ctx.db.groupSubscription.findMany({
        where: {
          status: "ACTIVE",
          package: { isGroupClass: true },
          leadSubscription: {
            isActive: true,
            deletedAt: null,
            OR: [
              { endDate: null },
              { endDate: { gte: now } },
            ],
            AND: [
              {
                OR: [
                  { remainingSessions: { gt: 0 } },
                  { remainingBonusSessions: { gt: 0 } },
                ],
              },
            ],
          },
        },
        include: {
          leadSubscription: {
            select: {
              memberId: true,
              trainerId: true,
              remainingSessions: true,
              remainingBonusSessions: true,
              endDate: true,
              member: {
                include: { user: { select: { name: true } } },
              },
              trainer: {
                include: { user: { select: { name: true } } },
              },
            },
          },
          groupMembers: {
            where: { status: "ACTIVE" },
            include: {
              subscription: {
                select: {
                  memberId: true,
                  member: {
                    include: { user: { select: { name: true } } },
                  },
                },
              },
            },
          },
          package: { select: { name: true, sessions: true, isGroupClass: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return groups;
    }),

  /**
   * Group Class Report — conduct report per trainer
   */
  getReport: permissionProtectedProcedure(["create:session"])
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        trainerId: z.string().optional(),
        groupSubscriptionId: z.string().optional(),
        status: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        schedule: {
          gte: input.startDate,
          lte: input.endDate,
        },
      };

      if (input.trainerId) where.trainerId = input.trainerId;
      if (input.groupSubscriptionId) where.groupSubscriptionId = input.groupSubscriptionId;
      if (input.status) where.status = input.status;

      const groupClasses = await ctx.db.groupClass.findMany({
        where,
        orderBy: { schedule: "desc" },
        include: {
          classType: { select: { name: true } },
          trainer: { include: { user: { select: { name: true, email: true } } } },
          groupSubscription: {
            select: {
              groupName: true,
              leadSubscription: {
                select: {
                  member: { include: { user: { select: { name: true } } } },
                },
              },
            },
          },
          attendances: {
            include: {
              member: { include: { user: { select: { name: true } } } },
            },
          },
          creator: { select: { name: true } },
        },
      });

      // Summary stats
      const totalSessions = groupClasses.length;
      const completedSessions = groupClasses.filter((gc) => gc.status === "ENDED").length;
      const cancelledSessions = groupClasses.filter((gc) => gc.status === "CANCELLED").length;
      const scheduledSessions = groupClasses.filter((gc) => gc.status === "SCHEDULED").length;
      const totalHours = groupClasses.reduce((sum, gc) => sum + (gc.duration || 0) / 60, 0);
      const totalAttendees = groupClasses.reduce(
        (sum, gc) => sum + gc.attendances.filter((a) => a.attended === true).length,
        0,
      );

      // Per-trainer summary
      const trainerMap: Record<string, { name: string; sessions: number; hours: number; attendees: number }> = {};
      for (const gc of groupClasses) {
        const tid = gc.trainerId;
        if (!trainerMap[tid]) {
          trainerMap[tid] = { name: gc.trainer.user.name ?? "Unknown", sessions: 0, hours: 0, attendees: 0 };
        }
        trainerMap[tid]!.sessions += 1;
        trainerMap[tid]!.hours += (gc.duration || 0) / 60;
        trainerMap[tid]!.attendees += gc.attendances.filter((a) => a.attended === true).length;
      }

      const sessions = groupClasses.map((gc) => ({
        id: gc.id,
        schedule: gc.schedule,
        endTime: gc.endTime,
        duration: gc.duration,
        status: gc.status,
        trainerName: gc.trainer.user.name ?? "Unknown",
        trainerEmail: gc.trainer.user.email ?? "",
        trainerId: gc.trainerId,
        groupName: gc.groupSubscription.groupName ?? "Unnamed Group",
        leadMemberName: gc.groupSubscription.leadSubscription.member.user.name ?? "Unknown",
        classTypeName: gc.classType?.name ?? "-",
        description: gc.description,
        creatorName: gc.creator?.name ?? "-",
        attendanceCount: gc.attendances.filter((a) => a.attended === true).length,
        totalMembers: gc.attendances.length,
        attendances: gc.attendances.map((a) => ({
          memberName: a.member.user.name ?? "Unknown",
          attended: a.attended,
        })),
      }));

      return {
        sessions,
        totalSessions,
        completedSessions,
        cancelledSessions,
        scheduledSessions,
        totalHours,
        totalAttendees,
        trainerSummary: Object.entries(trainerMap).map(([id, data]) => ({ id, ...data })),
      };
    }),
});
