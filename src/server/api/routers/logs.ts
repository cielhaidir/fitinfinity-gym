import { z } from "zod";
import { createTRPCRouter, permissionProtectedProcedure } from "@/server/api/trpc";
import * as fs from "fs";
import * as path from "path";
import { logApiMutation, extractIpAddress, extractUserAgent } from "@/server/utils/mutationLogger";

const logsDirectory = path.resolve("logs");

export const logsRouter = createTRPCRouter({
  // List all log files
  listFiles: permissionProtectedProcedure(["list:logs"])
    .query(async () => {
      try {
        if (!fs.existsSync(logsDirectory)) {
          return [];
        }

        const files = fs.readdirSync(logsDirectory);
        const logFiles = files
          .filter(file => file.endsWith('.log'))
          .map(file => {
            const filePath = path.join(logsDirectory, file);
            const stats = fs.statSync(filePath);
            return {
              name: file,
              size: stats.size,
              modified: stats.mtime,
              created: stats.birthtime,
            };
          })
          .sort((a, b) => b.modified.getTime() - a.modified.getTime());

        return logFiles;
      } catch (error) {
        console.error('Error listing log files:', error);
        return [];
      }
    }),

  // Read log file with pagination
  readLog: permissionProtectedProcedure(["list:logs"])
    .input(
      z.object({
        filename: z.string(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(1000).default(20),
        search: z.string().optional(),
        level: z.enum(['INFO', 'ERROR', 'WARN', 'ALL']).default('ALL'),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const filePath = path.join(logsDirectory, input.filename);
        
        // Security check: ensure file is within logs directory
        const resolvedPath = path.resolve(filePath);
        if (!resolvedPath.startsWith(logsDirectory)) {
          throw new Error('Invalid file path');
        }

        if (!fs.existsSync(filePath)) {
          throw new Error('Log file not found');
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        let lines = content.split('\n').filter(line => line.trim());

        // Filter by log level
        if (input.level !== 'ALL') {
          lines = lines.filter(line => line.includes(input.level));
        }

        // Filter by search term
        if (input.search) {
          const searchLower = input.search.toLowerCase();
          lines = lines.filter(line =>
            line.toLowerCase().includes(searchLower)
          );
        }

        // Filter by date range
        if (input.startDate || input.endDate) {
          lines = lines.filter(line => {
            // Extract timestamp from log line: [YYYY-MM-DD HH:mm:ss]
            const timestampMatch = line.match(/\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]/);
            if (!timestampMatch || !timestampMatch[1]) return false;

            const logDate = new Date(timestampMatch[1]);
            
            // Check if date is within range
            if (input.startDate && logDate < input.startDate) return false;
            if (input.endDate) {
              // Set end date to end of day (23:59:59)
              const endOfDay = new Date(input.endDate);
              endOfDay.setHours(23, 59, 59, 999);
              if (logDate > endOfDay) return false;
            }
            
            return true;
          });
        }

        // Reverse to show newest first
        lines = lines.reverse();

        // Pagination
        const total = lines.length;
        const start = (input.page - 1) * input.limit;
        const end = start + input.limit;
        const paginatedLines = lines.slice(start, end);

        return {
          lines: paginatedLines,
          total,
          page: input.page,
          limit: input.limit,
          totalPages: Math.ceil(total / input.limit),
        };
      } catch (error) {
        console.error('Error reading log file:', error);
        throw error;
      }
    }),

  // Search across all log files
  searchAll: permissionProtectedProcedure(["list:logs"])
    .input(
      z.object({
        query: z.string().min(1),
        level: z.enum(['INFO', 'ERROR', 'WARN', 'ALL']).default('ALL'),
        limit: z.number().min(1).max(500).default(100),
      })
    )
    .query(async ({ input }) => {
      try {
        if (!fs.existsSync(logsDirectory)) {
          return [];
        }

        const files = fs.readdirSync(logsDirectory)
          .filter(file => file.endsWith('.log'));

        const results: Array<{
          file: string;
          line: string;
          lineNumber: number;
        }> = [];

        const searchLower = input.query.toLowerCase();

        for (const file of files) {
          const filePath = path.join(logsDirectory, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const lines = content.split('\n');

          lines.forEach((line, index) => {
            if (!line.trim()) return;
            
            // Filter by level
            if (input.level !== 'ALL' && !line.includes(input.level)) {
              return;
            }

            // Filter by search query
            if (line.toLowerCase().includes(searchLower)) {
              results.push({
                file,
                line,
                lineNumber: index + 1,
              });
            }
          });
        }

        // Sort by most recent (assuming timestamp at start of line)
        results.sort((a, b) => b.lineNumber - a.lineNumber);

        return results.slice(0, input.limit);
      } catch (error) {
        console.error('Error searching logs:', error);
        return [];
      }
    }),

  // Get log statistics
  getStats: permissionProtectedProcedure(["list:logs"])
    .query(async () => {
      try {
        if (!fs.existsSync(logsDirectory)) {
          return {
            totalFiles: 0,
            totalSize: 0,
            logCounts: {},
          };
        }

        const files = fs.readdirSync(logsDirectory)
          .filter(file => file.endsWith('.log'));

        let totalSize = 0;
        const logCounts: Record<string, { info: number; error: number; warn: number; total: number }> = {};

        for (const file of files) {
          const filePath = path.join(logsDirectory, file);
          const stats = fs.statSync(filePath);
          totalSize += stats.size;

          const content = fs.readFileSync(filePath, 'utf-8');
          const lines = content.split('\n').filter(line => line.trim());

          const info = lines.filter(line => line.includes('INFO')).length;
          const error = lines.filter(line => line.includes('ERROR')).length;
          const warn = lines.filter(line => line.includes('WARN')).length;

          logCounts[file] = {
            info,
            error,
            warn,
            total: lines.length,
          };
        }

        return {
          totalFiles: files.length,
          totalSize,
          logCounts,
        };
      } catch (error) {
        console.error('Error getting log stats:', error);
        return {
          totalFiles: 0,
          totalSize: 0,
          logCounts: {},
        };
      }
    }),

  // Delete old logs
  deleteLog: permissionProtectedProcedure(["delete:logs"])
    .input(z.object({ filename: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result;
      let error: Error | null = null;

      try {
        const filePath = path.join(logsDirectory, input.filename);
        
        // Security check
        const resolvedPath = path.resolve(filePath);
        if (!resolvedPath.startsWith(logsDirectory)) {
          throw new Error('Invalid file path');
        }

        if (!fs.existsSync(filePath)) {
          throw new Error('Log file not found');
        }

        fs.unlinkSync(filePath);
        result = { success: true, message: `Deleted ${input.filename}` };
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        console.error('Error deleting log file:', error);
        throw error;
      } finally {
        await logApiMutation({
          db: ctx.db,
          endpoint: "logs.deleteLog",
          method: "DELETE",
          userId: ctx.session.user.id,
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

  // Get API mutation logs with filtering and pagination
  getMutationLogs: permissionProtectedProcedure(["list:logs"])
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        endpoint: z.string().optional(),
        method: z.string().optional(),
        success: z.boolean().optional(),
        userId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        search: z.string().optional(),
        model: z.string().optional(),
        action: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};

      if (input.endpoint) {
        where.endpoint = { contains: input.endpoint, mode: 'insensitive' };
      }

      // Model and action filters
      if (input.model && input.action) {
        // Both filters: exact match
        where.endpoint = { equals: `${input.model}.${input.action}` };
      } else if (input.model) {
        // Model filter only: check if endpoint starts with model.
        where.endpoint = { startsWith: `${input.model}.` };
      } else if (input.action) {
        // Action filter only: check if endpoint ends with .action
        where.endpoint = { endsWith: `.${input.action}` };
      }

      if (input.method) {
        where.method = input.method;
      }

      if (input.success !== undefined) {
        where.success = input.success;
      }

      if (input.userId) {
        where.userId = input.userId;
      }

      if (input.startDate || input.endDate) {
        where.createdAt = {};
        if (input.startDate) {
          where.createdAt.gte = input.startDate;
        }
        if (input.endDate) {
          const endOfDay = new Date(input.endDate);
          endOfDay.setHours(23, 59, 59, 999);
          where.createdAt.lte = endOfDay;
        }
      }

      if (input.search) {
        where.OR = [
          { endpoint: { contains: input.search, mode: 'insensitive' } },
          { ipAddress: { contains: input.search, mode: 'insensitive' } },
          { errorMessage: { contains: input.search, mode: 'insensitive' } },
        ];
      }

      const [items, total] = await Promise.all([
        ctx.db.logs.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
        ctx.db.logs.count({ where }),
      ]);

      return {
        items,
        total,
        page: input.page,
        limit: input.limit,
        totalPages: Math.ceil(total / input.limit),
      };
    }),

  // Get mutation log by ID
  getMutationLogById: permissionProtectedProcedure(["list:logs"])
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.logs.findUnique({
        where: { id: input.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    }),
});