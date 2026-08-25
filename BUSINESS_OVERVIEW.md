# MyTrivia — Business & Launch Overview

**A briefing for reviewers, valuation analysts and financial modellers.**
Prepared 25 August 2026 from the source repository and a read-only query of the
live production database. Every number below is either measured in this repo,
measured in the production database, or cited to the internal document that
holds it. Nothing here is a projection — where an input must come from the
market rather than the code, it is marked **UNKNOWN — post-launch data
required** rather than guessed.

| | |
|---|---|
| **Product** | MyTrivia — a multi-mode trivia game (mobile app, web app, and TV party mode) |
| **Bundle / domain** | `io.mytrivia.app` · https://mytrivia.io |
| **Store record** | *MyTrivia: Party Quiz Game*, App Store Connect, Apple Team `T38XQSM4L3` |
| **Stage** | Pre-launch. Version 1.0, build 30, iOS project complete; not yet submitted for review |
| **Business model** | Free-to-play with subscriptions (PRO / Friends PRO), consumable currency (gems), and opt-in rewarded video |
| **Primary market** | Georgia (Georgian-language first), with six additional languages already populated |
| **Platforms** | iOS (shipping first), web (live), Android (Capacitor target configured, not yet generated or built) |

---

## 1. Executive summary

MyTrivia is a completed live-service trivia game, not a prototype. The
codebase is ~233,000 lines across 864 TypeScript/React source files, backed by
99 PostgreSQL tables, 285 applied migrations and 76 server-side edge functions.
The production database already holds **72,576 questions in seven languages**
and a 9,015-asset illustration library — content that was produced by an
in-house AI generation, translation, quality-review and illustration pipeline
that is itself part of the asset.

The web app is live at mytrivia.io on Cloudflare. The iOS app is built,
signed-project-complete and sized (130 MB), with In-App Purchases created in
App Store Connect, RevenueCat wired end to end, and server-side entitlement
verification implemented and hardened. What remains before submission is
third-party console configuration (AdMob units, Firebase push), a set of Xcode
capability toggles that require a Mac, four App Store Connect forms, and an
on-device sandbox purchase test.

**The three facts that most affect a valuation:**

1. **Revenue is $0 to date and there is no live traction data.** The product
   has never been released. Every conversion, retention and ARPU input in a
   model must be assumed, not derived. Section 8 lists precisely which inputs
   are unknown.
2. **The content library and the pipeline that produced it are the durable
   asset.** 72,576 reviewed, illustrated, multi-language questions is a
   multi-year manual effort compressed into an automated one; the pipeline can
   keep producing at marginal AI cost.
3. **Two revenue lines are switched off by configuration, not by code.** iOS
   ad units still point at Google's demo inventory (ads serve, revenue is
   zero), and the annual subscription — the highest-LTV plan, which the paywall
   is built to lead with — has not yet been created in App Store Connect.
   Both are hours of console work, not development.

---

## 2. What the product is

A trivia game with six distinct ways to play, wrapped in a full free-to-play
live-service economy.

**Game modes**

| Mode | Description | Monetization touchpoint |
|---|---|---|
| Category campaign | Solo, 70 categories × ~20 star-rated levels | Free tier capped at 3 levels across 5 categories; PRO unlocks all |
| VS mode | 10-question match against a simulated opponent | 500-coin stake per game; PRO plays free |
| Multiplayer rooms | 2–8 players, real-time, room codes / QR / deep links | Room and trivia creation limits gated by PRO |
| TV party mode | Big screen shows questions, phones are buzzers; guests join with a nickname only | Acquisition surface — playable with no account |
| Async challenges | Share a link with your score to beat; playable without an account | Acquisition surface |
| Player-made trivia | Players author quizzes (AI-assisted or manual) and publish to a discovery feed | Creation quotas gated by PRO |

**Retention machinery already built:** 7-day daily reward cycle, 24-hour
treasure chest, daily lucky spin, rotating daily (5) and weekly (4) missions
with beginner/advanced difficulty tiers, mission streaks to 30 days, weekly
Bronze/Silver/Gold leagues with promotion and demotion, per-category
leaderboards with weekly top-10 prizes, friends graph with presence, push
notifications and 21 in-app notification types.

**Differentiator.** TV party mode is the unusual piece. It is the largest
subsystem in the codebase (~4,200 lines of context logic, 17 screens, a
separate phone-controller UI) and it converts one paying household into a room
full of nickname-only guests — an acquisition channel built into the product
rather than bought.

