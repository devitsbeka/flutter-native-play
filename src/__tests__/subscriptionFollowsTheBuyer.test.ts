import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  creditSubscriptionWelcome,
  parseSubscriber,
  syncSubscription,
  type SubscriberState,
} from "../../supabase/functions/_shared/iapEntitlements";

/**
 * A subscription must follow the person who owns it.
 *
 * `vip_subscriptions` carries a partial unique index on
 * `apple_original_transaction_id` so one store subscription can never light up
 * two accounts. The upsert resolves on `user_id`, so when a row under a
 * *different* user_id already holds the transaction the write raises `23505`
 * instead of merging — and the code returned `{ tier: null }`, permanently.
 *
 * That is not a rare state. RevenueCat's project transfer behaviour is
 * "Transfer to new App User ID": sign in as a second Supabase account on the
 * same phone — a reinstall, a deleted-and-recreated account, a tester — and
 * RevenueCat moves the subscription to the new app user id and says so. Our
 * table did not move with it, so:
 *
 *   - the shop kept showing "Subscribe" to someone who was subscribed;
 *   - tapping it produced Apple's own "You're already subscribed" sheet;
 *   - and the row never got written, on that attempt or any later one,
 *     because the collision was with a row nothing would ever clear.
 *
 * The device capture that proved it: RevenueCat's customer history for
 * 215a70e6… reads "Got their purchases transferred from a22491af…", with
 * Friends PRO Monthly active and renewing — while the app showed no PRO.
 */

type Row = Record<string, unknown>;

/** A Supabase double that behaves like the real one for the calls this uses. */
function fakeSupabase(rows: Row[], opts: { failFirstUpsert?: boolean } = {}) {
  const state = { rows: rows.map((r) => ({ ...r })) };
  const upserts: Row[] = [];
  const updates: Array<{ userId: unknown; patch: Row }> = [];
  const inserts: Row[] = [];
  let upsertCalls = 0;

  const conflicting = (txn: unknown, userId: unknown) =>
    state.rows.filter(
      (r) => r.apple_original_transaction_id === txn && r.user_id !== userId,
    );

  const client = {
    from(table: string) {
      if (table === "iap_events") {
        return {
          insert: async (row: Row) => {
            inserts.push(row);
            return { error: { code: "23505" } }; // already claimed: the quiet path
          },
          delete: () => ({ eq: async () => ({ error: null }) }),
        };
      }

      return {
        select: (_cols: string) => {
          const filters: Row = {};
          const q: Record<string, unknown> = {
            eq(col: string, val: unknown) {
              filters[col] = val;
              return q;
            },
            neq(col: string, val: unknown) {
              filters[`!${col}`] = val;
              return q;
            },
            maybeSingle: async () => ({
              data:
                state.rows.find((r) => r.user_id === filters.user_id) ?? null,
              error: null,
            }),
            then(resolve: (v: unknown) => unknown) {
              const data = state.rows.filter(
                (r) =>
                  r.apple_original_transaction_id ===
                    filters.apple_original_transaction_id &&
                  r.user_id !== filters["!user_id"],
              );
              return Promise.resolve({ data, error: null }).then(resolve);
            },
          };
          return q;
        },

        upsert: async (row: Row) => {
          upsertCalls += 1;
          const clash = conflicting(row.apple_original_transaction_id, row.user_id);
          if (clash.length || (opts.failFirstUpsert && upsertCalls === 1)) {
            return { error: { code: "23505", message: "duplicate key value" } };
          }
          upserts.push(row);
          const existing = state.rows.find((r) => r.user_id === row.user_id);
          if (existing) Object.assign(existing, row);
          else state.rows.push({ ...row });
          return { error: null };
        },

        update: (patch: Row) => ({
          eq: async (_col: string, val: unknown) => {
            updates.push({ userId: val, patch });
            const target = state.rows.find((r) => r.user_id === val);
            if (target) Object.assign(target, patch);
            return { error: null };
          },
        }),
      };
    },
    rpc: async () => ({ data: null, error: null }),
  };

  return { client, upserts, updates, inserts, state };
}

