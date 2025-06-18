import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  permissionProtectedProcedure,
} from "@/server/api/trpc";
import { employeeSchema } from "@/app/(authenticated)/management/employee/schema";

export const employeeRouter = createTRPCRouter({
  getAttendanceHistory: permissionProtectedProcedure(["list:employees"])
    .input(
      z.object({
        employeeId: z.string(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { employeeId, startDate, endDate, page, limit } = input;
      const skip = (page - 1) * limit;

      const where = {
        employeeId,
        ...(startDate && endDate
          ? {
              date: {
                gte: startDate,
                lte: endDate,
              },
            }
          : {}),
      };

      const [items, total] = await Promise.all([
        ctx.db.attendance.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            date: 'desc'
          }
        }),
        ctx.db.attendance.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        limit,
      };
    }),

  list: permissionProtectedProcedure(["list:employees"])
    .input(
      z.object({
        page: z.number().min(1),
        limit: z.number().min(1),
        search: z.string(),
        searchColumn: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, search, searchColumn } = input;
      const skip = (page - 1) * limit;

      const where = search
        ? {
            OR: [
              { user: { name: { contains: search } } },
              { user: { email: { contains: search } } },
              { rfidTag: { contains: search } },
            ],
          }
        : {};

      const [items, total] = await Promise.all([
        ctx.db.employee.findMany({
          where,
          skip,
          take: limit,
          include: {
            user: true,
          },
        }),
        ctx.db.employee.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        limit,
      };
    }),

  create: permissionProtectedProcedure(["create:employees"])
    .input(employeeSchema)
    .mutation(async ({ ctx, input }) => {
      const {
        userId,
        position,
        department,
        image,
        isActive,
        fingerprintId = null,
        enrollmentStatus = null
      } = input;

      return ctx.db.employee.create({
        data: {
          userId,
          position,
          department,
          image,
          isActive,
          fingerprintId,
          enrollmentStatus
        },
        include: {
          user: true
        }
      });
    }),

  update: permissionProtectedProcedure(["update:employees"])
    .input(
      z.object({
        id: z.string(),
        position: z.string().optional(),
        department: z.string().optional(),
        image: z.string().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      return ctx.db.employee.update({
        where: { id },
        data,
        include: {
          user: true
        }
      });
    }),

  delete: permissionProtectedProcedure(["delete:employees"])
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      return ctx.db.employee.delete({
        where: { id: input },
      });
    }),
});
