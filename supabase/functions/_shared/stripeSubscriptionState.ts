/**
 * What a Stripe subscription object means for our entitlement table.
 *
 * Deliberately free of Deno, Stripe and Supabase imports: this file is the
 * decision, and the webhook beside it is the plumbing. Vitest imports it
 * directly (`src/__tests__/stripeSubscriptionState.test.ts`), which is the
 * only way any of this logic gets tested — edge functions themselves run on
 * Deno with `https://esm.sh` imports and never execute in CI.
 *
 * The rules encoded here mirror `syncSubscription` in `iap.ts`, because a web
 * subscriber and a store subscriber must end up with the same row shape:
 *
 *   - The store, not us, decides when a subscription ends. `current_period_end`
 *     is authoritative and already reflects cancellation and billing retry —
 *     the same reason `iap.ts` refuses to compute an expiry from a product id.
 *   - Nothing is ever deleted. A lapsed subscription is a row with a past
 *     expiry, so history survives a cancellation.
 *   - A platform only revokes what it granted. Stripe expiring a web
 *     subscription must not touch an App Store row, an admin grant or a
 *     referral reward, exactly as `iap.ts` refuses to expire a row whose
 *     `purchase_platform` is not the store's.
 */

/** The two tiers the paywall sells. Anything else is not ours to grant. */
export type WebTier = "pro" | "pro_plus";

const TIERS: readonly string[] = ["pro", "pro_plus"];

/**
 * Stripe statuses that mean "this person is entitled right now".
 *
 * `past_due` is in the list on purpose: Stripe keeps retrying the card for
 * days, and `current_period_end` has not moved, so the honest reading is that
 * the paid period they already bought has not run out yet. Dropping them the
 * moment a renewal fails would revoke time they paid for.
 *
 * `incomplete` is NOT: that is a subscription whose very first payment has not
 * succeeded, which is a customer who has paid nothing.
 */
const ENTITLING_STATUSES: readonly string[] = ["active", "trialing", "past_due"];

/** The minimum shape this module needs out of a Stripe subscription. */
export interface StripeSubscriptionLike {
  status: string;
  current_period_end: number | null | undefined;
  cancel_at_period_end?: boolean | null;
  metadata?: Record<string, string | undefined> | null;
}

export type SubscriptionDecision =
  | { action: "ignore"; reason: string }
  | {
      action: "grant";
      userId: string;
      tier: WebTier;
      expiresAt: string;
      autoRenew: boolean;
      /** Whether this state has actually been paid for — see payWelcome below. */
      payWelcome: boolean;
    }
  | { action: "expire"; userId: string; reason: string };

/** Stripe user ids are Supabase uuids. "guest" and junk are neither. */
export function isUserId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

/**
 * Read a subscription and say what should happen to the user's row.
 *
 * Returning `ignore` rather than throwing matters: the caller answers Stripe
 * with a 200 for every ignore, because a 4xx makes Stripe retry the same
 * unusable event for three days and then disable the endpoint. An event we
 * cannot act on is not an error on Stripe's side.
 */
export function decideSubscription(
  subscription: StripeSubscriptionLike,
): SubscriptionDecision {
  const metadata = subscription.metadata ?? {};
  const userId = metadata.user_id;
  const tier = metadata.tier_id;

  // Guest checkouts wrote the literal string "guest" here and could never be
  // reconciled to an account. create-pro-checkout requires auth now, so this
  // only catches sessions created before that shipped.
  if (!isUserId(userId)) {
    return { action: "ignore", reason: `unusable user_id: ${String(userId)}` };
  }

  if (typeof tier !== "string" || !TIERS.includes(tier)) {
    return { action: "ignore", reason: `unknown tier_id: ${String(tier)}` };
  }

  if (!ENTITLING_STATUSES.includes(subscription.status)) {
    return { action: "expire", userId, reason: `status ${subscription.status}` };
  }

  const periodEnd = subscription.current_period_end;
  if (typeof periodEnd !== "number" || !Number.isFinite(periodEnd) || periodEnd <= 0) {
    // Entitling status with no period end is a shape we do not understand.
    // Granting a made-up expiry is how the old verify-receipt handed out a
    // year of PRO; ignoring leaves the previous state alone.
    return { action: "ignore", reason: "no current_period_end" };
  }

  return {
    action: "grant",
    userId,
    tier: tier as WebTier,
    expiresAt: new Date(periodEnd * 1000).toISOString(),
    autoRenew: subscription.cancel_at_period_end !== true,
    // The welcome bundle is 25 000 or 50 000 coins. It is paid once the
    // subscription is genuinely paid for, not during the 3-day trial the
    // annual plan grants — a trial that is cancelled on day two should not
    // have cost us the bundle. The entitlement itself starts immediately;
    // only the coins wait, and the next renewal event pays them.
    payWelcome: subscription.status === "active",
  };
}

/**
 * Whether an existing row may be overwritten by a web grant.
 *
 * A person can hold both — subscribe on the App Store, then again on the web,
 * or the other way round — and whichever event arrives second must not shorten
 * the other. So a web grant only writes when it leaves the user at least as
 * well off: a later expiry, or the same expiry at a stronger tier.
 */
const RANK: Record<string, number> = { ad_free: 1, standard: 1, pro: 2, pro_plus: 3 };

export function webGrantWins(
  incoming: { tier: WebTier; expiresAt: string },
  existing: { vip_tier?: string | null; expires_at?: string | null } | null,
): boolean {
  if (!existing?.expires_at) return true;

  const existingEnd = new Date(existing.expires_at).getTime();
  const incomingEnd = new Date(incoming.expiresAt).getTime();
  if (Number.isNaN(existingEnd)) return true;

  // An expired row is not an entitlement worth protecting.
  if (existingEnd <= Date.now()) return true;

  if (incomingEnd > existingEnd) return true;

  const existingRank = RANK[existing.vip_tier ?? ""] ?? 0;
  return incomingEnd === existingEnd && RANK[incoming.tier] > existingRank;
}

/**
 * Platforms a Stripe expiry is allowed to end.
 *
 * `iap.ts` has the mirror of this list for the store side. An admin grant, a
 * referral reward or an App Store subscription is not Stripe's to revoke.
 */
export function webMayExpire(purchasePlatform: string | null | undefined): boolean {
  return purchasePlatform === "web" || purchasePlatform === "stripe";
}
