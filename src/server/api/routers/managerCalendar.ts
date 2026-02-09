import { createTRPCRouter, permissionProtectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { logApiMutationAsync, extractIpAddress, extractUserAgent } from "@/server/utils/mutationLogger";

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

    // Fetch group information for sessions that are actually group sessions
    const groupSessionIds = sessions
      .filter((s) => s.isGroup && s.groupId)
      .map((s) => s.groupId!);
    
    const groupSubscriptions = await db.groupSubscription.findMany({
      where: {
        id: { in: groupSessionIds },
      },
      select: {
        id: true,
        groupName: true,
      },
    });

    const groupIdToGroupInfo: Record<string, { groupName: string | null }> = {};
    groupSubscriptions.forEach((gs) => {
      groupIdToGroupInfo[gs.id] = {
        groupName: gs.groupName ?? "Group",
      };
    });

    // Map sessions with correct type based on isGroup flag
    return sessions.map((session) => {
      if (session.isGroup && session.groupId) {
        const groupInfo = groupIdToGroupInfo[session.groupId];
        return {
          ...session,
          groupName: groupInfo?.groupName ?? "Group",
          groupId: session.groupId,
          type: "group" as const,
          exerciseResult: session.exerciseResult,
          attendanceCount: session.attendanceCount,
          isGroup: session.isGroup,
          status: session.status,
        };
      }
      return {
        ...session,
        type: "individual" as const,
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
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
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

        result = {
          ...updatedSession,
          exerciseResult: updatedSession.exerciseResult,
          attendanceCount: updatedSession.attendanceCount,
          isGroup: updatedSession.isGroup,
          status: updatedSession.status,
        };
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        // Fire and forget - don't block response
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "managerCalendar.updateAttendanceCount",
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

  updateSchedule: permissionProtectedProcedure(["edit:session"])
    .input(
      z.object({
        sessionId: z.string(),
        trainerId: z.string().optional(),
        memberId: z.string().optional(),
        date: z.date().optional(),
        startTime: z.date().optional(),
        endTime: z.date().optional(),
        description: z.string().optional(),
        status: z.enum(["NOT_YET", "ONGOING", "ENDED", "CANCELED"]).optional(),
        attendanceCount: z.number().min(1).max(50).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const { sessionId, ...updateData } = input;

        // Check if session exists
        const session = await db.trainerSession.findUnique({
          where: { id: sessionId },
          include: {
            member: true,
            trainer: true,
          },
        });

        if (!session) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Session tidak ditemukan",
          });
        }

        // Build update object with only provided fields
        const dataToUpdate: any = {};
        
        if (updateData.trainerId !== undefined) dataToUpdate.trainerId = updateData.trainerId;
        if (updateData.memberId !== undefined) dataToUpdate.memberId = updateData.memberId;
        if (updateData.date !== undefined) dataToUpdate.date = updateData.date;
        if (updateData.startTime !== undefined) dataToUpdate.startTime = updateData.startTime;
        if (updateData.endTime !== undefined) dataToUpdate.endTime = updateData.endTime;
        if (updateData.description !== undefined) dataToUpdate.description = updateData.description;
        if (updateData.status !== undefined) dataToUpdate.status = updateData.status;
        if (updateData.attendanceCount !== undefined) dataToUpdate.attendanceCount = updateData.attendanceCount;

        // Update the session
        const updatedSession = await db.trainerSession.update({
          where: { id: sessionId },
          data: dataToUpdate,
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

        result = {
          ...updatedSession,
          exerciseResult: updatedSession.exerciseResult,
          attendanceCount: updatedSession.attendanceCount,
          isGroup: updatedSession.isGroup,
          status: updatedSession.status,
        };
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        // Fire and forget - don't block response
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "managerCalendar.updateSchedule",
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

  cancelSchedule: permissionProtectedProcedure(["edit:session"])
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const { sessionId } = input;

        // Check if session exists
        const session = await db.trainerSession.findUnique({
          where: { id: sessionId },
        });

        if (!session) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Session tidak ditemukan",
          });
        }

        // Update session status to CANCELED
        const updatedSession = await db.trainerSession.update({
          where: { id: sessionId },
          data: { status: "CANCELED" },
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

        result = {
          success: true,
          message: "Sesi berhasil dibatalkan",
          session: updatedSession,
        };
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        // Fire and forget - don't block response
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "managerCalendar.cancelSchedule",
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

  restoreSchedule: permissionProtectedProcedure(["edit:session"])
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const { sessionId } = input;

        // Check if session exists
        const session = await db.trainerSession.findUnique({
          where: { id: sessionId },
          include: {
            member: true,
            trainer: true,
          },
        });

        if (!session) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Session tidak ditemukan",
          });
        }

        // Find the subscription for this member with the same trainer
        // This ensures we increment the correct PT subscription quota
        const subscription = await db.subscription.findFirst({
          where: {
            memberId: session.memberId,
            trainerId: session.trainerId,
          },
          orderBy: {
            remainingSessions: "desc",
          },
        });

        if (!subscription) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Subscription PT tidak ditemukan untuk member dan trainer ini",
          });
        }

        // Increment remaining sessions
        await db.subscription.update({
          where: { id: subscription.id },
          data: {
            remainingSessions: {
              increment: 1,
            },
          },
        });

        // Delete the trainer session
        await db.trainerSession.delete({
          where: { id: sessionId },
        });

        result = {
          success: true,
          message: "Sesi berhasil dikembalikan dan quota bertambah +1",
        };
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        // Fire and forget - don't block response
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "managerCalendar.restoreSchedule",
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
});
