import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  permissionProtectedProcedure,
} from "@/server/api/trpc";
import { employeeSchema } from "@/app/(authenticated)/management/employee/schema";
import { logApiMutationAsync, extractIpAddress, extractUserAgent } from "@/server/utils/mutationLogger";

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

      let where = {};
      
      if (search) {
        if (searchColumn) {
          // Column-specific search
          switch (searchColumn) {
            case "user.name":
              where = { user: { name: { contains: search } } };
              break;
            case "user.email":
              where = { user: { email: { contains: search } } };
              break;
            case "rfidTag":
              where = { rfidTag: { contains: search } };
              break;
            default:
              // If searchColumn is provided but not recognized, fall back to OR search
              where = {
                OR: [
                  { user: { name: { contains: search } } },
                  { user: { email: { contains: search } } },
                  { rfidTag: { contains: search } },
                ],
              };
          }
        } else {
          // No specific column, search all
          where = {
            OR: [
              { user: { name: { contains: search } } },
              { user: { email: { contains: search } } },
              { rfidTag: { contains: search } },
            ],
          };
        }
      }

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
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const {
          userId,
          position,
          department,
          image,
          isActive,
          fingerprintId = null,
          enrollmentStatus = null
        } = input;

        const employee = await ctx.db.employee.create({
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
        result = employee;
        success = true;
        return employee;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "employee.create",
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
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const { id, ...data } = input;

        const employee = await ctx.db.employee.update({
          where: { id },
          data,
          include: {
            user: true
          }
        });
        result = employee;
        success = true;
        return employee;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "employee.update",
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

  delete: permissionProtectedProcedure(["delete:employees"])
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const employee = await ctx.db.employee.delete({
          where: { id: input },
        });
        result = employee;
        success = true;
        return employee;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "employee.delete",
          method: "DELETE",
          userId: ctx.session?.user?.id,
          requestData: { id: input },
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
