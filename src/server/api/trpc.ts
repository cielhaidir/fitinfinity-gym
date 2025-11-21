/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */

import { initTRPC, TRPCError } from "@trpc/server";

import superjson from "superjson";
import { ZodError, z } from "zod";
import { Session } from "next-auth";
import * as fs from "fs";
import * as path from "path";

import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { configService } from "@/lib/config/configService";
import { createModelLogger } from "@/utils/logger";
import { sanitizeForLogging } from "@/utils/sanitizer";

// Define device context type
interface Context {
  db: typeof db;
  session: Session | null;
  headers: Headers;
  device?: {
    id: string;
    name: string;
    accessKey: string;
    isActive: boolean;
    lastSeen: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

// Load configurations at startup
// configService.loadFromDatabase().catch(console.error);
/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth();

  return {
    db,
    session,
    ...opts,
  };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

// Define device context type
interface Context {
  db: typeof db;
  session: Session | null;
  headers: Headers;
  device?: {
    id: string;
    name: string;
    accessKey: string;
    isActive: boolean;
    lastSeen: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 * Also logs slow operations to file.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  const executionTime = end - start;
  
  // Log all operations to console
  // console.log(`[TRPC] ${path} took ${executionTime}ms to execute`);
  
  // Define slow query threshold (configurable via environment variable)
  const slowThreshold = parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000');
  
  // Log slow operations to file
  if (executionTime > slowThreshold) {
    const slowLogEntry = {
      timestamp: new Date().toISOString(),
      path,
      executionTime,
      threshold: slowThreshold,
      type: 'SLOW_QUERY'
    };
    
    writeSlowLog(`[SLOW] ${JSON.stringify(slowLogEntry)}`);
  }

  return result;
});

/**
 * Helper function to write audit logs to file
 */
const writeAuditLog = (message: string) => {
  try {
    const logDir = path.join(process.cwd(), 'logs');
    const logFile = path.join(logDir, 'audit.log');
    
    // Ensure logs directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Append log message with newline
    fs.appendFileSync(logFile, message + '\n', 'utf8');
  } catch (error) {
    // Fallback to console if file logging fails
    console.error('[AUDIT] Failed to write to audit log file:', error);
    console.log(message);
  }
};

/**
 * Helper function to write slow query logs to file
 */
const writeSlowLog = (message: string) => {
  try {
    const logDir = path.join(process.cwd(), 'logs');
    const logFile = path.join(logDir, 'slow.log');
    
    // Ensure logs directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Append log message with newline
    fs.appendFileSync(logFile, message + '\n', 'utf8');
  } catch (error) {
    // Fallback to console if file logging fails
    console.error('[SLOW] Failed to write to slow log file:', error);
    console.log(message);
  }
};

/**
 * Audit middleware for logging create, update, delete operations to file
 */
export const auditMiddleware = t.middleware(async ({ ctx, next, path, type, input }) => {
  // Only log mutations (create, update, delete operations)
  if (type === 'mutation') {
    const timestamp = new Date().toISOString();
    let user = 'Unknown';
    let userId = null;

    // Extract user information from session or device context
    if (ctx.session?.user) {
      user = ctx.session.user.email || ctx.session.user.name || ctx.session.user.id;
      userId = ctx.session.user.id;
    } 
    // Determine operation type from path
    let operationType = 'UNKNOWN';
    const pathLower = path.toLowerCase();
    if (pathLower.includes('create') || pathLower.includes('add')) {
      operationType = 'CREATE';
    } else if (pathLower.includes('update') || pathLower.includes('edit') || pathLower.includes('modify')) {
      operationType = 'UPDATE';
    } else if (pathLower.includes('delete') || pathLower.includes('remove')) {
      operationType = 'DELETE';
    }

    // Create audit log entry
    const auditEntry = {
      timestamp,
      operationType,
      path,
      user,
      userId,
      status: 'STARTED'
    };

    // Log the operation before execution
    writeAuditLog(`[AUDIT] ${JSON.stringify(auditEntry)}`);
    
    // Log input data for audit trail in development (be careful with sensitive data)
   
    writeAuditLog(`[AUDIT] Input data for ${path}: ${JSON.stringify(input, null, 2)}`);
    

    try {
      const result = await next();
      
      // Log successful completion
      const successEntry = {
        ...auditEntry,
        status: 'COMPLETED',
        completedAt: new Date().toISOString()
      };
      writeAuditLog(`[AUDIT] ${JSON.stringify(successEntry)}`);
      
      return result;
    } catch (error) {
      // Log failed operations
      const errorEntry = {
        ...auditEntry,
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
        failedAt: new Date().toISOString()
      };
      writeAuditLog(`[AUDIT] ${JSON.stringify(errorEntry)}`);
      throw error;
    }
  }

  // For non-mutation operations, just continue without logging
  return next();
});

/**
 * Model-specific logging middleware using Winston
 * Creates a middleware that logs ONLY mutations (Create, Update, Delete) to a model-specific log file
 */
export const createModelLoggingMiddleware = (modelName: string) => {
  const logger = createModelLogger(modelName);
  
  return t.middleware(async ({ ctx, next, path, type, input }) => {
    // Only log mutations (create, update, delete operations)
    if (type !== 'mutation') {
      return next();
    }

    const timestamp = new Date().toISOString();
    let user = 'Unknown';
    let userId = 'Unknown';
    
    if (ctx.session?.user) {
      user = ctx.session.user.email || ctx.session.user.name || ctx.session.user.id;
      userId = ctx.session.user.id;
    }
    
    // Determine operation type from path
    let operationType = 'MUTATION';
    const pathLower = path.toLowerCase();
    if (pathLower.includes('create') || pathLower.includes('add')) {
      operationType = 'CREATE';
    } else if (pathLower.includes('update') || pathLower.includes('edit') || pathLower.includes('modify')) {
      operationType = 'UPDATE';
    } else if (pathLower.includes('delete') || pathLower.includes('remove')) {
      operationType = 'DELETE';
    }
    
    logger.info(`[${operationType}] ${path} - User: ${user} (${userId})`);
    
    if (input) {
      logger.info(`Input: ${JSON.stringify(input)}`);
    }
    
    try {
      const result = await next();
      logger.info(`[${operationType}] ${path} - SUCCESS`);
      return result;
    } catch (error) {
      logger.error(`[${operationType}] ${path} - ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  });
};

/**
 * Device authentication middleware
 */
export const deviceAuthMiddleware = t.middleware(async ({ ctx, next, input }) => {
  const { deviceId, accessKey } = input as { deviceId: string; accessKey: string };

  console.log(`[TRPC] Device authentication for deviceId: ${deviceId}, accessKey: ${accessKey}`);
  const device = await ctx.db.device.findFirst({
    where: {
      id: deviceId,
      accessKey: accessKey,
      isActive: true,
    },
  });

  if (!device) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Invalid device credentials',
    });
  }

  // Optional: Update last seen timestamp
  await ctx.db.device.update({
    where: { id: device.id },
    data: { lastSeen: new Date() },
  });

  return next({
    ctx: {
      ...ctx,
      device, // Pass the authenticated device into downstream ctx
    },
  });
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Helper to extract model name from procedure path
 */
const getModelNameFromPath = (path: string): string => {
  // Extract the first part of the path (e.g., "member.create" -> "member")
  const parts = path.split('.');
  return parts[0] || 'unknown';
};

/**
 * Global logging middleware that automatically determines model name from path
 * Only logs mutations (Create, Update, Delete operations)
 * Uses sanitizer to handle circular references, Date objects, and BigInt values
 */
const globalLoggingMiddleware = t.middleware(async ({ ctx, next, path, type, input }) => {
  // Only log mutations
  if (type !== 'mutation') {
    return next();
  }

  const modelName = getModelNameFromPath(path);
  const logger = createModelLogger(modelName);
  
  let user = 'Unknown';
  let userId = 'Unknown';
  
  if (ctx.session?.user) {
    user = ctx.session.user.email || ctx.session.user.name || ctx.session.user.id;
    userId = ctx.session.user.id;
  }
  
  // Determine operation type from path
  let operationType = 'MUTATION';
  const pathLower = path.toLowerCase();
  if (pathLower.includes('create') || pathLower.includes('add')) {
    operationType = 'CREATE';
  } else if (pathLower.includes('update') || pathLower.includes('edit') || pathLower.includes('modify')) {
    operationType = 'UPDATE';
  } else if (pathLower.includes('delete') || pathLower.includes('remove')) {
    operationType = 'DELETE';
  }
  
  logger.info(`[${operationType}] ${path} - User: ${user} (${userId})`);
  
  // Sanitize and log input parameters
  if (input) {
    const sanitizedInput = sanitizeForLogging(input);
    logger.info(`Input: ${JSON.stringify(sanitizedInput)}`);
  }
  
  try {
    const result = await next();
    logger.info(`[${operationType}] ${path} - SUCCESS`);
    
    // Sanitize and log response payload with safety measures
    if (result) {
      const sanitizedResult = sanitizeForLogging(result);
      const responseStr = JSON.stringify(sanitizedResult);
      const MAX_RESPONSE_LENGTH = 5000; // Limit to 5000 characters
      
      // Check if response is too large
      if (responseStr.length > MAX_RESPONSE_LENGTH) {
        logger.info(`Response: [TRUNCATED - ${responseStr.length} chars] ${responseStr.substring(0, MAX_RESPONSE_LENGTH)}...`);
      } else {
        logger.info(`Response: ${responseStr}`);
      }
    } else {
      logger.info(`Response: null`);
    }
    
    return result;
  } catch (error) {
    logger.error(`[${operationType}] ${path} - ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
});

/**
 * Public procedure with automatic logging
 */
export const publicProcedureWithLogging = t.procedure
  .use(timingMiddleware)
  .use(globalLoggingMiddleware);

/**
 * Device-protected procedure
 *
 * Use this for endpoints that require valid device authentication
 */
export const deviceProcedure = t.procedure
  .input(z.object({
    deviceId: z.string(),
    accessKey: z.string(),
  }))
  .use(timingMiddleware)
  .use(deviceAuthMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(globalLoggingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session || !ctx.session.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        // infers the `session` as non-nullable
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  });

/**
* Audited procedure for operations that need audit logging
*
* Use this for create, update, delete operations that should be tracked
*/
export const auditedProcedure = t.procedure
 .use(timingMiddleware)
 .use(globalLoggingMiddleware)
 .use(auditMiddleware);

/**
* Protected audited procedure for authenticated operations that need audit logging
*/
export const protectedAuditedProcedure = t.procedure
 .use(timingMiddleware)
 .use(globalLoggingMiddleware)
 .use(auditMiddleware)
 .use(({ ctx, next }) => {
   if (!ctx.session || !ctx.session.user) {
     throw new TRPCError({ code: "UNAUTHORIZED" });
   }
   return next({
     ctx: {
       // infers the `session` as non-nullable
       session: { ...ctx.session, user: ctx.session.user },
     },
   });
 });

// Add this middleware to your existing TRPC setup

export const enforcePermissionMiddleware = t.middleware(
  async ({ ctx, next }) => {
    if (!ctx.session || !ctx.session.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const userId = ctx.session.user.id;

    const user = await ctx.db.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    // Add user permissions to both context and session
    const permissions = user.roles.flatMap((role) =>
      role.permissions.map((p) => p.permission.name),
    );

    // Update the session with permissions
    ctx.session.user.permissions = permissions;

    return next({
      ctx: {
        ...ctx,
        user,
        permissions,
        session: {
          ...ctx.session,
          user: {
            ...ctx.session.user,
            permissions,
          },
        },
      },
    });
  },
);

// Create a procedure that requires specific permissions
export const permissionProtectedProcedure = (requiredPermissions: string[]) =>
  t.procedure
  .use(timingMiddleware)
  .use(globalLoggingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session || !ctx.session.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        // infers the `session` as non-nullable
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  })
  .use(enforcePermissionMiddleware)
  .use(({ ctx, next }) => {
    if (process.env.ALLOW_RBAC === "false") {
      return next({
        ctx: {
          ...ctx,
          session: ctx.session,
        },
      });
    }

    const hasPermission = requiredPermissions.some((permission) =>
      ctx.permissions.includes(permission),
    );

    if (!hasPermission) {
      if (process.env.NODE_ENV === "development") {
      console.log(`[TRPC] Missing permissions: ${requiredPermissions}`);
      }
      throw new TRPCError({
      code: "FORBIDDEN",
      message: "You don't have permission to perform this action",
      });
    }

    // Since we're using protectedProcedure and enforcePermissionMiddleware,
    // ctx.session is guaranteed to be non-null at this point
    return next({
      ctx: {
        ...ctx,
        session: ctx.session,
      },
    });
  });
