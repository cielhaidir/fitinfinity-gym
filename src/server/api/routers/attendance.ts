import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  permissionProtectedProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import * as XLSX from "xlsx";
import { logApiMutationAsync, extractIpAddress, extractUserAgent } from "@/server/utils/mutationLogger";

export const attendanceRouter = createTRPCRouter({
  getAllHistory: permissionProtectedProcedure(["list:employees"])
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).default(20),
        search: z.string().optional(),
        searchType: z.enum(["employee", "device", "fingerprint"]).default("employee"),
        attendanceType: z.enum(["all", "checkin", "checkout"]).default("all"),
      })
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate, page, limit, search, searchType, attendanceType } = input;
      const skip = (page - 1) * limit;

      // Build where clause
      let where: any = {};

      // Date filter
      if (startDate && endDate) {
        where.date = {
          gte: startDate,
          lte: endDate,
        };
      }

      // Search filter
      if (search) {
        switch (searchType) {
          case "employee":
            where.employee = {
              user: {
                name: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            };
            break;
          case "device":
            where.deviceId = {
              contains: search,
              mode: "insensitive",
            };
            break;
          case "fingerprint":
            where.employee = {
              fingerprintId: parseInt(search) || undefined,
            };
            break;
        }
      }

      // Attendance type filter
      if (attendanceType === "checkin") {
        where.NOT = [{ checkIn: null }];
        where.checkOut = null;
      } else if (attendanceType === "checkout") {
        where.NOT = [{ checkOut: null }];
      }

      const [items, total] = await Promise.all([
        ctx.db.attendance.findMany({
          where,
          skip,
          take: limit,
          include: {
            employee: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: {
            date: "desc",
          },
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

  exportToExcel: permissionProtectedProcedure(["list:employees"])
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        search: z.string().optional(),
        searchType: z.enum(["employee", "device", "fingerprint"]).default("employee"),
        attendanceType: z.enum(["all", "checkin", "checkout"]).default("all"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const { startDate, endDate, search, searchType, attendanceType } = input;

        // Build where clause (same as getAllHistory)
        let where: any = {};

        if (startDate && endDate) {
          where.date = {
            gte: startDate,
            lte: endDate,
          };
        }

        if (search) {
          switch (searchType) {
            case "employee":
              where.employee = {
                user: {
                  name: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              };
              break;
            case "device":
              where.deviceId = {
                contains: search,
                mode: "insensitive",
              };
              break;
            case "fingerprint":
              where.employee = {
                fingerprintId: parseInt(search) || undefined,
              };
              break;
          }
        }

        if (attendanceType === "checkin") {
          where.NOT = [{ checkIn: null }];
          where.checkOut = null;
        } else if (attendanceType === "checkout") {
          where.NOT = [{ checkOut: null }];
        }

        // Get all records for export (no pagination)
        const records = await ctx.db.attendance.findMany({
          where,
          include: {
            employee: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: {
            date: "desc",
          },
        });

        // Prepare attendance data for Excel
        const attendanceData = records.map((record) => ({
          "Employee Name": record.employee.user.name,
          "Employee Email": record.employee.user.email,
          "Fingerprint ID": record.employee.fingerprintId || "-",
          "Date": record.checkIn ? record.checkIn.toLocaleDateString("id-ID") : record.date.toLocaleDateString("id-ID"),
          "Check In": record.checkIn ? record.checkIn.toLocaleString("id-ID") : "-",
          "Check Out": record.checkOut ? record.checkOut.toLocaleString("id-ID") : "-",
          "Device ID": record.deviceId || "-",
          "Status": record.checkOut ? "Complete" : "Checked In",
          "Duration (Hours)": record.checkOut && record.checkIn
            ? ((record.checkOut.getTime() - record.checkIn.getTime()) / (1000 * 60 * 60)).toFixed(2)
            : "-",
        }));

        // Get summary data for export
        const summaryData = records.reduce((acc, record) => {
          const employeeId = record.employee.id;
          const employeeName = record.employee.user.name || "Unknown Employee";

          if (!acc[employeeId]) {
            acc[employeeId] = {
              "Employee No": employeeId.slice(-8),
              "Employee Name": employeeName,
              "Total Attendance": 0,
              "Total Hours": 0,
            };
          }

          acc[employeeId]!["Total Attendance"]++;

          if (record.checkIn && record.checkOut) {
            const hours = (record.checkOut.getTime() - record.checkIn.getTime()) / (1000 * 60 * 60);
            acc[employeeId]!["Total Hours"] += hours;
          }

          return acc;
        }, {} as Record<string, { "Employee No": string; "Employee Name": string; "Total Attendance": number; "Total Hours": number }>);

        // Convert summary to array and round hours
        const summaryArray = Object.values(summaryData).map(summary => ({
          ...summary,
          "Total Hours": Math.round(summary["Total Hours"] * 100) / 100,
        }));

        // Sort by employee name
        summaryArray.sort((a, b) => a["Employee Name"].localeCompare(b["Employee Name"]));

        // Create workbook
        const workbook = XLSX.utils.book_new();
        
        // Create attendance records worksheet
        const attendanceWorksheet = XLSX.utils.json_to_sheet(attendanceData);
        const attendanceColWidths = Object.keys(attendanceData[0] || {}).map((key) => ({
          wch: Math.max(key.length, 15),
        }));
        attendanceWorksheet["!cols"] = attendanceColWidths;
        XLSX.utils.book_append_sheet(workbook, attendanceWorksheet, "Attendance Records");

        // Create employee summary worksheet
        if (summaryArray.length > 0) {
          const summaryWorksheet = XLSX.utils.json_to_sheet(summaryArray);
          const summaryColWidths = Object.keys(summaryArray[0]!).map((key) => ({
            wch: Math.max(key.length, 15),
          }));
          summaryWorksheet["!cols"] = summaryColWidths;
          XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Employee Summary");
        }

        // Generate buffer
        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

        // Generate filename
        const dateRange = startDate && endDate
          ? `_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}`
          : "";
        const filename = `attendance_records${dateRange}_${new Date().toISOString().split('T')[0]}.xlsx`;

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
          endpoint: "attendance.exportToExcel",
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

  getStats: permissionProtectedProcedure(["list:employees"])
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate } = input;

      let where: any = {};
      if (startDate && endDate) {
        where.date = {
          gte: startDate,
          lte: endDate,
        };
      }

      const [totalRecords, checkedInOnly, completedRecords, uniqueEmployees] = await Promise.all([
        ctx.db.attendance.count({ where }),
        ctx.db.attendance.count({
          where: {
            ...where,
            checkIn: {
              not: null,
            },
            checkOut: {
              equals: null,
            },
          },
        }),
        
        ctx.db.attendance.count({
          where: {
            ...where,
            checkOut: {
              not: null,
            },
          },
        }),
        ctx.db.attendance.groupBy({
          by: ["employeeId"],
          where,
          _count: true,
        }),
      ]);

      return {
        totalRecords,
        checkedInOnly,
        completedRecords,
        uniqueEmployees: uniqueEmployees.length,
      };
    }),

  getSummary: permissionProtectedProcedure(["list:employees"])
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        search: z.string().optional(),
        searchType: z.enum(["employee", "device", "fingerprint"]).default("employee"),
      })
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate, search, searchType } = input;

      // Build where clause for filtering
      let where: any = {};

      // Date filter
      if (startDate && endDate) {
        where.date = {
          gte: startDate,
          lte: endDate,
        };
      }

      // Search filter
      if (search) {
        switch (searchType) {
          case "employee":
            where.employee = {
              user: {
                name: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            };
            break;
          case "device":
            where.deviceId = {
              contains: search,
              mode: "insensitive",
            };
            break;
          case "fingerprint":
            where.employee = {
              fingerprintId: parseInt(search) || undefined,
            };
            break;
        }
      }

      // Get attendance data grouped by employee
      const attendanceRecords = await ctx.db.attendance.findMany({
        where,
        include: {
          employee: {
            include: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          date: "desc",
        },
      });

      // Group and summarize data by employee
      const employeeSummary = attendanceRecords.reduce((acc, record) => {
        const employeeId = record.employee.id;
        const employeeName = record.employee.user.name || "Unknown Employee";

        if (!acc[employeeId]) {
          acc[employeeId] = {
            no: employeeId.slice(-8), // Use last 8 characters of ID as employee number
            employeeName,
            totalAttendance: 0,
            totalHours: 0,
          };
        }

        // Count attendance (each record is one attendance day)
        acc[employeeId]!.totalAttendance++;

        // Calculate hours if both check-in and check-out exist
        if (record.checkIn && record.checkOut) {
          const hours = (record.checkOut.getTime() - record.checkIn.getTime()) / (1000 * 60 * 60);
          acc[employeeId]!.totalHours += hours;
        }

        return acc;
      }, {} as Record<string, { no: string; employeeName: string; totalAttendance: number; totalHours: number }>);

      // Convert to array and round hours
      const summaryArray = Object.values(employeeSummary).map(summary => ({
        ...summary,
        totalHours: Math.round(summary.totalHours * 100) / 100, // Round to 2 decimal places
      }));

      // Sort by employee name
      summaryArray.sort((a, b) => {
        return a.employeeName.localeCompare(b.employeeName);
      });

      return summaryArray;
    }),
});
