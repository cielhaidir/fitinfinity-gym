import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  permissionProtectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { createClassSchema, createBulkClassSchema } from "@/app/(authenticated)/management/class/schema";

export const classRouter = createTRPCRouter({
  create: permissionProtectedProcedure(["create:classes"])
    .input(createClassSchema)
    .mutation(async ({ ctx, input }) => {
      console.log("Creating class with input:", input); // Debug log
      try {
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
            schedule: input.schedule,
            duration: input.duration,
            price: input.price,
          },
          include: {
            classType: true,
          },
        });
        return newClass;
      } catch (error) {
        console.error("Failed to create class:", error);
        throw new Error("Failed to create class");
      }
    }),

  createBulk: permissionProtectedProcedure(["create:classes"])
    .input(createBulkClassSchema)
    .mutation(async ({ ctx, input }) => {
      console.log("Creating bulk classes with input:", input); // Debug log
      try {
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
                schedule: schedule,
                duration: classData.duration,
                price: classData.price,
              },
              include: {
                classType: true,
              },
            })
          )
        );
        
        return createdClasses;
      } catch (error) {
        console.error("Failed to create bulk classes:", error);
        throw new Error("Failed to create bulk classes");
      }
    }),

  list: permissionProtectedProcedure(["list:classes"])
    .input(
      z.object({
        page: z.number().min(1),
        limit: z.number().min(1),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, search } = input;
      const skip = (page - 1) * limit;

      try {
        // Calculate date threshold - exclude classes older than 1 day
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        oneDayAgo.setHours(0, 0, 0, 0); // Set to start of yesterday

        const whereConditions: any = {
          schedule: {
            gte: oneDayAgo, // Only show classes from yesterday onwards
          },
        };

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
            },
            orderBy: { createdAt: "desc" },
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
      const { id, ...data } = input;
      try {
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
            schedule: data.schedule,
            duration: data.duration,
          },
          include: {
            classType: true,
          },
        });
        return updatedClass;
      } catch (error) {
        console.error("Failed to update class:", error);
        throw new Error("Failed to update class");
      }
    }),

  remove: permissionProtectedProcedure(["delete:classes"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const deletedClass = await ctx.db.class.delete({
          where: { id: input.id },
        });
        return deletedClass;
      } catch (error) {
        console.error("Failed to delete class:", error);
        throw new Error("Failed to delete class");
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
});
