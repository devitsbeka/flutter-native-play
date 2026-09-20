# Critical-path audit — subscriptions, IAP, PRO/non-PRO

**Date:** 2026-09-20
**Scope:** every path that decides whether money moves or whether an account
is PRO. Client, edge functions, database, and the RevenueCat/App Store
configuration behind them.

Nothing below is asserted from memory. Each finding names how it was
established, and the three that are only *reasoned* say so rather than being
dressed up as measurements.

---

## Findings, worst first

| # | Finding | Severity | State |
|---|---|---|---|
| 1 | One subscription pays a welcome bundle to **every account it transfers to** | **High — economic** | Fixed, needs deploy |
| 2 | `TRANSFER` webhooks are acknowledged and **never applied** | **High** | Fixed, needs deploy |
| 3 | PRO's unlimited-plays benefit is enforced in the client only | Medium — by design | Documented |
| 4 | `pro_seat_allowance` is declared `IMMUTABLE` but calls `now()` | Low | Documented |
| 5 | The seats panel reads `vip_tier` without checking `isVip` | Low — cosmetic | Documented |
| 6 | The shop shows PRO tiers the player already owns | Open product question | Yours to decide |

---

## 1. One subscription, unlimited welcome bundles — HIGH

**How established:** read of `grant_subscription_welcome`
(`20261106100000_lock_the_house.sql:190-240`) and `creditSubscriptionWelcome`
(`_shared/iapEntitlements.ts`), plus the confirmed RevenueCat project setting.

Both writers claim `welcome:<user_id>:<tier>` in `iap_events`, which is unique
**per user**. The project's transfer behaviour is *Transfer to new App User ID*
— verified on the settings page — so one Apple ID's subscription moves to
whichever MyTrivia account signs in on that phone.

Each new account it lands on has no claim yet, so the trigger fires and pays a
full bundle:

| Tier | Coins | Gems |
|---|---|---|
| `pro` | 25 000 | 10 |
| `pro_plus` | 50 000 | 20 |

Registering is free and takes seconds. One subscription therefore mints an
unbounded amount of both currencies — including **gems**, the hard currency
people pay money for. 20 gems is a fifth of the smallest pack sold.

This is live today: the account history shows the same subscription moving
between five different app user ids in three days, and the newest hop was onto
a test account created an hour earlier.

**Fix.** A second claim keyed on the store transaction —
`welcome-txn:<apple_original_transaction_id>:<tier>` — taken *before* the
per-user one. The bundle is paid only when both claims are new.

- The per-user claim stays, so nobody already paid is paid again. Replacing
  the key outright would have handed every existing subscriber one more bundle.
- The transaction claim is skipped when there is no transaction id, so admin
  grants and referral rewards keep the per-user rule.
- Seats already return before any of this and still do.
- Both writers make both claims, in the same order, so whichever runs first
  wins and the other finds it taken.

`supabase/migrations/20260920010000_welcome_bundle_is_per_subscription.sql`
plus the matching change in `_shared/iapEntitlements.ts`. Five tests; the one
that matters fails against the old code.

---

## 2. TRANSFER webhooks never applied — HIGH

**How established:** RevenueCat's own event-field reference, read today, plus
the handler source.

A `TRANSFER` event carries **no `app_user_id`**. RevenueCat sends
`transferred_from` and `transferred_to` arrays instead. The handler listed
`TRANSFER` in `ENTITLEMENT_EVENTS` and then read `event.app_user_id`, so every
transfer hit:

```ts
if (!appUserId || appUserId.startsWith("$RCAnonymousID")) {
  return json({ received: true, applied: false });
}
```

Acknowledged, ledgered, and dropped.

**What that left behind.** The account that *lost* the subscription kept its
tier and a future `expires_at` in `vip_subscriptions` — it stayed PRO in the
app until it next opened and re-synced, and forever if it never did. The
account that *gained* it had nothing written until it next opened the app.
**Both accounts read as PRO at the same time.** That is a large part of what
"a lot of chaos" looked like on the device, and with transfer behaviour set to
Transfer it is the routine case, not an exotic one.

**Fix.** Sync both sides, de-duplicated, skipping anonymous ids. Same rule as
the rest of the handler: the event says something changed, RevenueCat says
what is now true.

---

## 3. Unlimited plays is a client-side gate — MEDIUM, by design

`usePlayLimit` reads `isVip` and gates the UI. There is no server-side refusal
of a game started past the free limit.

This is a monetisation gate, not a security hole, and the distinction holds
because **the rewards are bounded server-side regardless**:
`credit_gameplay_reward` checks `currency_grant_limits` per kind and per day
(`20261106100000_lock_the_house.sql`), and `update_user_currency` refuses
positive deltas from a signed-in caller. So bypassing the play limit yields
more play, not more currency.

Worth knowing rather than fixing. Closing it means moving round-start through
a `SECURITY DEFINER` function that counts plays — a meaningful change to the
game loop, not a patch.

---

## 4. `pro_seat_allowance` is `IMMUTABLE` and calls `now()` — LOW

```sql
CREATE OR REPLACE FUNCTION public.pro_seat_allowance(...)
RETURNS integer LANGUAGE sql IMMUTABLE
AS $$ SELECT CASE WHEN p_expires_at IS NULL OR p_expires_at <= now() THEN 0 ...
```

`now()` is `STABLE`; a function that calls it is not `IMMUTABLE`. Postgres does
not check the declaration, and in ordinary queries this behaves correctly
today. It would stop behaving correctly the moment the function were used in
an index expression or a generated column, where the planner is entitled to
fold it to a constant — and the failure would be a silently frozen allowance,
not an error.

