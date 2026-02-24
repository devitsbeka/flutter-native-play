// Currency formatting utility
// All prices are stored in USD. For Georgian users, prices are shown in GEL.

const USD_TO_GEL_RATE = 2.75;

/**
 * Check if the user should see GEL pricing
 */
export function shouldShowGel(): boolean {
  const lang = localStorage.getItem('preferredLanguage') || 'ka';
  return lang === 'ka';
}

/**
 * Convert USD to GEL
 */
export function usdToGel(usdPrice: number): number {
  return Math.round(usdPrice * USD_TO_GEL_RATE * 100) / 100;
}

/**
 * Format a price in USD or GEL based on user locale
 */
export function formatPrice(usdPrice: number): string {
  if (shouldShowGel()) {
    const gel = usdToGel(usdPrice);
    return `${gel.toFixed(2).replace(/\.00$/, '')} ₾`;
  }
  return `$${usdPrice.toFixed(2).replace(/\.00$/, '')}`;
}

/**
 * Format price with per-month suffix
 */
export function formatMonthlyPrice(usdPrice: number, monthLabel: string = "/mo"): string {
  if (shouldShowGel()) {
    const gel = usdToGel(usdPrice);
    return `${gel.toFixed(2)} ₾${monthLabel}`;
  }
  return `$${usdPrice.toFixed(2)}${monthLabel}`;
}

/**
 * Get the price value and currency symbol separately (for inline rendering)
 */
export function getPriceDisplay(usdPrice: number): { value: string; symbol: string; suffix: string } {
  if (shouldShowGel()) {
    const gel = usdToGel(usdPrice);
    return { value: gel.toFixed(2), symbol: '', suffix: ' ₾' };
  }
  return { value: usdPrice.toFixed(2), symbol: '$', suffix: '' };
}
