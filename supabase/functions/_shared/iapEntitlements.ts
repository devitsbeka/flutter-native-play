/**
 * What a store purchase means, with nothing Deno-specific in it.
 *
 * Split out of `iap.ts` so the rules can be executed by a test rather than
 * read. `iap.ts` is a Deno module — `Deno.env`, an `https://` import — and
 * TypeScript follows an import out of `src/` into the browser config, so a
 * test that imported it turned `npm run typecheck` red in CI while passing
 * locally. `src/__tests__/noDenoInBrowserTypecheck.test.ts` is the rule; this
 * is the same shape `_shared/pushPayload.ts` has for the same reason.
 *
 * Everything here is pure or takes the database as an argument. Fetching from
 * RevenueCat — the one part that needs the secret key and the runtime — stays
 * in `iap.ts`, which re-exports this file so its callers see no difference.
 */

/**
 * The database, described by what this module actually calls on it.
 *
 * Structural rather than `SupabaseClient`, whose type lives behind an
 * `https://` specifier that does not resolve outside Deno — importing it here
 * would reintroduce exactly the problem this split exists to solve.
 */
// deno-lint-ignore no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IapDb = any;

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
  // Same PRO tier, other billing periods, sold by the paywall. Expiry comes
  // from the store either way, so the period is not encoded here.
  PRO_ANNUAL: "io.mytrivia.pro.annual",
  PRO_WEEKLY: "io.mytrivia.pro.weekly",
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
  // pro_plus, not pro: the year is sold as PRO for you and five friends, and
  // the tier is the only thing that decides the seat count —
  // `pro_seat_allowance` grants 5 to pro_plus and 1 to pro. Granting `pro`
  // here would sell five seats on the paywall and hand over one.
  [PRODUCTS.PRO_ANNUAL]: { kind: "subscription", tier: "pro_plus" },
  [PRODUCTS.PRO_WEEKLY]: { kind: "subscription", tier: "pro" },
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

/**
 * What a subscription opens with, once per person per tier.
 *
 * PRO's benefit is unlimited plays — real, and invisible on the balance the
 * day somebody pays for it; a room stake is not waived by it either, because
 * a pot is the other players' money (see the room pot migration). So a
 * subscription arrives with coins and gems in hand (owner: "pro solo -25 000
 * coins + 10 gems, friends pro 50 000 coins + 20 gems").
 *
 * Kept in step with REWARDS.PRO_WELCOME in src/config/rewardConfig.ts and
 * with the economy_config rows in
 * supabase/migrations/20261102100000_starting_balance_and_pro_welcome.sql;
 * src/__tests__/economyStartingBalance.test.ts fails if the three disagree.
 *
 * `ad_free` is not a subscription tier and gets nothing.
 */
