/**
 * Format number as Indonesian Rupiah (IDR) with comma separators
 * @param amount - The amount to format
 * @returns Formatted string with "Rp " prefix and comma separators
 */
export function formatIDR(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

/**
 * Format number with comma separators (without currency prefix)
 * @param amount - The amount to format
 * @returns Formatted string with comma separators
 */
export function formatNumber(amount: number): string {
  return amount.toLocaleString('id-ID');
}