/**
 * Store purchases, resolved into entitlements.
 *
 * One catalog and one apply path, shared by the two things that can learn
 * about a purchase: `verify-receipt` (the app asking us to re-sync after a
 * purchase or a restore) and `revenuecat-webhook` (RevenueCat telling us
 * something changed while the app wasn't looking).
 *
 * The rule both obey: **nothing a client says is evidence.** The app's call
 * is a trigger, not a payload — we go and ask RevenueCat what this user
 * actually owns, and write that. The previous version of verify-receipt
 * trusted `{ productId, userId }` straight off the request body and handed
 * out a year of PRO to anyone who asked.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const REVENUECAT_API = "https://api.revenuecat.com/v1";

/**
 * Product ids as configured in App Store Connect and RevenueCat.
 *
 * Both subscriptions are monthly: PRO and Friends PRO are feature tiers, not
 * billing periods, and the app renders both with a "/month" label. They were
 * previously named `vip.monthly`/`vip.annual` after an unrelated shop_items
 * migration, which would have led to the $7.99 tier being created as a yearly
 * product. Kept in sync with IAP_PRODUCTS in src/hooks/useInAppPurchases.ts.
 */
export const PRODUCTS = {
  PRO_MONTHLY: "io.mytrivia.pro.monthly",
  PRO_PLUS_MONTHLY: "io.mytrivia.proplus.monthly",
  AD_FREE: "io.mytrivia.adfree",
  GEMS_100: "io.mytrivia.gems.100",
  GEMS_500: "io.mytrivia.gems.500",
  GEMS_1500: "io.mytrivia.gems.1500",
  GEMS_5000: "io.mytrivia.gems.5000",
} as const;

type CatalogEntry =
  | { kind: "subscription"; tier: "pro" | "pro_plus" }
  | { kind: "non_consumable"; tier: "ad_free" }
  | { kind: "consumable"; gems: number };

/**
 * The single source of truth for what a product grants.
 *
 * Subscription expiry is never computed here — it comes from the store, via
 * RevenueCat. The old code derived it from the product id ("monthly" in the
 * string meant +30 days), which meant a cancelled subscription stayed active
 * until a date we had invented.
 *
 * Note the tiers: `pro` and `pro_plus` are what VipContext actually reads.
 * The old code wrote `vip`, which matched no branch in VIP_BENEFITS_BY_TIER
 * and left Friends PRO subscribers silently on plain PRO benefits —
 * isProPlus() returned false for someone who had just paid for the upgrade.
 */
const CATALOG: Record<string, CatalogEntry> = {
  [PRODUCTS.PRO_MONTHLY]: { kind: "subscription", tier: "pro" },
  [PRODUCTS.PRO_PLUS_MONTHLY]: { kind: "subscription", tier: "pro_plus" },
  [PRODUCTS.AD_FREE]: { kind: "non_consumable", tier: "ad_free" },
  // These are totals. No pack advertises a bonus any more, so total equals
  // face value — but the field means "what the buyer is owed", not "the number
  // in the id". An earlier ladder advertised "700 +200" and credited 700.
  // Keep in step with GEM_PACKS in src/config/gemPacks.ts; the repo invariant
  // test fails if the two disagree on which products exist.
  [PRODUCTS.GEMS_100]: { kind: "consumable", gems: 100 },
  [PRODUCTS.GEMS_500]: { kind: "consumable", gems: 500 },
  [PRODUCTS.GEMS_1500]: { kind: "consumable", gems: 1500 },
  [PRODUCTS.GEMS_5000]: { kind: "consumable", gems: 5000 },
};

export function lookupProduct(productId: string): CatalogEntry | null {
  // RevenueCat reports iOS subscription products with the base id, but Google
  // appends the base plan (`product:base-plan`). Strip it before matching so
  // one catalog serves both stores.
  return CATALOG[productId] ?? CATALOG[productId.split(":")[0]] ?? null;
}

/** Far-future stand-in for "owned forever". */
const LIFETIME = "2126-01-01T00:00:00Z";

export interface SubscriberState {
  /** Active, non-expired subscription/non-consumable entitlements. */
  active: Array<{ productId: string; expiresAt: string; store: string; transactionId: string }>;
  /** Every consumable purchase RevenueCat knows about, for gem crediting. */
  consumables: Array<{ productId: string; transactionId: string; purchasedAt: string; store: string }>;
}

/**
 * Ask RevenueCat what this user owns.
 *
 * `appUserID` is the Supabase user id — the client calls
 * `Purchases.logIn({ appUserID: user.id })`, so the two identities already
 * line up. Uses the *secret* API key, which must never reach a client.
 */
