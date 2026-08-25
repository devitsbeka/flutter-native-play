/**
 * The subscription plans the paywall offers, and the App Store products
 * behind them.
 *
 * The offer, as the design (Figma 895:18) sets it out — two rows for the
 * same PRO tier, differing only in how long it is bought for:
 *
 *   Annual   io.mytrivia.pro.annual   59.88 GEL / year  (4.99 / month)
 *   Monthly  io.mytrivia.pro.monthly   9.99 GEL / month  ($3.99 in the App Store)
 *
 * Family PRO is not here. It is a different tier with its own banner in the
 * shop, and the design's paywall sells one thing.
 *
 * The annual product does not exist in App Store Connect yet, so on a phone
 * that row is hidden — availablePlans() intersects with the catalogue the
 * device reported, because a row for a product the store never heard of
 * opens a payment sheet and fails. On the web it sells through Stripe, which
 * prices from `webGel` and needs a yearly line in create-pro-checkout.
 */

import { IAP_PRODUCTS } from "@/hooks/useInAppPurchases";
import type { ProTierId } from "@/hooks/useProPurchase";

export interface ProPlan {
  /** Stable key, used for selection state and the period label. */
  id: "annual" | "monthly";
  /** The App Store / RevenueCat product id. */
  productId: string;
  /** What the plan grants. Stripe prices by tier on the web. */
  tier: ProTierId;
  /** Locale key for the row's name. */
  nameKey: string;
  /** Locale key for the line under it. */
  blurbKey: string;
  /** Billing period in months, for the per-month figure and the saving. */
  months: number;
  /**
   * Free days the store grants before the first charge, when an
   * introductory offer is configured on the product. Drives the default
   * selection and the button's wording. Nothing has one today.
   */
  trialDays?: number;
  /**
   * The tier's configured USD price, shown while StoreKit has not answered
   * and converted to GEL on the web (see useStorePrice). Omitted for a
   * product that does not exist yet — such a row is hidden rather than
   * priced from thin air.
   */
  fallbackUsd?: number;
  /**
   * What the web checkout actually charges, in GEL — the figure in
   * PRO_PRODUCTS in supabase/functions/create-pro-checkout. Shown as-is on
   * the web rather than converting `fallbackUsd`, which is a flat 2.75x and
   * quoted 10.97 ₾ for a 9.99 ₾ charge.
   */
  webGel?: number;
  /**
   * Marks the row the paywall opens on, when it is available here. Annual
   * carries it so that creating the product is all it takes for the paywall
   * to lead with it; until then the first available row is the default.
   */
  featured?: boolean;
}

export const PRO_PLANS: ProPlan[] = [
  {
    id: "annual",
    productId: IAP_PRODUCTS.PRO_ANNUAL,
    tier: "pro",
    nameKey: "paywall.planAnnual",
    blurbKey: "paywall.planAnnualBlurb",
    months: 12,
    // One free day, then the year. Must match the introductory offer
    // configured on io.mytrivia.pro.annual in App Store Connect: this is the
    // promise, that is what keeps it.
    trialDays: 1,
    webGel: 59.88,
    featured: true,
  },
  {
    id: "monthly",
    productId: IAP_PRODUCTS.PRO_MONTHLY,
    tier: "pro",
    nameKey: "paywall.planMonthly",
    blurbKey: "paywall.planMonthlyBlurb",
    months: 1,
    fallbackUsd: 3.99,
    webGel: 9.99,
  },
];

/**
 * The plans this device can actually buy, in the order they are shown.
 *
 * On a phone that is the intersection with StoreKit's catalogue: ask for a
 * product the store has never heard of and the purchase fails after the sheet
 * has already opened, which reads as the app being broken rather than as the
 * product being unreleased.
 *
 * Off a device there is no catalogue to intersect with — the web build sells
 * through Stripe — so the test is whether the plan has a price of its own to
 * show.
 */
export function availablePlans(
  storeProductIds: readonly string[],
  isNative: boolean,
): ProPlan[] {
  const available = isNative
    ? PRO_PLANS.filter((p) => storeProductIds.includes(p.productId))
    : PRO_PLANS.filter((p) => p.webGel !== undefined || p.fallbackUsd !== undefined);

  // Never return nothing: a paywall with no rows is worse than one showing
  // the tier we know exists and letting the store refuse it.
  return available.length > 0
    ? available
    : PRO_PLANS.filter((p) => p.id === "monthly");
}

/** The row the paywall opens on: the featured plan if it is on sale here. */
export function defaultPlan(plans: ProPlan[]): ProPlan | undefined {
  return plans.find((p) => p.featured) ?? plans[0];
}

/**
 * What a multi-month plan saves against paying monthly for the same tier, in
 * whole currency units, or null when there is nothing to compare it with.
 */
export function annualSaving(
  plan: ProPlan,
  priceOf: (plan: ProPlan) => number | null,
): number | null {
  if (plan.months <= 1) return null;
  const monthly = PRO_PLANS.find((p) => p.months === 1 && p.tier === plan.tier);
  if (!monthly) return null;
  const monthlyPrice = priceOf(monthly);
  const planPrice = priceOf(plan);
  if (monthlyPrice === null || planPrice === null) return null;
  const saving = monthlyPrice * plan.months - planPrice;
  return saving > 0 ? saving : null;
}
