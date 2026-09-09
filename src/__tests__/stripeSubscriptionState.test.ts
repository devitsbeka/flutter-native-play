import { describe, it, expect } from "vitest";
import {
  decideSubscription,
  isUserId,
  webGrantWins,
  webMayExpire,
} from "../../supabase/functions/_shared/stripeSubscriptionState";

/**
 * The web subscription path, which had no code at all until now.
 *
 * `create-pro-checkout` has always opened a `mode: "subscription"` session,
 * and the only Stripe webhook handled gem packs — a subscription session has
 * no `product_id`, so it hit `lookupGemPack`, returned 400, and Stripe retried
 * for three days and gave up. Money in, entitlement never granted, on every
 * web PRO sale.
 *
 * Edge functions never run in CI (Deno, `https://esm.sh` imports), so the
 * decision was deliberately split into a dependency-free module. This file is
 * the only thing standing between that logic and production.
 */

const USER = "11111111-2222-3333-4444-555555555555";
const HOUR = 3600;
const nowSec = () => Math.floor(Date.now() / 1000);

const sub = (over: Record<string, unknown> = {}) => ({
  status: "active",
  current_period_end: nowSec() + 30 * 24 * HOUR,
  cancel_at_period_end: false,
  metadata: { user_id: USER, tier_id: "pro" },
  ...over,
});

describe("isUserId", () => {
  it("accepts a uuid and rejects the guest sentinel", () => {
    // create-pro-checkout wrote the literal string "guest" for an
    // unauthenticated buyer. Granting on that would mean picking a user.
    expect(isUserId(USER)).toBe(true);
    expect(isUserId("guest")).toBe(false);
    expect(isUserId(undefined)).toBe(false);
    expect(isUserId("")).toBe(false);
  });
});

describe("decideSubscription", () => {
  it("grants the tier and the period end the subscription carries", () => {
    const end = nowSec() + 14 * 24 * HOUR;
    const decision = decideSubscription(sub({ current_period_end: end, metadata: { user_id: USER, tier_id: "pro_plus" } }));

    expect(decision).toMatchObject({
      action: "grant",
      userId: USER,
      tier: "pro_plus",
      expiresAt: new Date(end * 1000).toISOString(),
      autoRenew: true,
    });
  });

  it("never computes an expiry of its own", () => {
    // The bug iap.ts records: deriving expiry from the product id ("monthly"
    // meant +30 days) left cancelled subscriptions active until a date we had
    // invented. An entitling status with no period end is a shape we do not
    // understand, and the safe answer is to leave the row alone.
    expect(decideSubscription(sub({ current_period_end: null }))).toMatchObject({ action: "ignore" });
    expect(decideSubscription(sub({ current_period_end: 0 }))).toMatchObject({ action: "ignore" });
  });

  it("ignores a guest subscription rather than failing the delivery", () => {
    // Returning 4xx to Stripe makes it retry for three days and then disable
    // the endpoint — which would take gem purchases down with it.
    const decision = decideSubscription(sub({ metadata: { user_id: "guest", tier_id: "pro" } }));
    expect(decision.action).toBe("ignore");
  });

  it("refuses a tier the paywall does not sell", () => {
    // Metadata is editable in the Stripe dashboard. It names the product; it
    // does not get to invent an entitlement.
    for (const tier of ["pro_master", "admin", "", undefined]) {
      expect(decideSubscription(sub({ metadata: { user_id: USER, tier_id: tier } })).action).toBe("ignore");
    }
  });

  it("keeps a past_due subscriber entitled until the period they paid for ends", () => {
    // Stripe retries a failed card for days without moving current_period_end.
    // Revoking on the first failure takes away time already paid for.
    expect(decideSubscription(sub({ status: "past_due" })).action).toBe("grant");
  });

  it("entitles a trialing subscriber but does not pay them the welcome bundle", () => {
    // The annual plan grants 3 free days. PRO starts at once; the 25 000-coin
    // bundle waits for the first real payment, so a trial cancelled on day two
    // costs nothing.
    const trial = decideSubscription(sub({ status: "trialing" }));
    expect(trial).toMatchObject({ action: "grant", payWelcome: false });
    expect(decideSubscription(sub({ status: "active" }))).toMatchObject({ payWelcome: true });
  });

  it("expires on the statuses that mean nobody is paying", () => {
    for (const status of ["canceled", "unpaid", "incomplete", "incomplete_expired", "paused"]) {
      expect(decideSubscription(sub({ status })), status).toMatchObject({ action: "expire", userId: USER });
    }
  });

  it("reports a cancellation scheduled for the period end as auto_renew off", () => {
    // Still entitled, still until the same date — but the app should stop
    // describing it as renewing.
    expect(decideSubscription(sub({ cancel_at_period_end: true }))).toMatchObject({
      action: "grant",
      autoRenew: false,
    });
  });
});

describe("webGrantWins", () => {
  const later = new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString();
  const sooner = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString();
  const past = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  it("writes when there is nothing there", () => {
    expect(webGrantWins({ tier: "pro", expiresAt: later }, null)).toBe(true);
  });

  it("does not shorten a longer entitlement bought somewhere else", () => {
    // Subscribe on the App Store, then again on the web: whichever event lands
    // second must not take time away.
    expect(webGrantWins({ tier: "pro", expiresAt: sooner }, { vip_tier: "pro", expires_at: later })).toBe(false);
  });

  it("upgrades the tier when the dates match", () => {
    expect(webGrantWins({ tier: "pro_plus", expiresAt: later }, { vip_tier: "pro", expires_at: later })).toBe(true);
    expect(webGrantWins({ tier: "pro", expiresAt: later }, { vip_tier: "pro_plus", expires_at: later })).toBe(false);
  });

  it("overwrites a lapsed row", () => {
    expect(webGrantWins({ tier: "pro", expiresAt: later }, { vip_tier: "pro_plus", expires_at: past })).toBe(true);
  });
});

describe("webMayExpire", () => {
  it("only ends what Stripe granted", () => {
    // The mirror of iap.ts's rule. An admin grant, a referral reward or an App
    // Store subscription is not Stripe's to revoke — and `grant_vip_days`
    // writes `standard` rows with no platform at all.
    expect(webMayExpire("web")).toBe(true);
    expect(webMayExpire("stripe")).toBe(true);
    expect(webMayExpire("ios")).toBe(false);
    expect(webMayExpire("android")).toBe(false);
    expect(webMayExpire(null)).toBe(false);
    expect(webMayExpire(undefined)).toBe(false);
  });
});