---

## 3. Asset inventory (measured)

### 3.1 Content — live production database, queried 25 Aug 2026

| Asset | Count |
|---|---|
| Questions total | **72,576** |
| — active and in production | 72,422 |
| — with an assigned illustration | 59,734 |
| — with image media (picture rounds) | 9,131 |
| — AI-graded "A" quality | 11,183 |
| Categories | 70 |
| Icon / illustration library | 9,015 assets |
| Player-authored quizzes published | 83 |
| Player-authored collections | 23 |
| Game rooms created | 315 |
| Profile rows | 672 *(includes seeded content accounts — see §9.2)* |

**Question bank by language**

| Language | Questions |
|---|---|
| Georgian (`ka`) | 16,510 |
| German (`de`) | 9,459 |
| French (`fr`) | 9,454 |
| Italian (`it`) | 9,447 |
| Spanish (`es`) | 9,431 |
| Portuguese (`pt`) | 9,426 |
| English (`en`) | 8,849 |

The Georgian bank has additionally been through a three-batch human-plus-rule
audit (`docs/QUESTION_QUALITY_AUDIT_KA.md`): 588 questions retired, 944
rewritten, 260 flagged. The other six languages have not had an equivalent
hand audit — see §9.5.

### 3.2 Software

| Measure | Value |
|---|---|
| Source files (`src/`) | 864 `.ts` / `.tsx` |
| Lines of source | ~232,600 |
| Test files | 98 (unit + Playwright e2e); the launch runbook records 428 passing tests |
| Database tables | ~99 |
| Applied migrations | 285 |
| Server-side edge functions | 76 |
| UI languages shipped | 7 (≈3,450 translation keys per full catalog) |
| iOS bundle size | 130 MB (reduced from 394 MB by streaming the video library) |
| iOS deployment target | 15.0 |

### 3.3 The content factory (an asset in its own right)

Roughly half the 76 edge functions exist to manufacture and maintain content:
research facts → generate questions (single, per-category, per-country,
contextual, multilingual, media) → shorten to fit the UI → AI quality-review
and score → detect semantic duplicates → assign, verify and repair
illustrations → translate → publish to production. Georgian-specific grammar
verification and mixed-language repair functions exist because the default
market required them.

Operationally this means the marginal cost of a new category, a new language or
a new country pack is AI inference plus review time — not writer headcount.

### 3.4 Infrastructure

| Layer | Provider | Note |
|---|---|---|
| Web hosting | Cloudflare Workers static assets | Chosen because bandwidth is unmetered; the build carries ~280 MB of video |
| Backend | Supabase (Postgres, Auth, Realtime, Storage, Edge Functions) | Project ref `sqwpzezkhpqkdyltvsim` |
| Native shell | Capacitor 8 | iOS generated and committed; Android configured but not generated |
| Payments (native) | RevenueCat → App Store | Server verifies entitlements against RevenueCat's API; no client input trusted |
| Payments (web) | Stripe | Separate checkout functions for PRO and gems |
| Ads | AdMob | Rewarded video only (see §5.3) |
| Push | Firebase Cloud Messaging | Client complete; console half outstanding |
| Analytics | PostHog + Meta Pixel | Identity bootstrapped on first event |
| CI/CD | GitHub Actions → Cloudflare on every push to `main`; migration tests on every PR; Qodana static analysis | |

---

## 4. Revenue model

Four revenue lines exist in code. Two are live-capable today, one is
configuration-blocked, one is dormant.

### 4.1 Subscriptions — PRO and Friends PRO

Both tiers bill **monthly**; they are feature tiers, not billing periods.

| Product ID | Tier | App Store price | Web price (Stripe, GEL) | Status |
|---|---|---|---|---|
| `io.mytrivia.pro.monthly` | PRO | **$3.99 / month** | 9.99 ₾ / month | Created, ready |
| `io.mytrivia.proplus.monthly` | Friends PRO *(web: "Family PRO")* | **$7.99 / month** | 19.99 ₾ / month | Created, ready |
| `io.mytrivia.pro.annual` | PRO, yearly | — | 59.88 ₾ / year | **Not yet created in App Store Connect** |
| `io.mytrivia.pro.weekly` | PRO, weekly | — | — | Defined in code, not created |

