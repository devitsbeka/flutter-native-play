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

Each of these replaced a hole where a signed-in user could grant themselves a
paid subscription or unlimited currency. Please don't reintroduce a
client-side write "for convenience". `supabase/tests/` executes these rules
against a real Postgres.

## 4. The edge functions in `supabase/functions/` are written — deploy, don't rewrite

`verify-receipt`, `revenuecat-webhook` and `_shared/iap.ts` are a single
design: one product catalog, one apply path, an `iap_events` ledger that makes
RevenueCat's retries idempotent. A second implementation of any of them will
disagree with the tables and with each other.

If one appears to be missing, check the branch before writing a new one.

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
