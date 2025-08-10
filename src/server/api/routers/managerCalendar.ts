import { createTRPCRouter, permissionProtectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";

export const managerCalendarRouter = createTRPCRouter({
  getAll: permissionProtectedProcedure(["list:session"]).query(async ({ ctx }) => {
    const sessions = await db.trainerSession.findMany({
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
        };
      }
      return {
        ...session,
        type: "individual",
      };
    });
  }),
});
