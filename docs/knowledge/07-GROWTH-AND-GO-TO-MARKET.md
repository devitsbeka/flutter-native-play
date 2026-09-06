# MyTrivia — growth and go-to-market

*What the $100k MRR goal actually costs in units, which levers exist, and which
of them are already built and unmeasured. Written 2026-09-06.*

**Read the marks.** *Derived* = arithmetic from measured repo/config values.
*Measured* = counted in the repo or the production database on the date given.
*Unknown* = nobody knows yet, because the product has never been released.
*Hypothesis* = a plausible motion nobody has tested. Nothing here is a forecast.

---

## 1. The goal in units

**$100,000 MRR.** MRR is subscriptions only — gem consumables and rewarded ads
fund the business and do not count toward it.

**Blended ARPPU** *(derived from `src/config/pricing.ts` + `proPlans.ts`)*. The
paywall is built to lead with the annual plan, so the mix skews cheap per month:

| Plan | Effective $/month | Subscribers for $100k |
|---|---|---|
| PRO monthly ($3.99) | $3.99 | 25,100 |
| Friends PRO ($7.99) | $7.99 | 12,500 |
| PRO annual ($23.88/yr) | $1.99 | 50,300 |
| A plausible mix (50% annual / 35% monthly / 15% friends) | **$3.59** | **~27,900** |

**Working number: ~25,000–50,000 paying subscribers, call it 30,000.**

If the $100k is meant **net**, add Apple's cut on the native channel — 15% under
the Small Business Program, 30% above the threshold — so roughly **$118k gross**,
about 33,000 subscribers. Web checkout through Stripe carries no such cut (§5).

**Monthly actives required** *(derived, using industry-typical subscription
conversion of 2–5%; the real rate is Unknown)*:

| Conversion | MAU needed |
|---|---|
| 2% | ~1,400,000 |
| 3% | ~930,000 |
| 5% | ~560,000 |

**Range: 550,000 – 1,500,000 MAU.**

## 2. The consequence: this is an international plan by arithmetic

Georgia's population is roughly 3.7 million; smartphone users perhaps 2.5
million. The table above needs **550k–1.5M monthly actives**, which is 22–60% of
every smartphone in the country.

**$100k MRR is not reachable in the Georgian market alone.** That is not a
judgement about the market or the product — it is division. The goal itself
selects the strategy, and everything downstream follows from it:

- Expansion is not optional or a phase-two nicety. It is the plan.
- Georgia's role changes: it becomes the **proving ground** — the market where
  the funnel is validated cheaply and where content quality is highest — not the
  revenue engine.
- The **non-Georgian content quality gap moves onto the critical path.** See §4.
- The **annual product's absence stops being a to-do and becomes a revenue
  blocker**, because ARPPU is the lever that most reduces the MAU requirement.

## 3. Content readiness by market

*(Measured in the production database 2026-08-25; will have grown.)*

| Language | Questions | Human audit? |
|---|---|---|
| Georgian (`ka`) | 16,510 | **Yes** — 588 retired, 944 rewritten, 260 flagged |
| German (`de`) | 9,459 | No |
| French (`fr`) | 9,454 | No |
| Italian (`it`) | 9,447 | No |
| Spanish (`es`) | 9,431 | No |
| Portuguese (`pt`) | 9,426 | No |
| English (`en`) | 8,849 | No — PR #391 open, proposing 1,527 rewritten and 189 retired |

This is the unusual asset. Six additional markets are **content-ready in bulk**,
which makes expansion a marketing question rather than a multi-year writing
project. The whole UI ships in all seven languages (~4,500 key/value lines each),
prices exist per currency, and `LanguageFollowsCountry` routes players
automatically.

The caveat is quality, not quantity. The Georgian audit found roughly **10% of
the bank needed intervention**. The other six have had no equivalent pass. If a
launch market's first session serves broken questions, no amount of acquisition
spend survives it — so **budget a content audit per market, ahead of spend in
that market**, at roughly the rate PR #391 assumes.

## 4. The funnel

Every value is **Unknown** until launch. This is the spine to fill in, and the
instrumentation already exists to fill it (§7).

