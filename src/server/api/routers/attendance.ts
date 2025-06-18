import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  permissionProtectedProcedure,
} from "../trpc";
import { TRPCError } from "@trpc/server";

export const attendanceRouter = createTRPCRouter({
  list: permissionProtectedProcedure(["list:attendance"])
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(10),
        search: z.string().optional(),
        searchColumn: z.string().optional(),
        date: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, search, searchColumn, date } = input;
      const skip = (page - 1) * limit;

      try {
        const where = {
          ...(date && {
            date: {
              gte: new Date(date + "T00:00:00.000Z"),
              lt: new Date(date + "T23:59:59.999Z"),
            },
          }),
          ...(search &&
            searchColumn && {
              employee: {
                user: {
                  [searchColumn]: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            }),
        };

        const [items, total] = await Promise.all([
          ctx.db.attendance.findMany({
            where,
            include: {
              employee: {
                include: {
                  user: true,
                },
              },
            },
            orderBy: {
              date: "desc",
            },
            skip,
            take: limit,
          }),
          ctx.db.attendance.count({ where }),
        ]);

        return {
          items,
          total,
          page,
          limit,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch attendance records",
        });
      }
    }),

  checkIn: permissionProtectedProcedure(["create:attendance"]).mutation(async ({ ctx }) => {
    try {
      // First check if user exists and has employee role
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        include: {
          roles: true,
          employee: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (!user.employee) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only employees can check in",
        });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingAttendance = await ctx.db.attendance.findFirst({
        where: {
          employeeId: user.employee.id,
          date: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      });

      if (existingAttendance) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You have already checked in today",
        });
      }

      const attendance = await ctx.db.attendance.create({
        data: {
          employeeId: user.employee.id,
          checkIn: new Date(),
          date: new Date(),
        },
      });

      return attendance;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to check in",
      });
    }
  }),

  checkOut: permissionProtectedProcedure(["create:attendance"]).mutation(async ({ ctx }) => {
    try {
      // First check if user exists and has employee role
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        include: {
          roles: true,
          employee: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (!user.employee) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only employees can check out",
        });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const attendance = await ctx.db.attendance.findFirst({
        where: {
          employeeId: user.employee.id,
          date: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          },
          checkOut: null,
        },
      });

      if (!attendance) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No check-in record found for today",
        });
      }

      const updatedAttendance = await ctx.db.attendance.update({
        where: {
          id: attendance.id,
        },
        data: {
          checkOut: new Date(),
        },
      });

      return updatedAttendance;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to check out",
      });
    }
  }),
});
