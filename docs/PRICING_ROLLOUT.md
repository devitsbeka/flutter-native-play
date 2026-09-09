# Rolling out the pricing and economics fixes

Branch: `claude/pricing-economics-audit-q29u8m`. Findings and reasoning are in
[`docs/PRICING_ECONOMICS_AUDIT.md`](./PRICING_ECONOMICS_AUDIT.md); this is the
sequence.

---

## First: the SQL is one of three parts, and it is not the important one

The headline bug — **a web PRO subscription charges the card and grants
nothing** — is in an **edge function**, not the database. No amount of SQL
fixes it. The change set splits like this:

| Part | Ships how | What it covers |
|---|---|---|
| Web client | merge to `main` → Cloudflare, automatic | shop UI, prices shown, the RPCs it calls |
| **Edge functions** | **Lovable deploy** | **§1 subscription webhook**, §2 auth, §9 price key, and the server's copy of the price table |
| Migrations | Lovable SQL editor (below) | §3 §4 §5 §7 §12 §13 |

**The edge function deploy is not optional**, and skipping it is worse than
doing nothing, for one specific reason: `_shared/pricing.ts` is the server's
mirror of `src/config/pricing.ts`, and this branch changed both. Deploy the
client without the functions and the gem shop **displays $10.99 and charges
$12.99** — display and charge disagreeing, which is the exact thing the whole
pricing layer exists to prevent.

So the ask to Lovable is still one sentence — *"deploy the edge functions"* —
and nothing else, per AGENTS.md §4a. The SQL below is what you run yourself so
that the deploy is the only thing you have to ask for.

---

## Current live state, probed with the anon key just now

```
purchase_shop_item   -> 404   migrations NOT applied yet
grant_vip_days       -> 401   exists (401 = reached the auth check)
exchange_currency    -> 401   exists
stripe-gem-webhook   -> 401   deployed, and BOTH Stripe secrets are set
create-pro-checkout  -> 400   deployed, OLD version
create-gem-checkout  -> 401   deployed
```

Two things worth reading off that:

- **`stripe-gem-webhook` answering 401 means `STRIPE_SECRET_KEY` and
  `STRIPE_WEBHOOK_SECRET` are both already configured.** The function checks
  them *before* the signature, returning 400 and 500 respectively when they are
  missing; 401 is "missing signature", which is past both. **You do not need to
  touch Supabase secrets.**
- **`create-pro-checkout` answering 400 rather than 401 is how you will know
  the deploy landed.** The old version accepts an unauthenticated request and
  gets as far as the tier check; the new one returns 401 immediately. Same
  probe, different number.

Re-run any of these yourself:

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST "https://sqwpzezkhpqkdyltvsim.supabase.co/rest/v1/rpc/purchase_shop_item" \
  -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY" \
  -H "Content-Type: application/json" -d '{"p_item_id":"probe"}'
