import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  permissionProtectedProcedure,
} from "@/server/api/trpc";

import { PackageType } from '@prisma/client';
import { logApiMutationAsync, extractIpAddress, extractUserAgent } from "@/server/utils/mutationLogger";

const packageType = z.enum(["GYM_MEMBERSHIP", "PERSONAL_TRAINER", "GROUP_TRAINING"]);
const groupPriceType = z.enum(["TOTAL", "PER_PERSON"]);

const packageTypeSchema = z.nativeEnum(PackageType);
export const packageRouter = createTRPCRouter({
  create: permissionProtectedProcedure(["create:packages"])
  .input(
    z.object({
      name: z.string(),
      description: z.string().optional(),
      price: z.number(),
      point: z.number(),
      type: packageTypeSchema, // Use the proper enum schema
      sessions: z.number().nullish(),
      bonusSessions: z.number().min(0).default(0),
      day: z.number().nullish(),
      isActive: z.boolean().optional(),
      // Group package fields
      maxUsers: z.number().nullish(),
      isGroupPackage: z.boolean().optional(),
      groupPriceType: groupPriceType.nullish(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const startTime = Date.now();
    let success = false;
    let result: any = null;
    let error: Error | null = null;

    try {
      console.log("Creating package with input:", input);
      
      result = await ctx.db.package.create({
        data: {
          name: input.name,
          description: input.description,
          price: input.price,
          point: input.point,
          type: input.type, // Now properly typed as PackageType
          sessions: input.sessions ?? null,
          bonusSessions: input.bonusSessions ?? 0,
          day: input.day ?? null,
          isActive: input.isActive ?? true,
          maxUsers: input.maxUsers ?? null,
          isGroupPackage: input.type === "GROUP_TRAINING" ? true : (input.isGroupPackage ?? false),
          groupPriceType: input.groupPriceType ?? null,
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
        endpoint: "package.create",
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

  list: permissionProtectedProcedure(["list:packages"])
    .input(
      z.object({
        page: z.number().min(1),
        limit: z.number().min(1).max(100),
        search: z.string().optional(),
        type: packageType.optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = {
        AND: [
          input.search
            ? {
                OR: [
                  {
                    name: {
                      contains: input.search,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    description: {
                      contains: input.search,
                      mode: "insensitive" as const,
                    },
                  },
                ],
              }
            : {},
          input.type ? { type: input.type } : {},
        ],
      };

      const items = await ctx.db.package.findMany({
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        where,
        orderBy: { createdAt: "desc" },
      });
      const total = await ctx.db.package.count({ where });

      return {
        items,
        total,
        page: input.page,
        limit: input.limit,
      };
    }),

  detail: permissionProtectedProcedure(["show:packages"])
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.package.findUnique({
        where: { id: input.id },
      });
    }),

  update: permissionProtectedProcedure(["update:packages"])
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        price: z.number(),
        point: z.number(),
        type: packageType,
        sessions: z.number().nullable(),
        bonusSessions: z.number().min(0).default(0),
        day: z.number().nullable(),
        isActive: z.boolean(),
        // Group package fields
        maxUsers: z.number().nullable(),
        isGroupPackage: z.boolean(),
        groupPriceType: groupPriceType.nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const { id, ...data } = input;

        result = await ctx.db.package.update({
          where: { id },
          data: {
            name: data.name,
            description: data.description,
            price: data.price,
            point: data.point,
            type: data.type,
            sessions: data.sessions,
            bonusSessions: data.bonusSessions ?? 0,
            day: data.day,
            isActive: data.isActive,
            maxUsers: data.maxUsers,
            isGroupPackage: data.type === "GROUP_TRAINING" ? true : data.isGroupPackage,
            groupPriceType: data.groupPriceType,
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
          endpoint: "package.update",
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

  remove: permissionProtectedProcedure(["delete:packages"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        result = await ctx.db.package.delete({
          where: { id: input.id },
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
          endpoint: "package.remove",
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

  listActive: permissionProtectedProcedure(["list:packages"]).query(
    async ({ ctx }) => {
      return ctx.db.package.findMany({
        where: { isActive: true },
      });
    },
  ),

   listAlll: permissionProtectedProcedure(["list:packages"]).query(
    async ({ ctx }) => {
      return ctx.db.package.findMany();
    },
  ),


  listByType: permissionProtectedProcedure(["list:packages"])
    .input(z.object({ type: packageType }))
    .query(async ({ ctx, input }) => {
      return ctx.db.package.findMany({
        where: { type: input.type, isActive: true },
      });
    }),

  // Group subscription management
  createGroupSubscription: protectedProcedure
    .input(z.object({
      packageId: z.string(),
      groupName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const user = ctx.session.user;
        
        // Get the member record for the user
        const member = await ctx.db.membership.findFirst({
          where: { userId: user.id }
        });
        
        if (!member) {
          throw new Error("User is not a member");
        }

        // Verify the package is a group package
        const groupPackage = await ctx.db.package.findUnique({
          where: { id: input.packageId }
        });

        if (!groupPackage || !groupPackage.isGroupPackage) {
          throw new Error("Package is not a group package");
        }

        result = await ctx.db.$transaction(async (tx) => {
          // Create lead subscription
          const leadSubscription = await tx.subscription.create({
            data: {
              memberId: member.id,
              packageId: input.packageId,
              startDate: new Date(),
              remainingSessions: groupPackage.sessions,
              isActive: true
            }
          });

          // Create group subscription
          const groupSubscription = await tx.groupSubscription.create({
            data: {
              groupName: input.groupName ?? `${user.name}'s Training Group`,
              leadSubscriptionId: leadSubscription.id,
              packageId: input.packageId,
              totalMembers: 1,
              maxMembers: groupPackage.maxUsers ?? 4,
              status: "ACTIVE"
            }
          });

          // Add lead as first member
          await tx.groupMember.create({
            data: {
              groupSubscriptionId: groupSubscription.id,
              subscriptionId: leadSubscription.id,
              status: "ACTIVE"
            }
          });

          return { groupSubscription, leadSubscription };
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
          endpoint: "package.createGroupSubscription",
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

  getMyGroups: protectedProcedure
    .query(async ({ ctx }) => {
      const user = ctx.session.user;
      
      // Get the member record for the user
      const member = await ctx.db.membership.findFirst({
        where: { userId: user.id }
      });
      
      if (!member) return [];
      
      const groupMembers = await ctx.db.groupMember.findMany({
        where: {
          subscription: { memberId: member.id },
          status: "ACTIVE"
        },
        include: {
          subscription: {
            include: {
              member: {
                include: { user: true }
              }
            }
          },
          groupSubscription: {
            include: {
              package: true,
              leadSubscription: {
                include: {
                  member: {
                    include: { user: true }
                  }
                }
              },
              groupMembers: {
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
          }
        }
      });
      
      return groupMembers;
    }),

    getAllGroups: protectedProcedure
      .query(async ({ ctx }) => {
        const groups = await ctx.db.groupSubscription.findMany({
          include: {
            package: true,
            leadSubscription: {
              include: {
                member: {
                  include: { user: true }
                }
              }
            },
            groupMembers: {
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

        return groups;
      }),

  joinGroup: protectedProcedure
    .input(z.object({
      groupSubscriptionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const user = ctx.session.user;
        
        // Get the member record for the user
        const member = await ctx.db.membership.findFirst({
          where: { userId: user.id }
        });
        
        if (!member) {
          throw new Error("User is not a member");
        }

        // Get group subscription details (include leadSubscription to copy trainerId)
        const groupSubscription = await ctx.db.groupSubscription.findUnique({
          where: { id: input.groupSubscriptionId },
          include: { package: true, leadSubscription: true }
        });

        if (!groupSubscription) {
          throw new Error("Group subscription not found");
        }

        if (groupSubscription.totalMembers >= groupSubscription.maxMembers) {
          throw new Error("Group is full");
        }

        const newTotalMembers = groupSubscription.totalMembers + 1;

        result = await ctx.db.$transaction(async (tx) => {
          // Create member subscription (copy trainerId from leader so FIFO decrement works)
          const memberSubscription = await tx.subscription.create({
            data: {
              memberId: member.id,
              packageId: groupSubscription.packageId,
              trainerId: groupSubscription.leadSubscription.trainerId,
              startDate: groupSubscription.leadSubscription.startDate,
              endDate: groupSubscription.leadSubscription.endDate,
              remainingSessions: groupSubscription.package.sessions,
              isActive: true
            }
          });

          // Add to group
          await tx.groupMember.create({
            data: {
              groupSubscriptionId: groupSubscription.id,
              subscriptionId: memberSubscription.id,
              status: "ACTIVE"
            }
          });

          // Update group member count; activate group if now full
          await tx.groupSubscription.update({
            where: { id: groupSubscription.id },
            data: {
              totalMembers: newTotalMembers,
              ...(newTotalMembers >= groupSubscription.maxMembers && { status: "ACTIVE" }),
            }
          });

          return memberSubscription;
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
          endpoint: "package.joinGroup",
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

  leaveGroup: protectedProcedure
    .input(z.object({
      groupSubscriptionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const user = ctx.session.user;
        
        // Get the member record for the user
        const member = await ctx.db.membership.findFirst({
          where: { userId: user.id }
        });
        
        if (!member) {
          throw new Error("User is not a member");
        }

        result = await ctx.db.$transaction(async (tx) => {
          // Find and remove the group member
          const groupMember = await tx.groupMember.findFirst({
            where: {
              groupSubscriptionId: input.groupSubscriptionId,
              subscription: { memberId: member.id }
            }
          });

          if (!groupMember) {
            throw new Error("User is not a member of this group");
          }

          // Update member status to REMOVED
          await tx.groupMember.update({
            where: { id: groupMember.id },
            data: { status: "REMOVED" }
          });

          // Deactivate the subscription
          await tx.subscription.update({
            where: { id: groupMember.subscriptionId },
            data: { isActive: false }
          });

          // Update group member count
          await tx.groupSubscription.update({
            where: { id: input.groupSubscriptionId },
            data: { totalMembers: { decrement: 1 } }
          });

          return { success: true };
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
          endpoint: "package.leaveGroup",
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
  
    // Admin: Remove member from group
    kickMember: permissionProtectedProcedure(["manage:groups"])
      .input(z.object({
        groupSubscriptionId: z.string(),
        memberId: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const startTime = Date.now();
        let success = false;
        let result: any = null;
        let error: Error | null = null;

        try {
          result = await ctx.db.$transaction(async (tx) => {
            // Find the group member
            const groupMember = await tx.groupMember.findFirst({
              where: {
                groupSubscriptionId: input.groupSubscriptionId,
                subscription: { memberId: input.memberId }
              }
            });
    
            if (!groupMember) {
              throw new Error("User is not a member of this group");
            }
    
            // Check if trying to kick the leader
            const groupSubscription = await tx.groupSubscription.findUnique({
              where: { id: input.groupSubscriptionId },
              include: { leadSubscription: true }
            });
    
            if (groupSubscription?.leadSubscription.memberId === input.memberId) {
              throw new Error("Cannot kick the group leader");
            }
    
            // Update member status to REMOVED
            await tx.groupMember.update({
              where: { id: groupMember.id },
              data: { status: "REMOVED" }
            });
    
            // Deactivate AND soft-delete the subscription so it doesn't accumulate as duplicates
            await tx.subscription.update({
              where: { id: groupMember.subscriptionId },
              data: { isActive: false, deletedAt: new Date() }
            });
    
            // Update group member count
            await tx.groupSubscription.update({
              where: { id: input.groupSubscriptionId },
              data: { totalMembers: { decrement: 1 } }
            });

            // Decrease points for the admin who kicked the member
            await tx.user.update({
              where: { id: ctx.session.user.id },
              data: { point: { decrement: 5 } } // -5 points for kicking a member
            });
    
            return { success: true };
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
            endpoint: "package.kickMember",
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
  
    // Group invitation system
  inviteToGroup: protectedProcedure
    .input(z.object({
      groupSubscriptionId: z.string(),
      memberIds: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const user = ctx.session.user;
        
        // Verify user is the group leader
        const groupSubscription = await ctx.db.groupSubscription.findUnique({
          where: { id: input.groupSubscriptionId },
          include: {
            package: true,
            leadSubscription: {
              include: {
                member: {
                  include: { user: true }
                }
              }
            }
          }
        });

        if (!groupSubscription) {
          throw new Error("Group not found");
        }

        // Query user permissions from DB (protectedProcedure does not populate permissions)
        const userWithRoles = await ctx.db.user.findUnique({
          where: { id: user.id },
          include: {
            roles: {
              include: {
                permissions: { include: { permission: true } }
              }
            }
          }
        });
        const userPermissions = userWithRoles?.roles.flatMap(role =>
          role.permissions.map(p => p.permission.name)
        ) ?? [];
        const hasManageGroups = userPermissions.includes("manage:groups");

        const isGroupLeader = groupSubscription.leadSubscription.member.userId === user.id;
        if (!isGroupLeader && !hasManageGroups) {
          throw new Error("Only the group leader or a user with 'manage:groups' permission can invite members");
        }

        // Check if group has space
        const availableSpots = groupSubscription.maxMembers - groupSubscription.totalMembers;
        if (input.memberIds.length > availableSpots) {
          throw new Error(`Group only has ${availableSpots} available spots`);
        }

        // For now, automatically add members to the group (simple invitation)
        // In a full implementation, you would send email invitations and wait for acceptance
        const inviteResults = [];

        for (const memberId of input.memberIds) {
          try {
            const member = await ctx.db.membership.findUnique({
              where: { id: memberId },
              include: { user: true }
            });

            if (!member) {
              inviteResults.push({ memberId, success: false, error: "Member not found" });
              continue;
            }

            // Check if already in group (only block if ACTIVE)
            const existingMember = await ctx.db.groupMember.findFirst({
              where: {
                groupSubscriptionId: input.groupSubscriptionId,
                subscription: { memberId: memberId }
              }
            });

            if (existingMember && existingMember.status === "ACTIVE") {
              inviteResults.push({ memberId, success: false, error: "Already in group" });
              continue;
            }

            // Create subscription and add to group (or re-add if previously removed)
            await ctx.db.$transaction(async (tx) => {
              // Re-read current totalMembers inside transaction
              const currentGroup = await tx.groupSubscription.findUnique({
                where: { id: input.groupSubscriptionId },
                select: { totalMembers: true, maxMembers: true },
              });
              const newTotal = (currentGroup?.totalMembers ?? groupSubscription.totalMembers) + 1;

              // Read the leader's current remaining sessions so the member matches
              const currentLeadSub = await tx.subscription.findUnique({
                where: { id: groupSubscription.leadSubscriptionId },
                select: { remainingSessions: true, remainingBonusSessions: true },
              });

              // Try to reuse an existing non-deleted subscription for the same member+package+trainer
              // to avoid creating duplicate subscription rows.
              const reusable = await tx.subscription.findFirst({
                where: {
                  memberId: memberId,
                  packageId: groupSubscription.packageId,
                  trainerId: groupSubscription.leadSubscription.trainerId,
                  deletedAt: null,
                  // Not already an ACTIVE member of ANY group
                  groupMembers: { none: { status: "ACTIVE" } },
                },
                orderBy: { startDate: "desc" },
              });

              let memberSubscription;
              if (reusable) {
                memberSubscription = await tx.subscription.update({
                  where: { id: reusable.id },
                  data: {
                    startDate: groupSubscription.leadSubscription.startDate,
                    endDate: groupSubscription.leadSubscription.endDate,
                    remainingSessions: currentLeadSub?.remainingSessions ?? groupSubscription.package?.sessions,
                    remainingBonusSessions: currentLeadSub?.remainingBonusSessions ?? 0,
                    isActive: true,
                  },
                });
              } else {
                memberSubscription = await tx.subscription.create({
                  data: {
                    memberId: memberId,
                    packageId: groupSubscription.packageId,
                    trainerId: groupSubscription.leadSubscription.trainerId,
                    startDate: groupSubscription.leadSubscription.startDate,
                    endDate: groupSubscription.leadSubscription.endDate,
                    remainingSessions: currentLeadSub?.remainingSessions ?? groupSubscription.package?.sessions,
                    remainingBonusSessions: currentLeadSub?.remainingBonusSessions ?? 0,
                    isActive: true,
                  },
                });
              }

              if (existingMember && existingMember.status === "REMOVED") {
                // Re-activate the existing group member record with new subscription
                await tx.groupMember.update({
                  where: { id: existingMember.id },
                  data: {
                    subscriptionId: memberSubscription.id,
                    status: "ACTIVE"
                  }
                });
              } else {
                await tx.groupMember.create({
                  data: {
                    groupSubscriptionId: input.groupSubscriptionId,
                    subscriptionId: memberSubscription.id,
                    status: "ACTIVE"
                  }
                });
              }

              await tx.groupSubscription.update({
                where: { id: input.groupSubscriptionId },
                data: {
                  totalMembers: newTotal,
                  ...(newTotal >= groupSubscription.maxMembers && { status: "ACTIVE" }),
                }
              });

              // Increase points for the user who invited the member
              await tx.user.update({
                where: { id: member.user.id },
                data: { point: { increment:  groupSubscription.package.point} } // +10 points for the invited member
              });
            });

            inviteResults.push({ memberId, success: true, error: null });
          } catch (error) {
            inviteResults.push({
              memberId,
              success: false,
              error: error instanceof Error ? error.message : "Unknown error"
            });
          }
        }

        result = inviteResults;
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "package.inviteToGroup",
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

  getAvailableMembers: protectedProcedure
    .input(z.object({
      groupSubscriptionId: z.string(),
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Get existing ACTIVE group members (REMOVED members should be available to re-add)
      const existingMembers = await ctx.db.groupMember.findMany({
        where: { groupSubscriptionId: input.groupSubscriptionId, status: "ACTIVE" },
        include: { subscription: true }
      });

      const existingMemberIds = existingMembers.map(gm => gm.subscription.memberId);

      // Find available members (not already in the group and have active subscription)
      const availableMembers = await ctx.db.membership.findMany({
        where: {
          id: { notIn: existingMemberIds },
          // Check for active subscriptions instead of membership.isActive
          subscriptions: {
            some: {
              isActive: true,
              deletedAt: null,
            },
          },
          ...(input.search && {
            user: {
              OR: [
                { name: { contains: input.search, mode: "insensitive" } },
                { email: { contains: input.search, mode: "insensitive" } }
              ]
            }
          })
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          }
        },
        take: 20
      });

      return availableMembers;
    }),

  getGroupDetails: protectedProcedure
    .input(z.object({
      groupSubscriptionId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const groupSubscription = await ctx.db.groupSubscription.findUnique({
        where: { id: input.groupSubscriptionId },
        include: {
          package: true,
          leadSubscription: {
            include: {
              member: {
                include: { user: true }
              }
            }
          },
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

      return groupSubscription;
    }),

  createGroupForExistingSubscription: permissionProtectedProcedure(["edit:subscription-advanced"])
    .input(z.object({ subscriptionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const subscription = await ctx.db.subscription.findUnique({
        where: { id: input.subscriptionId },
        include: {
          package: true,
          member: { include: { user: true } },
        },
      });

      if (!subscription) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found" });
      }

      if (subscription.package.type !== "GROUP_TRAINING") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Package is not GROUP_TRAINING type" });
      }

      const existing = await ctx.db.groupMember.findFirst({
        where: { subscriptionId: subscription.id },
      });

      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "GroupSubscription already exists for this subscription" });
      }

      const groupSubscription = await ctx.db.groupSubscription.create({
        data: {
          groupName: `${subscription.member?.user?.name || "Member"}'s Group`,
          leadSubscriptionId: subscription.id,
          packageId: subscription.packageId,
          totalMembers: 1,
          maxMembers: subscription.package.maxUsers ?? 4,
          status: "ACTIVE",
        },
      });

      await ctx.db.groupMember.create({
        data: {
          groupSubscriptionId: groupSubscription.id,
          subscriptionId: subscription.id,
          status: "ACTIVE",
        },
      });

      return groupSubscription;
    }),

  // Sync all group member subscriptions to match their leader's remaining sessions
  syncGroupSessions: permissionProtectedProcedure(["manage:groups"])
    .mutation(async ({ ctx }) => {
      const activeGroups = await ctx.db.groupSubscription.findMany({
        where: { status: "ACTIVE" },
        include: {
          leadSubscription: {
            select: { id: true, remainingSessions: true, remainingBonusSessions: true, endDate: true },
          },
          groupMembers: {
            where: { status: "ACTIVE" },
            select: { subscriptionId: true },
          },
        },
      });

      let totalSynced = 0;

      for (const group of activeGroups) {
        const partnerSubIds = group.groupMembers
          .filter(gm => gm.subscriptionId !== group.leadSubscriptionId)
          .map(gm => gm.subscriptionId);

        if (partnerSubIds.length > 0) {
          const result = await ctx.db.subscription.updateMany({
            where: { id: { in: partnerSubIds } },
            data: {
              remainingSessions: group.leadSubscription.remainingSessions,
              remainingBonusSessions: group.leadSubscription.remainingBonusSessions,
              endDate: group.leadSubscription.endDate,
            },
          });
          totalSynced += result.count;
        }
      }

      console.log(`[syncGroupSessions] Synced ${totalSynced} group member subscription(s) across ${activeGroups.length} group(s)`);
      return { syncedCount: totalSynced, groupCount: activeGroups.length };
    }),

  // Cleanup duplicate / orphan subscriptions.
  // Soft-deletes subscriptions that are:
  //  - not already deleted
  //  - inactive (isActive = false)
  //  - NOT attached to any ACTIVE GroupMember record
  //  - NOT a lead subscription of an ACTIVE GroupSubscription
  //  - have no remaining sessions (paid + bonus = 0) OR are already expired
  cleanupOrphanSubscriptions: permissionProtectedProcedure(["manage:groups"])
    .mutation(async ({ ctx }) => {
      const now = new Date();
      const orphans = await ctx.db.subscription.findMany({
        where: {
          deletedAt: null,
          isActive: false,
          groupMembers: { none: { status: "ACTIVE" } },
          leadGroupSubscriptions: { none: { status: "ACTIVE" } },
          OR: [
            {
              AND: [
                { OR: [{ remainingSessions: null }, { remainingSessions: { lte: 0 } }] },
                { remainingBonusSessions: { lte: 0 } },
              ],
            },
            { endDate: { lt: now } },
          ],
        },
        select: { id: true, memberId: true, packageId: true },
      });

      if (orphans.length === 0) {
        return { cleanedCount: 0 };
      }

      const result = await ctx.db.subscription.updateMany({
        where: { id: { in: orphans.map(o => o.id) } },
        data: { deletedAt: now },
      });

      console.log(`[cleanupOrphanSubscriptions] Soft-deleted ${result.count} orphan subscription(s)`);
      return { cleanedCount: result.count };
    }),

  // Deduplicate subscriptions: for each (memberId + packageId + startDate day),
  // keep only the best subscription and soft-delete the rest.
  deduplicateSubscriptions: permissionProtectedProcedure(["manage:groups"])
    .mutation(async ({ ctx }) => {
      const now = new Date();

      // Fetch all non-deleted subscriptions with relations needed for priority
      const allSubs = await ctx.db.subscription.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          memberId: true,
          packageId: true,
          startDate: true,
          isActive: true,
          remainingSessions: true,
          remainingBonusSessions: true,
          groupMembers: { where: { status: "ACTIVE" }, select: { id: true } },
          leadGroupSubscriptions: { where: { status: "ACTIVE" }, select: { id: true } },
        },
        orderBy: { startDate: "asc" },
      });

      // Group by memberId + packageId + startDate(day-level)
      const groups = new Map<string, typeof allSubs>();
      for (const sub of allSubs) {
        const dayKey = sub.startDate.toISOString().slice(0, 10); // "YYYY-MM-DD"
        const key = `${sub.memberId}|${sub.packageId}|${dayKey}`;
        const arr = groups.get(key) ?? [];
        arr.push(sub);
        groups.set(key, arr);
      }

      const toDelete: string[] = [];

      for (const [, subs] of groups) {
        if (subs.length <= 1) continue;

        // Sort: best first
        // 1) linked to active group → top
        // 2) isActive = true → top
        // 3) most remaining sessions → top
        subs.sort((a, b) => {
          const aLinked = a.groupMembers.length > 0 || a.leadGroupSubscriptions.length > 0 ? 1 : 0;
          const bLinked = b.groupMembers.length > 0 || b.leadGroupSubscriptions.length > 0 ? 1 : 0;
          if (bLinked !== aLinked) return bLinked - aLinked;

          const aActive = a.isActive ? 1 : 0;
          const bActive = b.isActive ? 1 : 0;
          if (bActive !== aActive) return bActive - aActive;

          const aSessions = (a.remainingSessions ?? 0) + (a.remainingBonusSessions ?? 0);
          const bSessions = (b.remainingSessions ?? 0) + (b.remainingBonusSessions ?? 0);
          return bSessions - aSessions;
        });

        // Keep index 0, soft-delete the rest
        for (let i = 1; i < subs.length; i++) {
          toDelete.push(subs[i]!.id);
        }
      }

      if (toDelete.length === 0) {
        return { deduplicatedCount: 0, groupsAffected: 0 };
      }

      const result = await ctx.db.subscription.updateMany({
        where: { id: { in: toDelete } },
        data: { deletedAt: now, isActive: false },
      });

      const groupsAffected = [...groups.values()].filter(g => g.length > 1).length;
      console.log(`[deduplicateSubscriptions] Soft-deleted ${result.count} duplicate subscription(s) across ${groupsAffected} group(s)`);
      return { deduplicatedCount: result.count, groupsAffected };
    }),
});
