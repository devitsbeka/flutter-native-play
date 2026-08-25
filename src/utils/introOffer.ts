/**
 * How many free days a store product's introductory offer actually grants.
 *
 * The paywall's "Try 1 day free" used to come from a constant in
 * `src/config/proPlans.ts`, next to a comment saying it "must match the
 * introductory offer configured in App Store Connect". Nothing could check
 * that, and the two live in different systems changed by different people —
 * so the app was one dashboard edit away from advertising a free trial the
 * store would not honour, which is a 2.3.1/3.1.2 rejection on the screen App
 * Review reads hardest.
 *
 * RevenueCat already reports the real offer on every store product, so the
 * promise is read from the store instead of declared in the bundle.
 */

/** The shape RevenueCat reports; only the fields this needs. */
export interface IntroPriceLike {
  price?: number | null;
  periodUnit?: string | null;
  periodNumberOfUnits?: number | null;
  cycles?: number | null;
}

const DAYS_PER_UNIT: Record<string, number> = {
  DAY: 1,
  WEEK: 7,
  MONTH: 30,
  YEAR: 365,
};

/**
 * Free days before the first charge, or undefined when the product has no
 * free introductory offer.
 *
 * Only a **zero-price** offer counts. RevenueCat reports pay-up-front and
 * pay-as-you-go introductory offers through the same field, and those are
 * discounts, not trials — calling a discounted first month "free" is the
 * same misstatement in the other direction.
 *
 * `cycles` multiplies the period: a 3-cycle 1-week free offer is 21 days.
 */
export function introFreeDays(intro: IntroPriceLike | null | undefined): number | undefined {
  if (!intro) return undefined;
  if (typeof intro.price !== "number" || intro.price > 0) return undefined;

  const unit = (intro.periodUnit ?? "").toUpperCase();
  const perUnit = DAYS_PER_UNIT[unit];
  if (!perUnit) return undefined;

  const units = intro.periodNumberOfUnits ?? 0;
  if (units <= 0) return undefined;

  // `cycles` is absent on some storefronts; one cycle is the sane floor.
  const cycles = intro.cycles && intro.cycles > 0 ? intro.cycles : 1;

  return perUnit * units * cycles;
}