export async function fetchSubscriberState(appUserId: string): Promise<SubscriberState> {
  const apiKey = Deno.env.get("REVENUECAT_SECRET_API_KEY");
  if (!apiKey) {
    throw new Error("REVENUECAT_SECRET_API_KEY is not configured");
  }

  const res = await fetch(`${REVENUECAT_API}/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`RevenueCat lookup failed (${res.status}): ${body}`);
  }

  const json = await res.json();
  const subscriber = json?.subscriber ?? {};
  const now = Date.now();

  const active: SubscriberState["active"] = [];

  // Auto-renewing subscriptions. `expires_date` is authoritative and already
  // reflects cancellation, billing retry and refunds.
  for (const [productId, sub] of Object.entries<Record<string, unknown>>(subscriber.subscriptions ?? {})) {
    const expires = sub?.expires_date as string | null;
    // A null expiry on a subscription means a lifetime/sandbox grant.
    const expiresAt = expires ?? LIFETIME;
    if (new Date(expiresAt).getTime() <= now) continue;
    if (sub?.refunded_at) continue;
    active.push({
      productId,
      expiresAt,
      store: (sub?.store as string) ?? "unknown",
      transactionId: (sub?.original_purchase_date as string) ?? productId,
    });
  }

  // Non-consumables (ad-free) arrive under non_subscriptions but never expire.
  const consumables: SubscriberState["consumables"] = [];
  for (const [productId, entries] of Object.entries<Array<Record<string, unknown>>>(
    subscriber.non_subscriptions ?? {},
  )) {
    for (const entry of entries ?? []) {
      const product = lookupProduct(productId);
      if (!product) continue;

      const transactionId = (entry?.id as string) ?? (entry?.store_transaction_id as string) ?? "";
      if (!transactionId) continue;

      if (product.kind === "consumable") {
        consumables.push({
          productId,
          transactionId,
          purchasedAt: (entry?.purchase_date as string) ?? new Date().toISOString(),
          store: (entry?.store as string) ?? "unknown",
        });
      } else {
        active.push({
          productId,
          expiresAt: LIFETIME,
          store: (entry?.store as string) ?? "unknown",
          transactionId,
        });
      }
    }
  }

  return { active, consumables };
}

/**
 * Write the subscription row to match what the store says is active.
 *
 * Picks the strongest entitlement rather than whichever arrived last: someone
 * holding both ad-free and PRO should read as PRO. When nothing is active the
 * row is expired rather than deleted, so history and analytics survive a
 * cancellation.
 */
export async function syncSubscription(
  supabase: SupabaseClient,
  userId: string,
  state: SubscriberState,
): Promise<{ tier: string | null; expiresAt: string | null }> {
  const RANK: Record<string, number> = { ad_free: 1, pro: 2, pro_plus: 3 };

  let best: { tier: string; expiresAt: string; productId: string; store: string; transactionId: string } | null = null;

  for (const entitlement of state.active) {
    const product = lookupProduct(entitlement.productId);
    if (!product || product.kind === "consumable") continue;

    const candidate = {
      tier: product.tier,
      expiresAt: entitlement.expiresAt,
      productId: entitlement.productId,
      store: entitlement.store,
      transactionId: entitlement.transactionId,
    };

    if (!best || RANK[candidate.tier] > RANK[best.tier]) best = candidate;
  }

  if (!best) {
    // Nothing active. Expire any store-granted row, but never touch a row that
    // came from somewhere else — admin grants and referral rewards are not the
    // store's to revoke.
    const { data: existing } = await supabase
      .from("vip_subscriptions")
      .select("purchase_platform, expires_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing && ["ios", "android", "app_store", "play_store"].includes(existing.purchase_platform ?? "")) {
      await supabase
        .from("vip_subscriptions")
        .update({ expires_at: new Date().toISOString(), auto_renew: false, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
    }
    return { tier: null, expiresAt: null };
  }

  const platform = best.store === "play_store" ? "android" : "ios";

  const { error } = await supabase
    .from("vip_subscriptions")
    .upsert(
      {
        user_id: userId,
        vip_tier: best.tier,
        expires_at: best.expiresAt,
        auto_renew: best.tier !== "ad_free",
        apple_product_id: best.productId,
        apple_original_transaction_id: best.transactionId,
        purchase_platform: platform,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (error) throw error;

  return { tier: best.tier, expiresAt: best.expiresAt };
}

/**
 * Credit gems for consumable purchases not yet applied.
 *
 * `iap_events` is the ledger — its unique event_id is what makes this safe to
 * call repeatedly, whether from a webhook retry or from the user tapping
 * "restore purchases" a third time.
 */
export async function creditConsumables(
  supabase: SupabaseClient,
  userId: string,
  state: SubscriberState,
): Promise<number> {
  let credited = 0;

  for (const purchase of state.consumables) {
    const product = lookupProduct(purchase.productId);
    if (!product || product.kind !== "consumable") continue;

    const eventId = `consumable:${purchase.transactionId}`;

    // Claim the transaction first. A duplicate key here means another call
    // already credited it, so we skip rather than double-crediting.
    const { error: claimError } = await supabase.from("iap_events").insert({
      event_id: eventId,
      event_type: "CONSUMABLE_PURCHASE",
      user_id: userId,
      product_id: purchase.productId,
      store: purchase.store,
      transaction_id: purchase.transactionId,
      event_at: purchase.purchasedAt,
      payload: purchase,
    });

    if (claimError) {
      // 23505 = unique_violation: already applied, which is the happy path.
      if (claimError.code !== "23505") {
        console.error("Failed to claim consumable:", claimError);
      }
      continue;
    }

    const { error: creditError } = await supabase.rpc("update_user_currency", {
      p_user_id: userId,
      p_gems_delta: product.gems,
      p_coins_delta: 0,
    });

    if (creditError) {
      // Release the claim so a later retry can credit it, rather than leaving
      // the user paid-but-empty with the ledger saying "done".
      await supabase.from("iap_events").delete().eq("event_id", eventId);
      console.error("Failed to credit gems, claim released:", creditError);
      continue;
    }

    await supabase.from("purchase_transactions").insert({
      user_id: userId,
      product_id: purchase.productId,
      product_type: "gems",
      value_received: { gems: product.gems },
      platform: purchase.store === "play_store" ? "android" : "ios",
    });

    credited += product.gems;
  }

  return credited;
}

/** Re-sync everything the store knows about one user. */
export async function syncUserFromStore(supabase: SupabaseClient, userId: string) {
  const state = await fetchSubscriberState(userId);
  const subscription = await syncSubscription(supabase, userId, state);
  const gemsCredited = await creditConsumables(supabase, userId, state);
  return { ...subscription, gemsCredited };
}
