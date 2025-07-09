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
  // ...other procedures...

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

  // ...other procedures...
});
