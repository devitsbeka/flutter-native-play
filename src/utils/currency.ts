/**
 * Legacy currency helpers.
 *
 * `formatPrice`, `formatMonthlyPrice` and `usdToGel` convert a USD figure at a
 * flat 2.75 — which is how a Georgian buyer came to be quoted 10.97 lari for a
 * subscription Stripe charges 9.99 lari for. Nothing renders an amount through
 * them any more: prices come from src/config/pricing.ts, which holds a real
 * figure per currency and is mirrored by the checkout, so the number shown is
 * the number taken.
 *
 * What is still used here is `getPriceDisplay().monthLabel` — the "/თვე" or
 * "/mo" suffix — and `shouldShowGel`. The converters are kept because the
 * exchange rate is also what the gem packs' lari prices were derived from, and
 * deleting them would leave that history nowhere; do not reach for them to
 * price anything new.
 */

import { readAppLanguage } from '@/utils/appLanguage';

const USD_TO_GEL_RATE = 2.75;

/**
 * Check if the user should see GEL pricing
 */
export function shouldShowGel(): boolean {
  return readAppLanguage() === 'ka';
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
export function formatMonthlyPrice(usdPrice: number, monthLabel?: string): string {
  const isGel = shouldShowGel();
  const label = monthLabel ?? (isGel ? '/თვე' : '/mo');
  if (isGel) {
    const gel = usdToGel(usdPrice);
    return `${gel.toFixed(2)} ₾${label}`;
  }
  return `$${usdPrice.toFixed(2)}${label}`;
}

/**
 * Get the price value and currency symbol separately (for inline rendering)
 */
export function getPriceDisplay(usdPrice: number): { value: string; symbol: string; suffix: string; monthLabel: string } {
  if (shouldShowGel()) {
    const gel = usdToGel(usdPrice);
    return { value: gel.toFixed(2), symbol: '', suffix: ' ₾', monthLabel: '/თვე' };
  }
  return { value: usdPrice.toFixed(2), symbol: '$', suffix: '', monthLabel: '/mo' };
}
