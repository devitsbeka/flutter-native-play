# MyTrivia — master brief

*The orientation document. Everything at one screen's depth, with pointers to
the file that goes deeper. Written 2026-09-06 from `main` @ `21717c9`.*

---

## 1. What it is

**MyTrivia** is a multi-mode trivia game and a full free-to-play live service.
It runs as a web app, an iOS app, and a **TV party game** where a big screen
shows the questions and everyone's phone is a buzzer.

It is Georgian-first — Georgian (`ka`) is the default language and the largest
question bank — with six more languages already populated, so expanding markets
is a marketing decision rather than a content project.

One sentence for each way to play:

- **Category campaign** — solo, ~70 categories of star-rated levels.
- **Quick Game (VS)** — a 10-question match against a simulated opponent.
- **Classic rooms** — 2–8 players, real-time, joined by code, QR or link.
- **TV / party mode** — the screen hosts, phones buzz, guests join with a
  nickname and no account.
- **Words** — a word-wheel crossword, solo or with one friend.
- **Team Battle** *(built, dark-launched)* — Family-Feud-style two-team board.
- **MyTrivia King** *(built, dark-launched)* — a "What? Where? When?" style
  logic duel against the game itself, first to 6.
- **Async challenges** — share your score as a link; anyone can play it without
  an account.
- **Player-made trivia and collections** — authored by hand or with AI.
- **Most Likely To** — a party category where the room votes on each other.

Wrapped around all of it: two currencies, power-ups, a shop, PRO subscriptions,
daily/weekly reward loops, missions, streaks, weekly leagues, per-category
leaderboards, a friends graph with presence, push, and 21 in-app notification
types.

→ Full detail: **`01-PRODUCT-AND-FEATURES.md`**

## 2. Identity and coordinates

| | |
|---|---|
| Product | MyTrivia |
| Store listing | *MyTrivia: Party Quiz Game* |
| Bundle id | `io.mytrivia.app` |
| Web | https://mytrivia.io · https://www.mytrivia.io |
| GitHub | `devitsbeka/flutter-native-play` — default branch `main` |
| Apple Team | `T38XQSM4L3` · account `hello@itsbeka.com` |
| Supabase project ref | `sqwpzezkhpqkdyltvsim` (owned and deployed through **Lovable**) |
| Web host | Cloudflare Workers (static assets + a small worker) |
| Payments | RevenueCat → App Store (native) · Stripe (web) |
| Analytics | PostHog + Meta Pixel |

**The repository name is a fossil.** `flutter-native-play` contains no Flutter
and no Dart. It is React 18 + TypeScript + Vite, wrapped in Capacitor 8. The
name is left over from an abandoned start and nobody has renamed it; do not
infer a Flutter codebase from it.

## 2a. The goal

**$100,000 MRR** — subscriptions only; gems and rewarded ads fund the business
but do not count toward it.

That is **~30,000 paying subscribers** and, at 2–5% conversion, **550,000 to
1.5 million monthly actives**. Georgia has ~3.7 million people, so the goal
**cannot be reached in the home market** — it selects international expansion as
the strategy rather than leaving it as a later phase. The product is unusually
ready for that (six non-Georgian languages populated at ~9,400 questions each)
and two known items move onto the critical path as a result: the non-Georgian
banks have had no human audit, and the annual plan — the highest-LTV product —
does not yet exist in App Store Connect.

Working, levers and sequencing: **`07-GROWTH-AND-GO-TO-MARKET.md`**.
Live state, open threads and the run log: **`docs/OPERATIONS.md`** in the repo.

## 3. Stage

**Pre-launch, and post-first-rejection.** The web app is live and deploys on
every merge to `main`. The iOS app has been built, archived and submitted;
**build 34 was rejected under guideline 2.1** because App Tracking Transparency
was deferred until the first ad, and ads here are strictly opt-in, so App Review
never reached one and reported the prompt missing. That is fixed — ATT is now
asked at launch from `NativeBridge` through a dedicated `AppTrackingPlugin.swift`
behind a full-screen explanation, and `src/__tests__/trackingConsent.test.ts`
locks each of the four suppressors that compounded it.

Revenue to date is **$0**; the product has never been publicly released, so
every retention, conversion and ARPU figure is an assumption, not a measurement.

