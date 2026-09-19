# App Review audit — MyTrivia 1.0

**Date:** 2026-09-19
**Audited against:** build 65 (`fe121b930`), App Store Connect state as of this date
**Posture:** deliberately stricter than App Review. Anything a reviewer *could*
reasonably fail us on is written up, including things they have historically let
pass. Prior rejections are treated as proof that this app is being read closely.

## History that shapes this audit

Two rejections so far, both partly metadata:

| Submission | Build | Findings |
|---|---|---|
| `6fdcd50e` (26 Aug) | 34 | 2.1 — ATT prompt not found · 2.1(b) — IAPs not submitted with the binary, each needs a review screenshot |
| `71c735ab` (10 Sep) | 55 | 2.3.6 ×2 — Advertising / UGC not declared · 3.1.1 — no Restore · 2.1(b) — IAP buttons unresponsive |

**2.1(b) has now been raised twice.** A third would be the same guideline three
times, which is the worst possible position to submit from. Everything in
§Blockers below is weighted accordingly.

---

## Verdict

**Do not submit yet.** Three blockers were found; **B1 and B2 are now fixed**
(see the status notes on each). B3 is partially done and is the remaining gate.

### Update — 2026-09-19, later the same day

B1 and B2 were both **locked by B3** and could not be touched until items were
withdrawn from submission `71c735ab`:

- B2 via API: `409 ENTITY_ERROR.ATTRIBUTE.INVALID.UNMODIFIABLE — The field
  (DESCRIPTION) can not be modified`
- B1 via UI: *"There was an error uploading your screenshot"*, with **Save**
  and **Add for Review** greyed out

After withdrawing the four consumables and PRO Annual from the submission, B2's
error changed to `TOO_LONG (max 55)` — proof the lock had lifted — and both were
completed. The version item was deliberately left in place, so Apple's message
thread is intact.

One correction to the method used above: the ASC API relationships for IAP
review screenshots (`appStoreReviewScreenshot`, `images`, `versions`) all return
**404 for this key's role**, so the "MISSING" detection in this audit cannot see
them even when they exist. Verification is by reloading the IAP page in the UI
and confirming the image persists.

---

## BLOCKERS — will very likely cause rejection

### B1 · Gem consumables have no App Review screenshot — guideline 2.1(b)

> **FIXED 2026-09-19.** All four now carry the Shop screenshot (1242×2688),
> each verified by reloading the IAP page after upload. Note that the native
> 1320×2868 capture was rejected by ASC; it had to be resized.

Apple already told us this on submission `6fdcd50e`: *"each needs an App Review
screenshot."* The subscriptions were fixed. **The four consumables were not.**

```
io.mytrivia.gems.100    READY_TO_SUBMIT   reviewScreenshot=*** MISSING ***
io.mytrivia.gems.500    READY_TO_SUBMIT   reviewScreenshot=*** MISSING ***
io.mytrivia.gems.1500   READY_TO_SUBMIT   reviewScreenshot=*** MISSING ***
io.mytrivia.gems.5000   READY_TO_SUBMIT   reviewScreenshot=*** MISSING ***

io.mytrivia.pro.monthly      READY_TO_SUBMIT   reviewScreenshot=YES
io.mytrivia.pro.annual       READY_TO_SUBMIT   reviewScreenshot=YES
io.mytrivia.proplus.monthly  READY_TO_SUBMIT   reviewScreenshot=YES
```

**Fix:** upload a screenshot of the gem shop to each of the four consumables in
App Store Connect. Any resolution Apple accepts; it is a review aid, not
marketing. **Blocks submission on its own.**

### B2 · App Store product description contradicts what the app sells — 2.3.6 / 3.1.2

> **FIXED 2026-09-19.** `io.mytrivia.pro.annual` now reads *"Double XP, no ads,
> VIP badge and 5 friend invites."* (50 chars; the field caps at 55), matching
> the paywall and the `pro_plus` entitlement the server grants.

`io.mytrivia.pro.annual` — StoreKit returns this description to the device:

> "Double XP, no ads, VIP badge and **1 friend invite**."

But the app advertises and the server grants **five**:

```
src/config/proPlans.ts        Annual → "PRO + 5 friends",  tier: "pro_plus"
_shared/iap.ts   [PRO_ANNUAL]: { kind: "subscription", tier: "pro_plus" }
```

The ASC description appears in the user's own subscription-management screen.
A reviewer comparing the paywall to the product metadata sees the app promising
five seats against a store record promising one. That is squarely 2.3.6
(inaccurate metadata), and arguably 3.1.2.

