/**
 * The subscription plans the paywall offers, and the App Store products
 * behind them.
 *
 * One list, because the paywall's three rows and the SKUs StoreKit is asked
 * for have to be the same three things. A row whose product id is not in the
 * store is a row that opens a payment sheet and fails, which is why
 * `availablePlans` below filters against the catalogue the device actually
 * came back with rather than against this file.
 *
 * ONLY `io.mytrivia.pro.monthly` exists in App Store Connect today (see
 * IAP_PRODUCTS in src/hooks/useInAppPurchases.ts, and the same three ids in
 * supabase/functions/_shared/iap.ts, which is what the receipt validator and
 * the RevenueCat webhook recognise). The annual and weekly ids are written
 * here in the form the others take, so that creating them — App Store Connect
 * subscription group, then RevenueCat, then the `_shared/iap.ts` catalogue —
 * is all it takes for those rows to appear. Nothing in the client needs to
 * change.
 */

import { IAP_PRODUCTS } from "@/hooks/useInAppPurchases";

export interface ProPlan {
  /** Stable key, used for selection state and analytics. */
  id: "annual" | "monthly" | "weekly";
  /** The App Store / RevenueCat product id. */
  productId: string;
  /** Locale key for the row's name. */
  nameKey: string;
  /** Locale key for the line under it. */
  blurbKey: string;
  /** Billing period in months, for the per-month figure and the saving. */
  months: number;
  /**
   * Free days the store grants before the first charge. Drives both the
   * default selection and the button's wording — a plan with a trial says
   * "try N days free", one without says "continue".
   *
   * This must match the introductory offer configured on the product in App
   * Store Connect. It is not what creates the trial; it is what the paywall
   * promises, and a promise the store does not keep is a refund.
   */
  trialDays?: number;
  /**
   * What the row shows before StoreKit answers — on the web, in the
   * simulator, or while the catalogue is still loading. The store's own
   * localised price wins whenever there is one, so this is never what a
   * buyer on a device is charged.
   */
  fallbackPrice: number;
  /** Marks the row the paywall opens on, and the one carrying the badge. */
  featured?: boolean;
}

export const PRO_PLANS: ProPlan[] = [
  {
    id: "annual",
    productId: IAP_PRODUCTS.PRO_ANNUAL,
    nameKey: "paywall.planAnnual",
    blurbKey: "paywall.planAnnualBlurb",
    months: 12,
    trialDays: 7,
    fallbackPrice: 39.99,
    featured: true,
  },
  {
    id: "monthly",
    productId: IAP_PRODUCTS.PRO_MONTHLY,
    nameKey: "paywall.planMonthly",
    blurbKey: "paywall.planMonthlyBlurb",
    months: 1,
    fallbackPrice: 3.99,
  },
  {
    id: "weekly",
    productId: IAP_PRODUCTS.PRO_WEEKLY,
    nameKey: "paywall.planWeekly",
    blurbKey: "paywall.planWeeklyBlurb",
    months: 0.25,
    fallbackPrice: 1.99,
  },
];

/**
 * The plans this device can actually buy.
 *
 * On a phone that is the intersection with StoreKit's catalogue: ask for a
 * product the store has never heard of and the purchase fails after the sheet
 * has already opened, which reads as the app being broken rather than as the
 * product being unreleased. Off a device there is no catalogue to intersect
 * with — the web build sells through Stripe — so the full list stands.
 */
export function availablePlans(
  storeProductIds: readonly string[],
  isNative: boolean,
): ProPlan[] {
  if (!isNative) return PRO_PLANS;
  const available = PRO_PLANS.filter((p) => storeProductIds.includes(p.productId));
  // Never return nothing: a paywall with no rows is worse than one showing
  // the plan we know exists and letting the store refuse it.
  return available.length > 0 ? available : PRO_PLANS.filter((p) => p.id === "monthly");
}

/** The row the paywall opens on: the featured plan if it is on sale here. */
export function defaultPlan(plans: ProPlan[]): ProPlan | undefined {
  return plans.find((p) => p.featured) ?? plans[0];
}

/**
 * What the yearly plan saves against paying monthly, in whole currency units,
 * or null when there is nothing to compare it with.
 */
export function annualSaving(
  plan: ProPlan,
  priceOf: (plan: ProPlan) => number | null,
): number | null {
  if (plan.months <= 1) return null;
  const monthly = PRO_PLANS.find((p) => p.id === "monthly");
  if (!monthly) return null;
  const monthlyPrice = priceOf(monthly);
  const planPrice = priceOf(plan);
  if (monthlyPrice === null || planPrice === null) return null;
  const saving = monthlyPrice * plan.months - planPrice;
  return saving > 0 ? saving : null;
}
