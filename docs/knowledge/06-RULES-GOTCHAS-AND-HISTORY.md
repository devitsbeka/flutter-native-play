# MyTrivia — rules, gotchas, conventions and history

*The expensive lessons, and how this repository is actually worked.
Written 2026-09-06 from `main` @ `21717c9`.*

More than one agent edits this codebase — Lovable, Claude Code, and whoever comes
next. Most of what follows exists because something broke.

---

## 1. The six hard rules (from `AGENTS.md`, which is `CLAUDE.md`)

### 1.1 Never regenerate `src/integrations/supabase/types.ts` against a database missing the entitlement migrations

The client calls six database functions **by name**:

```
grant_vip_days · ensure_admin_lifetime_pro · claim_daily_reward
claim_leaderboard_reward · credit_gameplay_reward · exchange_currency
```

They are created by `supabase/migrations/20260813*.sql`. Regenerating types
against a database that has not had those applied **silently deletes all six**,
and the build then fails with two dozen errors at the call sites, none of which
mention the cause. Apply the migrations first, then regenerate.
`repo-invariants.test.ts` fails loudly if they go missing.

This is also why you ask Lovable for **the deploy and nothing else** — it syncs
the whole repo, and every extra pass is a chance for it to regenerate this file.

### 1.2 Install with npm, or update both lockfiles

The repo carries **both `package-lock.json` and `bun.lock`**. CI runs `npm ci`,
which refuses to install when `package.json` and `package-lock.json` disagree —
so installing with bun and committing only `bun.lock` takes down every CI job on
every open pull request, before any code runs. If you add a dependency with bun,
also run `npm install --package-lock-only`.

### 1.3 Money and entitlements are enforced in the database — leave them there

Full detail in `03-BACKEND-DATA-AND-SECURITY.md` §4. The short version:
`vip_subscriptions` has no client write policy; `update_user_currency` refuses
positive deltas from a signed-in caller; credits flow only through bounded
server-side functions that write a `currency_grants` ledger row; and **every
`SECURITY DEFINER` function must `REVOKE ALL … FROM PUBLIC` and then grant
explicitly**, because Postgres grants new ones to `PUBLIC` by default.

Each of these replaced a hole where a signed-in user could grant themselves a
paid subscription or unlimited currency. Do not reintroduce a client-side write
"for convenience". `supabase/tests/` executes these rules against a real Postgres.

### 1.4 The edge functions are written — deploy, do not rewrite

`verify-receipt`, `revenuecat-webhook` and `_shared/iap.ts` are a **single
design**: one product catalog, one apply path, an `iap_events` ledger that makes
RevenueCat's retries idempotent. A second implementation of any of them will
disagree with the tables and with each other. If one appears to be missing,
check the branch before writing a new one.

### 1.5 Server-side deploys go through Lovable

See `05-PLATFORMS-DEPLOY-AND-RELEASE.md` §3. Including: a Supabase MCP server in
your session belongs to a different account; check the project ref
(`sqwpzezkhpqkdyltvsim`) before believing you have access, and assume you do not.

### 1.6 `.env` is tracked on purpose, and the build refuses to run without it

It holds only public values (project ref, anon key, RevenueCat public SDK key,
AdMob unit ids). Three separate builders read it — the GitHub deploy workflow,
Lovable, and local builds — and removing it broke two of them. Real secrets are
Supabase platform secrets and must never be committed.

`vite build` refuses to build without the Supabase values, because Vite inlines
`undefined` for an unset `VITE_*` var: the build succeeds, deploys, and the app
cannot reach its backend, with nothing in CI to explain why. **The fix for
"Refusing to build without VITE_SUPABASE_URL" is to supply the value, not to
remove the check.**

## 2. The iOS scroll trap

`nativeShell.ts` calls `Keyboard.setScroll({ isDisabled: true })`, whose iOS
implementation is `webView.scrollView.scrollEnabled = NO`. That kills the
webview's document scroller for the life of the app — **deliberately**, so iOS
cannot drag the page around when the keyboard opens.

The consequence: a page whose content just grows (`min-h-screen` and let the
document scroll) works in every browser and is **frozen solid on the device**.
The category landing page shipped that way twice.

Standalone pages must be a fixed-height box that scrolls itself:

- plain page: `h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-y-auto`
- full-bleed page: `h-[100dvh] overflow-y-auto safe-bleed`

Pages inside `MainLayout` already scroll in its container and need nothing.

Related: **never put a safe-area utility on the same element as its own
padding** — `repo-invariants.test.ts` scans every `.tsx` for it.

## 3. `backdrop-filter` on a phone

Glass surfaces are opaque below `md` and glass at `md` and up. `backdrop-filter`
is cheap in a desktop browser and pathological in WKWebView: on a large surface
inside a scrolling container it asks the compositor to re-sample everything
behind it every frame, and when it cannot keep up it does not slow down — it
hands back stale or empty tiles. That is what "the whole page is glitching"
looks like: a card row that paints half of itself, artwork that never appears, a
screenful of blank under content that is really there.