export const SUBSCRIPTION_WELCOME: Record<string, { coins: number; gems: number }> = {
  pro: { coins: 25000, gems: 10 },
  pro_plus: { coins: 50000, gems: 20 },
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
 * Write the subscription row to match what the store says is active.
 *
 * Picks the strongest entitlement rather than whichever arrived last: someone
 * holding both ad-free and PRO should read as PRO. When nothing is active the
 * row is expired rather than deleted, so history and analytics survive a
 * cancellation.
 */
export async function syncSubscription(
  supabase: IapDb,
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

  const writeRow = () =>
    supabase
      .from("vip_subscriptions")
      .upsert(
        {
          user_id: userId,
          vip_tier: best!.tier,
          expires_at: best!.expiresAt,
          auto_renew: best!.tier !== "ad_free",
          apple_product_id: best!.productId,
          apple_original_transaction_id: best!.transactionId,
          purchase_platform: platform,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

  let { error } = await writeRow();

  if (error?.code === "23505") {
    // The transaction is held by a different account, and RevenueCat has
    // already moved it to this one.
    //
    // This is not a shared-subscription attack, it is the ordinary case of a
    // player signing in as somebody else on the same phone — a reinstall, a
    // deleted-and-recreated account, a second Supabase identity. The project's
    // transfer behaviour is "Transfer to new App User ID", so the subscriber
    // response we just read is RevenueCat telling us THIS user owns it now;
    // the previous holder's own next sync will find nothing active.
    //
    // Until this ran, that left the payer with no subscription and no way to
    // get one: the upsert raised, the tier came back null, and every later
    // attempt collided on the same row for as long as it existed.
    //
    // Releasing the claim is what completes the transfer. The row itself is
    // not deleted — expiring it keeps the loser's history and their welcome
    // bundle claim, and it is only expired when the store granted it. An
    // admin grant or a referral reward in the same row keeps its expiry and
    // just stops claiming the transaction.
    const { data: holders } = await supabase
      .from("vip_subscriptions")
      .select("user_id, purchase_platform")
      .eq("apple_original_transaction_id", best.transactionId)
      .neq("user_id", userId);

    for (const holder of holders ?? []) {
      const storeGranted = ["ios", "android", "app_store", "play_store"].includes(
        holder.purchase_platform ?? "",
      );
      console.error(
        `Transferring ${best.transactionId} from ${holder.user_id} to ${userId}: ` +
          `RevenueCat reports it active for the latter.`,
      );
      await supabase
        .from("vip_subscriptions")
        .update({
          apple_original_transaction_id: null,
          ...(storeGranted
            ? { expires_at: new Date().toISOString(), auto_renew: false }
            : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", holder.user_id);
    }

    // Retried once, deliberately. A second 23505 means something wrote the
    // transaction back in between, and looping on it would spin.
    if (holders?.length) ({ error } = await writeRow());
  }

  if (error) {
    // A 23505 that survived the transfer above.
    //
    // The table carries a partial unique index on
    // `apple_original_transaction_id` so one store subscription can never
    // activate two accounts at once, while the upsert resolves on `user_id` —
    // so a row under a different user_id raises instead of merging. The
    // transfer releases that claim when RevenueCat says this user now owns
    // the subscription; reaching here means it did not, either because the
    // holder lookup came back empty or because the row was rewritten in
    // between.
    //
    // Throwing took the whole sync down with it, and syncSubscription runs
    // before creditConsumables — so a subscription that could not be written
    // also stopped every gem pack from being credited, for every later
    // purchase, permanently. A player who bought gems saw the App Store
    // confirm the charge and their balance never move, and nothing anywhere
    // said why. The blast radius stays contained: the subscription is not
    // granted, that is recorded, and the consumables the same call is
    // responsible for still get credited.
    if (error.code === "23505") {
      console.error(
        `Subscription not granted for ${userId}: Apple transaction ` +
          `${best.transactionId} is already held by another account. ` +
          `Consumables in this sync are unaffected.`,
        error,
      );
      return { tier: null, expiresAt: null };
    }
    throw error;
  }

  await creditSubscriptionWelcome(supabase, userId, best.tier, best);

  return { tier: best.tier, expiresAt: best.expiresAt };
}

/**
 * Pay the welcome bundle for a tier, at most once per person per tier.
 *
 * Claimed in `iap_events` before a coin moves, exactly as the gem packs are:
 * this runs on every sync — the webhook's renewals included, and every
 * "restore purchases" the player taps — and the unique event_id is the only
 * thing between that and paying the bundle out monthly. Keyed on the USER
 * and the TIER rather than on a transaction id, because a renewal brings a
 * new transaction id for a subscription that is not new.
 *
 * A failure to credit releases the claim, so the next sync tries again
 * rather than leaving somebody paid-up and empty-handed with the ledger
 * saying it was done.
 */
export async function creditSubscriptionWelcome(
  supabase: IapDb,
  userId: string,
  tier: string,
  entitlement: { productId: string; store: string; transactionId: string },
  /**
   * Where the subscription was bought, for the analytics row.
   *
   * Defaults to deriving it from the RevenueCat store name, which is what
   * every caller inside this file wants. The Stripe subscription webhook
   * passes "web" explicitly — it shares this function so that a web
   * subscriber and a store subscriber are paid the same bundle, once, off the
   * same `iap_events` claim, rather than through a second implementation that
   * could disagree about the amount or pay it twice.
   */
  platform?: string,
): Promise<void> {
  const bundle = SUBSCRIPTION_WELCOME[tier];
  if (!bundle) return;

  const eventId = `welcome:${userId}:${tier}`;

  const { error: claimError } = await supabase.from("iap_events").insert({
    event_id: eventId,
    event_type: "SUBSCRIPTION_WELCOME",
    user_id: userId,
    product_id: entitlement.productId,
    store: entitlement.store,
    transaction_id: entitlement.transactionId,
    event_at: new Date().toISOString(),
    payload: { tier, ...bundle },
  });

  if (claimError) {
    // 23505 = unique_violation: this person already has this tier's bundle,
    // which is the happy path on every sync after the first.
    if (claimError.code !== "23505") {
      console.error("Failed to claim subscription welcome:", claimError);
    }
    return;
  }

  const { error: creditError } = await supabase.rpc("update_user_currency", {
    p_user_id: userId,
    p_coins_delta: bundle.coins,
    p_gems_delta: bundle.gems,
  });

  if (creditError) {
    await supabase.from("iap_events").delete().eq("event_id", eventId);
    console.error("Failed to credit subscription welcome, claim released:", creditError);
    return;
  }

  await supabase.from("purchase_transactions").insert({
    user_id: userId,
    product_id: entitlement.productId,
    product_type: "subscription_welcome",
    value_received: bundle,
    platform: platform ?? (entitlement.store === "play_store" ? "android" : "ios"),
  });
}

/**
 * Credit gems for consumable purchases not yet applied.
 *
 * `iap_events` is the ledger — its unique event_id is what makes this safe to
 * call repeatedly, whether from a webhook retry or from the user tapping
 * "restore purchases" a third time.
 */
export async function creditConsumables(
  supabase: IapDb,
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

/**
 * Turn RevenueCat's subscriber payload into what this app grants.
 *
 * Pure: the fetch and the secret key live in `iap.ts`. Split so the
 * transaction key — the thing that decides whether a subscription can be
 * written at all — can be asserted directly rather than by reading the source.
 */
export function parseSubscriber(
  subscriber: Record<string, unknown>,
  now: number = Date.now(),
): SubscriberState {
  const active: SubscriberState["active"] = [];

  // Auto-renewing subscriptions. `expires_date` is authoritative and already
  // reflects cancellation, billing retry and refunds.
  for (const [productId, sub] of Object.entries<Record<string, unknown>>((subscriber.subscriptions ?? {}) as Record<string, Record<string, unknown>>)) {
    const expires = sub?.expires_date as string | null;
    // A null expiry on a subscription means a lifetime/sandbox grant.
    const expiresAt = expires ?? LIFETIME;
    if (new Date(expiresAt).getTime() <= now) continue;
    if (sub?.refunded_at) continue;
    active.push({
      productId,
      expiresAt,
      store: (sub?.store as string) ?? "unknown",
      // RevenueCat's v1 subscriber payload carries no stable original
      // transaction id for subscriptions — `store_transaction_id` is the
      // LATEST transaction and changes on every renewal, which would let one
      // subscription hold a different key each month and so activate a second
      // account. `original_purchase_date` does not move, which is what the
      // uniqueness guard needs.
      //
      // The product id is part of the key because the date alone is not
      // unique: it has second precision, so two unrelated buyers in the same
      // second would collide and the second one would be denied the
      // subscription they just paid for. Product + original purchase date is
      // one subscription.
      transactionId: sub?.original_purchase_date
        ? `${productId}:${sub.original_purchase_date as string}`
        : productId,
    });
  }

  // Non-consumables (ad-free) arrive under non_subscriptions but never expire.
  const consumables: SubscriberState["consumables"] = [];
  for (const [productId, entries] of Object.entries<Array<Record<string, unknown>>>(
    (subscriber.non_subscriptions ?? {}) as Record<string, Array<Record<string, unknown>>>,
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