**PRO benefits:** 2× XP · unlimited plays (no free-play window) · no game stake
· no ads · 4 daily spins instead of 1 · one free power-up of each type daily ·
PRO badge and exclusive frames · unlimited rooms, trivia, collections and avatar
generations · **1 PRO seat to give a friend**. Friends PRO adds enhanced daily
rewards and **5 seats**. A seat is full PRO for another player, lasting as long
as the subscription that paid for it and revocable at any time — a referral
mechanism embedded in the price ladder.

**The annual gap is a revenue lever, not a defect.** The paywall is already
built to lead with the annual plan (with a one-day introductory trial) the
moment the product exists in App Store Connect; until then that row is hidden
because offering a product the store has never heard of fails the purchase
after the sheet opens. Creating it is console work.

### 4.2 Consumables — gems

| Product ID | Price | Gems | Gems per $ |
|---|---|---|---|
| `io.mytrivia.gems.100` | $0.99 | 100 | 101 |
| `io.mytrivia.gems.500` | $3.99 | 500 | 125 |
| `io.mytrivia.gems.1500` | $12.99 | 1,500 | 116 |
| `io.mytrivia.gems.5000` | $34.99 | 5,000 | 143 |

All four are created in App Store Connect and mapped in RevenueCat, with the
grant table (`supabase/functions/_shared/iap.ts`) locked to the client catalog
by an automated repository invariant test — a product that grants nothing is a
failing test, not a support ticket.

**Note for the model:** the 1,500 pack is priced *worse per dollar* than the 500
pack (116 vs 125), which gives a buyer a reason to purchase two 500s instead.
Any price below $11.97 restores a monotonic value curve. Prices remain editable;
product IDs never are.

### 4.3 Advertising — rewarded video only

Ads are **strictly opt-in**. An ad plays only when a player presses a button
that says so: extra plays after the free window, bonus spins, power-ups. There
are **no interstitials** — the interstitial code path exists in the ad service
but has no call sites anywhere in the app, by deliberate product policy. PRO
subscribers and all web users bypass ads entirely.

Caps: maximum **5 rewarded ads per day** per player; one ad grants one extra
game. The rewarded gate fails open (12-second deadline before the ad appears,
one retry) so a broken ad network can never block gameplay — which also means
ad impressions are not guaranteed per gated action.

**Currently earning zero.** The iOS interstitial and rewarded unit IDs still
fall back to Google's demo units, which serve real ads and pay nothing.
Creating the real units is a prerequisite to any ad revenue in a projection.

### 4.4 Dormant — ad-free purchase

`io.mytrivia.adfree` exists in both catalogs and its modal is mounted in the
app, but nothing can open it. It was deliberately **not** created in App Store
Connect: an in-app purchase with no reachable path invites a review question.
A future line, not a current one.

---

## 5. The economy — model inputs

These are the parameters a projection needs. All are in source
(`src/config/rewardConfig.ts`, `extraPlays.ts`, `gemPacks.ts`) and most are
additionally overridable at runtime from the admin Economy console without a
deploy.

### 5.1 Currency and pricing spine

| Parameter | Value |
|---|---|
| Exchange rate | 1 gem = 500 coins |
| New player grant | 3,000 coins + 3 gems |
| VS game stake | 500 coins (win returns +500; loss forfeits; draw neutral) |
| Free plays | **5 games per rolling 3-hour window**, counted server-side |
| Extra plays | 1 game = 500 coins / 1 gem / 1 rewarded ad · 3 games = 1,500 coins / 3 gems |
| Ad cap | 5 rewarded ads per day |
| Free-tier campaign cap | 3 levels across at most 5 categories |
| Display FX rate (web) | 2.75 GEL per USD, used for price display only |

### 5.2 Coin faucets (the sinks' counterweight)

| Source | Payout |
|---|---|
| Daily reward, 7-day cycle | 200 / 300 / 400 / 500 / 750 / 1,000 / 1,500 coins + 1 gem on day 7 (~6,750 coins/week) |
| Treasure chest | 50–250 coins per 24h, +1 gem at weekends |
| Lucky spin | 100–500 coins, rare 1 gem, or a power-up; 1/day free, 4/day for PRO, +2 per ad |
| Level completion | score × 10 + stars × 20 |
| Account level-up | 150 coins + 1 random power-up, every 20 correct answers |
| Multiplayer 1st place | min(500 × opponents beaten, 1,000) + own score |
| Missions | XP + coins + gems + power-ups, granted instantly on completion |
| Mission streak (30 days) | 300 coins + 15 gems + 250 XP |
| Weekly leaderboard, per category | 1st: 2,000 coins + 25 gems + exclusive frame; down to 150 coins + 1 gem at 10th |