**Fix:** correct the App Store Connect description for `io.mytrivia.pro.annual`
to match the five-seat entitlement. Metadata-only; no build needed.

### B3 · Submission `71c735ab` is stuck and cannot be resubmitted via API

> **PARTIALLY DONE 2026-09-19.** Four consumables + PRO Annual withdrawn
> (`state=REMOVED`) to unlock B1/B2. Still in the submission: PRO Monthly,
> Friends PRO Monthly, the subscription group, and the rejected version.
> "Resubmit to App Review" is disabled, confirming it cannot be reused.

State `UNRESOLVED_ISSUES`, holding a version item in state `REJECTED`. Both API
routes are refused:

```
DELETE reviewSubmissionItems/{id}  → 409 "Item was already submitted"
POST   reviewSubmissionItems       → 409 "reviewSubmission state does not allow adding more items"
PATCH  reviewSubmissions/{id}      → 409 "Version is not ready to be submitted yet"
```

**Fix:** clear it in the App Store Connect UI (App Review → the 11 Sep
submission → resolve/remove the version item), then create a fresh submission
carrying version 1.0 **plus all seven IAPs plus the subscription group**. The
group cannot be added by API — use the group page's "Add for Review".

---

## HIGH RISK

### H1 · Diagnostic instrumentation is still in the shipping build

`capacitor.config.ts` sets `loggingBehavior: 'production'`, and `purchase()`
logs elapsed timings on every step. Both were added to diagnose the crediting
failure and both are still in build 65.

Not a guideline breach by itself, but it forwards internal breadcrumbs —
product ids, user ids, purchase outcomes — to the device console on a shipping
build. **Must be stripped before the submission build.** No reviewer should be
the first person to read those.

### H2 · Server-side fixes are only half-deployed

| Change | State |
|---|---|
| `_shared/iap.ts` — a 23505 no longer kills the whole sync | deployed via `verify-receipt` |
| `verify-receipt/index.ts` — serialises `PostgrestError` | deployed |
| `revenuecat-webhook` | **NOT redeployed** — still bundles the old `iap.ts` |
| `20261106130000_vip_subscriptions_are_realtime.sql` | **NOT applied** |

`revenuecat-webhook` is the path RevenueCat uses for renewals, cancellations and
retries. On the old code an Apple-transaction collision throws and takes the
whole sync down, which is exactly the failure that made every gem purchase
silently credit nothing for days.

### H3 · Purchase reliability has no automated coverage

Six builds were spent chasing one class of bug (purchases completing and the app
showing nothing). Every fix was verified by a human tapping a phone. The tests
that exist for this path are **source-text assertions** — regexes over
`useInAppPurchases.ts` — which confirm a line is present but never execute it.

Nothing would catch a regression in: the optimistic balance, the optimistic
entitlement, announce-exactly-once, the bounded awaits, or the failure paths.
For a 2.1(b)-twice app this is the single largest remaining risk, and it is
addressed separately (see §Closing the testing gap).

### H4 · RevenueCat offerings were empty until 18 Sep

Until the `$rc_annual` package was added, `getOfferings()` returned nothing on
every launch and all prices came from the compiled fallback in
`src/config/pricing.ts` rather than from StoreKit.

That means **the price shown was the bundled USD figure, not the storefront
price** — wrong in every non-US region, on the screen 2.3.1 is written about.
Now confirmed working on-device:

```
TO JS {"current":{"annual":{"packageType":"ANNUAL","identifier":"$rc_annual", ...}}}
```

**Still to verify:** that the four gem packages also resolve. The device log
continued to report `gems.500 is in no RevenueCat offering` after the fix, so
consumables may still be falling back to bundled prices.

---

## MEDIUM

### M1 · Age rating 16+ against a "Family" games subcategory

Declaring Simulated Gambling = Infrequent (correct — staked rooms, `GAME_STAKE`,
the ±200 Guess stake) pushed the rating to **16+**, while the app sits in Games
→ Trivia → **Family**. Not a rejection on its own, but it is an inconsistency a
thorough reviewer may query. The declaration is right; consider whether the
Family subcategory still is.

### M2 · Social Media declared "No" — defensible, not certain

`useSocialFeed` reads `user_quiz_posts` with `.select("*")` and **no author
filter** — every user's quizzes, with likes, saves and creator portfolios. That
is close to Apple's definition of "a discovery method that visibly spreads
content to many users."

