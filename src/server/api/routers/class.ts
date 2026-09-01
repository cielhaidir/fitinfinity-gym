import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  permissionProtectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { createClassSchema, createBulkClassSchema } from "@/app/(authenticated)/management/class/schema";
import { logApiMutationAsync, extractIpAddress, extractUserAgent } from "@/server/utils/mutationLogger";

export const classRouter = createTRPCRouter({
  create: permissionProtectedProcedure(["create:classes"])
    .input(createClassSchema)
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        console.log("Creating class with input:", input); // Debug log
        // Find the classType by name
        const classType = await ctx.db.classType.findUnique({
          where: { name: input.name.toLowerCase() },
        });

        const newClass = await ctx.db.class.create({
          data: {
            name: input.name,
            classTypeId: classType?.id,
            limit: input.limit,
            instructorName: input.instructorName,
            instructorId: input.instructorId ?? undefined,
            schedule: input.schedule,
            duration: input.duration,
            price: input.price,
          },
          include: {
            classType: true,
            instructor: true,
          },
        });
        result = newClass;
        success = true;
        return newClass;
      } catch (err) {
        error = err as Error;
        success = false;
        console.error("Failed to create class:", error);
        throw new Error("Failed to create class");
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "class.create",
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

  createBulk: permissionProtectedProcedure(["create:classes"])
    .input(createBulkClassSchema)
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        console.log("Creating bulk classes with input:", input); // Debug log
        const { schedules, ...classData } = input;
        
        // Find the classType by name
        const classType = await ctx.db.classType.findUnique({
          where: { name: classData.name.toLowerCase() },
        });
        
        // Create multiple classes with different schedules
        const createdClasses = await Promise.all(
          schedules.map(schedule =>
            ctx.db.class.create({
              data: {
                name: classData.name,
                classTypeId: classType?.id,
                limit: classData.limit,
                instructorName: classData.instructorName,
                instructorId: classData.instructorId ?? undefined,
                schedule: schedule,
                duration: classData.duration,
                price: classData.price,
              },
              include: {
                classType: true,
                instructor: true,
              },
            })
          )
        );
        
        result = createdClasses;
        success = true;
        return createdClasses;
      } catch (err) {
        error = err as Error;
        success = false;
        console.error("Failed to create bulk classes:", error);
        throw new Error("Failed to create bulk classes");
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "class.createBulk",
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

  list: permissionProtectedProcedure(["list:classes"])
    .input(
      z.object({
        page: z.number().min(1),
        limit: z.number().min(1),
        search: z.string().optional(),
        filter: z.enum(["all", "past", "upcoming"]).optional().default("upcoming"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, search, filter } = input;
      const skip = (page - 1) * limit;

      try {
        const whereConditions: any = {};

        if (filter === "upcoming") {
          whereConditions.schedule = { gte: new Date() };
        } else if (filter === "past") {
          whereConditions.schedule = { lt: new Date() };
        }

        // Add search condition if provided
        if (search) {
          whereConditions.name = { contains: search, mode: "insensitive" as const };
        }

        const where = whereConditions;

        const [items, total] = await Promise.all([
          ctx.db.class.findMany({
            skip,
            take: limit,
            where,
            include: {
              classType: true,
              instructor: true,
            },
            orderBy: { schedule: filter === "past" ? "desc" : "asc" },
          }),
          ctx.db.class.count({ where }),
        ]);

        return {
          items,
          total,
          page,
          limit,
        };
      } catch (error) {
        throw new Error("Failed to fetch classes");
      }
    }),

  update: permissionProtectedProcedure(["update:classes"])
    .input(
      createClassSchema.extend({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const { id, ...data } = input;
        // Find the classType by name if name is being updated
        let classTypeId = undefined;
        if (data.name) {
          const classType = await ctx.db.classType.findUnique({
            where: { name: data.name.toLowerCase() },
          });
          classTypeId = classType?.id;
        }

        const updatedClass = await ctx.db.class.update({
          where: { id },
          data: {
            name: data.name,
            classTypeId: classTypeId,
            limit: data.limit,
            instructorName: data.instructorName,
            instructorId: data.instructorId ?? undefined,
            schedule: data.schedule,
            duration: data.duration,
          },
          include: {
            classType: true,
            instructor: true,
          },
        });
        result = updatedClass;
        success = true;
        return updatedClass;
      } catch (err) {
        error = err as Error;
        success = false;
        console.error("Failed to update class:", error);
        throw new Error("Failed to update class");
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "class.update",
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

  remove: permissionProtectedProcedure(["delete:classes"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const deletedClass = await ctx.db.class.delete({
          where: { id: input.id },
        });
        result = deletedClass;
        success = true;
        return deletedClass;
      } catch (err) {
        error = err as Error;
        success = false;
        console.error("Failed to delete class:", error);
        throw new Error("Failed to delete class");
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "class.remove",
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
  // Cancel class with two modes: session counted or not
  cancel: permissionProtectedProcedure(["update:classes"])
    .input(
      z.object({
        id: z.string(),
        sessionCounted: z.boolean(),
        cancelReason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        result = await ctx.db.class.update({
          where: { id: input.id },
          data: {
            status: "CANCELLED",
            sessionCounted: input.sessionCounted,
            cancelReason: input.cancelReason ?? null,
            cancelledAt: new Date(),
            cancelledBy: ctx.session?.user?.id,
          },
        });
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "class.cancel",
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

  // Public procedure for landing page - no authentication required
  forLandingPage: publicProcedure
    .query(async ({ ctx }) => {
      try {
        // console.log("🔍 Fetching classes for landing page...");
        const now = new Date();
        // console.log("📅 Current time:", now);
        
        // Get date ranges - wider range to ensure we get classes
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekFromNow = new Date(now);
        weekFromNow.setDate(weekFromNow.getDate() + 7);

        // Get all classes from the Class table with classType relation
        const allClasses = await ctx.db.class.findMany({
          where: {
            schedule: {
              gte: weekAgo,
              lte: weekFromNow,
            },
          },
          include: {
            classType: true,
          },
          orderBy: { schedule: "asc" }, // Changed to ascending to get upcoming classes first
          take: 20, // Get more classes to work with
        });

        // console.log(`📊 Found ${allClasses.length} classes from Class table`);
        // allClasses.forEach(cls => {
        //   console.log(`- ${cls.name} by ${cls.instructorName} at ${cls.schedule.toLocaleString()}`);
        // });

        // Get today's date range
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);

        // console.log("🕐 Today range:", todayStart.toLocaleString(), "to", todayEnd.toLocaleString());

        // Get today's classes
        let todayClasses = allClasses.filter(cls => {
          const scheduleDate = new Date(cls.schedule);
          return scheduleDate >= todayStart && scheduleDate <= todayEnd;
        });

        // console.log(`📅 Today's classes: ${todayClasses.length}`);

        // Get upcoming classes (next few days)
        const upcomingClasses = allClasses.filter(cls => {
          const scheduleDate = new Date(cls.schedule);
          return scheduleDate > todayEnd;
        }).slice(0, 4); // Limit upcoming classes

        // console.log(`📅 Upcoming classes: ${upcomingClasses.length}`);

        // Combine today's and upcoming classes
        let classes = [...todayClasses, ...upcomingClasses];
        let isFromYesterday = false;

        // If no classes today or upcoming, get yesterday's classes as fallback
        if (classes.length === 0) {
          const yesterdayStart = new Date(now);
          yesterdayStart.setDate(yesterdayStart.getDate() - 1);
          yesterdayStart.setHours(0, 0, 0, 0);
          const yesterdayEnd = new Date(now);
          yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
          yesterdayEnd.setHours(23, 59, 59, 999);

          // console.log("🕐 Yesterday range:", yesterdayStart.toLocaleString(), "to", yesterdayEnd.toLocaleString());

          classes = allClasses.filter(cls => {
            const scheduleDate = new Date(cls.schedule);
            return scheduleDate >= yesterdayStart && scheduleDate <= yesterdayEnd;
          });

          // console.log(`📅 Yesterday's classes: ${classes.length}`);
          isFromYesterday = true;
        }

        // If still no classes, get any available classes
        if (classes.length === 0) {
          // console.log("📅 No classes found, getting any available classes");
          classes = allClasses.slice(0, 6);
          isFromYesterday = true;
        }

        // Limit to 6 classes for display
        classes = classes.slice(0, 6);

        // Transform class data for landing page display
        const transformedClasses = classes.map(cls => ({
          id: cls.id,
          name: cls.name,
          instructorName: cls.instructorName,
          schedule: cls.schedule,
          duration: cls.duration,
          price: cls.price,
          classType: cls.classType,
        }));

        // console.log(`✅ Returning ${transformedClasses.length} classes, isFromYesterday: ${isFromYesterday}`);

        return {
          classes: transformedClasses,
          isFromYesterday,
        };
      } catch (error) {
        // console.error("❌ Failed to fetch classes for landing page:", error);
        throw new Error("Failed to fetch classes for landing page");
      }
    }),

  // Class attendance summary — combines Class (registered), ClassVisit, and GroupClass attendance
  attendanceSummary: permissionProtectedProcedure(["menu:class-attendance"])
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        search: z.string().optional(),
        instructorName: z.string().optional(),
        type: z.enum(["all", "class", "class_visit", "group_class"]).default("all"),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      type AttendanceRow = {
        id: string;
        type: "CLASS" | "CLASS_VISIT" | "GROUP_CLASS";
        className: string;
        classTypeName: string | null;
        memberName: string;
        memberId: string;
        instructorName: string;
        schedule: Date;
        attended: boolean;
        attendedAt: Date | null;
        status: string;
      };

      const rows: AttendanceRow[] = [];

      // 1. ClassMember (registered members in Class)
      if (input.type === "all" || input.type === "class") {
        const classMembers = await ctx.db.classMember.findMany({
          where: {
            class: {
              schedule: { gte: input.startDate, lte: input.endDate },
              ...(input.instructorName
                ? { instructor: { name: { contains: input.instructorName, mode: "insensitive" as const } } }
                : {}),
            },
            ...(input.search
              ? { member: { user: { name: { contains: input.search, mode: "insensitive" as const } } } }
              : {}),
          },
          include: {
            class: {
              include: {
                classType: { select: { name: true } },
                instructor: { select: { name: true } },
              },
            },
            member: { include: { user: { select: { name: true } } } },
          },
          orderBy: { class: { schedule: "desc" } },
        });

        for (const cm of classMembers) {
          rows.push({
            id: cm.id,
            type: "CLASS",
            className: cm.class.name,
            classTypeName: cm.class.classType?.name ?? null,
            memberName: cm.member.user.name ?? "Unknown",
            memberId: cm.memberId,
            instructorName: cm.class.instructor?.name ?? cm.class.instructorName,
            schedule: cm.class.schedule,
            attended: cm.attended,
            attendedAt: cm.attendedAt,
            status: cm.attended ? "HADIR" : "BELUM",
          });
        }
      }

      // 2. ClassVisitRegistration
      if (input.type === "all" || input.type === "class_visit") {
        const classVisits = await ctx.db.classVisitRegistration.findMany({
          where: {
            class: {
              schedule: { gte: input.startDate, lte: input.endDate },
              ...(input.instructorName
                ? { instructor: { name: { contains: input.instructorName, mode: "insensitive" as const } } }
                : {}),
            },
            status: { in: ["CONFIRMED", "ATTENDED", "NO_SHOW"] },
            ...(input.search
              ? { member: { user: { name: { contains: input.search, mode: "insensitive" as const } } } }
              : {}),
          },
          include: {
            class: {
              include: {
                classType: { select: { name: true } },
                instructor: { select: { name: true } },
              },
            },
            member: { include: { user: { select: { name: true } } } },
          },
          orderBy: { class: { schedule: "desc" } },
        });

        for (const cv of classVisits) {
          rows.push({
            id: cv.id,
            type: "CLASS_VISIT",
            className: cv.class.name,
            classTypeName: cv.class.classType?.name ?? null,
            memberName: cv.member.user.name ?? "Unknown",
            memberId: cv.memberId,
            instructorName: cv.class.instructor?.name ?? cv.class.instructorName,
            schedule: cv.class.schedule,
            attended: cv.status === "ATTENDED",
            attendedAt: cv.status === "ATTENDED" ? cv.updatedAt : null,
            status: cv.status === "ATTENDED" ? "HADIR" : cv.status === "NO_SHOW" ? "TIDAK HADIR" : "TERKONFIRMASI",
          });
        }
      }

      // 3. GroupClassAttendance
      if (input.type === "all" || input.type === "group_class") {
        const groupAttendances = await ctx.db.groupClassAttendance.findMany({
          where: {
            groupClass: {
              schedule: { gte: input.startDate, lte: input.endDate },
              status: { not: "CANCELLED" },
              ...(input.instructorName
                ? { trainer: { user: { name: { contains: input.instructorName, mode: "insensitive" as const } } } }
                : {}),
            },
            ...(input.search
              ? { member: { user: { name: { contains: input.search, mode: "insensitive" as const } } } }
              : {}),
          },
          include: {
            groupClass: {
              include: {
                classType: { select: { name: true } },
                trainer: { include: { user: { select: { name: true } } } },
                groupSubscription: { select: { groupName: true } },
              },
            },
            member: { include: { user: { select: { name: true } } } },
          },
          orderBy: { groupClass: { schedule: "desc" } },
        });

        for (const ga of groupAttendances) {
          rows.push({
            id: ga.id,
            type: "GROUP_CLASS",
            className: ga.groupClass.groupSubscription.groupName ?? "Group Class",
            classTypeName: ga.groupClass.classType?.name ?? null,
            memberName: ga.member.user.name ?? "Unknown",
            memberId: ga.memberId,
            instructorName: ga.groupClass.trainer.user.name ?? "Unknown",
            schedule: ga.groupClass.schedule,
            attended: ga.attended === true,
            attendedAt: ga.attended === true ? ga.attendedAt : null,
            status: ga.attended === true ? "HADIR" : ga.attended === false ? "TIDAK HADIR" : "BELUM",
          });
        }
      }

      // Sort by schedule desc
      rows.sort((a, b) => new Date(b.schedule).getTime() - new Date(a.schedule).getTime());

      const total = rows.length;
      const totalAttended = rows.filter((r) => r.attended).length;
      const start = (input.page - 1) * input.pageSize;
      const items = rows.slice(start, start + input.pageSize);

      return { items, total, totalAttended };
    }),

  // Calendar events: combines Class (class visit) and GroupClass schedules
  calendarEvents: permissionProtectedProcedure(["list:classes"])
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const [classes, groupClasses] = await Promise.all([
        ctx.db.class.findMany({
          where: {
            schedule: { gte: input.startDate, lte: input.endDate },
          },
          include: {
            classType: { select: { name: true, icon: true } },
            instructor: { select: { name: true } },
            _count: { select: { registeredMembers: true, classVisitRegistrations: true } },
          },
          orderBy: { schedule: "asc" },
        }),
        ctx.db.groupClass.findMany({
          where: {
            schedule: { gte: input.startDate, lte: input.endDate },
          },
          include: {
            classType: { select: { name: true, icon: true } },
            trainer: { include: { user: { select: { name: true } } } },
            groupSubscription: { select: { groupName: true } },
            _count: { select: { attendances: true } },
          },
          orderBy: { schedule: "asc" },
        }),
      ]);

      const events = [
        ...classes.map((c) => ({
          id: c.id,
          type: "CLASS_VISIT" as const,
          title: c.name,
          schedule: c.schedule,
          duration: c.duration,
          status: c.status,
          instructorName: c.instructor?.name ?? c.instructorName,
          classTypeName: c.classType?.name ?? null,
          classTypeIcon: c.classType?.icon ?? null,
          groupName: null as string | null,
          memberCount: c._count.registeredMembers + c._count.classVisitRegistrations,
          limit: c.limit,
        })),
        ...groupClasses.map((gc) => ({
          id: gc.id,
          type: "GROUP_CLASS" as const,
          title: gc.groupSubscription.groupName ?? "Group Class",
          schedule: gc.schedule,
          duration: gc.duration,
          status: gc.status,
          instructorName: gc.trainer.user.name ?? "Unknown",
          classTypeName: gc.classType?.name ?? null,
          classTypeIcon: gc.classType?.icon ?? null,
          groupName: gc.groupSubscription.groupName,
          memberCount: gc._count.attendances,
          limit: null as number | null,
        })),
      ];

      events.sort((a, b) => new Date(a.schedule).getTime() - new Date(b.schedule).getTime());

      return events;
    }),
});