const FUTURE = new Date(Date.now() + 30 * 86_400_000).toISOString();
const TXN = "io.mytrivia.proplus.monthly:2026-09-17T21:46:23Z";

const proPlus: SubscriberState = {
  active: [
    {
      productId: "io.mytrivia.proplus.monthly",
      expiresAt: FUTURE,
      store: "app_store",
      transactionId: TXN,
    },
  ],
  consumables: [],
};

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("a subscription that RevenueCat has transferred", () => {
  it("is granted to the new owner, not refused", async () => {
    const { client, upserts } = fakeSupabase([
      {
        user_id: "old-account",
        vip_tier: "pro_plus",
        expires_at: FUTURE,
        apple_original_transaction_id: TXN,
        purchase_platform: "ios",
      },
    ]);

    const result = await syncSubscription(client as never, "new-account", proPlus);

    expect(
      result.tier,
      "the payer was refused their own subscription because a row under their " +
        "previous account still held the transaction",
    ).toBe("pro_plus");
    expect(upserts.at(-1)).toMatchObject({
      user_id: "new-account",
      vip_tier: "pro_plus",
      apple_original_transaction_id: TXN,
    });
  });

  it("releases and expires the previous store-granted holder", async () => {
    const { client, updates, state } = fakeSupabase([
      {
        user_id: "old-account",
        vip_tier: "pro_plus",
        expires_at: FUTURE,
        apple_original_transaction_id: TXN,
        purchase_platform: "ios",
      },
    ]);

    await syncSubscription(client as never, "new-account", proPlus);

    expect(updates).toHaveLength(1);
    expect(updates[0].userId).toBe("old-account");
    expect(updates[0].patch.apple_original_transaction_id).toBeNull();
    expect(updates[0].patch.auto_renew).toBe(false);

    const old = state.rows.find((r) => r.user_id === "old-account")!;
    expect(
      new Date(old.expires_at as string).getTime(),
      "the loser of a transfer keeps an active subscription",
    ).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it("does not expire an admin or referral grant, only its claim", async () => {
    // The same row carries grants that did not come from the store. Taking the
    // transaction away is right; cancelling a lifetime admin grant is not.
    const { client, updates, state } = fakeSupabase([
      {
        user_id: "admin-account",
        vip_tier: "pro_plus",
        expires_at: FUTURE,
        apple_original_transaction_id: TXN,
        purchase_platform: "admin",
      },
    ]);

    await syncSubscription(client as never, "new-account", proPlus);

    expect(updates[0].patch.apple_original_transaction_id).toBeNull();
    expect(updates[0].patch).not.toHaveProperty("expires_at");
    expect(
      state.rows.find((r) => r.user_id === "admin-account")!.expires_at,
      "an admin grant was cancelled by somebody else's purchase",
    ).toBe(FUTURE);
  });

  it("gives up rather than looping when no holder can be found", async () => {
    // A 23505 with nothing to release means the collision is something else.
    // Retrying forever would spin; the sync has to come back so the gem packs
    // in the same call still get credited.
    const { client, updates } = fakeSupabase([], { failFirstUpsert: true });

    const result = await syncSubscription(client as never, "new-account", proPlus);

    expect(result).toEqual({ tier: null, expiresAt: null });
    expect(updates).toHaveLength(0);
  });

  it("leaves an unrelated subscriber's row alone", async () => {
    // The release is scoped to the transaction. A different subscription held
    // by somebody else must not be touched by this sync.
    const { client, updates } = fakeSupabase([
      {
        user_id: "old-account",
        vip_tier: "pro_plus",
        expires_at: FUTURE,
        apple_original_transaction_id: TXN,
        purchase_platform: "ios",
      },
      {
        user_id: "stranger",
        vip_tier: "pro",
        expires_at: FUTURE,
        apple_original_transaction_id: "io.mytrivia.pro.monthly:2026-01-01T00:00:00Z",
        purchase_platform: "ios",
      },
    ]);

    await syncSubscription(client as never, "new-account", proPlus);

    expect(updates.map((u) => u.userId)).toEqual(["old-account"]);
  });
});

describe("the transaction key identifies one subscription", () => {
  const payload = (originalPurchaseDate: string, productId = "io.mytrivia.proplus.monthly") => ({
    subscriptions: {
      [productId]: {
        expires_date: FUTURE,
        store: "app_store",
        original_purchase_date: originalPurchaseDate,
      },
    },
  });

  it("is scoped by product, so two buyers in the same second do not collide", () => {
    // `original_purchase_date` has second precision. Keyed on the date alone,
    // two unrelated people subscribing in the same second collide on the unique
    // index — and the second one is denied the subscription they just paid for,
    // or, once the transfer above exists, silently takes the first one's away.
    const sameSecond = "2026-09-17T21:46:23Z";
    const a = parseSubscriber(payload(sameSecond, "io.mytrivia.proplus.monthly"));
    const b = parseSubscriber(payload(sameSecond, "io.mytrivia.pro.monthly"));

    expect(a.active[0].transactionId).not.toBe(b.active[0].transactionId);
    expect(a.active[0].transactionId).toContain("io.mytrivia.proplus.monthly");
  });

  it("does not move when the subscription renews", () => {
    // The guard only holds if the key is stable for the life of the
    // subscription. `store_transaction_id` changes every renewal, which would
    // hand the same subscription a fresh key each month — and with it the
    // ability to light up a second account while the first is still running.
    const first = parseSubscriber(payload("2026-09-17T21:46:23Z"));
    const afterRenewal = parseSubscriber({
      subscriptions: {
        "io.mytrivia.proplus.monthly": {
          expires_date: FUTURE,
          store: "app_store",
          original_purchase_date: "2026-09-17T21:46:23Z",
          store_transaction_id: "2000000999999999",
          purchase_date: "2026-10-17T21:46:23Z",
        },
      },
    });

    expect(afterRenewal.active[0].transactionId).toBe(first.active[0].transactionId);
  });

  it("still yields a key when RevenueCat sends no purchase date", () => {
    const parsed = parseSubscriber({
      subscriptions: {
        "io.mytrivia.pro.monthly": { expires_date: FUTURE, store: "app_store" },
      },
    });
    expect(parsed.active[0].transactionId).toBe("io.mytrivia.pro.monthly");
  });
});

describe("sign-out reaches the store", () => {
  /**
   * A source-text guard, and labelled as one.
   *
   * The behaviour it protects IS executed elsewhere:
   * `purchaseFlow.behaviour.test.tsx` drives `resetPurchaseIdentity` and the
   * signed-out branch of the reconcile effect, and asserts that the next
   * sign-in re-identifies and re-syncs. What cannot be reached from there is
   * whether AuthContext actually calls it — rendering AuthProvider needs the
   * whole session/profile/realtime surface mocked for one line of wiring.
   *
   * The wiring is not load-bearing for correctness: the effect clears
   * `identifiedAs` and `reconciledUserId` itself, so a session that expires
   * without passing through signOut still heals. This call adds the SDK-level
   * logOut on top. The assertion exists so that removing it is a deliberate
   * act rather than an accident.
   */
  it("AuthContext.signOut resets the purchase identity", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/contexts/AuthContext.tsx", "utf8");
    const signOut = src.slice(src.indexOf("const signOut = async"));
    const body = signOut.slice(0, signOut.indexOf("\n  };"));

    expect(
      body,
      "signing out no longer tells RevenueCat the account has left — the SDK " +
        "stays identified as the departing user",
    ).toContain("resetPurchaseIdentity");
  });
});

describe("the welcome bundle is paid once per subscription", () => {
  /**
   * `welcome:<user>:<tier>` is unique per USER. With RevenueCat's transfer
   * behaviour set to "Transfer to new App User ID" — which is this project's
   * setting, confirmed in the dashboard — one Apple ID's subscription lands
   * on whichever account signs in on that phone, and every new account it
   * reached had no claim yet and was paid a full bundle: 25 000 coins + 10
   * gems for pro, 50 000 + 20 for pro_plus.
   *
   * Registering is free and takes seconds. That is one subscription minting
   * an unbounded amount of both currencies, gems included — the hard currency
   * people pay money for.
   *
   * A second claim keyed on the store transaction closes it. The per-user
   * claim stays, so nobody already paid is paid twice; changing the key
   * outright would have handed every existing subscriber one more bundle.
   */

  function ledgerSupabase(existingEventIds: string[] = []) {
    const claimed = new Set(existingEventIds);
    const credits: unknown[] = [];
    const client = {
      from: (table: string) => {
        if (table === "iap_events") {
          return {
            insert: async (row: Record<string, unknown>) => {
              const id = String(row.event_id);
              if (claimed.has(id)) return { error: { code: "23505" } };
              claimed.add(id);
              return { error: null };
            },
            delete: () => ({ eq: async () => ({ error: null }) }),
          };
        }
        return { insert: async () => ({ error: null }) };
      },
      rpc: async (fn: string, args: unknown) => {
        credits.push({ fn, args });
        return { data: null, error: null };
      },
    };
    return { client, claimed, credits };
  }

  const entitlement = {
    productId: "io.mytrivia.proplus.monthly",
    store: "app_store",
    transactionId: TXN,
  };

  it("pays the first account that holds it", async () => {
    const { client, credits } = ledgerSupabase();
    await creditSubscriptionWelcome(client as never, "first-owner", "pro_plus", entitlement);
    expect(credits).toHaveLength(1);
  });

  it("does not pay again when the same subscription moves to a new account", async () => {
    const { client, credits } = ledgerSupabase();

    await creditSubscriptionWelcome(client as never, "first-owner", "pro_plus", entitlement);
    await creditSubscriptionWelcome(client as never, "second-account", "pro_plus", entitlement);
    await creditSubscriptionWelcome(client as never, "third-account", "pro_plus", entitlement);

    expect(
      credits,
      "one subscription paid a welcome bundle to every account it was " +
        "transferred to — free to register, so unbounded",
    ).toHaveLength(1);
  });

  it("still pays somebody who buys their own subscription", async () => {
    const { client, credits } = ledgerSupabase();
    await creditSubscriptionWelcome(client as never, "first-owner", "pro_plus", entitlement);
    await creditSubscriptionWelcome(client as never, "other-buyer", "pro_plus", {
      ...entitlement,
      transactionId: "io.mytrivia.proplus.monthly:2027-01-01T00:00:00Z",
    });
    expect(credits).toHaveLength(2);
  });

  it("keeps the per-user rule for grants with no transaction", async () => {
    // Admin grants and referral rewards are not store purchases and carry no
    // transaction id. They must not all collide on one empty key.
    const { client, credits } = ledgerSupabase();
    const granted = { productId: "", store: "admin_grant", transactionId: "" };

    await creditSubscriptionWelcome(client as never, "admin-a", "pro", granted);
    await creditSubscriptionWelcome(client as never, "admin-b", "pro", granted);

    expect(credits).toHaveLength(2);
  });

  it("does not pay twice for the same person and tier", async () => {
    const { client, credits } = ledgerSupabase();
    await creditSubscriptionWelcome(client as never, "owner", "pro", {
      ...entitlement,
      transactionId: "",
    });
    await creditSubscriptionWelcome(client as never, "owner", "pro", {
      ...entitlement,
      transactionId: "",
    });
    expect(credits).toHaveLength(1);
  });
});
