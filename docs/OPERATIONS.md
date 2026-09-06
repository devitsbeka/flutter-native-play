# MyTrivia — operations cockpit

**Read this first, at the start of every scheduled run. Update it before you
finish.** It is the only thing carrying state between runs; a run that leaves no
trace here did not happen.

Last updated: 2026-09-06 · seeded from repository state at `main` @ `21717c9`.

---

## 1. The goal

**$100,000 MRR.** Subscriptions only — gems and ads fund the business and do not
count toward it.

| | |
|---|---|
| Paying subscribers required | **~25,000–50,000**, working figure **30,000** |
| Monthly actives required | **~550,000–1,500,000** (at 2–5% conversion) |
| Blended ARPPU assumed | **$3.59/mo** at a 50/35/15 annual/monthly/friends mix |
| Therefore | **Not reachable in Georgia alone.** This is an international plan by arithmetic |

Working is in `docs/knowledge/07-GROWTH-AND-GO-TO-MARKET.md` §1–2. Revisit the
ARPPU assumption once the annual plan exists and real mix data arrives.

**Every piece of work should name the lever it moves:** installs, activation,
retention, conversion, ARPPU, margin, or referral. If it moves none, it is not
this project's work.

## 2. Where we are

**Phase 0 — get live.** Revenue is $0. The app has never been publicly
released; build 34 was submitted and **rejected under guideline 2.1** (ATT
prompt reported missing — fixed, needs resubmission).

**No paid acquisition in this phase.** Spending before the funnel is measured
converts money into noise.

Phases in `07-GROWTH-AND-GO-TO-MARKET.md` §6. Phase 1 begins when the app is
live and the funnel below starts taking values.

## 3. The funnel

Fill these in as real data arrives. Everything is instrumented already
(PostHog with identity bootstrap, `currency_grants`, `iap_events`,
`/admin/economy`) — see `07-GROWTH-AND-GO-TO-MARKET.md` §7.

| Stage | Definition | Value | As of |
|---|---|---|---|
| Install | Store install or web first visit | — | — |
| Activate | First game completed | — | — |
| D1 / D7 / D30 | Return rates | — | — |
| Convert | Free → any paid subscription | — | — |
| ARPPU | Blended, actual mix | — | — |
| Gem attach | % of payers also buying consumables | — | — |
| Referral | Coefficient from TV mode / challenge links / PRO seats | — | — |
| CAC | By channel | — | — |

## 4. Live loops

None yet. Format for each, so a loop can never become unattended noise:

```
### <name>
Fires:      <schedule>
Lever:      <installs | activation | retention | conversion | ARPPU | margin | referral>
Does:       <one sentence>
Authority:  <propose-only | may do X and Y unprompted>
Ends when:  <the condition that retires this loop>
Owner:      <me | Claude>
```

`Authority` is the instruction a scheduled run acts on. A loop that says
propose-only prepares the change and stops; a loop that grants standing
authority for a specific action may take it unprompted. Anything not named there
is proposed, not executed.

`Ends when` is mandatory. A loop with no end condition is a subscription to noise.

## 5. Open threads

Seeded from the repo. Ordered by what unblocks the most.

### Urgent — money, live today

- [ ] **The deployed backend does not honour what the live web paywall
      promises.** Four server-side files sit merged on `main` and undeployed
      (they deploy only through Lovable): `create-pro-checkout`,
      `create-gem-checkout`, `_shared/iap.ts`, `_shared/pricing.ts`. Two
      consequences right now: the web paywall shows a "3 days free" badge while
      the deployed checkout **grants no trial**, so a buyer clicking it is
      charged immediately against a free promise; and an annual purchase maps to
      tier `pro` (1 friend seat) when the paywall sells it as 5.
      **Action: ask Lovable to deploy those four, and nothing else.**

### Phase 0 blockers — submission

- [ ] `GoogleService-Info.plist` into the Xcode target (Firebase console).
      Missing, the app crashes on launch; `verify-ios-native.mjs` catches it
      before Xcode.
