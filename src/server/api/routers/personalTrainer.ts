import { z } from "zod";
import {
  createTRPCRouter,
  permissionProtectedProcedure,
  publicProcedure,
  protectedProcedure,
} from "@/server/api/trpc";
import { memberSchema } from "@/app/(authenticated)/personal-trainers/member-list/schema";

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
      return ctx.db.$transaction(async (tx) => {
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
      return ctx.db.personalTrainer.update({
        where: { id: input.id },
        data: {
          description: input.description,
          expertise: input.expertise,
          isActive: input.isActive,
        },
      });
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
      // Use a transaction to ensure all related data is deleted properly
      return ctx.db.$transaction(async (tx) => {
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

      return ctx.db.$transaction(async (tx) => {
        // Create the trainer session
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

        // If it's a group session, we need to decrease the remaining sessions
        // from the lead subscription
        if (input.isGroup && input.groupId) {
          const groupSubscription = await tx.groupSubscription.findFirst({
            where: {
              id: input.groupId,
            },
            include: {
              leadSubscription: true,
            },
          });

          if (groupSubscription) {
            // Decrease remaining sessions from the lead subscription
            await tx.subscription.update({
              where: {
                id: groupSubscription.leadSubscriptionId,
              },
              data: {
                remainingSessions: {
                  decrement: 1,
                },
              },
            });
          }
        } else {
          // For individual sessions, decrease remaining sessions from the member's subscription
          await tx.subscription.updateMany({
            where: {
              memberId: input.memberId,
              trainerId: trainer.id,
            },
            data: {
              remainingSessions: {
                decrement: 1,
              },
            },
          });
        }

        return session;
      });
    }),

  // For management to get members by specific trainer ID
  getMembersByTrainerId: permissionProtectedProcedure(["list:trainers"])
    .input(z.object({ trainerId: z.string() }))
    .query(async ({ ctx, input }) => {
      console.log("Getting members for trainer ID:", input.trainerId);

      // Get all individual subscriptions for this personal trainer
      // Exclude subscriptions that are lead subscriptions for groups
      const subscriptions = await ctx.db.subscription.findMany({
        where: {
          trainerId: input.trainerId,
          isActive: true,
          remainingSessions: {
            gt: 0,
          },
          leadGroupSubscriptions: {
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
            remainingSessions: {
              gt: 0,
            },
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
        subscriptionEndDate: subscription.endDate?.toISOString() || "",
        type: "individual" as const,
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
        subscriptionEndDate: groupSubscription.leadSubscription.endDate?.toISOString() || "",
        type: "group" as const,
        groupId: groupSubscription.id,
      }));

      // Combine both individual and group members
      return [...individualMembers, ...groupMembers];
    }),

  getMembers: permissionProtectedProcedure(["list:trainers"]).query(
    async ({ ctx }) => {
      console.log("Getting members for trainer");

      // Get the personal trainer's ID
      const personalTrainer = await ctx.db.personalTrainer.findFirst({
        where: {
          userId: ctx.session.user.id,
          isActive: true,
        },
      });

      if (!personalTrainer) {
        console.log("No active trainer found");
        return [];
      }

      // console.log("Found trainer:", personalTrainer.id);

      // Get all individual subscriptions for this personal trainer
      // Exclude subscriptions that are lead subscriptions for groups
      const subscriptions = await ctx.db.subscription.findMany({
        where: {
          trainerId: personalTrainer.id,
          isActive: true,
          remainingSessions: {
            gt: 0,
          },
          leadGroupSubscriptions: {
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
            trainerId: personalTrainer.id,
            remainingSessions: {
              gt: 0,
            },
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
          package: {
            select: {
              type: true,
              sessions: true,
            },
          },
          // group: true, // Include group to access group name
        },
      });

      console.log(
        "Found subscriptions:",
        subscriptions.map((s) => ({
          memberId: s.memberId,
          remainingSessions: s.remainingSessions,
          userId: s.member.userId,
        })),
      );

      console.log(
        "Found group subscriptions:",
        groupSubscriptions.map((gs) => ({
          groupId: gs.id,
          groupName: gs.groupName,
          leaderId: gs.leadSubscription.member.userId,
        })),
      );

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
        subscriptionEndDate: subscription.endDate?.toISOString() || "",
        type: "individual",
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
        subscriptionEndDate: groupSubscription.leadSubscription.endDate?.toISOString() || "",
        type: "group",
        groupId: groupSubscription.id,
      }));

      // Combine both individual and group members
      return [...individualMembers, ...groupMembers];
    },
  ),

  updateMember: protectedProcedure
    .input(memberSchema)
    .mutation(async ({ ctx, input }) => {
      const trainer = await ctx.db.personalTrainer.findFirst({
        where: {
          userId: ctx.session.user.id,
          isActive: true,
        },
      });

      if (!trainer) {
        throw new Error("Trainer not found or not active.");
      }

      return ctx.db.$transaction(async (prisma) => {
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
