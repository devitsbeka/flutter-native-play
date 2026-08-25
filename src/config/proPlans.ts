/**
 * The subscription plans the paywall offers, and the App Store products
 * behind them.
 *
 * Every figure here is one the app already charges. What the app actually
 * sells today is two tiers, both monthly:
 *
 *   Solo PRO    io.mytrivia.pro.monthly      $3.99   /  9.99 GEL on Stripe
 *   Family PRO  io.mytrivia.proplus.monthly  $7.99   / 19.99 GEL on Stripe
 *
 * (Native fallbacks from MobileProCarousel, GEL prices from PRO_PRODUCTS in
 * supabase/functions/create-pro-checkout. The two are the same tier priced
 * per store, not two different offers — and neither figure is ever what a
 * buyer on a phone sees, because StoreKit's own localised string wins there.)
 *
 * There is no annual product, no weekly product, and no introductory offer
 * anywhere in App Store Connect. The annual and weekly rows below therefore
 * carry no price of their own: a plan with no `fallbackUsd` is only ever
 * shown when the store itself quotes one, so nothing invented reaches a
 * screen. Create the products, and the rows appear priced by Apple.
 *
 * `trialDays` is the trial the annual plan is meant to carry: one day, the
 * same one the cover promotes. It is a promise, and the introductory offer
 * on the product in App Store Connect is what keeps it — the row is hidden
 * until that product exists, so the promise cannot be shown before then.
 */

import { IAP_PRODUCTS } from "@/hooks/useInAppPurchases";
import type { ProTierId } from "@/hooks/useProPurchase";

export interface ProPlan {
  /** Stable key, used for selection state and the period label. */
  id: "solo_monthly" | "family_monthly" | "annual" | "weekly";
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
    // The offer the cover promotes: one free day, then the year. Set here so
    // the paywall says it the moment the product exists — and it must match
    // the introductory offer configured on io.mytrivia.pro.annual in App
    // Store Connect, because this is the promise and that is what keeps it.
    trialDays: 1,
    featured: true,
  },
  {
    id: "solo_monthly",
    productId: IAP_PRODUCTS.PRO_MONTHLY,
    tier: "pro",
    nameKey: "paywall.planSolo",
    blurbKey: "paywall.planSoloBlurb",
    months: 1,
    fallbackUsd: 3.99,
    webGel: 9.99,
  },
  {
    id: "family_monthly",
    productId: IAP_PRODUCTS.PRO_PLUS_MONTHLY,
    tier: "pro_plus",
    nameKey: "paywall.planFamily",
    blurbKey: "paywall.planFamilyBlurb",
    months: 1,
    fallbackUsd: 7.99,
    webGel: 19.99,
  },
  {
    id: "weekly",
    productId: IAP_PRODUCTS.PRO_WEEKLY,
    tier: "pro",
    nameKey: "paywall.planWeekly",
    blurbKey: "paywall.planWeeklyBlurb",
    months: 0.25,
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
    : PRO_PLANS.filter((p) => p.fallbackUsd !== undefined);

  // Never return nothing: a paywall with no rows is worse than one showing
  // the tier we know exists and letting the store refuse it.
  return available.length > 0
    ? available
    : PRO_PLANS.filter((p) => p.id === "solo_monthly");
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
