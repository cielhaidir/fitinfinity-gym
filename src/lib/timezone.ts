/**
 * Timezone utility functions for converting dates to GMT+8 (Asia/Makassar)
 * Database stores dates in GMT 0, but we need to filter by GMT+8 timezone
 *
 * The frontend sends dates in UTC (e.g., 2026-01-08T00:00:00.000Z)
 * We need to treat this as 2026-01-08 in GMT+8 timezone
 * So we keep the date as-is for start of day (already midnight UTC)
 * For end of day, we add 23:59:59.999 + 8 hours to get to end of day GMT+8
 */

/**
 * Convert a date to GMT+8 start of day (00:00:00 GMT+8)
 * @param date - The input date (assumed to be in UTC representing the date in GMT+8)
 * @returns Date adjusted to start of day in GMT+8 (in GMT 0 for database)
 */
export function toGMT8StartOfDay(date: Date): Date {
  // The date comes as 2026-01-08T00:00:00.000Z (midnight UTC)
  // We want: 2026-01-08 00:00:00 GMT+8 = 2026-01-07 16:00:00 GMT+0
  
  // Get UTC date components (year, month, day from the UTC date)
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  
  // Create start of day in GMT+8, which is 16:00 previous day in GMT+0
  // 00:00:00 GMT+8 = 16:00:00 previous day GMT+0
  const result = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  result.setUTCHours(result.getUTCHours() - 8);
  
  return result;
}

/**
 * Convert a date to GMT+8 end of day (23:59:59.999 GMT+8)
 * @param date - The input date (assumed to be in UTC representing the date in GMT+8)
 * @returns Date adjusted to end of day in GMT+8 (in GMT 0 for database)
 */
export function toGMT8EndOfDay(date: Date): Date {
  // The date comes as 2026-01-08T00:00:00.000Z (midnight UTC)
  // We want: 2026-01-08 23:59:59.999 GMT+8 = 2026-01-08 15:59:59.999 GMT+0
  
  // Get UTC date components
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  
  // Create end of day in GMT+8, which is 15:59:59.999 same day in GMT+0
  // 23:59:59.999 GMT+8 = 15:59:59.999 GMT+0
  const result = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
  result.setUTCHours(result.getUTCHours() - 8);
  
  return result;
}