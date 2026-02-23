// Currency formatting utility
// All prices are stored in USD. This replaces the old GEL-based pricing.

/**
 * Format a price in USD
 */
export function formatPrice(usdPrice: number): string {
  return `$${usdPrice.toFixed(2).replace(/\.00$/, '')}`;
}

/**
 * Format price with per-month suffix
 */
export function formatMonthlyPrice(usdPrice: number, monthLabel: string = "/mo"): string {
  return `$${usdPrice.toFixed(2)}${monthLabel}`;
}
