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

export const trainerSessionRouter = createTRPCRouter({
  
  create: permissionProtectedProcedure(["create:session"])
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

  // Group session creation
  createGroupSession: permissionProtectedProcedure(["create:session"])
    .input(
      z.object({
        groupSubscriptionId: z.string(),
        date: z.date(),
        startTime: z.date(),
        endTime: z.date(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      console.log("Creating group session for group:", input.groupSubscriptionId);

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

      // Get group subscription details and active members
      const groupSubscription = await ctx.db.groupSubscription.findUnique({
        where: { id: input.groupSubscriptionId },
        include: {
          package: true,
          groupMembers: {
            where: { status: "ACTIVE" },
            include: {
              subscription: {
                include: {
                  member: {
                    include: { user: true }
                  }
                }
              }
            }
          }
        }
      });

      if (!groupSubscription) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Group subscription not found",
        });
      }

      if (groupSubscription.groupMembers.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active members in this group",
        });
      }

      // Validate all members have remaining sessions
      const invalidMembers = groupSubscription.groupMembers.filter(
        gm => !gm.subscription.remainingSessions || gm.subscription.remainingSessions <= 0
      );

      if (invalidMembers.length > 0) {
        const memberNames = invalidMembers.map(gm => gm.subscription.member.user.name).join(", ");
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `The following members have no remaining sessions: ${memberNames}`,
        });
      }

      // Create sessions for all group members in a transaction
      return ctx.db.$transaction(async (tx) => {
        console.log("Starting group session transaction");

        const sessions = [];

        for (const groupMember of groupSubscription.groupMembers) {
          // Create session for each member
          const session = await tx.trainerSession.create({
            data: {
              trainerId: trainer.id,
              memberId: groupMember.subscription.memberId,
              date: input.date,
              startTime: input.startTime,
              endTime: input.endTime,
              description: `Group Session: ${input.description || groupSubscription.groupName || 'Group Training'}`,
              status: "NOT_YET"
            },
          });

          // Decrement remaining sessions for this member
          await tx.subscription.update({
            where: { id: groupMember.subscriptionId },
            data: { remainingSessions: { decrement: 1 } }
          });

          // Award points to the user (from the package)
          const packagePoints = groupSubscription.package.point;
          if (packagePoints > 0) {
            await tx.user.update({
              where: { id: groupMember.subscription.member.userId },
              data: { point: { increment: packagePoints } }
            });
          }

          sessions.push({
            ...session,
            member: groupMember.subscription.member
          });

          console.log(`Session created for member: ${groupMember.subscription.member.user.name}`);
        }

        console.log(`Group session created with ${sessions.length} individual sessions`);
        return sessions;
      });
    }),

  getGroupSessions: permissionProtectedProcedure(["list:session"])
    .input(z.object({ groupSubscriptionId: z.string() }))
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

      // Get group members
      const groupMembers = await ctx.db.groupMember.findMany({
        where: { 
          groupSubscriptionId: input.groupSubscriptionId,
          status: "ACTIVE"
        },
        include: { 
          subscription: {
            include: {
              member: {
                include: { user: true }
              }
            }
          }
        }
      });

      if (groupMembers.length === 0) {
        return [];
      }

      const memberIds = groupMembers.map(gm => gm.subscription.memberId);

      // Get sessions for all group members
      const sessions = await ctx.db.trainerSession.findMany({
        where: {
          trainerId: trainer.id,
          memberId: { in: memberIds }
        },
        include: {
          member: {
            include: { user: true }
          }
        },
        orderBy: { date: 'desc' }
      });

      // Group sessions by date/time (same session for multiple members)
      const groupedSessions = sessions.reduce((acc, session) => {
        const key = `${session.date.toISOString().split('T')[0]}_${session.startTime.toISOString()}_${session.endTime.toISOString()}`;
        if (!acc[key]) {
          acc[key] = {
            id: session.id, // Use first session's ID as group ID
            date: session.date,
            startTime: session.startTime,
            endTime: session.endTime,
            description: session.description,
            status: session.status,
            trainerId: session.trainerId,
            attendees: []
          };
        }
        acc[key].attendees.push({
          memberId: session.memberId,
          memberName: session.member.user.name,
          memberEmail: session.member.user.email,
          sessionId: session.id,
          status: session.status
        });
        return acc;
      }, {} as Record<string, any>);

      return Object.values(groupedSessions);
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
        // If user is a trainer, get all their sessions
        return ctx.db.trainerSession.findMany({
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
    },
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

  update: permissionProtectedProcedure(["update:session"])
    .input(
      z.object({
        id: z.string(),
        date: z.date(),
        startTime: z.date(),
        endTime: z.date(),
        status: z.enum(["ENDED", "NOT_YET", "CANCELED", "ONGOING"]).optional(),
        exerciseResult: z.string().optional(),
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
});
