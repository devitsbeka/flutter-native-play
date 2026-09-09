# Pricing and economics audit — Stripe, IAP, gems, coins

Date: 2026-09-09. Read against `main` at the commit this branch forked from.
`npx vitest run` passes (265 files, 2766 tests) — **every finding below is
something the existing suite does not cover.** Where a finding contradicts a
comment in the code, the comment is quoted so the disagreement is visible.

## What "checking Stripe" means here, and what it does not

There is no Stripe API access from this repo. `.env` holds the Supabase ref,
the anon key, the RevenueCat *public* key and the AdMob unit ids; the
`STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are Supabase platform
secrets, and no Stripe MCP server is connected to this session. So nothing
below was read from the Stripe dashboard.

That matters much less than it sounds, because **this integration configures
nothing in Stripe.** Both checkouts build their line items with inline
`price_data` — there is not a single `price_…` id, `lookup_key`, or
`prices.list` call anywhere in the repo:

```
supabase/functions/create-pro-checkout/index.ts   unit_amount: toMinorUnits(amount)
supabase/functions/create-gem-checkout/index.ts   unit_amount: toMinorUnits(amount)
```

The amount Stripe charges is decided entirely by `supabase/functions/_shared/pricing.ts`
at request time. So auditing that file, the two checkout functions and the
webhook *is* auditing what Stripe charges.

Three things do live in the dashboard and can only be confirmed there. Please
check them yourself:

1. **The webhook endpoint and its failed deliveries** — this is how you find
   out whether §1 has already cost you a customer. Details in §1.
2. **Whether any `mode=subscription` payment exists.** Same reason.
3. **Promotion codes.** `create-pro-checkout` sets `allow_promotion_codes: true`
   (`create-gem-checkout` does not), so any code that exists in your dashboard
   is redeemable against every PRO plan, in every currency, by anyone who
   types it. Codes are dashboard objects — nothing in this repo bounds them —
   so a `forever` duration or a 100%-off code is an unlimited free
   subscription with no code change involved. Worth listing what is live and
   deleting anything from testing. If you are not running a promo campaign
   right now, set the flag to `false` and turn it on for the campaign.

Everything else below is in the repo, and was read there.

---

## Severity 1 — money in, nothing out

### 1. A web PRO subscription charges the card and grants no entitlement

**This is the one to fix first.** `create-pro-checkout` opens a
`mode: "subscription"` Checkout session, and nothing in the repo ever hears
back about it.

- `stripe-gem-webhook` is the only Stripe webhook. It handles exactly one
  event, `checkout.session.completed`, and immediately does
  `lookupGemPack(session.metadata.product_id)`.
- A PRO session's metadata has `tier_id`, `sku` and `friend_invites` — no
  `product_id`. So `lookupGemPack(undefined)` returns `null`, and the
  handler takes this branch:

  ```ts
  if (!userId || !pack) {
    console.error("Unusable session metadata:", session.metadata);
    return new Response(JSON.stringify({ error: "Missing metadata" }), { status: 400, … });
  }
  ```

- No function anywhere subscribes to `customer.subscription.created`,
  `.updated`, `.deleted`, `invoice.paid` or `invoice.payment_failed`.
  Grepping the whole `supabase/functions/` tree for those event names
  returns nothing.
- The only writer of `vip_subscriptions` on the server is
  `_shared/iap.ts`, which is the **RevenueCat** path. Stripe never reaches it.
- On the client, the return from Checkout does nothing but show a modal.
  `src/components/profile/ProPlansSection.tsx`:

  ```ts
  if (subscriptionStatus === "success") {
    setPurchasedTierName("PRO");
    setShowSuccessModal(true);
  }
  ```

  It cannot do more: `AGENTS.md` §3 and the RLS on `vip_subscriptions` mean
  a client cannot write that table, which is correct.

So the sequence today is: buyer picks a plan → Stripe takes 3.99 USD /
4.99 GEL (or 23.88 / 59.88 for the year, after the 3-day trial) → the
subscription renews forever → the buyer's account is never marked PRO, on
any surface, ever. The recurring charge keeps working. The entitlement never
starts.

**Two things to confirm in the Stripe dashboard, which will tell you whether
this has already hit a real customer:**

1. Developers → Webhooks → the endpoint pointing at `stripe-gem-webhook`.
   Every PRO checkout should appear there as a **failed delivery with a 400**,
   retried for 3 days and then given up on. If that list is empty, no web PRO
   subscription has been sold yet and this is still a pre-launch bug.
2. Payments, filtered to `mode=subscription`. Any active subscription there
   is a customer who is paying and has nothing.

**Fix:** a `stripe-subscription-webhook` function (or extend the existing one,
but a second endpoint is cleaner given §2) that verifies the signature,
handles `customer.subscription.created/updated/deleted` and `invoice.paid`,
maps `metadata.tier_id` → `pro` / `pro_plus`, and upserts `vip_subscriptions`
with `expires_at = current_period_end`, `purchase_platform = 'web'`. Reuse the
shape of `syncSubscription()` in `_shared/iap.ts` — including its rule of never
downgrading a row the store did not write — and pay the welcome bundle through
the same `iap_events`-claim path `creditSubscriptionWelcome()` uses, so a
Stripe subscriber gets the same 25 000 / 50 000 coins the IAP subscriber does.
Do **not** grant from `checkout.session.completed`: use the subscription
events, so renewals, cancellations and failed payments are handled by the same
code.

### 2. Guest PRO checkout can never be reconciled to an account

`create-pro-checkout` accepts an unauthenticated request and writes
`user_id: "guest"` into both the session and the subscription metadata:

```ts
metadata: { user_id: userId || "guest", … }
```

Even once §1 is fixed, there is no user to grant anything to, and no flow that
later claims the subscription against the email Stripe collected. The gem
checkout does not have this problem — it returns 401 without an auth header.

**Fix:** either require auth (one-line change, matching `create-gem-checkout`),
or add a claim step on the success page that matches
`stripe.customer.email` → `auth.users.email`. Requiring auth is the smaller
and safer change; the paywall already sends the user to `/auth` when signed
out, so the guest branch is unreachable from the app's own UI anyway.

---

## Severity 2 — the in-app economy leaks value

### 3. `grant_vip_days` is free. Anyone signed in can mint unlimited PRO.

`supabase/migrations/20260813120000_lock_vip_entitlements.sql`:

```sql
CREATE OR REPLACE FUNCTION public.grant_vip_days(p_duration text)
…
GRANT EXECUTE ON FUNCTION public.grant_vip_days(text) TO authenticated;
```

The function takes a duration string and nothing else. It checks
`auth.uid() IS NOT NULL` and then writes the row. **There is no payment
argument, no gem debit, and no check that one happened.** And it stacks —
`v_base := GREATEST(COALESCE(expires_at, now()), now())` — so it is designed
to be called repeatedly.

The client's purchase is two independent calls (`src/pages/PowerUps.tsx`):

```ts
const spent = await spendGems(item.price, { … });
if (!spent) { … return; }
…
} else if (item.vipDuration) {
  await activateVip(item.vipDuration);
```

Skipping the first one is a one-liner in the browser console with the anon key
that ships in the bundle:

```js
await supabase.rpc('grant_vip_days', { p_duration: 'month' })  // repeat at will
```

The tier granted is `standard`, but that is not a limitation — `isVip` in
`VipContext` is `isAfter(expires_at, now())` and nothing else, so `standard`
gets the full benefit set: `getXpMultiplier() === 2`,
`shouldSkipGameStake() === true`, `getMaxDailySpins() === 4`, no ads.

This is the same class of hole `AGENTS.md` §3 describes as already closed
("a signed-in user could grant themselves a paid subscription"). It is closed
for `vip_subscriptions` direct writes and for `update_user_currency`. It is
open on the function those fixes routed everyone through.

**Fix:** make the debit and the grant one transaction. `grant_vip_days` should
take the shop item id, read the gem price from a server-side table (the same
shape as `_shared/gems.ts` — the client names the product, the server decides
the price), debit gems and write the expiry in one `SECURITY DEFINER` body,
and raise on insufficient balance. Then `REVOKE` the current signature. The
client keeps calling one RPC; it just stops being able to call the half that
gives without the half that takes.

### 4. Buying coins with gems and exchanging them back mints gems — in two taps, no console needed

`exchange_currency` is a **lossless two-way** trade at a flat rate:

```sql
v_rate constant integer := 500;
IF p_direction = 'gems_to_coins' THEN  v_coins_delta := p_amount * v_rate;
ELSIF p_direction = 'coins_to_gems' THEN  v_gems_delta := p_amount / v_rate;
```

No spread, no fee, no daily cap. Meanwhile the shop sells coins at a *bonus*
rate above 500/gem (`src/hooks/useShopData.tsx`), which the comments describe
as the point:

```ts
{ id: "coins_5000",  price: 9,  value: 5000 },   // "5000 coins = 10 gems, sell for 9 = 10% bonus"
{ id: "coins_15000", price: 24, value: 15000 },  // "15000 coins = 30 gems, sell for 24 = 20% bonus"
```

Any coin bonus above 0% closes a loop against a 1:1 exchange:

| shop item | gems paid | coins received | exchanged back | net |
|---|---|---|---|---|
| `coins_500` | 1 | 500 | 1 gem | 0 |
| `coins_1500` | 3 | 1 500 | 3 gems | 0 |
| `coins_5000` | 9 | 5 000 | 10 gems | **+1** |
| `coins_15000` | 24 | 15 000 | 30 gems | **+6** |

Both halves are in the shipped UI — the coin packs in `PowerUps.tsx` /
`GemShopModal.tsx`, and `coins_to_gems` in
`src/components/shop/CurrencyExchangeModal.tsx`. A player who notices this
never pays for gems again.

The only ceiling is the `shop_grant` daily coin cap (§5): 1 000 000 coins/day
is 66 runs of `coins_15000`, so **+396 gems a day, free** — about $2.77/day of
gem inventory per account, or 1.6 months of VIP.

**Fix, cheapest first:** put a spread on `coins_to_gems` — e.g. buy at 500,
sell at 750 — so no shop bonus can close the loop. That is a two-line change
to the migration and matches how every real soft-currency economy works. The
alternative (cap the coin bonus at 0%) removes the reason to buy the larger
packs.

### 5. `shop_grant` lets a client credit itself 1 000 000 coins and 2 000 gems a day

`credit_gameplay_reward` takes the amount from the caller and bounds it
against `currency_grant_limits`. The comment is explicit that this is a
deliberate trade ("at most the daily cap for one category, and every unit of
it recorded"), and for gameplay kinds the caps are tight — `spin` is 500
coins / 2 gems per call. `shop_grant` is not:

```sql
('shop_grant', 200000, 500, 1000000, 2000),
```

It has to be that large, because it is how a *shop purchase* delivers what was
bought — but it is granted to `authenticated` like every other kind, and it
carries no proof that a debit happened. So the ceiling is the exploit:

```js
await supabase.rpc('credit_gameplay_reward', { p_kind: 'shop_grant', p_coins: 200000, p_gems: 500 })
```

repeated until the daily cap. 2 000 free gems a day is ~8 months of VIP, or
$14 of gem inventory, per account per day. Run alongside §4 it is ~4 000
gems/day.

**Fix:** `shop_grant` should not be a client-callable kind at all. Fold the
debit and the credit into one server function per shop item — the same fix as
§3, and the same shape `claim_daily_reward` and `claim_leaderboard_reward`
already use: the server decides both sides. Then drop the `shop_grant` row, or
lower it to something a legitimate single purchase needs and have the function
call `apply_currency_grant` directly (it is already granted to no one).

---

## Severity 3 — pricing that is wrong rather than exploitable

### 6. The $12.99 gem pack is dominated by the $3.99 one

| pack | gems | USD | $/gem | gems/$ |
|---|---|---|---|---|
| `gems_100` | 100 | 0.99 | 0.00990 | 101.0 |
| `gems_500` | 500 | 3.99 | 0.00798 | 125.3 |
| **`gems_1500`** | **1 500** | **12.99** | **0.00866** | **115.5** |
| `gems_5000` | 5 000 | 34.99 | 0.00700 | 142.9 |

Three × `gems_500` is 1 500 gems for **$11.97** — the same gems as `gems_1500`
for **$1.02 less**. The middle of the ladder gets *worse* before it gets
better, and it is the tier carrying no badge (`GEMS_BADGES` puts "popular" on
500 and "best-value" on 5000), so the card that is already the weakest deal is
also the one with nothing drawing the eye to it.

`src/config/__tests__/gemPacks.test.ts` passes because it deliberately tests a
band, not a curve:

> Deliberately a band and not a monotonic curve: where the packs sit inside
> the band is a pricing decision, but leaving the band means two economies
> again.

Fair — but a *strictly dominated* rung is not a pricing decision, it is a
rung nobody should ever buy. The spread test (`< 2`) has room: at $10.99 the
1500 pack is 136.5 gems/$, which sits neatly between 500 and 5000 and keeps
the ladder monotonic.

**Fix:** `gems_1500` → **$10.99** (and EUR to match; GEL follows §7). One line
in `src/config/gemPacks.ts`, one in `src/config/pricing.ts`, one in
`supabase/functions/_shared/pricing.ts`, and the App Store Connect tier —
`repo-invariants.test.ts` will fail until all three code sites agree.
Consider adding a monotonicity assertion to `gemPacks.test.ts` alongside the
existing strict-dominance one, which only checks gems, not gems-per-dollar.

### 7. Lari is priced off two different exchange rates

| row | USD | GEL | implied multiplier |
|---|---|---|---|
| `gems_*` (all four) | — | — | **2.75** |
| `pro_monthly` | 3.99 | 4.99 | **1.25** |
| `pro_plus_monthly` | 7.99 | 9.99 | **1.25** |
| `pro_annual` | 23.88 | 59.88 | 2.51 |

`pricing.ts` explains each half on its own terms — subscriptions "priced for
the home market", gems kept at "the USD price at the 2.75 rate the old
converter used… so that making the charge match the display changes nobody's
price". Both are reasonable in isolation. Together they mean the gem economy
and the subscription economy are on different money in the one market that
matters most, and the seam shows up as a price:

**A month of VIP costs 250 gems. What that is in real money:**

| bought via | USD | GEL |
|---|---|---|
| `gems_5000` | $1.75 | 4.81 ₾ |
| `gems_500` | $2.00 | 5.49 ₾ |
| PRO subscription | **$3.99** | **4.99 ₾** |

In lari the two routes are within 4% of each other — the ladder works. In
dollars and euro the gem route undercuts the subscription by **56%**, and it
is the route with no renewal, no trial period and no Apple/Stripe
subscription tooling behind it. Every non-Georgian user who does the
arithmetic buys gems.

Note this is a *reporting* artefact of §6 as well: the 2.75 rate was chosen so
Georgian display prices would not move, which was right at the time, but it
has since become the only place that rate survives — `utils/currency.ts` was
gutted precisely to remove it.

**Fix:** pick one lari rate and state it. If 1.25 is the home-market rate,
gems in GEL become 1.24 / 4.99 / 13.74 / 43.74 — a large price *cut* for
Georgian buyers, which is a business call, not a bug fix. If 2.75 is right for
consumables, then USD/EUR gems are underpriced relative to the subscription
and the ladder should move up rather than lari down. Either way the answer
belongs in the comment block at the top of `PRICES`, because the next person
to touch it will otherwise re-derive the same two rates.

### 8. Three "savings" badges in the shop compare against prices the same shop undercuts

`useShopData.tsx` prices the starter bundles against a 1-gem-per-power list
rate, and the Mega Powers section three cards down sells the same powers for
less:

| item | contents | price | cheapest same-shop equivalent | claimed |
|---|---|---|---|---|
| `starter_bundle` | 8 powers + 500 coins | 10 gems | 7 (`power_bundle_small`) + 1 (`coins_500`) = **8** | badge "new" |
| `starter_bundle_medium` | 20 powers + 1 000 coins | 20 gems | ~14 (pro-rata `power_bundle_large`) + 2 = **~16** | **−10%** |
| `starter_bundle_large` | 40 powers + 2 500 coins | 35 gems | 28 (`power_bundle_large`) + 5 = **33** | **−22%** |

All three cost *more* than buying the same contents from the neighbouring
section, and two of them wear a discount badge while doing it.

The rotating deals in `shopDeals.ts` have a milder version of the same
arithmetic — `deal_daily_champion` states `wasPrice: 150 // 100 + 40 + 10`,
where the 40 powers are really 28 and the 5 000 coins really 9, so the true
comparison is 137 and the real saving is 35%, not the 41% shown.

This is precisely the reference-price problem the VIP section already fixed,
and the comment there says why it matters:

> the discount was against a figure with no purchasable original, which is
> exactly the reference-price claim guideline 2.3.1 calls out.

**Fix:** compute `wasPrice` from the cheapest purchasable route to the same
contents, not from the list rate. It is a pure function of
`BUNDLE_CONTENTS` + the shop catalogue, so it can be derived rather than
hand-written — and then a test can assert `price < wasPrice` for every bundle,
which is the assertion that would have caught all three.

Related, from the same file: the standalone VIP rows (100 gems/week,
250 gems/month) are undercut *every single day* by the rotating deals —
`deal_daily_booster` is a VIP day + 12 powers + 1 500 coins for 25 gems
against a 30-gem VIP day. The headline VIP prices are never the price anyone
pays. That is a merchandising decision to make deliberately, not a defect, but
it should be made deliberately.

### 9. A gem pack with a bonus will crash the web checkout

`create-gem-checkout` derives the price key from the gem **count**:

```ts
const priceKey = `gems_${pack.gems}` as PriceKey;
const amount = priceOf(priceKey, currency);
```

`pack.gems` is documented in `gemPacks.ts` as "base plus bonus — the total
credited". Every pack currently has `bonusGems: 0`, so the counts happen to
equal the `PRICES` keys and it works. The first pack that advertises "1500
+300" makes `priceKey` `"gems_1800"`, `PRICES["gems_1800"]` is `undefined`,
and `priceOf` throws `TypeError: Cannot read properties of undefined` — a 500
from the checkout function, for every buyer of that pack.

This is the *same shape* as the bug `gemPacks.ts` records at length ("the
store SKU was looked up by gem count… adding a bonus silently unmapped its
SKU"), which was fixed on the native path by keying on `pack.id`. The web path
still keys on the count.

**Fix:** `const priceKey = pack.id as PriceKey;` — the ids are already
`gems_100`-style and already match the `PriceKey` union. Add the same
assertion `repo-invariants.test.ts` uses for the catalogues: every pack id is
a key of `PRICES`.

### 10. The gem section header is hardcoded English, in dollars

`useShopData.tsx`:

```ts
{ id: "gems-lari", title: t("common.gems"), description: "$ Buy with USD", … }
```

The section id says lari, the description says USD, and the cards underneath
correctly render ₾ or € via `useStorePrice`. A Georgian buyer sees
"**$ Buy with USD**" above four cards priced in lari. It is the only
untranslated string on a price surface in the app.

**Fix:** a locale key, and one that does not name a currency — the cards
already name it, and they are the ones that know which.

---

## What is right, and worth not breaking

Worth stating, because it is most of the surface and it is genuinely well
built:

- **Neither checkout trusts the client with money.** Both take only a product
  id and look up price and quantity server-side (`_shared/gems.ts`,
  `_shared/pricing.ts`). The `gems`/`priceGel` fields the client still sends
  are read by nothing.
- **The gem webhook is correct.** It fails closed on a missing
  `STRIPE_WEBHOOK_SECRET`, verifies the signature, refuses
  `payment_status !== "paid"`, and claims the purchase row with a
  `status = 'pending'` predicate before crediting — so Stripe's at-least-once
  retries cannot pay out twice. The credit failure path releases the claim.
- **The IAP path is correct** and idempotent through the `iap_events` ledger,
  including the once-per-tier welcome bundle keyed on user+tier rather than
  transaction id.
- **Display and charge agree.** `PRICES` is mirrored in the edge function and
  `repo-invariants.test.ts` fails if they drift; nothing converts a currency at
  runtime any more; native reads StoreKit's own `priceString` and refuses to
  sell when the store has not answered.
- **The RLS holes on `gem_purchases` and `purchase_transactions` are already
  closed** (`20260731010000_launch_hardening.sql`,
  `20260728210000_fix_purchase_visibility.sql`). I re-checked both.

---

## Action plan

Ordered by money at risk, not by effort.

### Now — before another web subscription is sold

1. **§1 Stripe subscription webhook.** New `stripe-subscription-webhook`
   function; handle `customer.subscription.created/updated/deleted` and
   `invoice.paid`; upsert `vip_subscriptions` from `metadata.tier_id` and
   `current_period_end`; pay the welcome bundle through the existing
   `iap_events` claim. Register the endpoint in the Stripe dashboard and
   deploy through Lovable (`AGENTS.md` §4a — merge to `main`, then ask for the
   deploy, and ask for the deploy only).
   *Then* check the dashboard for the failed 400s and reconcile anyone
   affected with `grant_vip_days` — which is, ironically, exactly what that
   function is for.
2. **§2** Require auth in `create-pro-checkout`. One `if`, matching
   `create-gem-checkout`.
3. If a launch is imminent and §1 cannot ship first: **disable the web PRO
   buy buttons** rather than take money for nothing. The paywall already has
   an honest "store unavailable" state for the native case
   (`ProPaywallModal`'s `storeReady` guard); the web branch needs the same
   switch, which is a flag in `availablePlans()` rather than new UI.

### This week — the economy holes

4. **§3 + §5 together**, because they are one fix: a `purchase_shop_item`
   RPC that debits and grants in a single transaction from a server-side
   catalogue; then `REVOKE` the bare `grant_vip_days(text)` and drop
   `shop_grant` from `currency_grant_limits`. This is the largest change on
   the list — a migration plus a rework of the two purchase handlers in
   `PowerUps.tsx` and `GemShopModal.tsx` — and it closes both.
5. **§4** Spread on `coins_to_gems` (buy 500 / sell 750). Two lines. Ship it
   ahead of 4 if 4 is going to take a week; on its own it stops the loop.
6. **§9** `priceKey = pack.id`, plus the test. Five minutes, and it is a
   latent 500 on a revenue path.

### Next — pricing decisions, which are yours not mine

7. **§6** `gems_1500` → $10.99 / €10.99, App Store tier included.
8. **§7** Pick one lari rate. Genuinely a business call; the audit only says
   that having two is not one.
9. **§8** Derive `wasPrice` from the cheapest purchasable route, and add the
   `price < wasPrice` test.
10. **§10** Translate the gem section header.

### Housekeeping

11. `VIP_PRICES` in `src/contexts/VipContext.tsx` (`day: 3, week: 12,
    month: 35`) is a **fourth** VIP price ladder — nothing reads it; the shop
    and the modal both use `REWARDS.VIP_PRICES` (30/100/250). It is exported
    on the context as `prices`. Delete it. `utils/currency.ts` was gutted for
    exactly this reason: "gone rather than left lying next to a price surface
    for the next person to reach for."
12. **The admin economy screen shows prices the app does not charge.** The
    `iap_products` rows seeded in `20260119190510_*.sql` still say
    `price_usd` 0.80 / 3.20 / 8.00 / 24.00 and `price_gel` 2.00 / 8.00 /
    20.00 / 60.00, against a live charge of 0.99 / 3.99 / 12.99 / 34.99 and
    2.72 / 10.97 / 35.72 / 96.22. They also carry `bonus_percentage` 20 and
    40 on the two large packs, which no pack has had since `bonusGems` went
    to zero everywhere.

    The table is read by `useIAPProducts` / `useIAPProductsAdmin` and rendered
    by `src/components/admin/economy/IAPProductsTab.tsx` — so it is not dead
    data, it is the screen you would look at to answer "what do we charge for
    gems", and it is wrong on every row. Worse, that tab lets you *edit* the
    numbers, which changes nothing: the charge comes from
    `_shared/pricing.ts`. Either seed it from the real table and make it
    read-only, or drop the tab.
13. **The admin Settings page asks for the Stripe secret key and then ignores
    it.** `src/pages/admin/Settings.tsx` renders an input for
    `app_settings.stripe_secret_key`, links to
    `dashboard.stripe.com/apikeys`, and saves whatever is typed into a
    Postgres column. No edge function ever reads `app_settings` — all three
    Stripe functions use `Deno.env.get("STRIPE_SECRET_KEY")`. So the form
    does nothing except put a live `sk_live_…` in the database in plaintext,
    which is the one place `AGENTS.md` §5 says real secrets must never go.

    Note also line 242 of that page: it instructs the operator to register the
    Stripe webhook at `…/functions/v1/stripe-gem-webhook`. That instruction is
    what produces §1 — it points *every* event, subscriptions included, at the
    handler that only understands gem packs. Update it alongside the fix.
14. `create-pro-checkout` has no `[functions.create-pro-checkout]` block in
    `supabase/config.toml`. It defaults to `verify_jwt = true`, which is what
    you want, but every other payment function states it — and §2 makes the
    setting load-bearing.
