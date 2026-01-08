import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  permissionProtectedProcedure,
} from "@/server/api/trpc";

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

      return ctx.db.classMember.create({
        data: {
          classId: input.classId,
          memberId: membership.id,
        },
        include: {
          class: true,
        },
      });
    }),

  joinWaitlist: permissionProtectedProcedure(["create:class-registration"])
    .input(z.object({ classId: z.string() }))
    .mutation(async ({ ctx, input }) => {
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

      return ctx.db.classWaitingList.create({
        data: {
          classId: input.classId,
          memberId: membership.id,
        },
        include: {
          class: true,
        },
      });
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

      return ctx.db.classMember.create({
        data: {
          classId: input.classId,
          memberId: input.memberId,
        },
        include: {
          class: true,
        },
          
      });
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

      return {
        total: results.length,
        successful: successCount,
        failed: failedCount,
        results: results.map(r => r.status === "fulfilled" ? r.value : { success: false, error: "Unknown error" })
      };
    }),
    /**
     * Admin: Remove a member from a class manually
     * Requires: classId, memberId
     */
    adminRemoveMember: protectedProcedure
      .input(z.object({ classId: z.string(), memberId: z.string() }))
      .mutation(async ({ ctx, input }) => {
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

        return { success: true };
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

      return {
        buffer: Array.from(buffer),
        filename,
      };
    }),
});