Two revenue lines are switched off by *configuration*, not by code:

1. iOS AdMob unit ids were falling back to Google's demo units (ads serve, they
   pay nothing). Real unit ids are now in `.env` — confirm they are live in the
   AdMob console.
2. The annual subscription is the highest-LTV plan and the paywall is built to
   lead with it, but the row hides itself on a phone until
   `io.mytrivia.pro.annual` exists in App Store Connect.

→ Full detail: **`05-PLATFORMS-DEPLOY-AND-RELEASE.md`**

## 4. Scale (measured 2026-09-06)

| Measure | Value |
|---|---|
| Source files in `src/` | **1,057** `.ts` / `.tsx` |
| Lines of source | **~280,000** |
| React components | 398 `.tsx` under `src/components` |
| Pages | 90 |
| Hooks | 130 |
| Contexts | 20 |
| Test files | 167 (Vitest unit + 5 Playwright specs) |
| SQL test suites | 17, run against a real Postgres in CI |
| Database tables | **107** (from the generated Supabase types) |
| Database RPCs | **114** |
| Edge functions | **76** (Deno) |
| Applied migrations | **337** |
| UI languages | 7, ~4,500 key/value lines each |
| Built-in categories in code | 57 (plus database-backed country/language sets) |
| `public/` payload | ~301 MB, mostly video |

Content in the **production database**, last queried 25 Aug 2026 (will have
grown): 72,576 questions across 7 languages (Georgian 16,510; the other six
~9,400 each), 59,734 with an assigned illustration, a 9,015-asset icon library,
70 categories.

The largest single files, for a sense of where the mass is:
`TVGameContext.tsx` (4,277 lines), `MultiplayerContextV2.tsx` (3,416),
`CreateRoomPage.tsx` (2,189), `TeamV2.tsx` (1,789), `KingPage.tsx` (1,773),
`Index.tsx` (1,670).

## 5. The stack in one table

| Layer | Choice |
|---|---|
| App | React 18, TypeScript, Vite (SWC), React Router 6 |
| UI | Tailwind, shadcn/ui over Radix, plus custom "chunky" game components |
| Motion | Framer Motion, GSAP, Lottie, canvas-confetti, WebM/MP4 overlays |
| 3D | three.js + React Three Fiber (`src/features/world-map`) |
| State | React Context (20 providers) + TanStack Query + Zustand (world map only) |
| Backend | Supabase — Postgres, Auth, Realtime, Storage, Edge Functions (Deno) |
| Native | Capacitor 8, iOS 15+, portrait-locked |
| Web edge | Cloudflare Workers (`worker/index.ts` + assets binding) |
| AI | Server-side AI gateway + fal.ai image models, **only ever called from edge functions** |
| Tests | Vitest, Playwright, plus SQL suites against Postgres 16 |

→ Full detail: **`02-ARCHITECTURE-AND-CODE-MAP.md`**

## 6. The five things that most often trip people up

These are the expensive lessons. Each is expanded in
**`06-RULES-GOTCHAS-AND-HISTORY.md`**, and most are enforced by
`src/__tests__/repo-invariants.test.ts` in CI.

1. **Merging to `main` deploys the web app and nothing else.** Migrations and
   edge functions reach production **through Lovable**, by a human asking for a
   deploy. There is no Supabase CLI access and no `SUPABASE_ACCESS_TOKEN`. A
   Supabase MCP server in a session belongs to a *different account* — check the
   project ref (`sqwpzezkhpqkdyltvsim`) before believing you can reach this
   database.
2. **Never regenerate `src/integrations/supabase/types.ts` against a database
   missing the entitlement migrations.** It silently deletes six RPCs the client
   calls by name and the build fails with two dozen unrelated-looking errors.
3. **Install with npm.** The repo carries both `package-lock.json` and
   `bun.lock`; CI runs `npm ci`, which refuses to install when `package.json`
   and the npm lockfile disagree. Installing with bun alone takes down CI on
   every open PR.
4. **The document does not scroll on iOS.** `nativeShell.ts` disables the
   webview's scroller for the life of the app, deliberately. A standalone page
   that just grows works in every browser and is frozen solid on device. Pages
   must be a fixed-height box that scrolls itself.
