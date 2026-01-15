/**
 * API Logger Utility
 * 
 * Helper function for logging tRPC API calls to PostgreSQL database.
 * Part of Phase 2 of the SQL Logging Implementation Plan.
 */

import type { PrismaClient } from "@prisma/client";
import type { Session } from "next-auth";
import { sanitizeForLogging } from "@/utils/sanitizer";

/**
 * Context type from tRPC (simplified version)
 */
interface TRPCContext {
  session: Session | null;
  headers: Headers;
}

/**
 * Parameters for logApiCall function
 */
interface LogApiCallParams {
  db: PrismaClient;
  path: string;
  procedureType: "query" | "mutation" | "subscription";
  status: "success" | "error";
  durationMs?: number;
  ctx: TRPCContext;
  input?: unknown;
  output?: unknown;
  error?: Error | unknown;
}

/**
 * Extract router and procedure from tRPC path
 * Similar to getModelNameFromPath() logic in trpc.ts
 * 
 * @param path - tRPC path (e.g., "member.create", "subscription.getById")
 * @returns Object with router and procedure
 */
function extractRouterAndProcedure(path: string): { router: string; procedure: string } {
  const parts = path.split(".");
  return {
    router: parts[0] || "unknown",
    procedure: parts[1] || "unknown",
  };
}

/**
 * Extract IP address from request headers
 * Checks multiple header sources in priority order
 * 
 * @param headers - Request headers
 * @returns IP address or null
 */
function extractIpAddress(headers: Headers): string | null {
  // Check x-forwarded-for first (most common behind proxies)
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  // Check x-real-ip
  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback to null if no IP found
  return null;
}

/**
 * Infer action from procedure name
 * 
 * @param procedure - Procedure name (e.g., "create", "update", "getById")
 * @returns Action type
 */
function inferAction(procedure: string): string {
  const lowerProcedure = procedure.toLowerCase();

  if (lowerProcedure.includes("create") || lowerProcedure.includes("add")) {
    return "create";
  }

  if (lowerProcedure.includes("update") || lowerProcedure.includes("edit") || lowerProcedure.includes("modify")) {
    return "update";
  }

  if (lowerProcedure.includes("delete") || lowerProcedure.includes("remove")) {
    return "delete";
  }

  if (
    lowerProcedure.includes("list") ||
    lowerProcedure.includes("getall") ||
    lowerProcedure.includes("getmany")
  ) {
    return "list";
  }

  if (
    lowerProcedure.includes("get") ||
    lowerProcedure.includes("getone") ||
    lowerProcedure.includes("getbyid")
  ) {
    return "show";
  }

  return "custom";
}

/**
 * Sanitize and truncate payload to max 20KB JSON string
 * 
 * @param data - Data to sanitize and truncate
 * @returns Object with sanitized data and truncation flag
 */
function sanitizeAndTruncatePayload(data: unknown): { 
  sanitized: unknown; 
  truncated: boolean 
} {
  try {
    // First sanitize the data
    const sanitized = sanitizeForLogging(data);

    // Convert to JSON string to check size
    const jsonString = JSON.stringify(sanitized);

    // Max size: 20KB = 20480 bytes
    const MAX_SIZE = 20480;

    if (jsonString.length > MAX_SIZE) {
      // Truncate the string
      const truncatedString = jsonString.substring(0, MAX_SIZE);
      
      // Try to parse back to JSON, or return as string if fails
      try {
        return {
          sanitized: JSON.parse(truncatedString),
          truncated: true,
        };
      } catch {
        // If truncated JSON is invalid, return a placeholder
        return {
          sanitized: { _truncated: true, _message: "Payload too large" },
          truncated: true,
        };
      }
    }

    return {
      sanitized,
      truncated: false,
    };
  } catch (error) {
    // If sanitization fails, return null
    console.error("[apiLogger] Error sanitizing payload:", error);
    return {
      sanitized: null,
      truncated: false,
    };
  }
}

/**
 * Log API call to PostgreSQL database
 * 
 * This is a fire-and-forget function that never throws errors.
 * If logging fails, it logs to console but doesn't interrupt the request.
 * 
 * @param params - LogApiCallParams
 */
export default async function logApiCall(params: LogApiCallParams): Promise<void> {
  try {
    const {
      db,
      path,
      procedureType,
      status,
      durationMs,
      ctx,
      input,
      output,
      error,
    } = params;

    // Extract router and procedure from path
    const { router, procedure } = extractRouterAndProcedure(path);

    // Extract user info from session
    const userId = ctx.session?.user?.id || null;
    const userEmail = ctx.session?.user?.email || null;

    // Extract IP address from headers
    const ipAddress = extractIpAddress(ctx.headers);

    // Extract user agent from headers
    const userAgent = ctx.headers.get("user-agent") || null;

    // Infer action from procedure name
    const action = inferAction(procedure);

    // Sanitize and truncate input
    let inputPayload: unknown = null;
    let inputTruncated = false;
    if (input !== undefined && input !== null) {
      const { sanitized, truncated } = sanitizeAndTruncatePayload(input);
      inputPayload = sanitized;
      inputTruncated = truncated;
    }

    // Sanitize and truncate output
    let outputPayload: unknown = null;
    let outputTruncated = false;
    if (output !== undefined && output !== null) {
      const { sanitized, truncated } = sanitizeAndTruncatePayload(output);
      outputPayload = sanitized;
      outputTruncated = truncated;
    }

    // Extract error details if present
    let errorMessage: string | null = null;
    let errorCode: string | null = null;
    let errorStack: string | null = null;

    if (error) {
      if (error instanceof Error) {
        errorMessage = error.message;
        errorStack = error.stack || null;
        // Try to get error code if it exists
        errorCode = (error as any).code || null;
      } else {
        errorMessage = String(error);
      }
    }

    // Build meta object for additional information
    const meta: Record<string, unknown> = {};
    if (inputTruncated || outputTruncated) {
      meta.payloadTruncated = true;
      if (inputTruncated) meta.inputTruncated = true;
      if (outputTruncated) meta.outputTruncated = true;
    }

    // Create log entry in database
    await db.log.create({
      data: {
        // Routing
        router,
        procedure,
        path,
        procedureType,

        // Semantics
        action,
        status,

        // Performance
        durationMs: durationMs || null,

        // Identity / context
        userId,
        userEmail,
        ipAddress,
        userAgent,

        // Payloads
        input: inputPayload as any,
        output: outputPayload as any,

        // Error capture
        errorMessage,
        errorCode,
        errorStack,

        // Extension point
        meta: Object.keys(meta).length > 0 ? meta : null,
      },
    });
  } catch (logError) {
    // Fail-open: log error to console but never throw
    console.error("[apiLogger] Failed to log API call:", logError);
    console.error("[apiLogger] Original path:", params.path);
  }
}