**The rule is a width, not a platform.** iOS Safari runs the same engine as the
app, so a Capacitor check would have fixed the app and left mobile web exactly as
broken. `docs/why-mobile-surfaces-are-opaque.md`.

## 4. The safety net: `src/__tests__/repo-invariants.test.ts`

Runs in CI on every PR. If it fails, read the message — it names the cause and
the fix. **Do not delete an assertion to make it pass.** What it asserts:

- the six entitlement RPCs are still in the generated types;
- `package-lock.json` is in sync with `package.json`;
- the build cannot ship without a backend;
- `.env` still exists for the build systems that read it;
- the client and server product catalogs agree (gem packs ↔ `_shared/iap.ts`);
- the web gem catalog matches the client's;
- the Stripe webhook never runs unsigned (it must call `constructEventAsync`, not
  just `JSON.parse` the body);
- **the app charges the price it displays, in every currency**;
- both PRO tier products stay on a monthly identifier;
- no safe-area utility shares an element with its own padding;
- every shareable route is listed in the universal-links file;
- the entitlement migrations are still present.

Alongside it, 112 more top-level test files pin decided behaviour by name —
`proOffer`, `subscriptionTerms`, `privacyDisclosure`, `trackingConsent`,
`categoryAccess`, `partyCategories`, `unreleasedModesHidden`, `universalLinks`,
`videoRange`, `locale-parity`, `no-mixed-language`, and so on. Several of them
**read the SQL migration** to check a client constant still matches the server
rule.

## 5. Things that have actually gone wrong

A partial catalogue, because each one is a class of mistake rather than a
one-off.

| What happened | The lesson |
|---|---|
| Types regenerated against a database without the entitlement migrations | §1.1 |
| A bun install committed without the npm lockfile | Took down CI on every open PR |
| `.env` untracked | The deploy built an app that could not reach its backend; the build guard now refuses |
| Two gem ladders in two surfaces | The shop sold 30/100/300/700 and the modal 100/500/1500/5000 — four to eight times more gems per dollar. On native the SKU lookup was by gem *count*, so three of four packs resolved to "unavailable" and the fourth advertised 111 gems and credited 100. Lookup is by pack **id** now |
| "700 +200" advertised, `value: 700` sent to checkout | The bonus was never granted on any platform. `gems` now means **total credited** |
| Three different answers to "what does PRO cost" | A Georgian buyer was quoted 10.97 ₾ and charged 9.99 ₾. Nothing is converted now — a price exists per currency or it does not exist |
| Paywall footnote read `9.99 ₾ / paywall.period_friends` | A raw translation key on the screen App Review reads the price off. The period key is now derived from `plan.months`, so a fourth row cannot reintroduce it |
| Discover cover said "/ month" while quoting the yearly total | Twelve times the real monthly price, on the first screen a reviewer sees |
| Paywall fell back to a hardcoded USD monthly row when StoreKit returned nothing | Two rejections on one screen (2.3.1 + 2.1). It now shows an explicit "store unavailable" state |
| The annual plan granted `pro` on the server and `pro_plus` on the client | Would have sold five friend seats and handed over one. `proOffer.test.ts` reads the SQL |
| RevenueCat's `gems_5000` package wired to the 1500 product | The 5000 pack was in no package at all, and nothing announced it |
| A V2 RevenueCat secret key | 403 code 7723 against the V1 `/subscribers` endpoint, and every symptom is server-side |
| `GADApplicationIdentifier` held the **Android** app id | Recent SDK versions raise on it — a crash on launch before the app paints, the first thing a reviewer would hit |
| ATT deferred to the first ad | Build 34 rejected under 2.1. Ads are opt-in, so review never reached one. Three further suppressors compounded it |
| `io.mytrivia.adfree` mounted but unreachable | An IAP App Review cannot find is a 2.1 rejection. Removed from the client catalog rather than wired up |
| No `<Toaster>` was ever mounted | The app calls `toast()` in ~580 places and none of it had ever reached a screen — "it loads for a second and does nothing" was the app explaining itself to nobody |
| `complete_room_round` done client-side | RLS silently blocked every non-host row: "0 points and 0 rounds after every round" |
| Client-side `friendships` insert as "we are friends now" | Actually "I am in your friends list now" for anyone whose user id you can learn — and every room participant can read those. The invite-link code is what proves consent |
| `process_referral_reward` granted PRO to a caller-supplied recipient | `SECURITY DEFINER`, granted to `PUBLIC` by default, never revoked, and the invite table let anyone name themselves as inviter. Measured against a real Postgres: two calls, no friend, ten days of self-granted PRO, repeatable forever. **This is the incident rule §1.3 exists for.** Function dropped; table kept but no longer client-writable |
| Streak rewards banked twice | A local "claimed" flag instead of a server-side ledger check |
| Shared quota for avatar scenes and portraits | Silently blocked new avatars with no explanation. Separate caps now |
| `send-game-invite-push` never deployed | HTTP 404 while every other function answered 401; the call is fire-and-forget, so it failed silently |
| A guarded route for `/docs` | The chunk still shipped, and the chunk was the leak. Build-time exclusion now |
| Reduce Motion did nothing | Hundreds of infinite decorative animations, none of which asked the OS setting |
| Root tsconfig `files: []` | `tsc --noEmit` resolved to an empty program and passed unconditionally for a while |
| Category landing page shipped without its own scroller — **twice** | §2 |