**The pressure point that drives revenue** is the intersection of the 3-hour
free-play window, the 500-coin stake and the daily faucet: a free player's
7-day faucet (~6,750 coins) funds roughly 13 staked games, against a free-play
ceiling of up to 40 per day. The gap between what a player wants to play and
what the faucet funds is what PRO and gems are sold into. A modeller changing
any of these three numbers changes the whole conversion curve — and they are
runtime-tunable, which means the economy can be re-balanced against real data
post-launch without an app release.

### 5.3 Anti-abuse posture (relevant to economy integrity)

Money and entitlements are enforced in the database, not the client:
subscription tables have no client write policy; the currency RPC refuses
positive deltas from a signed-in caller; credits flow only through four
server-side functions that decide or bound the amount and write a
`currency_grants` ledger row; every such function is revoked from `PUBLIC` and
granted explicitly. Multiplayer scores, question advancement, question expiry
and observer bonuses are all server-side. Purchase verification never trusts
client input — the server asks RevenueCat what the user actually owns.

**One gap remains, and it is disclosed:** gameplay rewards are *bounded and
ledgered, not verified*. A modified client can still claim a plausible score
within those bounds. The repository's own launch documentation names this as
"the one economy gap left" and recommends closing it before the economy carries
significant real money. It is a project, not a patch.

---

## 6. Cost structure

No dollar figures are asserted here because the product has no usage to
measure. These are the lines a model must carry, and what drives each.

| Cost line | Driver | Notes |
|---|---|---|
| **App Store commission** | Gross IAP revenue | Standard Apple terms; the Small Business Program rate applies below the annual revenue threshold. Verify the current rate at model time. |
| **Stripe fees** | Web checkout volume | Web is the lower-commission channel — a margin argument for driving web purchases where store rules permit |
| **RevenueCat** | Tracked subscription revenue | Percentage above a free tier; confirm current terms |
| **Supabase** | Database size, realtime connections, edge invocations, storage | Realtime multiplayer and TV mode are connection-intensive; this is the line most sensitive to concurrency, not to registered users |
| **Cloudflare Workers** | Requests | Static assets; bandwidth unmetered, which is why it was chosen over metered hosts for a build carrying ~280 MB of video |
| **AI inference** | New content produced | Question generation, translation, quality review, illustration, avatar generation and animation. Variable and controllable — content production can be throttled |
| **Avatar / cover generation** | Player actions | Per-user AI image and video generation, quota-capped (5 per type for PRO, 2 free) — a per-user variable cost that scales with engagement, not revenue |
| **Firebase FCM** | Push volume | Generally negligible at this scale |
| **Apple Developer Program** | Fixed | $99 / year |
| **Domain, incidental SaaS** | Fixed | Small |

**The cost line worth watching in a model is AI image and video generation for
avatars**, because it is the one variable cost that a free, non-paying, highly
engaged user can consume. Quotas exist and are enforced separately for scenes
and portraits.

---

## 7. Launch status — what is done and what is left

### 7.1 Complete

- Web app live at mytrivia.io, deploying automatically on every push to `main`
- iOS project generated, committed, CocoaPods configured, all six native
  plugins integrated; `Info.plist` with real usage strings, portrait lock and
  encryption exemption; `PrivacyInfo.xcprivacy` authored and registered
- App Store Connect record created on the permanent bundle ID
  `io.mytrivia.app` (a prior vendor-generated record was deleted before it
  could lock in a wrong identity)
- Subscription group and four gem consumables created, localized, with review
  screenshots — all reading *Ready to Submit*
- RevenueCat project rebuilt: iOS app, In-App Purchase key uploaded, all six
  products imported, default offering with six packages, webhook returning 200
- Server-side entitlement verification and the renewal/cancellation/refund
  webhook, made idempotent by an event ledger
- Sign in with Apple (native + web), Google OAuth, email, username-only signup,
  and a security-question password reset for players with no email address
- App Tracking Transparency flow, child-directed ad treatment from an age gate
- Guideline 1.2 compliance: user reporting and blocking, built and wired
- Account deletion and data export (guideline 5.1.1(v))
- Legal pages in Georgian and English; support page

### 7.2 Outstanding before submission

