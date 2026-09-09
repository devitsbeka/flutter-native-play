# Notes for agents working in this repo

More than one agent edits this codebase — Lovable, Claude Code, and whoever
comes next. This file is the short list of things that have actually broken
when that went wrong, so the next change doesn't repeat them.

Read this before regenerating a file or adding a dependency.

---

## 1. Do not regenerate `src/integrations/supabase/types.ts` from a database
   that lacks the entitlement migrations

The client calls six database functions by name:

```
grant_vip_days · ensure_admin_lifetime_pro · claim_daily_reward
claim_leaderboard_reward · credit_gameplay_reward · exchange_currency
```

They are created by `supabase/migrations/20260813*.sql`. Regenerating types
against a database that hasn't had those applied **silently deletes all six**,
and the build then fails with two dozen errors at the call sites, none of
which mention the cause.

If you need to regenerate: apply the migrations first, then regenerate.
`src/__tests__/repo-invariants.test.ts` will fail loudly if they go missing.

## 2. Install with npm, or update both lockfiles

This repo carries **both `package-lock.json` and `bun.lock`**. CI runs
`npm ci`, which refuses to install when `package.json` and
`package-lock.json` disagree — so installing with bun and committing only
`bun.lock` takes down every CI job on every open pull request, before any
code runs.

If you add a dependency with bun, also run:

```bash
npm install --package-lock-only
```

## 3. Money and entitlements are enforced in the database — leave them there

Subscriptions and currency are deliberately **not** writable by clients:

- `vip_subscriptions` has no client INSERT/UPDATE policy. Grants go through
  `grant_vip_days` or the RevenueCat webhook.
- `update_user_currency` refuses positive deltas from a signed-in caller.
  Credits go through `credit_gameplay_reward`, `claim_daily_reward`,
  `claim_leaderboard_reward` or `exchange_currency`, which decide or bound the
  amount server-side and write a `currency_grants` ledger row.
- Every one of those functions is revoked from `PUBLIC` and `anon`. A new
  `SECURITY DEFINER` function is granted to `PUBLIC` by **default** — always
  `REVOKE ALL ... FROM PUBLIC` and then grant explicitly.

- **A purchase is ONE call.** `purchase_shop_item(id)` reads the price and the
  contents from `shop_catalog` and does the debit and the grant in one
  transaction. It replaced a debit followed by a separate grant, and the
  problem was never that the grant could fail — it was that the grant worked
  *without* the debit. `grant_vip_days` took a duration and nothing else,
  `credit_gameplay_reward('shop_grant', …)` took an amount, and both were
  granted to `authenticated`. Skipping the debit was the whole exploit.
  Same rule for `purchase_power_up` (coins) and `claim_vip_frame`.
- **Nothing a client says about a quantity is evidence either.**
  `adjust_power_up` is debit-only, like `update_user_currency`; awards go
  through `grant_reward_power_up`, bounded per call and per day.
  `user_power_ups` and `user_avatar_frames` have no client write policies.
- **The coin↔gem exchange charges a spread** — 500 to buy, 750 to sell back.
  Lossless both ways, the shop's own coin bonus was a gem printer: 24 gems
  bought 15 000 coins which sold back for 30. Any coin pack paying above the
  sell rate reopens it, which `shopValue.test.ts` asserts.

Each of these replaced a hole where a signed-in user could grant themselves a
paid subscription or unlimited currency. Please don't reintroduce a
client-side write "for convenience". `supabase/tests/` executes these rules
against a real Postgres — `19-shop-purchase.sql` is the one for this section,
and it is worth running after touching anything that grants without charging.
It caught a `42702` in its own migration: a `RETURNS TABLE` column named after
a table column made an `ON CONFLICT` ambiguous, which `CREATE FUNCTION` accepts
and only fails when something calls it.

## 3a. Gem prices and VIP gem prices move TOGETHER

VIP is priced in gems, which are global. Gems are priced in money, which is
per currency. So the real cost of a month of PRO bought with gems is whatever
the gem rate is in the buyer's currency — and there is no per-currency VIP
price to correct it with, because VIP does not have one.

That is how the app came to sell a month of VIP for 4.81 ₾ (against a 4.99 ₾
subscription — fine) and $1.75 (against $3.99 — PRO at 56% off for everyone
outside Georgia). The cause was two lari rates: 2.75× USD for gems, 1.25× for
subscriptions. Both were defensible alone.

**Lari is 1.25× USD for everything now, and `REWARDS.VIP_PRICES` is set so
that 570 gems is `pro_monthly` in every currency.** Change one and you have to
change the other. `src/config/pricing.ts` carries the long version.

## 4. The edge functions in `supabase/functions/` are written — deploy, don't rewrite

