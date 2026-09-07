/**
 * The word after a subscription price — "/თვე" or "/mo".
 *
 * This file used to be a currency converter as well: `usdToGel`, `formatPrice`,
 * `formatMonthlyPrice` and `getPriceDisplay` all multiplied a USD figure by a
 * flat `USD_TO_GEL_RATE = 2.75`, which is how a Georgian buyer came to be
 * quoted 10.97 lari for a subscription Stripe charges 9.99 lari for, and how a
 * gem pack Apple sells for $0.99 came to be advertised at 2.72 ₾. Showing one
 * price and taking another is guideline 2.3.1.
 *
 * Every one of those exports was already dead — the two remaining call sites
 * read `getPriceDisplay(x).monthLabel` and threw the converted number away —
 * so they are gone rather than left lying next to a price surface for the next
 * person to reach for. What is left takes no amount at all, because it does
 * not have one to get wrong.
 *
 * Prices come from src/config/pricing.ts, which holds a real figure per
 * currency and is mirrored by the checkout, or from StoreKit via
 * src/hooks/useStorePrice.ts on a device. Nothing is converted anywhere.
 */

import { readAppLanguage } from '@/utils/appLanguage';

/**
 * The per-month suffix in the app's current language.
 *
 * Georgian is the only language with its own form; everything else the app
 * ships in uses the "/mo" abbreviation.
 */
export function monthLabel(): string {
  return readAppLanguage() === 'ka' ? '/თვე' : '/mo';
}