| Item | Owner | Blocking? |
|---|---|---|
| Create real AdMob iOS rewarded + interstitial units | Console | Ad revenue = 0 until done |
| Firebase project, `GoogleService-Info.plist` in the Xcode target, APNs key, service-account secret | Console + Xcode | **Yes — missing plist crashes the app on launch** |
| Xcode capabilities: Team, Associated Domains, Push, Sign in with Apple | Needs a Mac | **Yes** — without the entitlements file these are inert |
| App Privacy nutrition labels + age rating questionnaire (expect 12+) | App Store Connect forms | **Yes** |
| **EU trader status declaration (Digital Services Act)** | App Store Connect | **Yes for EU storefronts** — verification takes days, runs independently of app review, and failure removes the app from every EU storefront |
| Demo account + review notes for App Review | Listing | Yes — a reviewer who cannot sign in rejects on 2.1 |
| On-device sandbox test: purchase, cancel, restore, push, deep link, deletion | Device | Yes |
| TestFlight upload and internal test | — | Yes |
| Create `io.mytrivia.pro.annual` with its one-day introductory offer | Console | No — but it is the highest-LTV plan |
| Mobile MP4 video variants (needs ffmpeg) | Build machine | No — but most iPhones currently download desktop-sized video |
| Lossless WebP image conversion | Build | No — would cut ~27 MB from a 130 MB bundle, pixel-identical |
| Server-side score verification | Engineering | No — but see §5.3 |

### 7.3 Realistic read on timeline

Everything blocking is configuration, forms or a device — no unbuilt features
stand between the current state and a submitted build. The two schedule risks
that are *not* under the team's control are Apple's review queue and the EU
trader verification, which has a multi-day turnaround and fails independently
of app review.

---

## 8. What a financial model needs — and what this repo cannot supply

The product parameters in §5 are known exactly. The following are **UNKNOWN —
post-launch data required**, and any projection is a function of them:

| Input | Status |
|---|---|
| Installs / CAC by channel | Unknown. No paid acquisition has run |
| D1 / D7 / D30 retention | Unknown. No release |
| Free→paying conversion rate | Unknown |
| Subscription mix (monthly vs annual vs Friends PRO) | Unknown; annual not yet purchasable on iOS |
| Subscription churn and renewal rate | Unknown |
| Gem pack purchase frequency and pack mix | Unknown |
| Rewarded-ad eCPM in Georgia and target geographies | Unknown; also currently unearning (§4.3) |
| ARPDAU / ARPPU | Unknown |
| Viral coefficient from TV mode, challenge links and PRO seats | Unknown — mechanically supported, never measured |
| Supabase cost per thousand DAU | Unknown; concurrency-driven |

**What the app will be able to tell you on day one**, because the
instrumentation is already built: PostHog with identity bootstrapped on the
first event, purchase analytics, session tracking, an admin economy-health and
revenue dashboard, a `currency_grants` ledger for every credit issued, an
`iap_events` ledger for every purchase event, and per-question analytics
counters. This is a product that can be measured from launch rather than
retrofitted — which materially shortens the time to a data-backed model.

**Recommended modelling approach:** treat §5 as fixed economy mechanics, run
scenarios over the unknown table above, and re-base after 30 days of live data.
The economy's runtime-tunable configuration means the balance can be moved to
meet the model rather than the model rewritten to meet the balance.

---

## 9. Risk register and diligence items

### 9.1 Concentration and dependency risk

The Supabase project is owned and deployed through **Lovable**, a third-party
AI development platform. Nobody on the team holds a Supabase personal access
token or dashboard CLI access; migrations and edge functions reach production
by merging to `main` and asking Lovable to deploy. This works, and is
documented as the intended path, but it means **production deploys depend on a
vendor relationship** and there is deploy latency between merge and live. A
buyer should confirm the account ownership and the path to direct control.

### 9.2 Seeded content accounts and simulated opponents — disclosure item

Two mechanics warrant explicit review:

- **VS mode plays against simulated opponents** drawn from real player profiles
  rather than live matchmaking.
- A curated list of **seeded "content" profiles** exists to populate the
  explore feed. They never sign in; a friend request sent to one is
  auto-accepted from the requester's own client after a 4–48 hour delay so they
  behave like a real person who was away. Accounts not on that list are never
  auto-accepted.

Both are common free-to-play practice and both are implemented carefully and
narrowly. Neither is currently disclosed to players. This is a policy and
consumer-perception question rather than a code defect, and it is worth an
explicit decision — and a line in the store listing or terms — before launch.
It also affects the 672 profile count in §3.1, which should not be read as 672
real users.

### 9.3 Revenue lines currently switched off

