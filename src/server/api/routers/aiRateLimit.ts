import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createAIRateLimitService, AIRequestType } from "@/server/utils/aiRateLimitService";
import { Prisma } from "@prisma/client";
import { logApiMutationAsync, extractIpAddress, extractUserAgent } from "@/server/utils/mutationLogger";

export const aiRateLimitRouter = createTRPCRouter({
  // Get current user's rate limit status
  getMyStatus: protectedProcedure.query(async ({ ctx }) => {
    const rateLimitService = createAIRateLimitService(ctx.db);
    return await rateLimitService.getUserRateLimitStatus(ctx.session.user.id);
  }),

  // Get current user's rate limit for a specific request type
  getMyLimit: protectedProcedure
    .input(
      z.object({
        requestType: z.nativeEnum(AIRequestType),
      })
    )
    .query(async ({ ctx, input }) => {
      const rateLimitService = createAIRateLimitService(ctx.db);
      const [limits, usage] = await Promise.all([
        rateLimitService.getUserRateLimit(ctx.session.user.id, input.requestType),
        rateLimitService.getUserUsage(ctx.session.user.id, input.requestType),
      ]);
      
      return {
        limits,
        usage,
        requestType: input.requestType,
      };
    }),

  // Update current user's rate limits (self-management)
  updateMyLimits: protectedProcedure
    .input(
      z.object({
        requestType: z.nativeEnum(AIRequestType),
        dailyLimit: z.number().min(0).max(100).optional(),
        weeklyLimit: z.number().min(0).max(500).optional(),
        monthlyLimit: z.number().min(0).max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const rateLimitService = createAIRateLimitService(ctx.db);
        
        // Get current limits
        const currentLimits = await rateLimitService.getUserRateLimit(
          ctx.session.user.id,
          input.requestType
        );

        // Only allow users to reduce their limits, not increase them beyond defaults
        const defaultLimits = {
          dailyLimit: parseInt(process.env.AI_DEFAULT_DAILY_LIMIT || "5"),
          weeklyLimit: parseInt(process.env.AI_DEFAULT_WEEKLY_LIMIT || "20"),
          monthlyLimit: parseInt(process.env.AI_DEFAULT_MONTHLY_LIMIT || "50"),
        };

        const newLimits = {
          dailyLimit: input.dailyLimit !== undefined
            ? Math.min(input.dailyLimit, defaultLimits.dailyLimit)
            : currentLimits.dailyLimit,
          weeklyLimit: input.weeklyLimit !== undefined
            ? Math.min(input.weeklyLimit, defaultLimits.weeklyLimit)
            : currentLimits.weeklyLimit,
          monthlyLimit: input.monthlyLimit !== undefined
            ? Math.min(input.monthlyLimit, defaultLimits.monthlyLimit)
            : currentLimits.monthlyLimit,
        };

        await rateLimitService.updateUserLimits(
          ctx.session.user.id,
          input.requestType,
          newLimits
        );

        result = {
          success: true,
          limits: newLimits,
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
          endpoint: "aiRateLimit.updateMyLimits",
          method: "PUT",
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

  // Check if user can make a request
  canMakeRequest: protectedProcedure
    .input(
      z.object({
        requestType: z.nativeEnum(AIRequestType),
      })
    )
    .query(async ({ ctx, input }) => {
      const rateLimitService = createAIRateLimitService(ctx.db);
      return await rateLimitService.canMakeRequest(ctx.session.user.id, input.requestType);
    }),

  // Get user's request history
  getMyRequestHistory: protectedProcedure
    .input(
      z.object({
        requestType: z.nativeEnum(AIRequestType).optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(20),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        userId: ctx.session.user.id,
        ...(input.requestType ? { requestType: input.requestType } : {}),
        ...(input.startDate || input.endDate ? {
          createdAt: {
            ...(input.startDate ? { gte: input.startDate } : {}),
            ...(input.endDate ? { lte: input.endDate } : {}),
          }
        } : {})
      };

      const [logs, total] = await Promise.all([
        ctx.db.aIRequestLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          select: {
            id: true,
            requestType: true,
            endpoint: true,
            success: true,
            errorMessage: true,
            processingTime: true,
            createdAt: true,
          },
        }),
        ctx.db.aIRequestLog.count({ where }),
      ]);

      return {
        logs,
        total,
        page: input.page,
        limit: input.limit,
      };
    }),

  // Admin endpoints (require admin role check)
  admin: createTRPCRouter({
    // Get all users' rate limit status
    getAllUsersStatus: protectedProcedure
      .input(
        z.object({
          page: z.number().min(1).default(1),
          limit: z.number().min(1).max(100).default(20),
          searchTerm: z.string().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        // TODO: Add admin role check here
        // const isAdmin = await checkAdminRole(ctx.session.user.id, ctx.db);
        // if (!isAdmin) throw new TRPCError({ code: "FORBIDDEN" });

        const where = input.searchTerm ? {
          OR: [
            { name: { contains: input.searchTerm, mode: Prisma.QueryMode.insensitive } },
            { email: { contains: input.searchTerm, mode: Prisma.QueryMode.insensitive } },
          ]
        } : {};

        const [users, total] = await Promise.all([
          ctx.db.user.findMany({
            where,
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
              aiRateLimits: {
                select: {
                  requestType: true,
                  dailyLimit: true,
                  weeklyLimit: true,
                  monthlyLimit: true,
                  isActive: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            skip: (input.page - 1) * input.limit,
            take: input.limit,
          }),
          ctx.db.user.count({ where }),
        ]);

        return {
          users,
          total,
          page: input.page,
          limit: input.limit,
        };
      }),

    // Update any user's rate limits
    updateUserLimits: protectedProcedure
      .input(
        z.object({
          userId: z.string(),
          requestType: z.nativeEnum(AIRequestType),
          dailyLimit: z.number().min(0).optional(),
          weeklyLimit: z.number().min(0).optional(),
          monthlyLimit: z.number().min(0).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const startTime = Date.now();
        let success = false;
        let result: any = null;
        let error: Error | null = null;

        try {
          // TODO: Add admin role check here
          // const isAdmin = await checkAdminRole(ctx.session.user.id, ctx.db);
          // if (!isAdmin) throw new TRPCError({ code: "FORBIDDEN" });

          const rateLimitService = createAIRateLimitService(ctx.db);
          const { userId, requestType, ...limits } = input;

          await rateLimitService.updateUserLimits(userId, requestType, limits);

          result = {
            success: true,
            userId,
            requestType,
            limits,
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
            endpoint: "aiRateLimit.admin.updateUserLimits",
            method: "PUT",
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

    // Get rate limit statistics
    getStats: protectedProcedure
      .input(
        z.object({
          timeframe: z.enum(['day', 'week', 'month']).default('day'),
        })
      )
      .query(async ({ ctx, input }) => {
        // TODO: Add admin role check here
        // const isAdmin = await checkAdminRole(ctx.session.user.id, ctx.db);
        // if (!isAdmin) throw new TRPCError({ code: "FORBIDDEN" });

        const rateLimitService = createAIRateLimitService(ctx.db);
        return await rateLimitService.getRateLimitStats(input.timeframe);
      }),

    // Get detailed user request logs
    getUserRequestLogs: protectedProcedure
      .input(
        z.object({
          userId: z.string(),
          requestType: z.nativeEnum(AIRequestType).optional(),
          page: z.number().min(1).default(1),
          limit: z.number().min(1).max(100).default(20),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        // TODO: Add admin role check here
        // const isAdmin = await checkAdminRole(ctx.session.user.id, ctx.db);
        // if (!isAdmin) throw new TRPCError({ code: "FORBIDDEN" });

        const where = {
          userId: input.userId,
          ...(input.requestType ? { requestType: input.requestType } : {}),
          ...(input.startDate || input.endDate ? {
            createdAt: {
              ...(input.startDate ? { gte: input.startDate } : {}),
              ...(input.endDate ? { lte: input.endDate } : {}),
            }
          } : {})
        };

        const [logs, total] = await Promise.all([
          ctx.db.aIRequestLog.findMany({
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
          ctx.db.aIRequestLog.count({ where }),
        ]);

        return {
          logs,
          total,
          page: input.page,
          limit: input.limit,
        };
      }),
  }),
});