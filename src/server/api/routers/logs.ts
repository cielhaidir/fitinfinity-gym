import { z } from "zod";
import { createTRPCRouter, permissionProtectedProcedure } from "@/server/api/trpc";
import * as fs from "fs";
import * as path from "path";

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
        limit: z.number().min(1).max(1000).default(100),
        search: z.string().optional(),
        level: z.enum(['INFO', 'ERROR', 'WARN', 'ALL']).default('ALL'),
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
    .mutation(async ({ input }) => {
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
        return { success: true, message: `Deleted ${input.filename}` };
      } catch (error) {
        console.error('Error deleting log file:', error);
        throw error;
      }
    }),
});