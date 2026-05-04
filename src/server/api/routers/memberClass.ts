import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  permissionProtectedProcedure,
} from "@/server/api/trpc";
import { logApiMutationAsync, extractIpAddress, extractUserAgent } from "@/server/utils/mutationLogger";
import { decrementClassSessionFIFO } from "@/server/utils/ptSubscriptionUtils";
import { toGMT8StartOfDay, toGMT8EndOfDay } from "@/lib/timezone";

export const memberClassRouter = createTRPCRouter({
  list: permissionProtectedProcedure(["list:classes"])
    .input(
      z.object({
        page: z.number().min(1),
        limit: z.number().min(1).max(100),
      }),
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();

      const items = await ctx.db.class.findMany({
        where: {
          schedule: {
            gt: now, // Hanya ambil kelas yang jadwalnya lebih besar dari sekarang
          },
        },
        orderBy: {
          schedule: "asc", // Urutkan berdasarkan jadwal terdekat
        },
        include: {
          registeredMembers: {
            include: {
              member: {
                include: {
                  user: true,
                },
              },
            },
          },
          waitingList: {
            include: {
              member: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
        skip: (input.page - 1) * input.limit,
        take: input.limit,
      });

      const total = await ctx.db.class.count({
        where: {
          schedule: {
            gt: now,
          },
        },
      });

      return {
        items,
        total,
        page: input.page,
        limit: input.limit,
      };
    }),

  register: permissionProtectedProcedure(["create:class-registration"])
    .input(z.object({ classId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const membership = await ctx.db.membership.findUnique({
          where: { userId: ctx.session.user.id },
        });

        if (!membership) {
          throw new Error("You must be a member to register for classes");
        }

        if (!membership.isActive) {
          throw new Error("Your membership is not active");
        }

        const class_ = await ctx.db.class.findUnique({
          where: { id: input.classId },
          include: {
            registeredMembers: true,
          },
        });

        if (!class_) {
          throw new Error("Class not found");
        }

        if (class_.schedule < new Date()) {
          throw new Error("Cannot register for past classes");
        }

        if (class_.limit && class_.registeredMembers.length >= class_.limit) {
          throw new Error("Class is full");
        }

        // Check if already registered
        const existingRegistration = await ctx.db.classMember.findFirst({
          where: {
            classId: input.classId,
            memberId: membership.id,
          },
        });

        if (existingRegistration) {
          throw new Error("You are already registered for this class");
        }

        result = await ctx.db.classMember.create({
          data: {
            classId: input.classId,
            memberId: membership.id,
          },
          include: {
            class: true,
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
          endpoint: "memberClass.register",
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

  joinWaitlist: permissionProtectedProcedure(["create:class-registration"])
    .input(z.object({ classId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const membership = await ctx.db.membership.findUnique({
          where: { userId: ctx.session.user.id },
        });

        if (!membership) {
          throw new Error("You must be a member to join the waitlist");
        }

        if (!membership.isActive) {
          throw new Error("Your membership is not active");
        }

        const class_ = await ctx.db.class.findUnique({
          where: { id: input.classId },
        });

        if (!class_) {
          throw new Error("Class not found");
        }

        if (class_.schedule < new Date()) {
          throw new Error("Cannot join waitlist for past classes");
        }

        // Check if already registered for the class
        const existingRegistration = await ctx.db.classMember.findFirst({
          where: {
            classId: input.classId,
            memberId: membership.id,
          },
        });

        if (existingRegistration) {
          throw new Error("You are already registered for this class");
        }

        // Check if already on waitlist
        const existingWaitlist = await ctx.db.classWaitingList.findFirst({
          where: {
            classId: input.classId,
            memberId: membership.id,
          },
        });

        if (existingWaitlist) {
          throw new Error("You are already on the waitlist for this class");
        }

        result = await ctx.db.classWaitingList.create({
          data: {
            classId: input.classId,
            memberId: membership.id,
          },
          include: {
            class: true,
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
          endpoint: "memberClass.joinWaitlist",
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

  myClasses: permissionProtectedProcedure(["list:classes"]).query(
    async ({ ctx }) => {
      const membership = await ctx.db.membership.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!membership) {
        throw new Error("Membership not found");
      }

      return ctx.db.classMember.findMany({
        where: {
          memberId: membership.id,
          class: {
            schedule: {
              gte: new Date(),
            },
          },
        },
        include: {
          class: true,
        },
        orderBy: {
          class: {
            schedule: "asc",
          },
        },
      });
    },
  ),
  /**
   * Admin: Add any member to a class manually
   * Requires: classId, memberId
   */
  adminAddMember: protectedProcedure
    .input(z.object({ classId: z.string(), memberId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        // Only allow admins (add your own admin check if needed)
        // Example: if (!ctx.session.user.isAdmin) throw new Error("Unauthorized");

        const class_ = await ctx.db.class.findUnique({
          where: { id: input.classId },
          include: { registeredMembers: true },
        });

        if (!class_) {
          throw new Error("Class not found");
        }

        if (class_.schedule < new Date()) {
          throw new Error("Cannot register for past classes");
        }

        if (class_.limit && class_.registeredMembers.length >= class_.limit) {
          throw new Error("Class is full");
        }

        // Check if already registered
        const existingRegistration = await ctx.db.classMember.findFirst({
          where: {
            classId: input.classId,
            memberId: input.memberId,
          },
        });

        if (existingRegistration) {
          throw new Error("Member is already registered for this class");
        }

        result = await ctx.db.classMember.create({
          data: {
            classId: input.classId,
            memberId: input.memberId,
          },
          include: {
            class: true,
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
          endpoint: "memberClass.adminAddMember",
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

  /**
   * Admin: Add multiple members to a class manually
   * Requires: classId, memberIds[]
   */
  adminAddMultipleMembers: protectedProcedure
    .input(z.object({
      classId: z.string(),
      memberIds: z.array(z.string()).min(1)
    }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const class_ = await ctx.db.class.findUnique({
          where: { id: input.classId },
          include: { registeredMembers: true },
        });

        if (!class_) {
          throw new Error("Class not found");
        }

        if (class_.schedule < new Date()) {
          throw new Error("Cannot register for past classes");
        }

        // Check available spots
        const currentCount = class_.registeredMembers.length;
        const availableSpots = class_.limit ? class_.limit - currentCount : Infinity;
        
        if (class_.limit && input.memberIds.length > availableSpots) {
          throw new Error(`Not enough spots available. Only ${availableSpots} spots left.`);
        }

        const results = await Promise.allSettled(
          input.memberIds.map(async (memberId) => {
            // Check if already registered
            const existingRegistration = await ctx.db.classMember.findFirst({
              where: {
                classId: input.classId,
                memberId: memberId,
              },
            });

            if (existingRegistration) {
              return {
                success: false,
                memberId,
                error: "Already registered"
              };
            }

            await ctx.db.classMember.create({
              data: {
                classId: input.classId,
                memberId: memberId,
              },
            });

            return {
              success: true,
              memberId
            };
          })
        );

        const successCount = results.filter(r => r.status === "fulfilled" && r.value.success).length;
        const failedCount = results.length - successCount;

        result = {
          total: results.length,
          successful: successCount,
          failed: failedCount,
          results: results.map(r => r.status === "fulfilled" ? r.value : { success: false, error: "Unknown error" })
        };
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "memberClass.adminAddMultipleMembers",
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
    /**
     * Admin: Remove a member from a class manually
     * Requires: classId, memberId
     */
    adminRemoveMember: protectedProcedure
      .input(z.object({ classId: z.string(), memberId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const startTime = Date.now();
        let success = false;
        let result: any = null;
        let error: Error | null = null;

        try {
          // Only allow admins (add your own admin check if needed)
          // Example: if (!ctx.session.user.isAdmin) throw new Error("Unauthorized");

          const class_ = await ctx.db.class.findUnique({
            where: { id: input.classId },
          });

          if (!class_) {
            throw new Error("Class not found");
          }

          // Check if member is registered
          const existingRegistration = await ctx.db.classMember.findFirst({
            where: {
              classId: input.classId,
              memberId: input.memberId,
            },
          });

          if (!existingRegistration) {
            throw new Error("Member is not registered for this class");
          }

          await ctx.db.classMember.delete({
            where: { id: existingRegistration.id },
          });

          result = { success: true };
          success = true;
          return result;
        } catch (err) {
          error = err as Error;
          success = false;
          throw err;
        } finally {
          logApiMutationAsync({
            db: ctx.db,
            endpoint: "memberClass.adminRemoveMember",
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
      /**
           * Member: Cancel their own registration from a class
           * Requires: classId
           */
      cancelRegistration: protectedProcedure
      .input(z.object({ classId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const membership = await ctx.db.membership.findUnique({
          where: { userId: ctx.session.user.id },
        });

        if (!membership) {
          throw new Error("Membership not found");
        }

        // Check if registered
        const existingRegistration = await ctx.db.classMember.findFirst({
          where: {
            classId: input.classId,
            memberId: membership.id,
          },
        });

        if (!existingRegistration) {
          throw new Error("You are not registered for this class");
        }

        await ctx.db.classMember.delete({
          where: { id: existingRegistration.id },
        });

        return { success: true };
      }),
      /**
       * Admin: Add a trial member to a class manually with just a name
       * Requires: classId, memberName
       */
      adminAddTrialMember: protectedProcedure
        .input(z.object({ classId: z.string(), memberName: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
          // Only allow admins (add your own admin check if needed)
          // Example: if (!ctx.session.user.isAdmin) throw new Error("Unauthorized");

          const class_ = await ctx.db.class.findUnique({
            where: { id: input.classId },
            include: { registeredMembers: true },
          });

          if (!class_) {
            throw new Error("Class not found");
          }

          if (class_.schedule < new Date()) {
            throw new Error("Cannot register for past classes");
          }

          if (class_.limit && class_.registeredMembers.length >= class_.limit) {
            throw new Error("Class is full");
          }

          // Create a temporary user and membership for trial member
          const trialUser = await ctx.db.user.create({
            data: {
              name: input.memberName.trim(),
              email: null,
              phone: null,
            },
          });

          const trialMembership = await ctx.db.membership.create({
            data: {
              userId: trialUser.id,
              registerDate: new Date(),
              isActive: false, // Trial members don't have active memberships
              createdBy: ctx.session.user.id,
            },
          });

          // Register the trial member to the class
          return ctx.db.classMember.create({
            data: {
              classId: input.classId,
              memberId: trialMembership.id,
            },
            include: {
              class: true,
              member: {
                include: {
                  user: true,
                },
              },
            },
          });
        }),

  /**
   * Report: Get member count for each class
   * Returns class information with registered member count and waitlist count
   */
  reportClassMemberCount: permissionProtectedProcedure(["list:classes"])
    .input(
      z.object({
        page: z.number().min(1).optional().default(1),
        limit: z.number().min(1).max(100).optional().default(50),
        includePast: z.boolean().optional().default(false),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      let whereClause: any = {};
      
      // Handle date filtering
      if (input.startDate || input.endDate) {
        whereClause.schedule = {};
        if (input.startDate) {
          whereClause.schedule.gte = input.startDate;
        }
        if (input.endDate) {
          whereClause.schedule.lte = input.endDate;
        }
      } else if (!input.includePast) {
        whereClause.schedule = { gt: new Date() };
      }

      const [classes, total] = await Promise.all([
        ctx.db.class.findMany({
          where: whereClause,
          include: {
            _count: {
              select: {
                registeredMembers: true,
                waitingList: true,
              },
            },
          },
          orderBy: {
            schedule: "asc",
          },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        }),
        ctx.db.class.count({
          where: whereClause,
        }),
      ]);

      return {
        items: classes.map((classItem) => ({
          id: classItem.id,
          name: classItem.name,
          schedule: classItem.schedule,
          limit: classItem.limit,
          registeredCount: classItem._count.registeredMembers,
          waitlistCount: classItem._count.waitingList,
          availableSpots: classItem.limit ? classItem.limit - classItem._count.registeredMembers : null,
        })),
        total,
        page: input.page,
        limit: input.limit,
      };
    }),

  /**
   * Export class member report to Excel
   */
  exportClassMemberReport: permissionProtectedProcedure(["list:classes"])
    .input(
      z.object({
        includePast: z.boolean().optional().default(false),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const XLSX = await import("xlsx");
        
        let whereClause: any = {};
        
        // Handle date filtering (same logic as reportClassMemberCount)
        if (input.startDate || input.endDate) {
          whereClause.schedule = {};
          if (input.startDate) {
            whereClause.schedule.gte = input.startDate;
          }
          if (input.endDate) {
            whereClause.schedule.lte = input.endDate;
          }
        } else if (!input.includePast) {
          whereClause.schedule = { gt: new Date() };
        }

        const classes = await ctx.db.class.findMany({
          where: whereClause,
          include: {
            _count: {
              select: {
                registeredMembers: true,
                waitingList: true,
              },
            },
            registeredMembers: {
              include: {
                member: {
                  include: {
                    user: true,
                  },
                },
              },
            },
            waitingList: {
              include: {
                member: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
          orderBy: {
            schedule: "asc",
          },
        });

        // Prepare summary data for Excel export
        const summaryData = classes.map((classItem) => ({
          'Class Name': classItem.name,
          'Schedule Date': classItem.schedule.toLocaleDateString(),
          'Schedule Time': classItem.schedule.toLocaleTimeString(),
          'Class Limit': classItem.limit || 'Unlimited',
          'Registered Members': classItem._count.registeredMembers,
          'Waitlist Count': classItem._count.waitingList,
          'Available Spots': classItem.limit ? classItem.limit - classItem._count.registeredMembers : 'Unlimited',
          'Status': classItem.schedule > new Date() ? 'Upcoming' : 'Past',
        }));

        // Prepare detailed member data
        const memberDetailData: any[] = [];
        
        classes.forEach((classItem) => {
          // Add registered members
          classItem.registeredMembers.forEach((registration) => {
            memberDetailData.push({
              'Member Name': registration.member.user.name || 'N/A',
              'Member Email': registration.member.user.email || 'N/A',
              'Member Phone': registration.member.user.phone || 'N/A',
              'Class Name': classItem.name,
              'Schedule Date': classItem.schedule.toLocaleDateString(),
              'Schedule Time': classItem.schedule.toLocaleTimeString(),
              'Registration Status': 'Registered',
              'Registration Type': 'Member',
            });
          });

          // Add waitlist members
          classItem.waitingList.forEach((waitlist) => {
            memberDetailData.push({
              'Member Name': waitlist.member.user.name || 'N/A',
              'Member Email': waitlist.member.user.email || 'N/A',
              'Member Phone': waitlist.member.user.phone || 'N/A',
              'Class Name': classItem.name,
              'Schedule Date': classItem.schedule.toLocaleDateString(),
              'Schedule Time': classItem.schedule.toLocaleTimeString(),
              'Registration Status': 'Waitlist',
              'Registration Type': 'Member',
            });
          });
        });

        // Create workbook and worksheets
        const workbook = XLSX.utils.book_new();
        
        // Summary sheet
        const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Class Summary");

        // Member details sheet
        if (memberDetailData.length > 0) {
          const memberWorksheet = XLSX.utils.json_to_sheet(memberDetailData);
          XLSX.utils.book_append_sheet(workbook, memberWorksheet, "Member Details");
        }

        // Generate Excel file buffer
        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

        // Generate filename with date range
        let filename = "class-member-report";
        if (input.startDate && input.endDate) {
          const startStr = input.startDate.toISOString().split('T')[0];
          const endStr = input.endDate.toISOString().split('T')[0];
          filename += `-${startStr}-to-${endStr}`;
        } else if (input.startDate) {
          filename += `-from-${input.startDate.toISOString().split('T')[0]}`;
        } else if (input.endDate) {
          filename += `-until-${input.endDate.toISOString().split('T')[0]}`;
        } else {
          filename += `-${new Date().toISOString().split('T')[0]}`;
        }
        filename += ".xlsx";

        result = {
          buffer: Array.from(buffer),
          filename,
        };
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw err;
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "memberClass.exportClassMemberReport",
          method: "POST",
          userId: ctx.session?.user?.id,
          requestData: input,
          responseData: success ? { filename: result?.filename } : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),

  // ─── Class Session Check-in Endpoints ─────────────────────────────

  /**
   * Determine check-in mode for a member after QR scan.
   * Returns gym, class, gym_class (both), or none.
   */
  getCheckInMode: protectedProcedure
    .input(z.object({ memberId: z.string() }))
    .query(async ({ ctx, input }) => {
      // 1. Check for active GYM_MEMBERSHIP
      const gymSub = await ctx.db.subscription.findFirst({
        where: {
          memberId: input.memberId,
          isActive: true,
          deletedAt: null,
          package: { type: "GYM_MEMBERSHIP" },
        },
        select: { id: true },
      });

      // 2. Check for active CLASS_SESSION with remaining sessions
      const classSub = await ctx.db.subscription.findFirst({
        where: {
          memberId: input.memberId,
          isActive: true,
          deletedAt: null,
          package: { type: "CLASS_SESSION" },
          OR: [
            { remainingSessions: { gt: 0 } },
            { remainingBonusSessions: { gt: 0 } },
          ],
        },
        select: {
          id: true,
          remainingSessions: true,
          remainingBonusSessions: true,
          package: { select: { name: true } },
        },
      });

      if (gymSub && classSub) {
        return {
          mode: "gym_class" as const,
          subscription: classSub,
        };
      }

      if (gymSub) {
        return { mode: "gym" as const };
      }

      if (classSub) {
        return {
          mode: "class" as const,
          subscription: classSub,
        };
      }

      return { mode: "none" as const };
    }),

  /**
   * Get classes available today for class session check-in.
   */
  getAvailableClassesToday: protectedProcedure
    .input(z.object({ memberId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Server runs in UTC; shift to GMT+8 so the helper gets the correct local date
      const now = new Date();
      const gmt8Now = new Date(now.getTime() + 8 * 60 * 60 * 1000);
      const startOfDay = toGMT8StartOfDay(gmt8Now);
      const endOfDay = toGMT8EndOfDay(gmt8Now);

      const classes = await ctx.db.class.findMany({
        where: {
          schedule: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          classType: true,
          registeredMembers: {
            select: { id: true, memberId: true, attended: true },
          },
        },
        orderBy: { schedule: "asc" },
      });

      return classes.map((cls) => ({
        id: cls.id,
        name: cls.name,
        classType: cls.classType?.name || null,
        instructorName: cls.instructorName,
        schedule: cls.schedule,
        duration: cls.duration,
        limit: cls.limit,
        registeredCount: cls.registeredMembers.length,
        isFull: cls.limit ? cls.registeredMembers.length >= cls.limit : false,
        isAlreadyRegistered: cls.registeredMembers.some(
          (m) => m.memberId === input.memberId,
        ),
        isAlreadyAttended: cls.registeredMembers.some(
          (m) => m.memberId === input.memberId && m.attended,
        ),
      }));
    }),

  /**
   * Class session check-in: pick a class today → decrement session → register + mark attended.
   */
  classCheckIn: protectedProcedure
    .input(
      z.object({
        memberId: z.string(),
        classId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;

      try {
        // Verify class exists and is today
        const cls = await ctx.db.class.findUnique({
          where: { id: input.classId },
          include: {
            registeredMembers: { select: { memberId: true } },
          },
        });

        if (!cls) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
        }

        // Check class is not full
        if (cls.limit && cls.registeredMembers.length >= cls.limit) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Class is full" });
        }

        // Check member not already registered for this class
        const alreadyRegistered = cls.registeredMembers.some(
          (m) => m.memberId === input.memberId,
        );
        if (alreadyRegistered) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Member sudah terdaftar di class ini",
          });
        }

        // Transaction: decrement session + register + mark attended
        result = await ctx.db.$transaction(async (tx) => {
          const fifoResult = await decrementClassSessionFIFO({
            tx,
            memberId: input.memberId,
          });

          const classMember = await tx.classMember.create({
            data: {
              classId: input.classId,
              memberId: input.memberId,
              subscriptionId: fifoResult.id,
              attended: true,
              attendedAt: new Date(),
            },
          });

          return {
            classMember,
            subscriptionId: fifoResult.id,
            remainingSessions: fifoResult.remainingSessions,
            remainingBonusSessions: fifoResult.remainingBonusSessions,
            isBonusSession: fifoResult.isBonusSession,
          };
        });

        success = true;
        return result;
      } catch (error: any) {
        success = false;
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to check in to class",
        });
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "memberClass.classCheckIn",
          method: "POST",
          userId: ctx.session.user.id,
          requestData: input,
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: success ? null : "Failed to class check-in",
          duration: Date.now() - startTime,
        });
      }
    }),

  /**
   * Stats for admin dashboard: active class session subscriptions count & total revenue.
   */
  getClassSessionStats: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const start = input.startDate ? toGMT8StartOfDay(input.startDate) : undefined;
      const end = input.endDate ? toGMT8EndOfDay(input.endDate) : undefined;

      // Count active class session subscriptions
      const activeCount = await ctx.db.subscription.count({
        where: {
          isActive: true,
          deletedAt: null,
          package: { type: "CLASS_SESSION" },
        },
      });

      // Total revenue from CLASS_SESSION payments
      const revenueResult = await ctx.db.payment.aggregate({
        where: {
          deletedAt: null,
          status: "SUCCESS",
          subscription: {
            deletedAt: null,
            package: { type: "CLASS_SESSION" },
          },
          ...(start && end
            ? { createdAt: { gte: start, lte: end } }
            : {}),
        },
        _sum: { totalPayment: true },
        _count: true,
      });

      return {
        activeSubscriptions: activeCount,
        totalRevenue: revenueResult._sum.totalPayment || 0,
        totalTransactions: revenueResult._count,
      };
    }),

  /**
   * Report: class session usage per member.
   */
  getClassSessionReport: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const start = input.startDate ? toGMT8StartOfDay(input.startDate) : undefined;
      const end = input.endDate ? toGMT8EndOfDay(input.endDate) : undefined;

      // Get all CLASS_SESSION subscriptions
      const subscriptions = await ctx.db.subscription.findMany({
        where: {
          deletedAt: null,
          package: { type: "CLASS_SESSION" },
        },
        include: {
          member: {
            include: { user: { select: { name: true, email: true } } },
          },
          package: { select: { name: true, sessions: true, bonusSessions: true } },
          classMembers: {
            where: {
              attended: true,
              ...(start && end
                ? { attendedAt: { gte: start, lte: end } }
                : {}),
            },
            include: {
              class: {
                select: { name: true, schedule: true, instructorName: true },
              },
            },
            orderBy: { attendedAt: "desc" },
          },
        },
        orderBy: { startDate: "desc" },
      });

      return subscriptions.map((sub) => {
        const totalPaid = sub.package.sessions || 0;
        const totalBonus = sub.bonusSessions || 0;
        const remainPaid = sub.remainingSessions || 0;
        const remainBonus = sub.remainingBonusSessions || 0;
        const totalAll = totalPaid + totalBonus;
        const remainAll = remainPaid + remainBonus;
        const usedAll = Math.max(0, totalAll - remainAll);

        return {
        subscriptionId: sub.id,
        memberName: sub.member.user?.name || "Unknown",
        memberEmail: sub.member.user?.email || "",
        memberId: sub.memberId,
        packageName: sub.package.name,
        totalSessions: totalAll,
        usedSessions: usedAll,
        remainingSessions: remainAll,
        isActive: sub.isActive,
        startDate: sub.startDate,
        endDate: sub.endDate,
        classHistory: sub.classMembers.map((cm) => ({
          className: cm.class.name,
          instructor: cm.class.instructorName,
          schedule: cm.class.schedule,
          attendedAt: cm.attendedAt,
        })),
      };
      });
    }),
});