## 6. Patterns to match when adding to this codebase

- **Dual-path anything that needs a new migration.** Migrations land through
  Lovable on their own schedule, so a hook must cope with a window where the
  page exists and the server half does not. Detect the missing column or the
  PostgREST "no such function", fall back to a legacy rule or an explanatory
  refusal, and switch over automatically when it appears. `usePlayLimit`,
  `useStreakMilestones`, `useGameTypes`, `categoryAccess` and `adjust_power_up`
  all do this.
- **Mirror, don't duplicate.** If a constant must exist on both sides, write a
  test that reads the SQL.
- **Fail open on infrastructure, fail closed on money.** The rewarded-ad gate
  lets the player through when the network breaks; the RevenueCat webhook
  refuses to run at all when its secret is unset.
- **One source of truth per policy**, and put the reasoning in a header comment.
- **Build links from `SITE_URL`**, toasts through `src/lib/toast.ts`, shares
  through `utils/shareLink.ts` — all enforced by tests.
- **Write the comment that explains the incident.** The long header comments in
  this repo are its institutional memory; they are why the same bug has not
  shipped three times. Match that style rather than stripping it.

## 7. How the repository is worked

**Repo**: `devitsbeka/flutter-native-play`, **public**, default branch `main`.
No open issues. Roughly **570 pull requests** to date.

**Branching**: work happens on `claude/<topic>-<suffix>` branches, e.g.
`claude/homepage-design-update-e3eywq`, `claude/most-likely-to-category-7jqonq`.
A topic branch is long-lived and carries **many small PRs** — a dozen or more
merged in a day is normal. `main` is merged back into the topic branch rather
than the branch being rebased.

**PR and commit titles are prose describing player-visible behaviour**, not
conventional-commit prefixes. Real examples:

> *"Tapping a room on the home screen opens its lobby"* ·
> *"The Discover offer quotes the year as a year, and only says free when it is"* ·
> *"A room can be opened by its code more than once per visit to the rooms page"* ·
> *"Backing out of a lobby entered from the home rail gives the rooms page back"* ·
> *"Retire the preset faces, fresh faces on the cards, seats change at once, your own row is the way out"*

Match this. No `feat:`, no `fix:`, no ticket ids. Describe what changed for the
person using the app.

**Open PRs at the time of writing** (both long-lived):

| # | Title |
|---|---|
| 472 | Add Four Crowns UGC campaign marketing materials |
| 391 | Repair the English question bank: 1,527 rewritten, 189 retired |

**Design source**: much of the recent UI work is driven from Figma frames, and
comments cite them by node id (e.g. *"Figma 1018:5815 (Game Rules)"*).

**Documentation is a first-class artifact here.** `docs/` carries ~280 KB of
long-form documents that are current and specific — the launch runbook, the
action-item inventory, the feature reference, the four-pass iOS audit, the game
type design doc. That is unusually good for a team this size, and it materially
reduces transfer risk. Keep it that way: when behaviour changes, the document
that describes it is part of the change.

## 8. Open questions and parked decisions

- **Disclosure of simulated opponents and seeded content accounts.** Both are
  ordinary free-to-play practice, both narrowly implemented, neither currently
  disclosed to players. It is a policy and consumer-perception decision that has
  not been made, and it belongs in the store listing or terms before launch. It
  also means the profile count in any database query should not be read as a
  count of real users.
- **Server-side score verification** — the one acknowledged economy gap.
- **Team Battle and King go live by data**, not by a release: one
  `UPDATE game_types SET is_live = true WHERE key = '…'` each, once the
  migrations are applied and the King question pool has grown from its 24-question
  seed toward the ~120 launch bar.
- **`PUBLIC_SHARING_ENABLED = false`** — the whole public-sharing surface is
  built and hidden for this launch. Flipping it back is a one-line change and a
  product decision.
- **Content quality outside Georgian** — six languages of largely
  machine-generated questions with no human audit. PR #391 proposes repairing
  English at roughly the same defect rate the Georgian audit found (~10%).
- **Backlog game types**, roughly ordered: Daily Gauntlet (cheapest to build,
  strongest retention loop, pairs with streaks), Blitz Royale (uses the
  matchmaking investment, marketable, a great TV moment), Auction Trivia, Co-op
  Raid, Liar's Trivia, Relay, Prediction League.
- **Parked playtest questions**: Team Battle board size vs team size; whether a
  whole-team RPS majority reads clearly at 5v5; whether King's 60-second think
  phase holds attention on mobile or 45 tests better; and below what DAU the
  global matchmaking queue feels dead per language bucket.
