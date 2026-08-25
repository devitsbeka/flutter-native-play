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
 * opens a payment sheet and fails. On the web it sells through Stripe at the
 * price in src/config/pricing.ts, in the buyer's own currency.
 *
 * **Free trials are not declared here.** A `trialDays: 1` used to sit on the
 * annual plan with a comment saying it had to match the introductory offer in
 * App Store Connect — a claim about a dashboard that nothing in this repo
 * could check, so the app was one edit away from advertising a trial the
 * store would not grant. The offer is read off the store product at render
 * time instead; see `IAPProduct.introFreeDays`.
 */

import { IAP_PRODUCTS } from "@/hooks/useInAppPurchases";
import type { ProTierId } from "@/hooks/useProPurchase";
import { PRICES, type PriceKey } from "@/config/pricing";

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
   * Which row of src/config/pricing.ts prices this plan. That table holds
   * the figure for every currency the app charges in, and the checkout
   * charges from its mirror — so what the row shows is what is taken.
   */
  priceKey: PriceKey;
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
    priceKey: "pro_annual",
    featured: true,
  },
  {
    id: "monthly",
    productId: IAP_PRODUCTS.PRO_MONTHLY,
    tier: "pro",
    nameKey: "paywall.planMonthly",
    blurbKey: "paywall.planMonthlyBlurb",
    months: 1,
    priceKey: "pro_monthly",
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
 *
 * **On native, an empty catalogue yields an empty list, and that is correct.**
 * This used to fall back to the monthly row on the reasoning that a paywall
 * with no rows is worse than one the store might refuse. It is not. StoreKit
 * answers with nothing whenever the products are not yet approved, not
 * attached to the version, or simply unreachable — which is exactly the state
 * an App Review device is in — and the fallback then rendered a row priced
 * from `fallbackUsd`, in dollars, with a live Subscribe button behind it.
 * That is two rejections on one screen: a price that is not the price charged
 * (2.3.1) and a purchase that cannot complete (2.1).
 *
 * The caller renders an explicit "store unavailable" state instead. Saying
 * "we cannot reach the App Store right now" is a worse paywall and an
 * honest one.
 */
export function availablePlans(
  storeProductIds: readonly string[],
  isNative: boolean,
): ProPlan[] {
  if (isNative) {
    return PRO_PLANS.filter((p) => storeProductIds.includes(p.productId));
  }

  return PRO_PLANS.filter((p) => PRICES[p.priceKey] !== undefined);
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