Declaring it `STABLE` costs nothing. Not changed here: it is a migration, and
it does not affect anything currently shipping.

---

## 5. The seats panel ignores `isVip` — LOW, cosmetic

`ProSeatsSection.tsx:53` reads `subscription?.vip_tier` directly, where
`proTierOf` and `proSeatsTotal` both guard on `isVip` first. An expired
subscriber whose row is still present therefore sees their seat count offered.

The database refuses it — `grant_pro_seat` recomputes the allowance from
`expires_at` and raises — so nothing can be given away. The cost is a panel
that offers an action that then fails.

---

## 6. The shop offers tiers the player already owns — open question

`ShopStandardLayout` passes `slides="pro"` to `ProBannerReel`, and that branch
keeps every tier. The filtering branch — the one whose comment reads *"The shop
is a list of things to buy. A tier the player is already on is not one"* —
only runs for a different `slides` value, so it never runs from the shop.

Consequence: a `pro_plus` holder sees **Active** on both slides, because
Friends PRO includes Solo. A `pro` holder sees Active on Solo and a live
Subscribe on Friends PRO; tapping it produces Apple's *"you're already
subscribed"* sheet, because both products are in one subscription group and
Apple treats the second as a plan change.

Neither is a fault. Which behaviour is wanted is a product decision, so it is
left alone.

---

## What was checked and found correct

### Catalog integrity
Client sells 3 subscriptions + 4 gem packs. Server recognises those 7 plus 2
retired (`pro.weekly`, `adfree`) so old entitlements still resolve on restore.
Tier mapping agrees across client and server, `pro.annual → pro_plus`
included. `repo-invariants.test.ts` fails if they drift.

### Money cannot be granted by a client
- `vip_subscriptions` has no client INSERT/UPDATE policy.
- `update_user_currency` refuses positive deltas from a signed-in caller.
- Every `SECURITY DEFINER` grant function is revoked from `PUBLIC` and `anon`.
- `purchase_shop_item` does debit and grant in one transaction.
- Verified against `supabase/tests/`, which executes these against real
  Postgres.

### Consumables (gem packs)
Claim-before-credit on `consumable:<transaction_id>`, claim released if the
credit fails, ledger row in `purchase_transactions` after. Idempotent against
webhook retries, the client poll and Restore alike. A transferred account
cannot re-credit the previous holder's packs, which is correct.

### Webhook, other than TRANSFER
Constant-time secret comparison; refuses to run if the secret is unset; event
ledgered before acting, with `23505` treated as "already processed"; the
ledger row is deleted if the sync throws, so RevenueCat's retry actually
retries rather than short-circuiting as a duplicate. Covers renewal,
cancellation, expiry, billing issue, product change, pause and uncancellation.

### verify-receipt
Caller identified from their own JWT and nowhere else; writes through the
service role; serialises PostgrestError properly (the old `"Unknown error"`
cost several build cycles).

### Entitlement resolution
Expiry comes from the store, never computed from the product id. Refunds
respected via `refunded_at`. Strongest tier wins rather than last-written. When
nothing is active, only *store-granted* rows are expired — admin grants and
referral rewards are not the store's to revoke.

### Seats
`pro_seat_allowance` returns 0 for an expired subscription and 0 for a
`seat`-platform row, so a gifted seat cannot be re-gifted into unlimited PRO.
Enforced in `grant_pro_seat`, not in the UI.

### Welcome bundle, two writers
The trigger and the edge function use the same claim keys in the same order,
so they are mutually idempotent whichever fires first. Verified by reading both.

### Ads
`useAds` waits for `vipLoading` before calling `adService.setVipStatus`, so a
subscriber is never shown ads during the unknown window. This is the pattern
the shop was missing and now has.

### Identity and sign-in (fixed earlier today)
Reconcile runs on every sign-in, not once per process; sign-out clears the
identity and signs the RevenueCat SDK out; a revoked session still heals; the
resume re-check survives a partial unmount; `cached_vip_status` is cleared on
sign-out; `purchase()` identifies before reading what the account owns and
waits for an in-flight reconcile.

---

## Answer to the question behind the audit

**Which account gets the subscription when the Apple ID and the MyTrivia
account are different emails?**

The Apple ID email is irrelevant — Apple never tells us what it is. The
subscription belongs to the Apple ID, but it is *attached* to whichever
MyTrivia account is signed in when the receipt is presented, and attaching it
to a new account **takes it from the previous one**.

One Apple ID → one subscription → exactly one MyTrivia account at a time, the
most recent to present the receipt.

That is the `Transfer to new App User ID` setting, deliberately kept. It is
right for real users — somebody who reinstalls or re-registers keeps what they
paid for — and the account-hopping seen in testing is an artefact of signing
into many accounts on one phone, not a fault.

It does have two consequences that are not obvious:

1. **Findings 1 and 2 are both transfer-shaped.** Neither would be reachable
   with the setting on *Keep with original App User ID*. Keeping Transfer is
   the right call, and it makes both fixes load-bearing rather than
   theoretical.
2. **A test account cannot stay non-PRO on a phone whose Apple ID owns a
   subscription.** Signing into it takes the subscription. Testing a non-PRO
   state needs a device or sandbox Apple ID that owns nothing.

---

## To take effect

Findings 1 and 2 are both server-side. Shipping an iOS build deploys nothing.

1. Apply `20260920010000_welcome_bundle_is_per_subscription.sql`.
2. Redeploy `verify-receipt` **and** `revenuecat-webhook` — both bundle
   `_shared/iapEntitlements.ts`.

Verified locally: `npm run typecheck`, 3428 tests over three clean runs,
`npm run build`, and `deno check` on all three edge functions that import the
shared module.