- [ ] Xcode capabilities — Team, Associated Domains, Push, Sign in with Apple.
      Needs a Mac; without the entitlements file these are inert.
- [ ] App Privacy nutrition labels + age rating questionnaire (**12+**, to match
      an age gate that starts at 13).
- [ ] **EU trader status declaration (DSA)** — multi-day, runs independently of
      app review, and failure removes the app from every EU storefront. Start
      early.
- [ ] All products **attached to this version**, not merely created.
- [ ] Review notes: guest mode means no demo account is needed — say so
      outright; how to reach the paywall; how to reach Restore Purchases; how a
      single reviewer can test multiplayer.
- [ ] On-device sandbox pass: purchase, restore after reinstall, push on a
      distribution build, universal link, camera, deletion, airplane mode.
- [ ] TestFlight upload and internal test.
- [ ] Resubmit.

### Revenue — highest leverage, console work only

- [ ] **Create `io.mytrivia.pro.annual`** with its introductory offer. It is the
      highest-LTV plan and the paywall is built to lead with it; until it exists
      the row hides itself on device.
- [ ] **Fix subscription levels.** Currently annual sits at level 3, below both
      monthlies, which makes buying the year a *downgrade* that defers to period
      end. Correct: Level 1 = Friends PRO + Annual (both `pro_plus`),
      Level 2 = PRO Monthly (`pro`).
- [ ] Confirm the real AdMob iOS units are live in the console. Ids are in
      `.env`; unset, `adService.ts` falls back to Google's demo units, which
      serve ads perfectly and earn nothing.

### Quality — first-session risk

- [ ] **F-1, byte-range video.** The iOS build streams ~185 videos from
      `mytrivia.io/videos/…`, and the host answered a `Range` request with HTTP
      200 and the whole file. AVFoundation expects a 206, so video may never
      start on device — blast radius is most of the app's motion. **A 5-minute
      test on a real iPhone settles it.** Fixes, smallest first: a `Range`
      handler in `worker/index.ts`; `cache-control` on video responses;
      or move the files to R2.
- [ ] **PR #391** — repair the English question bank (1,527 rewritten, 189
      retired). Gating for any English-language market.
- [ ] **PR #472** — Four Crowns UGC campaign materials.

### Decisions I owe

- [ ] **Disclosure of simulated opponents and seeded content accounts.** Both
      are ordinary F2P practice and narrowly implemented; neither is currently
      disclosed. Needs a line in the listing or terms, or a decision not to.
- [ ] **`PUBLIC_SHARING_ENABLED`** stays `false` for launch? The whole UGC
      discovery surface is built and hidden behind it.
- [ ] The gem ladder is non-monotonic — the 1,500 pack is worse value per dollar
      than the 500 ($11.97 or below fixes it). Prices stay editable; ids do not.
- [ ] **Server-side score verification** — the one acknowledged economy gap.
      Bounded and ledgered, not verified. A project, not a patch; worth closing
      before the economy carries real money at scale.

### Missing knowledge — needed before Phase 3

- [ ] Positioning and ICP, per market.
- [ ] Competitive landscape per app store: who owns "trivia", at what price.
- [ ] Real market sizing at app-store level, not speaker counts.
- [ ] Channel economics — CPI and eCPM by geography.
- [ ] Brand: name treatment, tone, store listing.

## 6. Decisions log

Newest first. One line each: what was decided, when, and why — so a later run
does not reopen it.

- **2026-09-06** — Goal set at $100k MRR. Accepted that this makes international
  expansion the plan rather than a later phase, and that Georgia's role is to
  prove the funnel, not to carry the revenue.

## 7. Run log

Newest first. A few lines per run: what it did, what it found, what it left for
the next one. Keep it scannable — this is the file a week of work is read from.

- **2026-09-06** — Cockpit created and seeded from repository state. No work
  executed. Next run: start at §5, urgent block.
