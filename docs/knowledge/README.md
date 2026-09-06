# MyTrivia — Claude Project knowledge pack

Eight files that, together, describe MyTrivia end to end: what the product is,
what is in the repository, how the backend is built and defended, how the money
works, how anything reaches production, what the $100k MRR goal costs in units,
and the rules that were learned the hard way.

**Upload all eight into the project's knowledge.** They are written to be read
in any order and to survive being retrieved one at a time — each carries enough
context to stand alone, at the cost of some deliberate repetition between them.

They are the *briefing* — durable facts about the product. Live state (goals,
loops, open threads, the run log) lives in **`docs/OPERATIONS.md`** in the repo,
which is read at the start of a scheduled run and updated at the end. Do not
upload that one; it changes too often to be knowledge.

| File | Read it for |
|---|---|
| `00-MASTER-BRIEF.md` | Orientation. Identity, stage, scale, the one-screen version of everything. **Start here.** |
| `01-PRODUCT-AND-FEATURES.md` | Every player-facing feature: game modes, progression, social, UGC, TV mode, notifications, i18n. |
| `02-ARCHITECTURE-AND-CODE-MAP.md` | The stack, the provider tree, the route map, where any given thing lives in `src/`. |
| `03-BACKEND-DATA-AND-SECURITY.md` | Supabase: 107 tables, 114 RPCs, 76 edge functions, RLS posture, the server-authority rules. |
| `04-ECONOMY-AND-MONETIZATION.md` | Coins, gems, play limits, PRO tiers and seats, the IAP catalog, prices in every currency, ads. |
| `05-PLATFORMS-DEPLOY-AND-RELEASE.md` | Web/Cloudflare, Supabase-through-Lovable, iOS/Capacitor, CI, environment, the App Review record. |
| `06-RULES-GOTCHAS-AND-HISTORY.md` | The traps. What has broken before, what the invariant tests defend, and the conventions of the repo. |
| `07-GROWTH-AND-GO-TO-MARKET.md` | The goal in units, why it forces international expansion, content readiness per market, the levers ranked, sequencing, and what is not yet known. |

## How these were produced

Written on **2026-09-06** from the repository at
`devitsbeka/flutter-native-play`, branch `claude/mytrivia-knowledge-docs-480m46`
(off `main` @ `21717c9`).

Facts are of three kinds and the documents distinguish them:

- **Measured** — counted or read out of the checkout at that commit (file
  counts, table lists, config values, route tables). These are exact and dated.
- **Documented** — carried forward from the repository's own long-form
  documents (`docs/MYTRIVIA_FEATURES.md`, `BUSINESS_OVERVIEW.md`,
  `docs/IOS_APP_REVIEW_AUDIT.md`, `docs/GAME_TYPES_DESIGN.md`, `AGENTS.md`),
  corrected against the code where the two disagreed. Where a source document
  is now stale, the correction is noted rather than silently applied.
- **Off-repo** — anything that lives in a console (App Store Connect,
  RevenueCat, AdMob, Firebase, Supabase dashboard) or in the production
  database. These are marked, because the repository cannot verify them and
  they drift.

## What will go stale first

- Production database content counts (question bank size, profile count). Last
  measured 25 Aug 2026 in `BUSINESS_OVERVIEW.md`; growing.
- App Store Connect / RevenueCat / AdMob console state, and the submission
  status. Build 34 was rejected on ATT; see `05-PLATFORMS-DEPLOY-AND-RELEASE.md`.
- Prices. They live in `src/config/pricing.ts` and are a one-line change.
- The dark-launched game modes (Team Battle, King), which go live by a single
  `UPDATE game_types SET is_live = true` and not by a release.
- Everything in `07-GROWTH-AND-GO-TO-MARKET.md` marked *Unknown*, which is most
  of the funnel. It stops being unknown thirty days after launch.

When something in here contradicts the code, **the code wins** — and these files
name the file to check for each claim so that is always a short trip.