Ad units on demo inventory (zero ad revenue), annual subscription not created
(the highest-LTV plan unsellable on iOS), ad-free purchase deliberately
unreachable. All three are recoverable in console work, but a model that
assumes ad revenue from day one is assuming work that has not happened.

### 9.4 Economy integrity

Gameplay rewards are bounded and ledgered but not server-verified (§5.3). The
exposure is bounded coin/XP inflation from modified clients, not direct revenue
theft — purchases and entitlements *are* server-verified. Worth closing before
scale.

### 9.5 Content quality outside Georgian

The Georgian bank has had a hand audit that retired 588 questions and rewrote
944 — roughly 10% of the bank needed intervention. The other six languages
carry ~9,000 questions each, largely machine-generated and machine-reviewed,
without an equivalent human pass. If the launch plan depends on a
non-Georgian market, budget for an audit at a similar rate.

### 9.6 Pricing and channel consistency

- Web sells PRO in GEL (9.99 ₾ / 19.99 ₾ / 59.88 ₾) while the App Store sells
  in USD ($3.99 / $7.99). The tiers are named differently across surfaces —
  "Friends PRO" on the store, "Family PRO" on web — for the same product.
- Web gem checkout charges in USD while recording the amount in a field named
  `amount_gel`; a reporting-hygiene item, not a charging error.
- The gem ladder is non-monotonic in value (§4.2).

### 9.7 Platform and market

iOS-first, single storefront at launch. Android is a configured Capacitor
target with no generated project — a known, scoped body of work, not a
rewrite, since the entire app layer is shared. Georgian-first positioning means
the initial addressable market is small; the six populated languages make
expansion a marketing question rather than a content question, which is
unusual and valuable at this stage.

### 9.8 Store review

First submissions carry rejection risk. The specific guidelines this app
touches — 2.3.1 (paywall must match what is charged), 3.1.2 (subscription
terms visible on the paywall), 1.2 (UGC reporting and blocking), 4.8 (Sign in
with Apple), 5.1.1(v) (account deletion) — have each been addressed
deliberately and are documented. Expect iteration rather than a clean first
pass; budget two to three review cycles.

### 9.9 Key-person risk

The repository, its documentation and its architectural decisions reflect a
very small team. The documentation is unusually good — the launch runbook,
action items and feature reference are current and specific — which materially
reduces, but does not remove, transfer risk.

---

## 10. What a reviewer should verify independently

1. **Ownership**: Apple Developer account, App Store Connect record, RevenueCat
   account, Supabase project, Cloudflare account, the mytrivia.io domain, and
   the Lovable project — confirm each is held by the entity being valued.
2. **The live database**: the counts in §3.1 are reproducible against the
   production project with the public anon key.
3. **The economy constants** in `src/config/rewardConfig.ts`,
   `src/config/gemPacks.ts` and `src/config/proPlans.ts` — these are the model
   inputs, and they are the actual source of truth the app reads.
4. **Store product status** in App Store Connect and RevenueCat: six products
   should read *Ready to Submit* / *Prepare for Submission*.
5. **`docs/LAUNCH_RUNBOOK.md`** — the ordered, verifiable list of everything
   between the current state and a submitted build. `ACTION_ITEMS.md` is the
   same set as an inventory.
6. **Test suite and CI**: `npm run typecheck`, `npm test`, and the PR checks
   workflow that runs the database security tests against a real Postgres.

---

## 11. Source documents in this repository

| Document | What it covers |
|---|---|
| `docs/MYTRIVIA_FEATURES.md` | Complete feature reference — every player-facing feature, economy rule and admin tool |
| `docs/LAUNCH_RUNBOOK.md` | Ordered launch sequence with verification checks per step |
| `ACTION_ITEMS.md` | Inventory of the items that require account access, a Mac, or a decision |
| `docs/IOS_LAUNCH_PLAN.md` | The full iOS audit, its findings by severity, and what was fixed |
| `docs/QUESTION_QUALITY_AUDIT_KA.md` | The Georgian content audit, with defect counts by class |
| `docs/HOSTING.md` | Web hosting architecture and the reasoning behind Cloudflare |
| `PERFORMANCE_ANALYSIS.md` | Client performance analysis |
| `AGENTS.md` / `CLAUDE.md` | Engineering constraints that protect the entitlement and economy code |
| `supabase/functions/README-entitlements.md` | How purchases become entitlements |

---

*Prepared from repository state at branch `claude/app-launch-documentation-xr5nmx`,
commit `ec78dce`. Production database figures queried read-only on 25 August 2026
and will drift as content and usage grow.*
