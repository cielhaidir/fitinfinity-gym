import { z } from "zod";
import {
  createTRPCRouter,
  permissionProtectedProcedure,
} from "@/server/api/trpc";
import { logApiMutationAsync, extractIpAddress, extractUserAgent } from "@/server/utils/mutationLogger";

export const instructorRouter = createTRPCRouter({
  // List all instructors (paginated)
  list: permissionProtectedProcedure(["list:instructor"])
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        activeOnly: z.boolean().optional().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};
      if (input.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { speciality: { contains: input.search, mode: "insensitive" } },
        ];
      }
      if (input.activeOnly) {
        where.isActive = true;
      }

      const [items, total] = await Promise.all([
        ctx.db.instructor.findMany({
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          where,
          orderBy: { name: "asc" },
          include: {
            _count: { select: { classes: true } },
          },
        }),
        ctx.db.instructor.count({ where }),
      ]);

      return { items, total, page: input.page, limit: input.limit };
    }),

  // Get active instructors (for dropdown in class form)
  getActive: permissionProtectedProcedure(["list:classes"])
    .query(async ({ ctx }) => {
      return ctx.db.instructor.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, speciality: true },
      });
    }),

  // Create instructor
  create: permissionProtectedProcedure(["create:instructor"])
    .input(
      z.object({
        name: z.string().min(1, "Nama wajib diisi"),
        phone: z.string().optional(),
        speciality: z.string().optional(),
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        result = await ctx.db.instructor.create({ data: input });
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "instructor.create",
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

  // Update instructor
  update: permissionProtectedProcedure(["update:instructor"])
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        phone: z.string().nullable().optional(),
        speciality: z.string().nullable().optional(),
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
        result = await ctx.db.instructor.update({ where: { id }, data });
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "instructor.update",
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

  // Delete instructor
  remove: permissionProtectedProcedure(["delete:instructor"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        // Check if instructor has classes
        const classCount = await ctx.db.class.count({ where: { instructorId: input.id } });
        if (classCount > 0) {
          throw new Error(`Instructor masih memiliki ${classCount} class. Nonaktifkan saja atau pindahkan class terlebih dahulu.`);
        }
        result = await ctx.db.instructor.delete({ where: { id: input.id } });
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "instructor.remove",
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

  // Report: instructor stats with class details
  report: permissionProtectedProcedure(["report:instructor"])
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        instructorId: z.string().optional(),
        status: z.enum(["all", "SCHEDULED", "CANCELLED"]).optional().default("all"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const endOfDay = new Date(input.endDate);
      endOfDay.setHours(23, 59, 59, 999);

      const classWhere: any = {
        schedule: { gte: input.startDate, lte: endOfDay },
      };
      if (input.instructorId) {
        classWhere.instructorId = input.instructorId;
      }
      if (input.status !== "all") {
        classWhere.status = input.status;
      }

      // Get all classes in date range
      const classes = await ctx.db.class.findMany({
        where: classWhere,
        include: {
          instructor: true,
          classType: true,
          registeredMembers: {
            include: {
              member: {
                include: { user: { select: { name: true } } },
              },
            },
          },
        },
        orderBy: { schedule: "asc" },
      });

      // Group by instructor
      const instructorMap = new Map<string, {
        instructorId: string | null;
        instructorName: string;
        totalClasses: number;
        cancelledClasses: number;
        cancelledSessionCounted: number;
        cancelledSessionNotCounted: number;
        scheduledClasses: number;
        totalStudents: number;
        totalAttended: number;
        totalRevenue: number;
        classes: typeof classes;
      }>();

      for (const cls of classes) {
        const key = cls.instructorId || cls.instructorName;
        const existing = instructorMap.get(key) || {
          instructorId: cls.instructorId,
          instructorName: cls.instructor?.name || cls.instructorName,
          totalClasses: 0,
          cancelledClasses: 0,
          cancelledSessionCounted: 0,
          cancelledSessionNotCounted: 0,
          scheduledClasses: 0,
          totalStudents: 0,
          totalAttended: 0,
          totalRevenue: 0,
          classes: [] as typeof classes,
        };

        existing.totalClasses++;
        if (cls.status === "CANCELLED") {
          existing.cancelledClasses++;
          if (cls.sessionCounted) {
            existing.cancelledSessionCounted++;
          } else {
            existing.cancelledSessionNotCounted++;
          }
        } else {
          existing.scheduledClasses++;
        }

        const registered = cls.registeredMembers.length;
        const attended = cls.registeredMembers.filter((m) => m.attended).length;
        existing.totalStudents += registered;
        existing.totalAttended += attended;
        existing.totalRevenue += cls.price * registered;
        existing.classes.push(cls);

        instructorMap.set(key, existing);
      }

      const instructors = Array.from(instructorMap.values()).sort(
        (a, b) => b.totalClasses - a.totalClasses,
      );

      // Summary
      const summary = {
        totalClasses: classes.length,
        scheduledClasses: classes.filter((c) => c.status === "SCHEDULED").length,
        cancelledClasses: classes.filter((c) => c.status === "CANCELLED").length,
        cancelledSessionCounted: classes.filter((c) => c.status === "CANCELLED" && c.sessionCounted).length,
        cancelledSessionNotCounted: classes.filter((c) => c.status === "CANCELLED" && !c.sessionCounted).length,
        totalStudents: classes.reduce((s, c) => s + c.registeredMembers.length, 0),
        totalAttended: classes.reduce((s, c) => s + c.registeredMembers.filter((m) => m.attended).length, 0),
        totalRevenue: classes.reduce((s, c) => s + c.price * c.registeredMembers.length, 0),
        uniqueInstructors: instructorMap.size,
      };

      return { summary, instructors };
    }),
});
