/**
 * Mutation Logger Utility
 * 
 * Manual logging helper for API mutations (POST/PUT/PATCH/DELETE operations).
 * Logs to the Logs table in PostgreSQL database.
 */

import type { PrismaClient } from "@prisma/client";

/**
 * Parameters for logApiMutation function
 */
export interface LogMutationParams {
  db: PrismaClient;
  endpoint: string;           // e.g., "member.create", "subscription.update"
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  userId?: string | null;     // User ID if authenticated
  requestData?: unknown;      // Input parameters
  responseData?: unknown;     // Response data (optional)
  ipAddress?: string | null;  // Client IP address
  userAgent?: string | null;  // User agent string
  success?: boolean;          // Whether operation succeeded (default: true)
  errorMessage?: string | null; // Error message if failed
  duration?: number;          // Duration in milliseconds
}

/**
 * Log API mutation to the Logs table
 * 
 * This is a fire-and-forget function that never throws errors.
 * If logging fails, it logs to console but doesn't interrupt the request.
 * 
 * @param params - LogMutationParams
 */
export async function logApiMutation(params: LogMutationParams): Promise<void> {
  try {
    const {
      db,
      endpoint,
      method,
      userId = null,
      requestData = null,
      responseData = null,
      ipAddress = null,
      userAgent = null,
      success = true,
      errorMessage = null,
      duration = null,
    } = params;

    // Sanitize and prepare data for logging
    const sanitizedRequestData = requestData ? sanitizeData(requestData) : null;
    const sanitizedResponseData = responseData ? sanitizeData(responseData) : null;

    // Insert log entry using Prisma
    await db.logs.create({
      data: {
        endpoint,
        method,
        userId,
        requestData: sanitizedRequestData as any,
        responseData: sanitizedResponseData as any,
        ipAddress,
        userAgent,
        success,
        errorMessage,
        duration,
      },
    });
  } catch (logError) {
    // Fail-open: log error to console but never throw
    console.error("[mutationLogger] Failed to log mutation:", logError);
    console.error("[mutationLogger] Endpoint:", params.endpoint);
  }
}

/**
 * Sanitize data by removing sensitive fields
 * This helps prevent logging passwords, tokens, etc.
 * 
 * @param data - Data to sanitize
 * @returns Sanitized data
 */
function sanitizeData(data: unknown): unknown {
  if (data === null || data === undefined) {
    return null;
  }

  // If it's not an object, return as-is
  if (typeof data !== "object") {
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  // Handle objects
  const sanitized: Record<string, unknown> = {};
  const sensitiveFields = [
    "password",
    "token",
    "accessToken",
    "refreshToken",
    "apiKey",
    "secret",
    "privateKey",
    "creditCard",
    "ssn",
  ];

  for (const [key, value] of Object.entries(data)) {
    // Check if the key contains sensitive information
    const isSensitive = sensitiveFields.some(field => 
      key.toLowerCase().includes(field.toLowerCase())
    );

    if (isSensitive) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = sanitizeData(value);
    }
  }

  return sanitized;
}

/**
 * Extract IP address from headers object
 * 
 * @param headers - Headers object or Map
 * @returns IP address or null
 */
export function extractIpAddress(headers: Headers | Record<string, string | string[] | undefined>): string | null {
  // Handle Headers object
  if (headers instanceof Headers) {
    const forwardedFor = headers.get("x-forwarded-for");
    if (forwardedFor) {
      return forwardedFor.split(",")[0]?.trim() || null;
    }
    const realIp = headers.get("x-real-ip");
    if (realIp) {
      return realIp;
    }
    return null;
  }

  // Handle plain object
  const forwardedFor = headers["x-forwarded-for"];
  if (forwardedFor) {
    const ip = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ip?.split(",")[0]?.trim() || null;
  }

  const realIp = headers["x-real-ip"];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] || null : realIp;
  }

  return null;
}

/**
 * Extract user agent from headers object
 * 
 * @param headers - Headers object or Map
 * @returns User agent string or null
 */
export function extractUserAgent(headers: Headers | Record<string, string | string[] | undefined>): string | null {
  // Handle Headers object
  if (headers instanceof Headers) {
    return headers.get("user-agent") || null;
  }

  // Handle plain object
  const userAgent = headers["user-agent"];
  if (userAgent) {
    return Array.isArray(userAgent) ? userAgent[0] || null : userAgent;
  }

  return null;
}
