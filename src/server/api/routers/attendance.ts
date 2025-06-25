import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  permissionProtectedProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import * as XLSX from "xlsx";

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

      // Prepare data for Excel
      const excelData = records.map((record) => ({
        "Employee Name": record.employee.user.name,
        "Employee Email": record.employee.user.email,
        "Fingerprint ID": record.employee.fingerprintId || "-",
        "Date": record.date.toLocaleDateString("id-ID"),
        "Check In": record.checkIn ? record.checkIn.toLocaleString("id-ID") : "-",
        "Check Out": record.checkOut ? record.checkOut.toLocaleString("id-ID") : "-",
        "Device ID": record.deviceId || "-",
        "Status": record.checkOut ? "Complete" : "Checked In",
        "Duration (Hours)": record.checkOut && record.checkIn 
          ? ((record.checkOut.getTime() - record.checkIn.getTime()) / (1000 * 60 * 60)).toFixed(2)
          : "-",
      }));

      // Create workbook
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Auto-size columns
      const colWidths = Object.keys(excelData[0] || {}).map((key) => ({
        wch: Math.max(key.length, 15),
      }));
      worksheet["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Records");

      // Generate buffer
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      // Generate filename
      const dateRange = startDate && endDate 
        ? `_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}`
        : "";
      const filename = `attendance_records${dateRange}_${new Date().toISOString().split('T')[0]}.xlsx`;

      return {
        buffer: Array.from(buffer),
        filename,
      };
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
            NOT: [{ checkIn: null }],
            checkOut: null,
          },
        }),
        ctx.db.attendance.count({
          where: {
            ...where,
            NOT: [{ checkOut: null }],
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
});
