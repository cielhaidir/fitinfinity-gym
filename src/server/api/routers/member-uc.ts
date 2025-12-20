import {
  createTRPCRouter,
  protectedProcedure,
  permissionProtectedProcedure,
} from "../trpc";
import {
  getUpcomingClassesSchema,
  getActivePackageSchema,
} from "@/app/(authenticated)/member/dashboard/schema";
import { PackageType } from "@prisma/client";

export const memberUcRouter = createTRPCRouter({
  list: permissionProtectedProcedure(["list:classes"])
    .input(getUpcomingClassesSchema)
    .query(async ({ ctx, input }) => {
      const now = new Date();

      return await ctx.db.class.findMany({
        where: {
          schedule: {
            gte: now,
          },
        },
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
          registeredMembers: {
            where: {
              memberId: input.memberId,
            },
          },
          _count: {
            select: {
              registeredMembers: true,
            },
          },
        },
        orderBy: {
          schedule: "asc",
        },
        take: input.limit,
      });
    }),

  getActivePackage: permissionProtectedProcedure(["list:packages"])
    .input(getActivePackageSchema)
    .query(async ({ ctx, input }) => {
      const now = new Date();

      // Get all active subscriptions (both gym and trainer)
      const subscriptions = await ctx.db.subscription.findMany({
        where: {
          memberId: input.memberId,
          endDate: {
            gte: now,
          },
          deletedAt: null,
          isActive: true,
        },
        include: {
          package: true,
          trainer: {
            include: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
          payments: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
        orderBy: {
          endDate: "asc",
        },
      });

      return subscriptions;
    }),
});
