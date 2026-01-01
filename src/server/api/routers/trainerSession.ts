
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  permissionProtectedProcedure,
  protectedProcedure,
} from "@/server/api/trpc";
import { db } from "@/server/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { toGMT8StartOfDay, toGMT8EndOfDay } from "@/lib/timezone";

export const trainerSessionRouter = createTRPCRouter({
  // For management to create schedule with trainer selection
  createSchedule: permissionProtectedProcedure(["create:session"])
    .input(
      z.object({
        trainerId: z.string(),
        memberId: z.string(),
        date: z.date(),
        startTime: z.date(),
        endTime: z.date(),
        description: z.string().optional(),
        isGroup: z.boolean().optional(),
        attendanceCount: z.number().min(1).max(50).optional(),
        status: z.enum(["ENDED", "NOT_YET", "CANCELED", "ONGOING"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      console.log("Creating schedule for trainer:", input.trainerId);

      // Verify trainer exists and is active
      const trainer = await ctx.db.personalTrainer.findFirst({
        where: {
          id: input.trainerId,
          isActive: true,
        },
      });

      if (!trainer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trainer not found or not active",
        });
      }

      // Get the member's subscription with this trainer
      const subscription = await ctx.db.subscription.findFirst({
        where: {
          memberId: input.memberId,
          trainerId: trainer.id,
        },
        orderBy: {
          remainingSessions: "desc",
        },
        include: {
          package: true,
        },
      });

      if (!subscription) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member does not have a subscription with this trainer",
        });
      }

      if (
        !subscription.remainingSessions ||
        subscription.remainingSessions <= 0
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Member tidak memiliki sisa sesi yang tersedia",
        });
      }

      // Validate attendance count against package maxUsers for group sessions
      if (input.isGroup && input.attendanceCount && subscription.package?.maxUsers) {
        if (input.attendanceCount > subscription.package.maxUsers) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Attendance count cannot exceed package limit of ${subscription.package.maxUsers} users`,
          });
        }
      }

      // Create the training session and decrement remaining sessions in a transaction
      return ctx.db.$transaction(async (tx) => {
        // Create the session
        const session = await tx.trainerSession.create({
          data: {
            trainerId: trainer.id,
            memberId: input.memberId,
            date: input.date,
            startTime: input.startTime,
            endTime: input.endTime,
            description: input.description,
            isGroup: input.isGroup || false,
            attendanceCount: input.attendanceCount || (input.isGroup ? 1 : 1),
            status: input.status || "NOT_YET",
          },
        });

        // Decrement remaining sessions
        await tx.subscription.update({
          where: {
            id: subscription.id,
          },
          data: {
            remainingSessions: {
              decrement: 1,
            },
          },
        });

        return session;
      });
    }),

  create: permissionProtectedProcedure(["create:session"])
    .input(
      z.object({
        memberId: z.string(),
        date: z.date(),
        startTime: z.date(),
        endTime: z.date(),
        description: z.string().optional(),
        isGroup: z.boolean().optional(),
        attendanceCount: z.number().min(1).max(50).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      console.log("Creating session for member:", input.memberId);

      // Get the trainer ID for the current user
      const trainer = await ctx.db.personalTrainer.findFirst({
        where: {
          userId: ctx.session.user.id,
          isActive: true,
        },
      });

      if (!trainer) {
        console.log("Trainer not found or not active");
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trainer not found or not active",
        });
      }

      console.log("Found trainer:", trainer.id);

      // Get the member's subscription
      const subscription = await ctx.db.subscription.findFirst({
        where: {
          memberId: input.memberId,
          trainerId: trainer.id,
        },
        orderBy: {
          remainingSessions: "desc",
        },
        include: {
          package: true,
        },
      });

      if (!subscription) {
        console.log("No subscription found for member");
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member does not have a subscription with this trainer",
        });
      }

      console.log("Found subscription:", {
        id: subscription.id,
        remainingSessions: subscription.remainingSessions,
        endDate: subscription.endDate,
      });

      if (
        !subscription.remainingSessions ||
        subscription.remainingSessions <= 0
      ) {
        console.log("No remaining sessions:", subscription.remainingSessions);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Member tidak memiliki sisa sesi yang tersedia",
        });
      }

      // Validate attendance count against package maxUsers for group sessions
      if (input.isGroup && input.attendanceCount && subscription.package?.maxUsers) {
        if (input.attendanceCount > subscription.package.maxUsers) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Attendance count cannot exceed package limit of ${subscription.package.maxUsers} users`,
          });
        }
      }

      // Create the training session and decrement remaining sessions in a transaction
      return ctx.db.$transaction(async (tx) => {
        console.log("Starting transaction");

        // Create the session
        const session = await tx.trainerSession.create({
          data: {
            trainerId: trainer.id,
            memberId: input.memberId,
            date: input.date,
            startTime: input.startTime,
            endTime: input.endTime,
            description: input.description,
            isGroup: input.isGroup || false,
            attendanceCount: input.attendanceCount || (input.isGroup ? 1 : 1),
          },
        });

        console.log("Session created:", session.id);

        // Decrement remaining sessions
        const updatedSubscription = await tx.subscription.update({
          where: {
            id: subscription.id,
          },
          data: {
            remainingSessions: {
              decrement: 1,
            },
          },
        });

        console.log("Updated subscription:", {
          id: updatedSubscription.id,
          remainingSessions: updatedSubscription.remainingSessions,
        });

        return session;
      });
    }),

    getAll: permissionProtectedProcedure(["list:session"]).query(
      async ({ ctx }) => {
        // Check if user is a trainer
        const trainer = await ctx.db.personalTrainer.findFirst({
          where: {
            userId: ctx.session.user.id,
            isActive: true,
          },
        });
  
        if (trainer) {
          // Get all sessions for this trainer
          const sessions = await ctx.db.trainerSession.findMany({
            where: {
              trainerId: trainer.id,
            },
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
            },
            orderBy: {
              date: "asc",
            },
          });
  
          // Enrich with group info
          const memberIds = sessions.map((s) => s.memberId);
          const subscriptions = await ctx.db.subscription.findMany({
            where: {
              memberId: { in: memberIds },
              trainerId: trainer.id,
              isActive: true,
              deletedAt: null,
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
  
          const groupMembers = await ctx.db.groupMember.findMany({
            where: {
              subscriptionId: { in: subscriptionIds },
              status: "ACTIVE",
            },
            include: {
              groupSubscription: true,
            },
          });
  
          // Map memberId to group info
          const memberIdToGroup: Record<
            string,
            { groupName: string | null; groupId: string }
          > = {};
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
              };
            }
            return {
              ...session,
              type: "individual",
            };
          });
        }
  
        // If not a trainer, check if user is a member
        const member = await ctx.db.membership.findFirst({
          where: {
            userId: ctx.session.user.id,
          },
        });
  
        if (!member) {
          return [];
        }
  
        // Get all active subscriptions for this member
        const subscriptions = await ctx.db.subscription.findMany({
          where: {
            memberId: member.id,
            isActive: true,
            deletedAt: null,
            remainingSessions: {
              gt: 0,
            },
          },
          select: {
            trainerId: true,
          },
        });
  
        if (subscriptions.length === 0) {
          return [];
        }
  
        // Get all sessions for this member from their subscribed trainers
        return ctx.db.trainerSession.findMany({
          where: {
            memberId: member.id,
            trainerId: {
              in: subscriptions
                .map((sub) => sub.trainerId)
                .filter((id): id is string => id !== null),
            },
          },
          include: {
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
      }
    ),
  

  getByDate: permissionProtectedProcedure(["list:session"])
    .input(
      z.object({
        date: z.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get the trainer ID for the current user
      const trainer = await ctx.db.personalTrainer.findFirst({
        where: {
          userId: ctx.session.user.id,
          isActive: true,
        },
      });

      if (!trainer) {
        return [];
      }

      // Get sessions for this trainer on the specified date
      return ctx.db.trainerSession.findMany({
        where: {
          trainerId: trainer.id,
          date: {
            gte: new Date(input.date.setHours(0, 0, 0, 0)),
            lt: new Date(input.date.setHours(23, 59, 59, 999)),
          },
        },
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
        },
        orderBy: {
          startTime: "asc",
        },
      });
    }),

  delete: permissionProtectedProcedure(["delete:session"])
    .input(
      z.object({
        id: z.string(),
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

      // Check if the session belongs to this trainer
      const session = await ctx.db.trainerSession.findFirst({
        where: {
          id: input.id,
          trainerId: trainer.id,
        },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            "Session not found or you do not have permission to delete it",
        });
      }

      // Delete the session
      return ctx.db.trainerSession.delete({
        where: {
          id: input.id,
        },
      });
    }),

  update: permissionProtectedProcedure(["edit:session"])
    .input(
      z.object({
        id: z.string(),
        date: z.date(),
        startTime: z.date(),
        endTime: z.date(),
        status: z.enum(["ENDED", "NOT_YET", "CANCELED", "ONGOING"]).optional(),
        exerciseResult: z.string().optional(),
        attendanceCount: z.number().min(1).max(50).optional(),
        isGroup: z.boolean().optional(),
      }),
    )
    
    .mutation(async ({ ctx, input }) => {
      console.log("Received update mutation:", {
        id: input.id,
        date: input.date.toISOString(),
        startTime: input.startTime.toISOString(),
        endTime: input.endTime.toISOString(),
        status: input.status,
        exerciseResult: input.exerciseResult,
      });

      try {
        // Verify the trainer owns this session
        const existingSession = await ctx.db.trainerSession.findFirst({
          where: {
            id: input.id,
            trainer: {
              userId: ctx.session.user.id,
            },
          },
        });

        console.log("Found existing session:", existingSession);

        if (!existingSession) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Sesi tidak ditemukan atau Anda tidak memiliki akses",
          });
        }

        // Create new Date objects to ensure proper formatting
        const updateDate = new Date(input.date);
        const updateStartTime = new Date(input.startTime);
        const updateEndTime = new Date(input.endTime);

        console.log("Updating with formatted dates:", {
          date: updateDate.toISOString(),
          startTime: updateStartTime.toISOString(),
          endTime: updateEndTime.toISOString(),
          status: input.status,
          exerciseResult: input.exerciseResult,
        });

        // Update the session
        const updatedSession = await ctx.db.trainerSession.update({
          where: { id: input.id },
          data: {
            date: updateDate,
            startTime: updateStartTime,
            endTime: updateEndTime,
            status: input.status,
            exerciseResult: input.exerciseResult,
          },
          include: {
            member: {
              include: {
                user: true,
              },
            },
          },
        });

        console.log("Update successful:", updatedSession);
        return updatedSession;
      } catch (error) {
        console.error("Error in update mutation:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal mengupdate sesi",
        });
      }
    }),

  uploadExerciseResult: protectedProcedure
    .input(
      z.object({
        fileData: z.string(), // base64 string
        fileName: z.string(),
        fileType: z.string(),
        memberId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const { fileData, fileName, fileType, memberId } = input;

      // Validate file type
      const validTypes = [
        "image/jpeg",
        "image/png",
        "image/jpg",
        "application/pdf",
      ];
      if (!validTypes.includes(fileType)) {
        throw new Error(
          "Invalid file type. Only PNG, JPG, JPEG, and PDF files are allowed.",
        );
      }

      // Remove data URL prefix if present
      const base64Data = fileData.replace(/^data:.*?;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (buffer.length > maxSize) {
        throw new Error("File size too large. Maximum size is 5MB.");
      }

      // Generate a unique filename
      const extension = path.extname(fileName);
      const uniqueFilename = `${uuidv4()}${extension}`;

      // Construct the path relative to the public directory
      const relativeUploadDir = path.join("assets", "exercise", memberId);
      const uploadDir = path.join(process.cwd(), "public", relativeUploadDir);
      const filePath = path.join("/", relativeUploadDir, uniqueFilename);

      // Create directory if it doesn't exist
      await mkdir(uploadDir, { recursive: true });

      // Write the file
      await writeFile(path.join(uploadDir, uniqueFilename), buffer);

      return {
        success: true,
        filePath: filePath,
        message: "File uploaded successfully",
      };
    }),

  uploadFile: protectedProcedure
    .input(
      z.object({
        fileData: z.string(), // base64 string
        fileName: z.string(),
        fileType: z.string(),
        memberId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const { fileData, fileName, fileType, memberId } = input;

      try {
        // Validate file type
        const validTypes = [
          "image/jpeg",
          "image/png",
          "image/jpg",
          "application/pdf",
        ];
        if (!validTypes.includes(fileType)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Invalid file type. Only PNG, JPG, JPEG, and PDF files are allowed.",
          });
        }

        // Remove data URL prefix if present
        const base64Data = fileData.replace(/^data:.*?;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (buffer.length > maxSize) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "File size too large. Maximum size is 5MB.",
          });
        }

        // Generate a unique filename
        const extension = path.extname(fileName);
        const uniqueFilename = `${uuidv4()}${extension}`;

        // Construct the path relative to the public directory
        const relativeUploadDir = path.join("assets", "exercise");
        const uploadDir = path.join(process.cwd(), "public", relativeUploadDir);
        const filePath = path.join("/", relativeUploadDir, uniqueFilename);

        // Create directory if it doesn't exist
        await mkdir(uploadDir, { recursive: true });

        // Write the file
        await writeFile(path.join(uploadDir, uniqueFilename), buffer);

        return {
          success: true,
          filePath: filePath,
          message: "File uploaded successfully",
        };
      } catch (error) {
        console.error("File upload error:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "Failed to upload file: " +
            (error instanceof Error ? error.message : "Unknown error"),
        });
      }
    }),

  // Conduct tracking procedures
  getConductSummary: permissionProtectedProcedure(["list:session"])
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
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

      // Build date filter (convert to GMT+8)
      const dateFilter: any = {};
      if (input?.startDate) {
        dateFilter.gte = toGMT8StartOfDay(input.startDate);
      }
      if (input?.endDate) {
        dateFilter.lte = toGMT8EndOfDay(input.endDate);
      }

      // Get all sessions for the trainer with date filter
      const sessions = await ctx.db.trainerSession.findMany({
        where: {
          trainerId: trainer.id,
          ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
        },
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
        },
        orderBy: {
          date: 'desc',
        },
      });

      // Calculate conduct hours
      let totalHours = 0;
      const sessionDetails = sessions.map(session => {
        const hours = session.isGroup
          ? (session.attendanceCount || 1) * 1 // 1 hour per attendee for group sessions
          : 1; // 1 hour for individual sessions
        
        totalHours += hours;

        return {
          id: session.id,
          date: session.date,
          startTime: session.startTime,
          endTime: session.endTime,
          memberName: session.member.user.name,
          memberEmail: session.member.user.email,
          isGroup: session.isGroup,
          attendanceCount: session.attendanceCount || 1,
          hours,
          description: session.description,
        };
      });

      return {
        totalHours,
        sessionCount: sessions.length,
        sessions: sessionDetails,
      };
    }),

  updateSessionAttendance: permissionProtectedProcedure(["edit:session"])
    .input(
      z.object({
        sessionId: z.string(),
        attendanceCount: z.number().min(1).max(50),
        isGroup: z.boolean().optional(),
      })
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

      // Verify the trainer owns this session
      const existingSession = await ctx.db.trainerSession.findFirst({
        where: {
          id: input.sessionId,
          trainerId: trainer.id,
        },
        include: {
          member: true,
        }
      });

      if (!existingSession) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found or you do not have permission to edit it",
        });
      }

      // Validate attendance count against package maxUsers
      const subscription = await ctx.db.subscription.findFirst({
        where: {
          memberId: existingSession.memberId,
          trainerId: trainer.id,
          isActive: true,
        },
        include: {
          package: true,
        },
      });

      if (subscription?.package?.maxUsers && input.attendanceCount > subscription.package.maxUsers) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Attendance count cannot exceed package limit of ${subscription.package.maxUsers} users`,
        });
      }

      // Update the session
      return ctx.db.trainerSession.update({
        where: { id: input.sessionId },
        data: {
          attendanceCount: input.attendanceCount,
          isGroup: input.isGroup ?? true,
        },
      });
    }),

  // Admin endpoint to get all trainer sessions with filters
  getTrainerSessionsReport: permissionProtectedProcedure(["report:pt"])
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        trainerId: z.string().optional(),
        memberId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Build date filter (convert to GMT+8)
      const dateFilter: { gte?: Date; lte?: Date } = {};
      dateFilter.gte = toGMT8StartOfDay(input.startDate);
      dateFilter.lte = toGMT8EndOfDay(input.endDate);

      // Build where clause
      const whereClause: {
        date: { gte?: Date; lte?: Date };
        trainerId?: string;
        memberId?: string;
      } = {
        date: dateFilter,
      };

      if (input.trainerId) {
        whereClause.trainerId = input.trainerId;
      }

      if (input.memberId) {
        whereClause.memberId = input.memberId;
      }

      // Get all sessions with filters
      const sessions = await ctx.db.trainerSession.findMany({
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
          date: 'desc',
        },
      });

      // Calculate totals
      let totalHours = 0;
      const sessionDetails = sessions.map(session => {
        const startTime = new Date(session.startTime);
        const endTime = new Date(session.endTime);
        const durationMs = endTime.getTime() - startTime.getTime();
        const durationHours = durationMs / 3600000; // Convert ms to hours

        totalHours += durationHours;

        return {
          id: session.id,
          date: session.date,
          startTime: session.startTime,
          endTime: session.endTime,
          durationHours,
          trainerName: session.trainer?.user?.name || 'Unknown',
          trainerEmail: session.trainer?.user?.email || '',
          trainerId: session.trainerId,
          memberName: session.member.user.name,
          memberEmail: session.member.user.email,
          memberId: session.memberId,
          isGroup: session.isGroup,
          attendanceCount: session.attendanceCount || 1,
          description: session.description,
          status: session.status,
        };
      });

      return {
        sessions: sessionDetails,
        totalSessions: sessions.length,
        totalHours,
      };
    }),

  // Get members who have sessions with a specific trainer
  getMembersByTrainer: permissionProtectedProcedure(["report:pt"])
    .input(
      z.object({
        trainerId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get all unique members who have had sessions with this trainer
      const sessions = await ctx.db.trainerSession.findMany({
        where: {
          trainerId: input.trainerId,
        },
        select: {
          memberId: true,
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
        },
        distinct: ['memberId'],
      });

      // Extract unique members
      const members = sessions.map(session => ({
        id: session.memberId,
        name: session.member.user?.name || 'Unknown',
        email: session.member.user?.email || '',
      }));

      // Sort by name
      return members.sort((a, b) => a.name.localeCompare(b.name));
    }),

  // Search members with optional search query (for async search)
  // Only returns members who have PERSONAL_TRAINER or GROUP_TRAINING subscriptions
  searchMembers: permissionProtectedProcedure(["report:pt"])
    .input(
      z.object({
        search: z.string().min(3), // Require at least 3 characters
        limit: z.number().min(1).max(50).optional().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      // Search members by name or email who have PT or Group Training subscriptions
      const members = await ctx.db.membership.findMany({
            where: {
          // Filter to only members with PERSONAL_TRAINER or GROUP_TRAINING subscriptions
          subscriptions: {
            some: {
              package: {
                type: {
                  in: ['PERSONAL_TRAINER', 'GROUP_TRAINING'],
                },
              },
            },
          },
          // Search by name or email
          OR: [
            {
              user: {
                name: {
                  contains: input.search,
                  mode: 'insensitive',
                },
              },
            },
            {
              user: {
                email: {
                  contains: input.search,
                  mode: 'insensitive',
                },
              },
            },
          ],
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        take: input.limit,
        orderBy: {
          user: {
            name: 'asc',
          },
        },
      });

      // Transform to simple format
      return members.map(member => ({
        id: member.id,
        name: member.user?.name || 'Unknown',
        email: member.user?.email || '',
      }));
    }),

  // Admin endpoint to get conduct report for any trainer
  getAdminConductReport: permissionProtectedProcedure(["report:pt"])
    .input(
      z.object({
        trainerId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Build trainer filter
      const trainerFilter: any = {};
      if (input.trainerId) {
        trainerFilter.id = input.trainerId;
      }

      // Build date filter (convert to GMT+8)
      const dateFilter: any = {};
      if (input.startDate) {
        dateFilter.gte = toGMT8StartOfDay(input.startDate);
      }
      if (input.endDate) {
        dateFilter.lte = toGMT8EndOfDay(input.endDate);
      }

      // Get all sessions with filters
      const sessions = await ctx.db.trainerSession.findMany({
        where: {
          ...(input.trainerId && { trainerId: input.trainerId }),
          ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
        },
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
          date: 'desc',
        },
      });

      // Group sessions by trainer and calculate conduct hours
      const trainerConductMap = new Map<string, {
        trainerId: string;
        trainerName: string;
        trainerEmail: string;
        totalHours: number;
        sessionCount: number;
        sessions: any[];
      }>();

      sessions.forEach(session => {
        const trainerId = session.trainerId;
        const trainerName = session.trainer?.user?.name || 'Unknown';
        const trainerEmail = session.trainer?.user?.email || '';
        
        const hours = session.isGroup
          ? (session.attendanceCount || 1) * 1 // 1 hour per attendee for group sessions
          : 1; // 1 hour for individual sessions

        if (!trainerConductMap.has(trainerId)) {
          trainerConductMap.set(trainerId, {
            trainerId,
            trainerName,
            trainerEmail,
            totalHours: 0,
            sessionCount: 0,
            sessions: [],
          });
        }

        const trainerData = trainerConductMap.get(trainerId)!;
        trainerData.totalHours += hours;
        trainerData.sessionCount += 1;
        trainerData.sessions.push({
          id: session.id,
          date: session.date,
          startTime: session.startTime,
          endTime: session.endTime,
          memberName: session.member.user.name,
          memberEmail: session.member.user.email,
          isGroup: session.isGroup,
          attendanceCount: session.attendanceCount || 1,
          hours,
          description: session.description,
        });
      });

      // Convert map to array and sort by total hours
      const trainerSummaries = Array.from(trainerConductMap.values())
        .sort((a, b) => b.totalHours - a.totalHours);

      // If specific trainer requested, return detailed data
      if (input.trainerId && trainerSummaries.length > 0) {
        const trainerData = trainerSummaries[0];
        if (trainerData) {
          return {
            summary: {
              trainerId: trainerData.trainerId,
              trainerName: trainerData.trainerName,
              trainerEmail: trainerData.trainerEmail,
              totalHours: trainerData.totalHours,
              sessionCount: trainerData.sessionCount,
            },
            sessions: trainerData.sessions,
          };
        }
      }

      // Return summary for all trainers
      return {
        trainers: trainerSummaries.map(trainer => ({
          trainerId: trainer.trainerId,
          trainerName: trainer.trainerName,
          trainerEmail: trainer.trainerEmail,
          totalHours: trainer.totalHours,
          sessionCount: trainer.sessionCount,
        })),
        totalConductHours: trainerSummaries.reduce((sum, trainer) => sum + trainer.totalHours, 0),
        totalSessions: trainerSummaries.reduce((sum, trainer) => sum + trainer.sessionCount, 0),
      };
    }),
});