```

`404` before, `401` after.

---

## Order matters, and one order is actively harmful

**Do NOT apply the SQL before the web client is deployed.**

The currently-live client buys in two steps: `spendGems()`, then a separate
grant. Migration `20261104110000` closes the grant half — that is the fix — but
`spendGems()` goes on working. So an old client against a new database
**takes the gems and delivers nothing**, on every shop purchase, silently
enough that the player only sees "purchase failed".

The reverse is safe: a new client against an old database calls
`purchase_shop_item`, gets a 404, and shows the same failure toast having
charged nothing.

### The sequence

1. **Merge this branch to `main`.**
   Cloudflare deploys the web app automatically (~3.5 min; note `deploy.yml`
   ignores `**/*.md`, so a docs-only commit will not trigger it).

2. **Run the three SQL files below**, in order, in the Lovable SQL editor.

3. **Ask Lovable to deploy the edge functions.** The exact prompt is below.

Step 2 before step 3 on purpose. Lovable regenerates
`src/integrations/supabase/types.ts` on a sync, and this branch hand-added five
function signatures to it (`purchase_shop_item`, `purchase_power_up`,
`grant_reward_power_up`, `ensure_default_power_ups`, `claim_vip_frame`). If it
regenerates against a database that does not have them yet, it deletes them and
the build breaks — AGENTS.md §1, the failure it describes. Applying the SQL
first makes that regeneration harmless.
(`src/__tests__/repo-invariants.test.ts` names all five, so CI fails loudly
rather than mysteriously if it happens anyway.)

**The one window you cannot close:** between step 1 and step 3 the new client
shows the new gem prices while the old deployed function still charges the old
ones. It is short, and the app is not on the App Store yet, so the exposure is
whatever web traffic you have in those few minutes. If you would rather have
none at all, do steps 1–3 back to back at a quiet time.

---

## The SQL, in order

Paste each file's contents into the Lovable SQL editor and run it. They are
independent of one another but ordered by dependency of meaning, and
`20261104110000` is the one that matters.

### 1. `20261104100000_reprice_vip_against_subscription.sql`

https://raw.githubusercontent.com/devitsbeka/flutter-native-play/claude/pricing-economics-audit-q29u8m/supabase/migrations/20261104100000_reprice_vip_against_subscription.sql

Updates four `economy_config` rows so the admin economy screen states the VIP
gem prices the shop now charges (70 / 125 / 230 / 570). A mirror table — this
one changes no price by itself, and is safe to run at any point.

### 2. `20261104110000_shop_purchase_and_exchange_spread.sql`

https://raw.githubusercontent.com/devitsbeka/flutter-native-play/claude/pricing-economics-audit-q29u8m/supabase/migrations/20261104110000_shop_purchase_and_exchange_spread.sql

**The important one.** Creates `shop_catalog` and `purchase_shop_item`, revokes
`grant_vip_days` from clients, deletes the `shop_grant` reward kind, makes
`adjust_power_up` debit-only, closes the write policies on `user_power_ups` and
`user_avatar_frames`, adds `purchase_power_up` / `grant_reward_power_up` /
`claim_vip_frame`, and puts a spread on the coins→gems exchange.

This is the one that must not run before the client is deployed.

### 3. `20261104120000_iap_products_mirror_real_prices.sql`

https://raw.githubusercontent.com/devitsbeka/flutter-native-play/claude/pricing-economics-audit-q29u8m/supabase/migrations/20261104120000_iap_products_mirror_real_prices.sql

Reseeds `iap_products` to the prices actually charged, adds the three
subscriptions, deactivates seven rows for products that no longer exist, and
deletes the two `app_settings` rows that invited a live Stripe secret key into
the database. Safe at any point.

### 4. `20261104130000_avatar_generation_is_server_charged.sql`

https://raw.githubusercontent.com/devitsbeka/flutter-native-play/claude/pricing-economics-audit-q29u8m/supabase/migrations/20261104130000_avatar_generation_is_server_charged.sql

Adds `claim_avatar_generation` and `refund_avatar_generation`, so AI avatar
generation is charged and capped by the server instead of by the browser. Pairs
with the `generate-avatar` deploy — apply this before that function ships, or
it calls an RPC that does not exist.

### 5. `20261104140000_internal_functions_are_internal.sql`

https://raw.githubusercontent.com/devitsbeka/flutter-native-play/claude/pricing-economics-audit-q29u8m/supabase/migrations/20261104140000_internal_functions_are_internal.sql

**Run this one first if you run nothing else today.**

It revokes five SECURITY DEFINER functions from `anon` and `authenticated`.
The important one is `apply_currency_grant` — the uncapped credit primitive
that `credit_gameplay_reward` wraps so a ceiling can be applied first. It is
callable by any signed-in user right now:

```js
await supabase.rpc('apply_currency_grant', {
  p_user_id: me, p_kind: 'x', p_coins: 999999, p_gems: 9999 })
```

Every cap in `currency_grant_limits` bypassed, by the function the whole
server-authoritative currency system was built around. This one is live today,
predates everything else on this branch, and is **safe to apply on its own, in
any order, with the old client still deployed** — nothing legitimate calls
these five from a browser.

> **It did not used to be.** The first version was five bare `REVOKE`
> statements, three of them naming functions that `20261104110000` and
> `20261104130000` create. Run first — which is what this section tells you to
> do — it died at the third with
> `ERROR: 42883: function public.grant_power_ups(uuid, text, integer) does not exist`,
> and because the SQL editor runs a file in one transaction, the two revokes
> that mattered rolled back with it.
>
> It now checks `to_regprocedure` per function and skips what is not there yet,
> reporting which. Verified in four orders: this one first on a database with
> none of the others, then the rest; twice in a row; and the natural sequence
> on a fresh database. All four end with zero of the five callable.

---

## Verify it applied

Paste this back into the SQL editor. Every `value` should match its `expect`.

```sql
SELECT 'shop_catalog rows' AS check, count(*)::text AS value, '40' AS expect FROM shop_catalog
UNION ALL SELECT 'vip_month price', price_gems::text, '570'      FROM shop_catalog WHERE id='vip_month'
UNION ALL SELECT 'gems_1500 price USD', price_usd::text, '10.99' FROM iap_products WHERE id='gems_1500'
UNION ALL SELECT 'gems_1500 price GEL', price_gel::text, '13.74' FROM iap_products WHERE id='gems_1500'
UNION ALL SELECT 'vip_price_month cfg', value::text, '570'       FROM economy_config WHERE id='vip_price_month'
UNION ALL SELECT 'shop_grant limit row', count(*)::text, '0'     FROM currency_grant_limits WHERE kind='shop_grant'
UNION ALL SELECT 'stripe keys in app_settings', count(*)::text, '0' FROM app_settings WHERE key LIKE 'stripe%'
UNION ALL SELECT 'power_up_grant_limits rows', count(*)::text, '5' FROM power_up_grant_limits
UNION ALL SELECT 'grant_vip_days granted to authenticated', count(*)::text, '0'
  FROM information_schema.role_routine_grants
 WHERE routine_name='grant_vip_days' AND grantee='authenticated'
UNION ALL SELECT 'purchase_shop_item granted to authenticated', count(*)::text, '1'
  FROM information_schema.role_routine_grants
 WHERE routine_name='purchase_shop_item' AND grantee='authenticated'
UNION ALL SELECT 'client write policies on user_power_ups', count(*)::text, '0'
  FROM pg_policies WHERE tablename='user_power_ups' AND cmd IN ('INSERT','UPDATE')
UNION ALL SELECT 'client INSERT policy on user_avatar_frames', count(*)::text, '0'
  FROM pg_policies WHERE tablename='user_avatar_frames' AND cmd='INSERT'
UNION ALL SELECT 'internal functions still callable', count(*)::text, '0'
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  CROSS JOIN (VALUES ('anon'), ('authenticated')) AS r(rolname)
 WHERE n.nspname = 'public'
   AND p.proname IN ('apply_currency_grant','befriend_room_players','grant_power_ups',
                     'claim_avatar_generation','refund_avatar_generation')
   AND has_function_privilege(r.rolname, p.oid, 'EXECUTE');
```

Read-only. Run it as often as you like.

---

## Which edge functions, and what to say to Lovable

### The three that need deploying

| Function | Why |
|---|---|
| `stripe-gem-webhook` | §1 — handles `customer.subscription.*` now. This is the one that matters. |
| `create-pro-checkout` | §2 — requires auth, and reads the repriced `_shared/pricing.ts` |
| `create-gem-checkout` | §9 — price key from `pack.id`, and the repriced table |
| `generate-avatar` | §15 — charges and caps AI generation, which it did not do at all |

`supabase/functions/_shared/` is not deployable on its own — Deno bundles it
into each function that imports it, so those files ship with the three above
automatically. Nothing to ask for there.

### The two that do NOT need anything

`verify-receipt` and `revenuecat-webhook` also bundle `_shared/iap.ts`, which
this branch touched — but the change is purely additive: `creditSubscriptionWelcome`
gained an `export` keyword and an optional `platform` argument that defaults to
the expression it replaced. Neither function passes it, so their behaviour is
identical whether they carry the old bundle or the new one. Including them does
no harm; leaving them alone does none either.

### The prompt

Copy this as-is:

> Please deploy these four Supabase edge functions from the current `main`,
> exactly as the code stands, and nothing else:
>
> - `stripe-gem-webhook`
> - `create-pro-checkout`
> - `create-gem-checkout`
> - `generate-avatar`
>
> They import shared modules from `supabase/functions/_shared/`, which are
> bundled automatically — no action needed there.
>
> Please do **not**:
> - regenerate or edit `src/integrations/supabase/types.ts`
> - edit, refactor or rewrite anything under `supabase/functions/`
> - add, remove or update dependencies, or touch `package.json`,
>   `package-lock.json` or `bun.lock`
> - change any other file in the repo
>
> If something looks wrong or missing, please stop and tell me instead of
> fixing it.

### The prompt is not the protection — the order is

Asking nicely is worth doing and is not a guarantee. Two things actually
protect you:

**Run the SQL first (step 2 before step 3).** `types.ts` gets wrecked when it
is regenerated against a database that does not have the functions yet — the
generator writes what it finds, and what it finds is nothing. Once
`20261104110000` is applied, the five names below exist in the database, so a
regeneration produces them and the whole risk evaporates. This is the real fix;
the prompt is the belt.

**Check afterwards.** These five signatures are what a bad regeneration
deletes:

```
purchase_shop_item   purchase_power_up   grant_reward_power_up
ensure_default_power_ups   claim_vip_frame
```

`src/__tests__/repo-invariants.test.ts` names all five, so:

```bash
git pull
npx vitest run src/__tests__/repo-invariants.test.ts
```

fails with a message naming the missing one, rather than two dozen errors at
the call sites. `git diff HEAD~1 --stat` is also worth a glance — a deploy
should not have changed any file.

### If it happens anyway

`types.ts` was last correct in commit `9b3fad6`:

```bash
git checkout 9b3fad6 -- src/integrations/supabase/types.ts
npx vitest run src/__tests__/repo-invariants.test.ts   # should pass
git commit -m "Restore the RPC types Lovable regenerated away"
git push
```

Nothing else in the repo depends on the regenerated content, so restoring the
one file is the whole fix.

---

## Stripe: the webhook events, step by step

The handler is written and will be live once the functions are deployed. But
**Stripe only delivers the events an endpoint is subscribed to**, and yours is
subscribed to gem-purchase events only. Until this is done, §1 is half fixed:
the code can grant a subscription and will never be told about one.

Everything below is in the Stripe Dashboard. **Check the Test/Live toggle at
the top** — do the whole thing in whichever mode you are actually selling in,
and repeat it in the other if you use both. Test and live have separate
endpoints and separate signing secrets.

### Step 1 — find the endpoint

1. Go to **https://dashboard.stripe.com/webhooks**.
2. You are looking for one whose URL ends in `/functions/v1/stripe-gem-webhook`
   — in full:
   ```
   https://sqwpzezkhpqkdyltvsim.supabase.co/functions/v1/stripe-gem-webhook
   ```
3. Click it.

If there is **no such endpoint**, skip to *"If you have to create it"* below.

### Step 2 — read the failed deliveries first, before changing anything

This is the diagnostic, and it is the answer to "has this already cost me a
customer".

1. On the endpoint's page, look at the recent deliveries list.
2. Filter or scan for **failed** attempts, and for the event type
   `checkout.session.completed`.
3. **A failed delivery with response `400` and body `{"error":"Missing metadata"}`
   is a PRO subscription that was paid for and never granted.** Open each one
   and note the `client_reference_id` / customer email and the amount.
4. If that list is empty, no web PRO subscription has ever been sold and this
   was caught before it cost anything.

Keep that list. Step 6 is what to do with it.

### Step 3 — add the subscription events

1. On the endpoint page, click **"..." → Update details** (or the
   **Select events** / **Listen to events** control — the wording moves around).
2. Add these three, keeping everything already selected:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
3. Confirm `checkout.session.completed` is **still selected** — that is what
   credits gem packs, and removing it breaks gem purchases.
4. Save.

Why these three and not `invoice.paid`: the subscription object carries both
the status and `current_period_end`, and `customer.subscription.updated` fires
on renewal, cancellation, trial→active and payment failure. One writer, one
fact. Adding `invoice.paid` as well is harmless (the handler ignores it) but
buys nothing.

### Step 4 — confirm the signing secret

You almost certainly do not need to change anything here. The probe above
showed the function getting as far as the signature check, which means
`STRIPE_WEBHOOK_SECRET` is already set and matches.

Only if you **created a new endpoint** in step 1:

1. On the endpoint page, reveal the **Signing secret** (`whsec_…`).
2. Put it in Supabase → your project → **Edge Functions → Secrets** as
   `STRIPE_WEBHOOK_SECRET`.
3. `STRIPE_SECRET_KEY` should already be there from
   https://dashboard.stripe.com/apikeys.

Never put either of these in `.env` — that file is tracked and ships in the
bundle (AGENTS.md §5).

### Step 5 — test it end to end

1. In **test mode**, open the app's paywall on the web and subscribe with
   Stripe's test card `4242 4242 4242 4242`, any future expiry, any CVC.
2. Back in **Developers → Webhooks → your endpoint**, the deliveries list
   should now show `customer.subscription.created` with a **200**.
3. Confirm the entitlement actually landed — in the Lovable SQL editor:

   ```sql
   SELECT p.nickname, v.vip_tier, v.expires_at, v.auto_renew, v.purchase_platform
     FROM vip_subscriptions v
     JOIN profiles p ON p.user_id = v.user_id
    WHERE v.purchase_platform = 'web'
    ORDER BY v.updated_at DESC
    LIMIT 10;
   ```

   You want a row with `vip_tier` `pro` or `pro_plus`, `purchase_platform`
   `web`, and `expires_at` about a month or a year out.

4. Then cancel that test subscription in Stripe (**Customers → the customer →
   the subscription → Cancel**) and re-run the query. `auto_renew` should go
   `false`, and once the period actually ends the row should expire rather than
   disappear.

If step 2 shows a **400**, open the delivery and read the response body — the
handler says which of `user_id` / `tier_id` it could not use, and both come from
`create-pro-checkout`, so a 400 there means the old version of that function is
still deployed.

### Step 6 — reconcile anyone the old bug caught

For each paid-but-not-granted customer from step 2:

1. Find their `user_id` — match the Stripe customer's email:

   ```sql
   SELECT user_id, nickname FROM profiles
    WHERE user_id = (SELECT id FROM auth.users WHERE email = 'them@example.com');
   ```

2. Grant the time they paid for. `grant_vip_days` is revoked from *clients*,
   but the SQL editor runs as the owner, so it still works here — which is
   exactly what it is for:

   ```sql
   -- Run as the project owner in the SQL editor, not from the app.
   SELECT public.grant_vip_days('month');   -- or 'week' / 'day'
   ```

   That grants to `auth.uid()`, which is null in the SQL editor — so for
   somebody else, write the row directly instead:

   ```sql
   INSERT INTO public.vip_subscriptions
     (user_id, vip_tier, expires_at, auto_renew, purchase_platform)
   VALUES ('<their user_id>', 'pro_plus', now() + interval '1 month', true, 'web')
   ON CONFLICT (user_id) DO UPDATE
     SET vip_tier   = EXCLUDED.vip_tier,
         expires_at = GREATEST(vip_subscriptions.expires_at, EXCLUDED.expires_at),
         auto_renew = EXCLUDED.auto_renew,
         updated_at = now();
   ```

   `pro_plus` for the annual plan and the Friends plan, `pro` for solo monthly
   — the tier is what decides the friend seats.

3. Their next renewal will now be picked up by the webhook normally; this is
   only for the period already paid.

### If you have to create it

1. **Developers → Webhooks → Add endpoint**.
2. URL: `https://sqwpzezkhpqkdyltvsim.supabase.co/functions/v1/stripe-gem-webhook`
3. Events: `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`.
4. Save, then do step 4 with the new signing secret.

---

## Afterwards

- Re-run the probe: `create-pro-checkout` should answer **401**, and
  `purchase_shop_item` should answer **401** instead of 404.
- Buy something small in the shop and check the gem balance moves by the price
  on the card.
- `allow_promotion_codes` is still `true` on PRO checkout, by your call. Worth
  a look at **Product catalogue → Coupons** for anything left over from
  testing: a `forever` 100%-off code is an unlimited free subscription and
  nothing in this repo bounds it.