5. **Money and entitlements are enforced in Postgres and must stay there.**
   Clients cannot write wallets, scores or subscriptions. Credits flow only
   through bounded `SECURITY DEFINER` functions that write a `currency_grants`
   ledger row. Every one of them is revoked from `PUBLIC` and `anon` explicitly,
   because Postgres grants a new `SECURITY DEFINER` function to `PUBLIC` by
   default.

## 7. The economy in ten numbers

| | |
|---|---|
| Exchange rate | 1 gem = 500 coins |
| New player | 3,000 coins + 3 gems |
| Quick Game stake | 500 coins (win +500, loss forfeits, draw neutral) |
| Free plays | 5 per rolling 3-hour window, counted server-side |
| Extra play | 1 game = 500 coins / 1 gem / 1 rewarded ad; 3 games = 1,500 coins / 3 gems |
| Rewarded ad cap | 5 per day |
| Daily reward week | 200 → 1,500 coins over 7 days, +1 gem on day 7 (~6,750/week) |
| PRO monthly | $3.99 / 4.99 ₾ / €3.99 — carries **1** friend seat |
| Friends PRO monthly | $7.99 / 9.99 ₾ / €7.99 — carries **5** seats |
| PRO annual | $23.88 / 59.88 ₾ / €23.88 — grants `pro_plus`, so **5** seats |

The pressure point that drives revenue is the intersection of the 3-hour play
window, the 500-coin stake and the daily faucet. All three are runtime-tunable
from the admin Economy console without a release.

→ Full detail: **`04-ECONOMY-AND-MONETIZATION.md`**

## 8. Where the knowledge already lives in the repo

This pack is a synthesis. The primary documents, still worth reading directly:

| Document | What it is |
|---|---|
| `AGENTS.md` (= `CLAUDE.md`) | The constraints. Short, load-bearing, read before changing anything. |
| `docs/MYTRIVIA_FEATURES.md` | 54 KB feature reference. Comprehensive; predates Team Battle/King/Words. |
| `BUSINESS_OVERVIEW.md` | Written for reviewers and valuation analysts. Measured, honest about unknowns. |
| `docs/IOS_APP_REVIEW_AUDIT.md` | 82 KB. Four audit passes, findings by severity, the resolution log. |
| `docs/IOS_LAUNCH_PLAN.md` · `docs/LAUNCH_RUNBOOK.md` · `ACTION_ITEMS.md` | The launch work: full audit, ordered sequence, and inventory of what needs a human. |
| `docs/GAME_TYPES_DESIGN.md` | Team Battle, King, matchmaking, Words — decided rules and schema. |
| `docs/HOSTING.md` · `DEPLOYMENT.md` | Web hosting and how to tell what is actually live. |
| `docs/QUESTION_QUALITY_AUDIT_KA.md` | The Georgian content audit: 588 retired, 944 rewritten. |
| `docs/tv-audit/` | Eight-part deep audit of TV mode. |
| `supabase/tests/README.md` | What the SQL suites prove, and what they do not. |
| `/docs` route in the app | An internal technical map, build-flagged out of production. |

## 9. Honest weak points

Named here so nobody has to rediscover them.

- **Gameplay rewards are bounded and ledgered, but not verified.** A modified
  client can still claim a plausible score within the caps. Purchases and
  entitlements *are* server-verified; this is coin/XP inflation, not revenue
  theft. The repo's own launch docs call it "the one economy gap left".
- **Deploy depends on a vendor relationship.** Lovable holds the Supabase
  connection. Anyone valuing or inheriting this should confirm account
  ownership and the path to direct control.
- **Simulated opponents and seeded content accounts.** Quick Game plays against
  bots drawn from real profiles, and a curated list of "content" profiles
  populates the feed — a friend request to one auto-accepts from the requester's
  own client after a stable 4–48 hour delay. Both are ordinary F2P practice,
  both are implemented narrowly, and **neither is currently disclosed to
  players**. It is a policy decision that has not been made.
- **Content quality outside Georgian.** Georgian has had a human audit; the
  other six languages carry ~9,400 largely machine-generated questions each with
  no equivalent pass. PR #391 (open) proposes repairing the English bank.
- **`useInAppPurchases.ts` is ~800 lines** and is the highest-risk file in the
  app by the audit's own reckoning.