| Stage | Definition | Current |
|---|---|---|
| **Install** | Store install or web first-visit | Unknown |
| **Activate** | First game completed | Unknown — guest mode means this can happen with no account |
| **Retain** | D1 / D7 / D30 | Unknown |
| **Convert** | Free → any paid subscription | Unknown |
| **Expand** | ARPPU: annual mix, Friends PRO mix, gem attach rate | Unknown; annual not purchasable on iOS |
| **Refer** | Viral coefficient from the three built-in loops | Unknown — mechanically supported, never measured |

**CAC by channel: Unknown.** No paid acquisition has ever run.

The single most valuable early output of this project is turning that column
from Unknown into numbers. Until it has values, every growth plan is arithmetic
over guesses, and the honest response to "will X work" is "we cannot know yet."

## 5. The levers, ranked by how much they move the goal

**1. ARPPU — create the annual product.** *(Blocker, off-repo.)*
`io.mytrivia.pro.annual` does not exist in App Store Connect, so the
highest-LTV plan cannot be sold on the platform that will carry most of the
volume, and the paywall hides the row it was designed to lead with. Also
**subscription levels are currently wrong**: annual sits at level 3, below both
monthlies, which makes buying the year a *downgrade* that defers to period end.
Correct arrangement is Level 1 = Friends PRO + Annual (both grant `pro_plus`),
Level 2 = PRO Monthly. Console work, no engineering.

**2. Margin — drive purchases to web where store rules permit.**
Stripe checkout is already built (`create-pro-checkout`, `create-gem-checkout`)
and carries no platform commission. At $100k MRR the Apple cut is $15–30k per
month. This is the largest single margin lever available and it requires no new
product. Constrained by App Store rules on steering, which are jurisdiction- and
period-dependent — **verify current rules before building any flow around it.**

**3. Conversion — the free-play pressure point.**
*(Measured in `src/config/rewardConfig.ts`, runtime-tunable via `economy_config`.)*
Five free plays per rolling 3-hour window, a 500-coin stake, and a weekly faucet
of ~6,750 coins that funds roughly 13 staked games. The gap between what a
player wants and what the faucet funds is what PRO is sold into. All three
numbers can be re-tuned from the admin console **without an app release**, which
means conversion can be optimized against live data on a days-long loop rather
than a release cycle. This is a genuine structural advantage; use it.

**4. Referral — three viral loops already shipped and never measured.**

| Loop | Mechanism | Why it is unusual |
|---|---|---|
| **TV party mode** | One screen hosts, guests join by 4-digit code with a **nickname and no account** | Converts one paying household into a room of exposed non-users. The largest subsystem in the codebase, and the product's real differentiator |
| **Challenge links** | Any result becomes a public link, **playable with no account**, with an OG share card | Zero-friction distribution surface, already built with social previews |
| **PRO seats** | Every subscription carries 1 (PRO) or 5 (Friends PRO / Annual) seats to give away | A referral engine embedded in the price ladder — and a reason to buy the more expensive tier |

None has ever been instrumented. **Measuring these should precede inventing new
channels**, because a working loop that is already built beats a hypothesis.

**5. Retention.** The machinery is dense and complete: 7-day daily rewards, 24h
chest, lucky spin, 5 daily + 4 weekly rotating missions with difficulty tiers,
mission streaks to 30 days, weekly Bronze/Silver/Gold leagues with promotion and
demotion, per-category leaderboards with weekly prizes, friends with presence,
push. Nothing here needs building; it needs measuring and tuning.

**6. Store conversion (ASO).** Listing, screenshots, title, keywords, per-locale
metadata — seven languages of it. Untouched territory, cheap, and it multiplies
every acquisition channel.

## 6. Sequencing — and what must not start early

**Phase 0 — get live.** No growth spend before the app is in the store. Revenue
is $0 and build 34 was rejected under guideline 2.1. Blockers are tracked in
`docs/OPERATIONS.md`; every one is configuration, forms or a device, not
unbuilt features.

**Phase 1 — instrument and baseline.** Thirty days of real data on the funnel in
§4, plus the three loops in §5.4. Create the annual product and fix the
subscription levels. Fix anything that makes a first session bad. **No paid
acquisition yet** — spending before the funnel is known converts money into
noise, and this is the most common way a launch budget is wasted.