`verify-receipt`, `revenuecat-webhook` and `_shared/iap.ts` are a single
design: one product catalog, one apply path, an `iap_events` ledger that makes
RevenueCat's retries idempotent. A second implementation of any of them will
disagree with the tables and with each other.

If one appears to be missing, check the branch before writing a new one.

## 4a. Edge functions and migrations are deployed **through Lovable**, not the CLI

Nobody here has a Supabase personal access token or dashboard CLI access, and
none of the workflows in `.github/workflows/` run `supabase functions deploy` —
`deploy.yml` builds the web app, `pr-checks.yml` runs the migration tests, and
that is all. Stop proposing `npx supabase functions deploy` and stop asking for
`SUPABASE_ACCESS_TOKEN`. It has been asked for more than once and the answer
does not change.

**A Supabase MCP server in your session is not this project.** One may be
connected — with `apply_migration`, `execute_sql`, `list_migrations` and the
rest — and it belongs to a different account. MyTrivia's database is the one
Lovable owns: project ref `sqwpzezkhpqkdyltvsim`, in `.env`. Those tools do
not reach it, and pointing them at whatever project they DO reach would be
writing to someone else's database. Check the ref before believing you have
access, and assume you do not.

The way to run SQL here is unchanged: hand the user a link to the migration's
raw file on `main`, which they paste into the Lovable SQL editor. To confirm
something applied, give them a read-only SELECT to paste back rather than
guessing — and some of it is checkable from here with the anon key in `.env`:
PostgREST answers for tables and functions, and a realtime websocket will say
whether a table is in the `supabase_realtime` publication.

The path is: merge to `main`, then ask Lovable to deploy. Lovable holds the
Supabase connection for this project.

Two consequences worth planning around:

- **`stripe-gem-webhook` handles subscriptions too, despite the name.** It was
  gem packs only, and a `mode: "subscription"` checkout has no `product_id` in
  its metadata — so every web PRO purchase failed `lookupGemPack`, answered
  400, and Stripe retried for three days and gave up. The card was charged; the
  entitlement never existed. Renaming it would cost a webhook re-registration
  and a second signing secret, and it would sit at 404 until Lovable deployed
  it explicitly. **The Stripe endpoint must be subscribed to
  `customer.subscription.created`, `.updated` and `.deleted`** as well as
  `checkout.session.completed`, or the handler never hears about a
  subscription.
- **A new function is not live because it is on `main`.** Existing functions
  get redeployed from `main`; one Lovable has never seen has to be deployed
  explicitly. `send-game-invite-push` sat at HTTP 404 while every other
  function answered 401, which is what that looks like from outside.
- **Shipping an iOS build deploys nothing server-side.** The archive carries
  the client only. A client calling a function that was never deployed fails
  exactly where the failure is hardest to see — and where the call is
  fire-and-forget, as the invite push deliberately is, it fails silently.

When asking Lovable, ask for the deploy and nothing else. It syncs the whole
repo, and every extra pass is a chance for it to regenerate
`src/integrations/supabase/types.ts` — see rule 1 for what that costs.

## 4b. The document does not scroll on iOS — every page owns its scrolling

`nativeShell.ts` calls `Keyboard.setScroll({ isDisabled: true })`, whose iOS
implementation is `webView.scrollView.scrollEnabled = NO`. That kills the
webview's document scroller for the life of the app — deliberately, so iOS
cannot drag the page around when the keyboard opens.

The consequence: a page whose content just grows (`min-h-screen` and let the
document scroll) works in every browser and is **frozen solid on the
device**. The category landing page shipped that way twice. Standalone pages
must be a fixed-height box that scrolls itself:

- plain page: `h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-y-auto`
- full-bleed page: `h-[100dvh] overflow-y-auto safe-bleed`

Pages inside MainLayout already scroll in its container and need nothing.

## 5. `.env` is tracked on purpose

It holds only the Supabase project ref and the **publishable** (anon) key,
both public by design. Three separate builders read it: the GitHub deploy
workflow, Lovable, and local builds. Removing it broke two of them.

Real secrets — the RevenueCat secret key, the webhook secret — are Supabase
platform secrets and must never be committed.

## 6. `vite build` refuses to build without the Supabase values

That guard exists because Vite inlines `undefined` for an unset `VITE_*` var:
the build succeeds, deploys, and the app cannot reach its backend, with
nothing in CI to explain why. If a build fails with *"Refusing to build
without VITE_SUPABASE_URL"*, the fix is to supply the value — not to remove
the check.

---

## The safety net

`src/__tests__/repo-invariants.test.ts` asserts most of the above and runs in
CI on every pull request. If it fails, read the message — it names the cause
and the fix. Don't delete the assertion to make it pass.
