/**
 * The subscription plans the paywall offers, and the App Store products
 * behind them.
 *
 * Three rows, and what separates them is how many friends they carry as much
 * as how long they are bought for:
 *
 *   Monthly       io.mytrivia.pro.monthly     4.99 GEL / month   PRO + 1 friend
 *   PRO + friends io.mytrivia.proplus.monthly 9.99 GEL / month   PRO + 5 friends
 *   Annual        io.mytrivia.pro.annual     59.88 GEL / year    PRO + 5 friends
 *
 * The seats are not configured here. `pro_seat_allowance` in the database
 * grants 1 to the `pro` tier and 5 to `pro_plus`, so the row's `tier` is what
 * decides it — which is why the annual row is pro_plus. Getting that wrong
 * would sell five seats and hand over one.
 *
 * In lari the year costs the same per month as the monthly plan; what it buys
 * is the four extra seats. In dollars and euro it is still half the monthly
 * rate. See src/config/pricing.ts.
 *
 * The annual product does not exist in App Store Connect yet, so on a phone
 * that row is hidden — availablePlans() intersects with the catalogue the
 * device reported, because a row for a product the store never heard of
 * opens a payment sheet and fails. On the web it sells through Stripe at the
 * price in src/config/pricing.ts, in the buyer's own currency.
 *
 * **Free trials are split by platform, on purpose.** `trialDays` below is the
 * offer the *web* checkout grants, and it has to match `TRIAL_DAYS` in
 * create-pro-checkout or Stripe will not honour it. On a phone it is ignored
 * entirely: only App Store Connect can grant a trial there, so the paywall
 * reads it off the store product (`IAPProduct.introFreeDays`). A number in
 * this file cannot make StoreKit grant anything, and advertising one it will
 * not honour is a 2.3.1 rejection — which is why this used to say trials were
 * never declared here at all.
 */

import { IAP_PRODUCTS } from "@/hooks/useInAppPurchases";
import type { ProTierId } from "@/hooks/useProPurchase";
import { PRICES, type PriceKey } from "@/config/pricing";

export interface ProPlan {
  /** Stable key, used for selection state and the period label. */
  id: "annual" | "monthly" | "friends";
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
   * Free days this plan's **web** checkout grants, or undefined.
   *
   * Web only, and deliberately so. On a phone the trial is read off the store
   * product (`IAPProduct.introFreeDays`) because App Store Connect is the only
   * thing that can actually grant one there — a number in this file could not
   * make StoreKit honour it, and claiming one it will not honour is a 2.3.1
   * rejection. On the web the app controls the offer, so it is declared here.
   *
   * **This must match `TRIAL_DAYS` in supabase/functions/create-pro-checkout.**
   * They deploy through different pipelines (Cloudflare on merge, Supabase via
   * Lovable), so a change here that has not shipped there yet promises a trial
   * Stripe will not give. Change both, and deploy the function first.
   */
  trialDays?: number;
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
    // pro_plus, not pro: the year carries five friend seats. The tier is the
    // only thing that decides that — see the note at the top of this file.
    tier: "pro_plus",
    nameKey: "paywall.planAnnual",
    blurbKey: "paywall.planAnnualBlurb",
    months: 12,
    priceKey: "pro_annual",
    // Three free days on the year. On iOS this does nothing on its own — the
    // matching introductory offer has to exist on io.mytrivia.pro.annual in
    // App Store Connect, and the paywall reads it from the store.
    trialDays: 3,
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
  {
    id: "friends",
    productId: IAP_PRODUCTS.PRO_PLUS_MONTHLY,
    tier: "pro_plus",
    nameKey: "paywall.planFriends",
    blurbKey: "paywall.planFriendsBlurb",
    months: 1,
    priceKey: "pro_plus_monthly",
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

/**
 * How many friends a plan can pass PRO to.
 *
 * This is a MIRROR, not the rule. `pro_seat_allowance` in the database decides
 * it — 5 for pro_plus and pro_master, 1 for pro and standard — and that
 * function is what `grant_pro_seat` enforces against. This exists so the
 * paywall can name the number before anyone has bought anything, and
 * src/__tests__/proOffer.test.ts reads the SQL to check the two still agree.
 *
 * The database also grades `pro_master` at 5 and `standard` at 1. Neither is
 * sellable here — ProTierId is the two tiers the paywall offers — so they are
 * not repeated in this switch, where they would be unreachable.
 */
export function friendSeats(tier: ProTierId): number {
  return tier === "pro_plus" ? 5 : 1;
}

/** The row the paywall opens on: the featured plan if it is on sale here. */
export function defaultPlan(plans: ProPlan[]): ProPlan | undefined {
  return plans.find((p) => p.featured) ?? plans[0];
}

/**
 * The locale key for the word after the price — "month" or "year".
 *
 * Keyed off how long the plan is bought for, NOT off its id. It was
 * `paywall.period_${plan.id}` until the third row arrived: `friends` had no
 * such key, so the footnote under the button read
 * "9.99 ₾ / paywall.period_friends" — a raw translation key, on the screen
 * App Review reads the price off. Deriving it means a fourth row cannot
 * reintroduce that, because there is no new key to forget.
 *
 * Shared by every surface that prints a plan's price: the paywall footnote
 * and the Discover cover. The cover used to say "/ month" in its own locale
 * string while quoting the YEARLY total of the plan it opens on — a price
 * twelve times what the store charges per month, on the first screen a
 * reviewer sees the offer.
 */
export function periodKeyFor(plan: ProPlan): string {
  return plan.months >= 12 ? "paywall.period_annual" : "paywall.period_monthly";
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
