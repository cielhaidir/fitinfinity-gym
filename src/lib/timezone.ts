/**
 * Timezone utility functions for converting dates to GMT+8 (Asia/Makassar)
 * Database stores dates in GMT 0, but we need to filter by GMT+8 timezone
 */

/**
 * Convert a date to GMT+8 start of day (00:00:00 GMT+8)
 * @param date - The input date
 * @returns Date adjusted to start of day in GMT+8
 */
export function toGMT8StartOfDay(date: Date): Date {
  const adjusted = new Date(date);
  adjusted.setHours(0, 0, 0, 0);
  // Subtract 8 hours to convert GMT+8 to GMT 0 for database query
  adjusted.setHours(adjusted.getHours() - 8);
  return adjusted;
}

/**
 * Convert a date to GMT+8 end of day (23:59:59.999 GMT+8)
 * @param date - The input date
 * @returns Date adjusted to end of day in GMT+8
 */
export function toGMT8EndOfDay(date: Date): Date {
  const adjusted = new Date(date);
  adjusted.setHours(23, 59, 59, 999);
  // Subtract 8 hours to convert GMT+8 to GMT 0 for database query
  adjusted.setHours(adjusted.getHours() - 8);
  return adjusted;
}