Kept as No because Apple reviewed this exact build and itemised two 2.3.6
findings without raising it. Flagged so the decision is deliberate rather than
accidental.

### M3 · `Social Media Disabled for Users Under 13` and `Age Assurance` = No

Both correct and both must stay No. The age gate is **self-declared** (tap a
bucket) and the Declared Age Range API is not used anywhere in the app.
Declaring either as Yes would be a false statement Apple can test directly.

### M4 · No `whatsNew` and no `marketingUrl`

Neither is required for a 1.0. Noted for completeness.

---

## VERIFIED PASSING

Each checked against build 65 / live ASC, not assumed.

| Guideline | Item | Evidence |
|---|---|---|
| 5.1.1(v) | Account deletion | `/delete-account` route + Settings entry |
| 4.8 | Sign in with Apple | present alongside Google |
| 5.1.1 | ATT + usage strings | `NSUserTrackingUsageDescription`, camera, photo library all declared |
| 5.1.1 | Privacy policy | set for all 6 ASC locales |
| — | Support URL | `https://mytrivia.io/support`, all locales |
| 2.1 | Demo account | required + name + password set; review notes present |
| 1.2 | UGC safety | report (`ContentReportButton` → `user_reports`), block (`ReportBlockSheet`, `BlockedPlayersSection`), server-side `blocked_terms` |
| 3.1.1 | Restore Purchases | three surfaces — paywall, shop, Settings — each answering in a modal |
| 3.1.2 | Subscription disclosure | auto-renewal, cancellation, payment, Terms + Privacy links |
| 3.1.1 | No external payment on native | Stripe branches compiled out via `NATIVE_BUILD` |
| 2.3.1 | Unreleased surfaces excluded | King, TeamBattle, HomeV3, WorldMap, admin console — `verify-ios-bundle` fails the build if any chunk leaks |
| 2.3.6 | Advertising / UGC declared | both `true`, verified in API **and** the ASC questionnaire UI |
| — | Screenshots | 6.7", 6.5", 5.5" present per locale |
| — | Privacy manifest | `PrivacyInfo.xcprivacy` present in the IPA |
| — | Build hygiene | iPhone-only, iOS 15.4+, `get-task-allow: false`, `aps-environment: production`, appex version matches |

---

## Closing the testing gap (H3)

Everything above is static analysis and metadata. The failure that actually cost
six builds was **behavioural**, and no static check would have caught any of it:

- a `finally` that never ran because two awaits were unbounded
- an `ensureIdentified` that swallowed failure and let the charge proceed against an anonymous id
- a `!synced.success` branch that returned without announcing
- a `catch` that reported only through a suppressed toast

The next step is a behavioural suite that drives `purchase()` and
`restorePurchases()` against a **mocked RevenueCat plugin**, asserting outcomes
rather than source text:

1. success → announced once, optimistic gems applied, entitlement applied, button released
2. store rejection (`code: 2`) → failure announced with the store's message, no balance change
3. user cancel → silent, button released
4. `verify-receipt` 500 → failure announced with the server's reason
5. hung `syncEntitlements` / `fetchProfile` → bounded, button still released
6. restore → each of the five outcomes maps to the right modal copy
7. never announce success twice

That converts "it worked when I tapped it" into something CI enforces on every
push, which is the only way this stops regressing.

---

## Pre-submission checklist

**Metadata / ASC**
- [x] B1 — review screenshot on each of the four gem consumables
- [x] B2 — fix `pro.annual` description (5 friend seats, not 1)
- [ ] B3 — withdraw the remaining 4 items from `71c735ab` (needs an ASC session)
- [ ] Re-confirm Advertising = Yes, UGC = Yes, Contests = Frequent, Simulated Gambling = Infrequent **immediately before** submitting

**Server**
- [ ] H2 — deploy `revenuecat-webhook`
- [ ] H2 — apply `20261106130000_vip_subscriptions_are_realtime.sql`

**Build**
- [x] H1 — remove `loggingBehavior: 'production'` and the purchase timing logs
- [x] H3 — behavioural purchase tests green (13 tests, `purchaseFlow.behaviour.test.tsx`)
- [x] H4 — offering now returns `current` + `$rc_annual` on device; gem packages still report "in no offering" and remain on the compiled fallback price
- [ ] Clean build from `main`, verify IPA, upload, attach to 1.0

**Then**
- [ ] New review submission: version 1.0 + 4 IAPs + 3 subscriptions + the group
- [ ] Submit
