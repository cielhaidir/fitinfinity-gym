import { type PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export enum AIRequestType {
  BODY_COMPOSITION = "BODY_COMPOSITION",
  CALORIE_CALCULATOR = "CALORIE_CALCULATOR", 
  GENERAL = "GENERAL",
}

export interface AIRateLimitConfig {
  dailyLimit: number;
  weeklyLimit: number;
  monthlyLimit: number;
}

export interface AIRequestContext {
  userId: string;
  requestType: AIRequestType;
  endpoint: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface AIRequestResult {
  success: boolean;
  errorMessage?: string;
  tokenCount?: number;
  processingTime?: number;
}

export class AIRateLimitService {
  constructor(private db: PrismaClient) {}

  /**
   * Get default rate limits from environment variables
   */
  private getDefaultLimits(): AIRateLimitConfig {
    return {
      dailyLimit: parseInt(process.env.AI_DEFAULT_DAILY_LIMIT || "5"),
      weeklyLimit: parseInt(process.env.AI_DEFAULT_WEEKLY_LIMIT || "20"),
      monthlyLimit: parseInt(process.env.AI_DEFAULT_MONTHLY_LIMIT || "50"),
    };
  }

  /**
   * Check if rate limiting is enabled
   */
  private isRateLimitingEnabled(): boolean {
    return process.env.AI_ENABLE_RATE_LIMITING !== "false";
  }

  /**
   * Check if admin override is enabled
   */
  private isAdminOverrideEnabled(): boolean {
    return process.env.AI_ADMIN_OVERRIDE === "true";
  }

  /**
   * Get or create user's rate limit configuration
   */
  async getUserRateLimit(userId: string, requestType: AIRequestType): Promise<AIRateLimitConfig> {
    let rateLimit = await this.db.aIRateLimit.findUnique({
      where: {
        userId_requestType: {
          userId,
          requestType,
        },
      },
    });

    if (!rateLimit) {
      const defaultLimits = this.getDefaultLimits();
      rateLimit = await this.db.aIRateLimit.create({
        data: {
          userId,
          requestType,
          ...defaultLimits,
        },
      });
    }

    return {
      dailyLimit: rateLimit.dailyLimit,
      weeklyLimit: rateLimit.weeklyLimit,
      monthlyLimit: rateLimit.monthlyLimit,
    };
  }

  /**
   * Get user's current usage for different time periods
   */
  async getUserUsage(userId: string, requestType: AIRequestType) {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(dayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [dailyUsage, weeklyUsage, monthlyUsage] = await Promise.all([
      this.db.aIRequestLog.count({
        where: {
          userId,
          requestType,
          success: true,
          createdAt: { gte: dayStart },
        },
      }),
      this.db.aIRequestLog.count({
        where: {
          userId,
          requestType,
          success: true,
          createdAt: { gte: weekStart },
        },
      }),
      this.db.aIRequestLog.count({
        where: {
          userId,
          requestType,
          success: true,
          createdAt: { gte: monthStart },
        },
      }),
    ]);

    return {
      daily: dailyUsage,
      weekly: weeklyUsage,
      monthly: monthlyUsage,
    };
  }

  /**
   * Check if user can make an AI request
   */
  async canMakeRequest(userId: string, requestType: AIRequestType): Promise<{
    allowed: boolean;
    reason?: string;
    usage?: {
      daily: number;
      weekly: number;
      monthly: number;
    };
    limits?: AIRateLimitConfig;
  }> {
    // Skip rate limiting if disabled
    if (!this.isRateLimitingEnabled()) {
      return { allowed: true };
    }

    // Admin override check (you can extend this with actual admin role checking)
    if (this.isAdminOverrideEnabled()) {
      const user = await this.db.user.findUnique({
        where: { id: userId },
        include: { roles: true },
      });
      
      // Check if user has admin role (customize this logic based on your role system)
      const isAdmin = user?.roles?.some((role: any) => role.name.toLowerCase().includes('admin'));
      if (isAdmin) {
        return { allowed: true };
      }
    }

    const [limits, usage] = await Promise.all([
      this.getUserRateLimit(userId, requestType),
      this.getUserUsage(userId, requestType),
    ]);

    // Check daily limit
    if (usage.daily >= limits.dailyLimit) {
      return {
        allowed: false,
        reason: `Daily limit exceeded (${usage.daily}/${limits.dailyLimit})`,
        usage,
        limits,
      };
    }

    // Check weekly limit
    if (usage.weekly >= limits.weeklyLimit) {
      return {
        allowed: false,
        reason: `Weekly limit exceeded (${usage.weekly}/${limits.weeklyLimit})`,
        usage,
        limits,
      };
    }

    // Check monthly limit
    if (usage.monthly >= limits.monthlyLimit) {
      return {
        allowed: false,
        reason: `Monthly limit exceeded (${usage.monthly}/${limits.monthlyLimit})`,
        usage,
        limits,
      };
    }

    return {
      allowed: true,
      usage,
      limits,
    };
  }

  /**
   * Log an AI request
   */
  async logRequest(context: AIRequestContext, result: AIRequestResult): Promise<void> {
    try {
      await this.db.aIRequestLog.create({
        data: {
          userId: context.userId,
          requestType: context.requestType,
          endpoint: context.endpoint,
          success: result.success,
          errorMessage: result.errorMessage,
          tokenCount: result.tokenCount,
          processingTime: result.processingTime,
          userAgent: context.userAgent,
          ipAddress: context.ipAddress,
        },
      });
    } catch (error) {
      console.error("Failed to log AI request:", error);
      // Don't throw error here to avoid breaking the main request flow
    }
  }

  /**
   * Update user's rate limits (admin function)
   */
  async updateUserLimits(
    userId: string,
    requestType: AIRequestType,
    limits: Partial<AIRateLimitConfig>
  ): Promise<void> {
    await this.db.aIRateLimit.upsert({
      where: {
        userId_requestType: {
          userId,
          requestType,
        },
      },
      update: limits,
      create: {
        userId,
        requestType,
        ...this.getDefaultLimits(),
        ...limits,
      },
    });
  }

  /**
   * Get user's rate limit status for all request types
   */
  async getUserRateLimitStatus(userId: string) {
    const requestTypes = Object.values(AIRequestType);
    const statusPromises = requestTypes.map(async (requestType) => {
      const [limits, usage, canMake] = await Promise.all([
        this.getUserRateLimit(userId, requestType),
        this.getUserUsage(userId, requestType),
        this.canMakeRequest(userId, requestType),
      ]);

      return {
        requestType,
        limits,
        usage,
        canMakeRequest: canMake.allowed,
        reason: canMake.reason,
      };
    });

    return Promise.all(statusPromises);
  }

  /**
   * Wrapper function to execute AI request with rate limiting
   */
  async executeWithRateLimit<T>(
    context: AIRequestContext,
    aiFunction: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();

    // Check rate limit
    const rateLimitCheck = await this.canMakeRequest(context.userId, context.requestType);
    
    if (!rateLimitCheck.allowed) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: rateLimitCheck.reason || "Rate limit exceeded",
        cause: {
          usage: rateLimitCheck.usage,
          limits: rateLimitCheck.limits,
        },
      });
    }

    let result: T;
    let success = false;
    let errorMessage: string | undefined;

    try {
      result = await aiFunction();
      success = true;
      return result;
    } catch (error) {
      success = false;
      errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw error;
    } finally {
      const processingTime = Date.now() - startTime;
      
      // Log the request
      await this.logRequest(context, {
        success,
        errorMessage,
        processingTime,
        // You can add token counting logic here if your AI service provides it
      });
    }
  }

  /**
   * Get rate limit statistics for admin dashboard
   */
  async getRateLimitStats(timeframe: 'day' | 'week' | 'month' = 'day') {
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const [totalRequests, successfulRequests, failedRequests, topUsers] = await Promise.all([
      this.db.aIRequestLog.count({
        where: { createdAt: { gte: startDate } },
      }),
      this.db.aIRequestLog.count({
        where: { 
          createdAt: { gte: startDate },
          success: true,
        },
      }),
      this.db.aIRequestLog.count({
        where: { 
          createdAt: { gte: startDate },
          success: false,
        },
      }),
      this.db.aIRequestLog.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: startDate } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    const requestsByType = await this.db.aIRequestLog.groupBy({
      by: ['requestType'],
      where: { createdAt: { gte: startDate } },
      _count: { id: true },
    });

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
      requestsByType: requestsByType.reduce((acc: Record<string, number>, item: any) => {
        acc[item.requestType] = item._count.id;
        return acc;
      }, {}),
      topUsers: topUsers.map((user: any) => ({
        userId: user.userId,
        requestCount: user._count.id,
      })),
    };
  }
}

// Factory function to create service instance
export function createAIRateLimitService(db: PrismaClient): AIRateLimitService {
  return new AIRateLimitService(db);
}