**Phase 2 — prove the funnel in one market.** Georgia: home market, audited
content, lowest CAC, existing language default. The goal here is not revenue —
Georgia cannot reach it (§2) — it is a validated set of numbers: activation,
D7, conversion, ARPPU, and at least one working referral loop.

**Phase 3 — expand by language, one market at a time.** Each market gated on a
content audit (§3) and its own ASO pass. Sequence by a real market-sizing
exercise, not by speaker counts.

**Phase 4 — scale spend where LTV > CAC**, per market, per channel.

The failure mode to guard against: running Phase 4 activity during Phase 1.

## 7. What can be measured from day one

Unusually good for a pre-launch product, and it materially shortens the time to
a data-backed model:

- **PostHog** with synchronous identity bootstrap — the very first event already
  carries the right user id — plus autocapture, pageviews, person profiles and
  global exception capture.
- **Meta Pixel** page views.
- `usePurchaseAnalytics`, session tracking (`user_sessions`), active/online user
  panels.
- **A `currency_grants` ledger row for every credit issued** and an
  **`iap_events` ledger row for every purchase event**.
- Per-question analytics counters (`times_shown`, `times_correct`).
- An admin economy-health and revenue dashboard at `/admin/economy`.

This is a product that can be measured from launch rather than retrofitted.

## 8. Lead generation — motions worth testing

*(All **Hypothesis**. None has been tried; none is endorsed by data.)*

- **Creators per language.** Trivia is natively watchable. Georgian first as the
  cheapest test of the format, then per-language. Fits the challenge-link loop:
  a creator's score becomes a playable link for their audience.
- **TV mode → venues.** Bars, cafés and pub-quiz nights are the one place this
  product's differentiator has an obvious commercial buyer, and the guest-join
  flow needs no accounts. Higher-touch, but it is the motion nobody else in the
  category can copy cheaply.
- **Corporate team-building / remote socials.** Same mechanism, different buyer,
  plausibly higher willingness to pay.
- **Schools and education.** The category taxonomy already types content as
  `educational`, and country/history packs exist.
- **PRO seats as an engine, not a perk.** Five seats per Friends PRO or annual
  subscription is a referral budget already paid for. It has never been
  marketed.

## 9. Known drags on growth

| Drag | Where |
|---|---|
| App not approved; build 34 rejected on ATT | `05-PLATFORMS-DEPLOY-AND-RELEASE.md` §7 |
| Annual plan unsellable on iOS; subscription levels inverted | §5.1 |
| Six language banks with no human audit | §3 |
| Gem ladder non-monotonic — the 1,500 pack is worse value per dollar than the 500 | `04-ECONOMY-AND-MONETIZATION.md` §5 |
| `PUBLIC_SHARING_ENABLED = false` — the entire UGC discovery surface is built and hidden for launch | `01-PRODUCT-AND-FEATURES.md` §9 |
| Video may not stream on device (byte-range finding F-1) — a bad first session risk | `05-PLATFORMS-DEPLOY-AND-RELEASE.md` §7 |
| Gameplay rewards bounded but not server-verified | `03-BACKEND-DATA-AND-SECURITY.md` §4.4 |
| Simulated opponents and seeded content accounts undisclosed | `06-RULES-GOTCHAS-AND-HISTORY.md` §8 |
| iOS-only at launch; Android is a configured but ungenerated Capacitor target | `05-PLATFORMS-DEPLOY-AND-RELEASE.md` §4 |

## 10. What this document cannot tell you

Not in the repository, not derivable, and required before Phase 3:

- **Positioning and ICP.** Who this is for, in each market, in their words.
- **Competitive landscape.** Who else owns "trivia" in each app store, at what
  price, with what ratings volume.
- **Real market sizing** at app-store level — installs and revenue per category
  per country, not speaker counts.
- **Channel economics.** CPI and eCPM by geography; Georgia in particular is
  thinly documented.
- **Brand.** Name, tone, visual system beyond the in-app art, and the store
  listing that carries it.

These are the first things to add to this project's knowledge as they are
learned. Until then, treat every plan that depends on them as provisional and
say so.
