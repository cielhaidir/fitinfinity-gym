import { createTRPCRouter, permissionProtectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const managerCalendarRouter = createTRPCRouter({
  getAllTrainers: permissionProtectedProcedure(["list:session"]).query(async ({ ctx }) => {
    const trainers = await db.personalTrainer.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    });

    return trainers.map(trainer => ({
      id: trainer.id,
      userId: trainer.user.id,
      name: trainer.user.name,
      email: trainer.user.email,
    }));
  }),

  getAll: permissionProtectedProcedure(["list:session"])
    .input(
      z.object({
        trainerId: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const whereClause = input?.trainerId
        ? { trainerId: input.trainerId }
        : {};
    const sessions = await db.trainerSession.findMany({
      where: whereClause,
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
      },
      orderBy: {
        date: "asc",
      },
    });

    // Enrich with group info
    const memberIds = sessions.map((s) => s.memberId);
    const subscriptions = await db.subscription.findMany({
      where: {
        memberId: { in: memberIds },
        isActive: true,
      },
      select: {
        id: true,
        memberId: true,
      },
    });
    const subscriptionIdToMemberId: Record<string, string> = {};
    subscriptions.forEach((sub) => {
      subscriptionIdToMemberId[sub.id] = sub.memberId;
    });
    const subscriptionIds = subscriptions.map((sub) => sub.id);
    const groupMembers = await db.groupMember.findMany({
      where: {
        subscriptionId: { in: subscriptionIds },
        status: "ACTIVE",
      },
      include: {
        groupSubscription: true,
      },
    });
    const memberIdToGroup: Record<string, { groupName: string | null; groupId: string }> = {};
    groupMembers.forEach((gm) => {
      const memberId = subscriptionIdToMemberId[gm.subscriptionId];
      if (memberId && gm.groupSubscription) {
        memberIdToGroup[memberId] = {
          groupName: gm.groupSubscription.groupName ?? "Group",
          groupId: gm.groupSubscription.id,
        };
      }
    });
    // Attach group info to sessions
    return sessions.map((session) => {
      const group = memberIdToGroup[session.memberId];
      if (group) {
        return {
          ...session,
          groupName: group.groupName,
          groupId: group.groupId,
          type: "group",
          exerciseResult: session.exerciseResult,
          attendanceCount: session.attendanceCount,
          isGroup: session.isGroup,
          status: session.status,
        };
      }
      return {
        ...session,
        type: "individual",
        exerciseResult: session.exerciseResult,
        attendanceCount: session.attendanceCount,
        isGroup: session.isGroup,
        status: session.status,
      };
    });
  }),

  updateAttendanceCount: permissionProtectedProcedure(["edit:session"])
    .input(
      z.object({
        sessionId: z.string(),
        attendanceCount: z.number().min(1).max(50),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { sessionId, attendanceCount } = input;

      // Check if session exists and is a group session
      const session = await db.trainerSession.findUnique({
        where: { id: sessionId },
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
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session tidak ditemukan",
        });
      }

      // Update attendance count
      const updatedSession = await db.trainerSession.update({
        where: { id: sessionId },
        data: { attendanceCount },
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
        },
      });

      return {
        ...updatedSession,
        exerciseResult: updatedSession.exerciseResult,
        attendanceCount: updatedSession.attendanceCount,
        isGroup: updatedSession.isGroup,
        status: updatedSession.status,
      };
    }),
});
