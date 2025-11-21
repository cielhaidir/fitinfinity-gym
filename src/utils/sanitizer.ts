/**
 * Sanitizer utility for logging
 * Handles circular references, Date objects, and BigInt values
 */

/**
 * Sanitizes data for safe JSON serialization in logs
 * - Replaces circular references with [Circular]
 * - Converts Date objects to ISO strings
 * - Converts BigInt to strings
 */
export function sanitizeForLogging(data: unknown): unknown {
  const seen = new WeakSet();

  function sanitize(value: unknown): unknown {
    // Handle null and undefined
    if (value === null || value === undefined) {
      return value;
    }

    // Handle primitive types
    if (typeof value !== 'object' && typeof value !== 'function') {
      // Convert BigInt to string
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    }

    // Handle functions
    if (typeof value === 'function') {
      return '[Function]';
    }

    // Handle Date objects
    if (value instanceof Date) {
      return value.toISOString();
    }

    // Handle circular references
    if (seen.has(value as object)) {
      return '[Circular]';
    }

    // Mark object as seen
    seen.add(value as object);

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map((item) => sanitize(item));
    }

    // Handle plain objects
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      sanitized[key] = sanitize(val);
    }

    return sanitized;
  }

  return sanitize(data);
}