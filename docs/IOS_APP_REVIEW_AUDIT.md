# iOS App Review Audit — MyTrivia

**Audited commit:** `ec78dce` (2026-08-25)
**Target:** `io.mytrivia.app` · MARKETING_VERSION 1.0 · CURRENT_PROJECT_VERSION 30 · iOS 15.0+ · iPhone only
**Posture:** written as an App Review reviewer would work — open the binary's
configuration, then walk the app looking for the things that get apps sent back.

This supersedes the iOS sections of `PRE_LAUNCH_CHECKLIST.md`, which was last
updated in January 2026 and is now substantially stale (it asks for a minimum
deployment target, a privacy manifest and `.env` removal — the first two exist,
and the third is deliberate; see `AGENTS.md` §5).

---

## How to read this

**Priority** is how bad it is.

| | |
|---|---|
| **P0** | Rejection or crash is near-certain. |
| **P1** | High likelihood of rejection, or a visibly broken feature a reviewer will reach. |
| **P2** | Production quality. Survives review; hurts users or revenue. |
| **P3** | Low. Worth doing before the second release. |
| **P4** | Nice to have. |
| **P5** | Technical debt. |

**Status** is the question you actually asked:

- **BLOCKING** — must be fixed before submission.
- **BLOCKING (conditional)** — blocking only if a stated condition holds
  (usually: "if that product is attached to the submission"). The condition is
  named in the finding.
- **NON-BLOCKING** — will pass review as-is, but bites later: a bad first
  session, lost revenue, a compliance exposure, or the next release's rejection.

**Confidence** distinguishes what was executed from what was read.

- **Verified** — a command was run and its output is quoted.
- **Read** — established by reading the source; deterministic, not executed.
- **Needs device / needs ASC** — cannot be settled from this repo. Named
  explicitly rather than asserted.

### What was actually run

```
npm ci                                    → exit 0
npx vitest run                            → 94 files, 895 tests, all passing
tsc --noEmit -p tsconfig.app.json         → exit 0
tsc --noEmit -p tsconfig.node.json        → exit 0
VITE_INCLUDE_ADMIN=false VITE_NATIVE_BUILD=true vite build
  + scripts/prune-ios-videos.mjs
  + scripts/verify-ios-bundle.mjs         → "ok — 98.7 MB, no admin console, no pre-ATT tracking"
curl https://mytrivia.io/.well-known/apple-app-site-association   → 200 application/json
curl https://www.mytrivia.io/.well-known/apple-app-site-association → 200
POST https://sqwpzezkhpqkdyltvsim.supabase.co/functions/v1/{fn}   → all 401/400, none 404
```

The tree is green. Everything below is a gap the tooling does not cover.

---

## Verdict

| Priority | Blocking | Conditional | Non-blocking | Total |
|---|---|---|---|---|
| P0 | 3 | 1 | 0 | 4 |
| P1 | 1 | 2 | 2 | 5 |
| P2 | 0 | 0 | 6 | 6 |
| P3 | 0 | 0 | 7 | 7 |
| P4 | 0 | 0 | 5 | 5 |
| P5 | 0 | 0 | 4 | 4 |

**Four items stood between this build and a submission that is worth making**
(P0-1 … P0-4), plus two that turned blocking depending on which in-app
purchase products got attached (P1-1, P1-2).

The compliance groundwork here is unusually good — privacy manifest, ATT
pre-prompt ordering, report/block, account deletion, restore, IAP-only payments
on device, SKAdNetwork, the bundle guard — and what follows was the last few
percent rather than a rebuild.

---

## Resolution log

Everything at P0 and P1 has been worked. Each finding's heading carries its
state; this is the summary.

| # | State | What changed |
|---|---|---|
| **P0-1** | ⚠️ Guarded | Cannot be fixed from this repo — the file is fetched from the Firebase console. `scripts/verify-ios-native.mjs` now runs first in `build:ios` and fails with the console path, so it is caught before Xcode rather than in it. It also rejects a plist for the wrong `BUNDLE_ID` and an `GADApplicationIdentifier` that is not an iOS app id. |
| **P0-2** | ✅ Fixed | `<SubscriptionTerms />` now renders on `PlayLimitModal` and `ProPaywallModal`. `subscriptionTerms.test.ts` **derives** the surface list by walking `src/` for files importing `useProPurchase`, so surface number six cannot slip through the same hole. |
| **P0-3** | ✅ Fixed, **wider than reported** | `availablePlans()` returns empty on native with no catalogue instead of falling back to a bundle-priced row; the paywall renders a loading / "store unavailable" state with the buy button disabled. Covered by `src/config/__tests__/proPlans.test.ts`. **The finding under-scoped this** — see below. |
| **P0-4** | ⚠️ Open | Off-repo by nature — the products have to exist in App Store Connect. The client surface shrank (P1-1) and can no longer display a product the store did not return (P0-3), so the checklist is shorter. Still on the pre-submission list below. |
| **P1-1** | ✅ Fixed | `IAP_PRODUCTS.AD_FREE` removed and the dead `AdFreeModal` deleted along with its `Index.tsx` render and admin-gallery entry. The **server** keeps the mapping, because the `ad_free` tier is also in the subscriptions table, a migration and `supabase/tests/03-pro-seats.sql`. The catalog invariant now asserts that retirement explicitly, in both directions. |
| **P1-2** | ✅ Fixed | `trialDays` deleted from the plan config. The trial is read off the store product — `IAPProduct.introFreeDays`, from RevenueCat's `introPrice`, zero-price offers only. No store offer, no trial copy, so the app cannot advertise one App Store Connect does not grant. `src/utils/__tests__/introOffer.test.ts` covers the conversions. |
| **P1-3** | ✅ Fixed | The QR scanner is gone entirely (product decision), taking `html5-qrcode`, `joinCodeFromQr` and the TeamV2 entry point with it. The avatar selfie now goes through `@capacitor/camera` on native, so **no `getUserMedia` runs in the webview at all** — which resolves the finding without `WKAppBoundDomains` and its ten-domain navigation cap. `NSCameraUsageDescription` no longer mentions QR codes. |
| **P1-4** | ✅ Fixed | MyTrivia is 13+: the under-16 bucket is gone and the age gate offers 13–17 / 18+. `useAds` sets the age group **before** `AdMob.initialize()`, and `adService` re-applies the treatment if the profile arrives later, so `maxAdContentRating` is no longer inert. `tagForChildDirectedTreatment` is not set at all now — it is COPPA's under-13 flag and there are no under-13s. Legacy `child` rows still resolve to the stricter treatment. |
| **P1-5** | ✅ Fixed | `main.tsx` arms an 8-second `SplashScreen.hide()` fallback on native, so a webview that never boots shows a blank screen rather than freezing on the launch image forever. |

### P0-3 was on four more surfaces than the finding named

Fixing the paywall exposed the same defect elsewhere. `MobileProCarousel`,
`ShopRightSidebar`, `ProRequiredModal` and `PlayLimitModal` all price from
`useStorePrice` and all gated their buy button on `isProcessing` alone — so on
a device where StoreKit stayed silent they showed the same `$3.99` beside the
same live button. The gem shop had the matching hole for consumables:
`useGemPurchase` checked that a pack had a configured SKU, never that the
store had actually returned it.

That is one defect, so it got one fix rather than five:

- **`useStorePrice`** no longer falls back to the USD figure on native. It
  returns `"—"` with `fromStore: false`. A placeholder is a loading state; a
  dollar figure is a quote, and it was the quote a reviewer would see.
- **`useProPurchase`** exposes `storeReady` (native: StoreKit returned a
  catalogue; web: always true) **and refuses the purchase itself** if the
  product is not in the catalogue, so a surface that forgets to gate its
  button gets a message instead of a payment sheet that fails.
- All five subscription surfaces disable their buy button on `!storeReady`.
- **`useGemPurchase`** checks the catalogue as well as the config.

The audit's own P0-3 entry is left as written above — it is the record of what
was found, and the gap between what it named and what was actually wrong is
worth keeping visible.

### Verification after the changes

```
npx vitest run                            → 95 files, 908 tests, all passing
npm run typecheck                         → clean (both tsconfigs)
eslint (changed files)                    → no new findings
VITE_INCLUDE_ADMIN=false VITE_NATIVE_BUILD=true vite build
  + prune-ios-videos + verify-ios-bundle  → "ok — 98.4 MB, no admin console, no pre-ATT tracking"
eslint, whole tree, vs a worktree at HEAD  → 650 problems before, 647 after (no new findings)
node scripts/verify-ios-native.mjs        → correctly fails here (no GoogleService-Info.plist);
                                            passes against a matching plist, rejects a mismatched one
```

---

# P0 — Blocking

## P0-1 · ⚠️ GUARDED · `GoogleService-Info.plist` is not in the repo, and the Xcode project requires it

**Status:** BLOCKING · **Guideline:** 2.1 (app crashes / does not build) · **Confidence:** Read (build-time, deterministic)

`.gitignore:52` excludes it deliberately, with a good reason written next to it.
But `ios/App/App.xcodeproj/project.pbxproj` references it as a real file in the
App target's Resources phase:

- `project.pbxproj:19` — `GoogleService-Info.plist in Resources`
- `project.pbxproj:59` — the `PBXFileReference`
- `project.pbxproj:245` — inside the App target's `PBXResourcesBuildPhase`

So a fresh clone on a Mac does not build: Xcode stops at *"Build input file
cannot be found."* If somebody "fixes" that by deleting the reference,
`@capacitor-firebase/messaging` then calls `FirebaseApp.configure()` at launch
with no configuration file and raises — a crash on launch, before the app
paints, which is the single fastest way to fail review.

**Fix.** Fetch it from Firebase console → Project settings → General → Your apps
→ `GoogleService-Info.plist`, drop it in `ios/App/App/`, before archiving. This
belongs in a release runbook step, not only in a `.gitignore` comment — the
comment is only read by someone already looking at `.gitignore`.

**Verify:** `ls ios/App/App/GoogleService-Info.plist` and confirm its
`BUNDLE_ID` is `io.mytrivia.app` before every archive.

---

## P0-2 · ✅ FIXED · Two subscription surfaces ship without the Guideline 3.1.2 disclosure

**Status:** BLOCKING · **Guideline:** 3.1.2 (auto-renewable subscriptions) · **Confidence:** Read

`SubscriptionTerms` exists, is correct, is native-gated correctly, and is pinned
by `src/__tests__/subscriptionTerms.test.ts`. The test's own docstring says *"A
fourth appearing without the disclosure is the regression this catches."* It
does not catch it — the file list is hardcoded to three paths.

Five components call `useProPurchase`. Three render the disclosure:

| Surface | Disclosure |
|---|---|
| `src/components/shared/ProRequiredModal.tsx:150` | ✅ |
| `src/components/shop/MobileProCarousel.tsx:416` | ✅ |
| `src/components/shop/ShopRightSidebar.tsx:233` | ✅ |
| `src/components/home/PlayLimitModal.tsx:56` | ❌ **nothing at all** |
| `src/components/pro/ProPaywallModal.tsx:146` | ❌ **incomplete** |

**`PlayLimitModal`** starts a PRO subscription (`initiateProCheckout("pro")`)
with no renewal terms, no billing-account statement, no cancellation
instructions, and no Terms/Privacy links anywhere on the modal. This is the
worst of the two: it is the modal a player hits when they run out of free
games, which makes it one of the likeliest paths a reviewer takes.

**`ProPaywallModal`** (reached from `Discover.tsx:767`) carries Terms, Privacy
and Restore links and a footnote — but the footnote is
`"{price} / {period}, cancel anytime"` (`src/locales/en.ts:4622`). 3.1.2 wants
four things beside the buy button, and that line carries one and a half:

- ✅ price and period
- ❌ that the subscription **auto-renews**
- ❌ that payment is charged to the **Apple ID account** at confirmation of purchase
- ❌ that it renews unless **turned off at least 24 hours before** the period ends,
  and where to manage it (Account Settings after purchase)

The copy for all of this already exists in every locale
(`extra.autoRenewalDesc`, `extra.paymentDesc`, `extra.cancellationDesc`).

**Fix.**
1. Render `<SubscriptionTerms />` in `PlayLimitModal`, under the buy button.
2. Render `<SubscriptionTerms onNavigate={onClose} />` in `ProPaywallModal`'s
   footer, replacing or joining the bare footnote. Keep the Restore button.
3. Rewrite `subscriptionTerms.test.ts` to **derive** the surface list — glob
   `src/**/*.tsx`, keep every file importing `useProPurchase`, assert each
   renders `<SubscriptionTerms` — so surface number six cannot slip through the
   same hole twice.

---

## P0-3 · ✅ FIXED · The paywall will offer a purchasable row when StoreKit returned no catalogue

**Status:** BLOCKING · **Guideline:** 2.1 / 3.1.2 · **Confidence:** Read

`availablePlans()` (`src/config/proPlans.ts:112-116`) deliberately never returns
an empty list:

```js
return available.length > 0 ? available : PRO_PLANS.filter((p) => p.id === "monthly");
```

And when the store has not answered, `useStorePrice`'s `nativeFallback`
(`src/hooks/useStorePrice.ts:80`) renders the hardcoded **`$3.99`**.

Compose those and the reviewer's actual session looks like this: their sandbox
account is in some storefront, StoreKit does not return the catalogue (products
not yet "Ready to Submit", not attached to the version, sandbox hiccup, no
account signed in) — and the paywall shows a **$3.99 monthly plan with an
enabled Subscribe button** that opens a sheet and fails. Two rejections in one
screen: a price that is not the price charged (2.3.1) and a purchase that does
not work (2.1).

The individual decisions are each defensible; the combination is not.

**Fix.**
- When `isNative && products.length === 0`, render a loading state, then an
  explicit "the store is unavailable, try again" state with the buy button
  **disabled** — never a priced row.
- Disable the buy button whenever `resolvePrice(...).fromStore === false` on
  native. `StorePrice` already exposes `fromStore` precisely for this and the
  comment in `useStorePrice.ts` says callers *"should prefer `fromStore`"* —
  no caller does.
- Keep the fallback string for layout measurement only, visually suppressed.

---

## P0-4 · ⚠️ OPEN (off-repo) · Every product the app can offer must exist in App Store Connect and be attached to this version

**Status:** BLOCKING · **Guideline:** 2.1 / 3.1.1 · **Confidence:** Needs ASC

The app can ask StoreKit for these (`src/hooks/useInAppPurchases.ts:21-31` plus
`src/config/gemPacks.ts`):

```
io.mytrivia.pro.monthly      auto-renewable   ← offered by default on every PRO surface
io.mytrivia.pro.annual       auto-renewable   ← paywall's featured row, "1 day free"
io.mytrivia.pro.weekly       auto-renewable
io.mytrivia.proplus.monthly  auto-renewable   ← the "family" tier in the shop carousel and sidebar
io.mytrivia.adfree           non-consumable   ← see P1-1
<gem pack SKUs>              consumable
```

For a **first** submission, in-app purchases are reviewed *with the binary* —
they must be created, priced, have review screenshots, and be submitted
alongside the build. Anything the app displays but that is not attached comes
back as *"we were unable to locate the in-app purchase."*

`proPlans.ts`'s own header records that `io.mytrivia.pro.annual` does not exist
in App Store Connect yet, and the shop's "family" tier maps to
`io.mytrivia.proplus.monthly` via `useStorePrice`'s `TIER_TO_PRODUCT` — so at
minimum `pro.monthly` and `proplus.monthly` must ship, and the gem consumables
must ship if the gem shop is reachable (it is).

**Fix.** Before submitting: for each SKU above that the build can display,
confirm it exists, is priced in all storefronts, has a screenshot and review
notes, and is in the "Submit with version" list. Delete or hide any the app
should not sell in 1.0 (see P1-1 for `adfree`, P1-2 for `annual`).

---

# P1 — High

## P1-1 · ✅ FIXED · `io.mytrivia.adfree` has no entry point in the app

**Status:** BLOCKING (conditional — blocking if the product is attached to the submission) · **Guideline:** 2.1 · **Confidence:** Verified

`AdFreeModal` is rendered at `src/pages/Index.tsx:844`, but
`setIsAdFreeModalOpen(true)` appears **nowhere in `src/`** — grep returns only
the comment in `RestorePurchasesRow.tsx:11` that documents the same fact. The
only other reference is the admin design gallery, which is excluded from the
iOS bundle.

So the non-consumable `io.mytrivia.adfree` cannot be bought from inside the
shipped app. If it is attached to the submission, review cannot find it and
rejects. If it is not attached, it is dead configuration that will confuse the
next person.

**Fix.** Either wire an entry point (an "remove ads" row in Settings, or the
ad-gate modal offering it), or do not attach the product to this version and
drop `AD_FREE` from `IAP_PRODUCTS`.

---

## P1-2 · ✅ FIXED · The paywall promises "Try 1 day free" for an offer that may not exist

**Status:** BLOCKING (conditional — blocking if `io.mytrivia.pro.annual` ships) · **Guideline:** 2.3.1 / 3.1.2 · **Confidence:** Read + needs ASC

`src/config/proPlans.ts:73` sets `trialDays: 1` on the annual plan, and
`src/locales/en.ts:4604` renders `planAnnualBlurb: "Try 1 day free"` in the
offer colour `#CE3A00`. The CTA also changes to `paywall.ctaTrial` ("Try PRO
for free") whenever the selected plan has `trialDays`.

The config comment is explicit: *"Must match the introductory offer configured
on io.mytrivia.pro.annual in App Store Connect."* If the annual product is
created without a 1-day free introductory offer — or with a different one — the
app states an offer StoreKit will not honour, on the screen review looks at
hardest.

Also note the row is hidden while the product is absent from the catalogue
(good), so this only bites the moment the annual product goes live — which is
exactly when nobody will be re-reading this file.

**Fix.** Configure a 1-day free trial introductory offer on
`io.mytrivia.pro.annual`, or remove `trialDays` and revert the blurb. Do not
ship the annual row without checking which.

---

## P1-3 · ✅ FIXED · In-webview camera may be dead on device: no `WKAppBoundDomains`

**Status:** BLOCKING (conditional — blocking if reproduced on device) · **Guideline:** 2.1 · **Confidence:** Needs device

Three features call `navigator.mediaDevices.getUserMedia` directly inside the
Capacitor WKWebView, with no native fallback:

- `src/components/team/QRScannerModal.tsx:83` — scanning a QR to join a game
- `src/components/home/AvatarModal.tsx:355` — selfie for the avatar generator
- `src/components/profile/AvatarGeneratorModal.tsx:43` — same, other entry

WKWebView's `getUserMedia` support is gated behind app-bound domains: the
webview must be created with `limitsNavigationsToAppBoundDomains = YES`, which
requires a `WKAppBoundDomains` array in `Info.plist`. Neither exists here —
`ios/App/App/Info.plist` has no `WKAppBoundDomains`, and `capacitor.config.ts`
has no `ios.limitsNavigationsToAppBoundDomains`.

`NSCameraUsageDescription` is present and correct, so this is not a permission
problem; it is a webview capability problem, and its failure mode is the camera
never starting — QRScannerModal shows its error state, the avatar flow falls
back to "upload". Both are visible dead ends on the happy path a reviewer takes
from a shared invite link.

I have **not** confirmed this on a device, and iOS behaviour here has shifted
across releases. Do not fix it blind.

**Test to run first (10 minutes, device or simulator, iOS 17/18):**
1. Open the QR scanner from the team/join screen. Does a camera preview appear?
2. Open Profile → avatar → take a selfie. Same question.

**If it fails,** add to `Info.plist`:

```xml
<key>WKAppBoundDomains</key>
<array>
  <string>mytrivia.io</string>
  <string>www.mytrivia.io</string>
  <string>sqwpzezkhpqkdyltvsim.supabase.co</string>
</array>
```

and set `ios: { limitsNavigationsToAppBoundDomains: true }` in
`capacitor.config.ts`. **Caveat worth budgeting for:** app-bound domains cap
the list at 10 entries and restrict in-webview navigation to those domains.
OAuth is unaffected (it runs in `SFSafariViewController` via `@capacitor/browser`,
see `src/integrations/oauth.ts:81`), but re-test deep links, Supabase storage
images and the share flows after enabling it.

Alternative, and arguably better regardless: move QR scanning to a native
plugin, which also gets torch and continuous autofocus for free.

> **How this was resolved.** Neither of the above. The QR scanner was dropped
> from the product entirely, so the question of scanning natively went with it
> — `QRScannerModal`, `html5-qrcode`, `joinCodeFromQr` and the TeamV2 header
> button are all gone. That left the avatar selfie as the only `getUserMedia`
> caller, and it now goes through `@capacitor/camera` on native
> (`takePhotoWithCamera` in `src/utils/nativePhotoPicker.ts`), alongside the
> library picker that already worked that way.
>
> So there is no in-webview media stream left to gate, and **`WKAppBoundDomains`
> was not added** — which is the better outcome: declaring it would have capped
> the app at ten navigable domains for the sake of one screen. The device test
> above is no longer needed for this finding; the two remaining `getUserMedia`
> calls are on the browser path only.

---

## P1-4 · ✅ FIXED · Child-directed ad treatment is configured but never applied

**Status:** NON-BLOCKING · **Guideline:** 1.3 / 5.1.4 (COPPA), AdMob policy · **Confidence:** Verified

Signup collects an age group with a **`child`** option
(`src/components/onboarding/SignupOnboardingModal.tsx:44`, `AgeGroup =
"child" | "teen" | "adult"`), and `adService.getChildSafetyOptions()` has the
right AdMob flags for it: `tagForChildDirectedTreatment`,
`tagForUnderAgeOfConsent`, `maxAdContentRating: 'G'`, `npa: '1'`.

They are applied at `AdMob.initialize()` (`src/services/adService.ts:172-185`),
which runs from a bare effect in `useAds` — and `useAds` **never calls
`setAgeGroup`**. Grep for `setAgeGroup` returns exactly two call sites, both in
ad modals (`WatchAdModal.tsx:30`, `WatchAdForSpinsModal.tsx:40`), and both fire
long after initialize. So at initialization `this.ageGroup` is `null`,
`getChildSafetyOptions()` returns `{}`, and the SDK is initialized with no child
treatment for the life of the process.

Per-request `npa: '1'` **does** get applied once the modals set the age group, so
self-declared children are not served personalised ads. What they can still be
served is **non-G-rated ad content**, because `maxAdContentRating` is an
initialization-time setting.

Two further inconsistencies in the same area:

- **`ensureTrackingConsent()` does not consult age.** `adService.ts:385` and
  `:477` call it before showing an ad, unconditionally. A self-declared under-13
  player gets the ATT pre-prompt and then the system tracking dialog.
- **The privacy policy says the service is 13+** (`en.ts:1204`,
  `PrivacyPolicyEN.tsx:220`) while the signup age gate offers "child". One of
  those two is wrong, and a reviewer comparing the age gate to the policy will
  notice.

Non-blocking because none of it is visible in a review session — but it is a
COPPA exposure with real teeth, and the age-rating questionnaire answers have to
be consistent with whichever way it is resolved.

**Fix.**
1. Call `adService.setAgeGroup(profile.age_group)` in `useAds` **before**
   `adService.initialize()`, and re-initialize (or defer initialization) when
   the age group arrives after sign-in.
2. Make `ensureTrackingConsent()` return `"unavailable"` without prompting when
   `isUnderAgeOfConsent(ageGroup)`.
3. Decide whether under-13 accounts are supported at all. If not, remove the
   `child` option and gate signup; if yes, the privacy policy and the App Store
   age rating both have to say so.

> **How this was resolved.** Point 3 first, because it settles the others:
> MyTrivia is a 13+ service, so the under-16 bucket is gone and the gate offers
> **13–17** and **18+**. `AgeGroup` is now `"teen" | "adult"`.
>
> Point 1 is done — `useAds` sets the age group before `initialize()`, and
> `adService.setAgeGroup` re-applies the treatment when the profile arrives
> after the SDK is already up, which is the ordinary case for a mid-session
> sign-in.
>
> Point 2 is **moot rather than done**, and deliberately so. The concern was
> putting the ATT prompt in front of an under-13; there are none. Prompting a
> 13–17 player is permitted, and they are already held to non-personalised ads
> by `npa: '1'` on every request regardless of the ATT answer.
>
> `tagForChildDirectedTreatment` is no longer set at all. It is COPPA's
> under-13 flag and this app has no under-13 population to apply it to; a row
> written before the bucket was removed still lands on the stricter
> under-age-of-consent treatment via `isUnderAgeOfConsent`.
>
> The privacy policy's 13+ statement and the age gate now agree, which is what
> a reviewer comparing the two will check.

---

## P1-5 · ✅ FIXED · No safety net if React never mounts — the splash stays up forever

**Status:** NON-BLOCKING · **Guideline:** 2.1 · **Confidence:** Read

`capacitor.config.ts` sets `SplashScreen.launchAutoHide: false`, and the only
call to `SplashScreen.hide()` is in `NativeBridge`'s effect
(`src/native/NativeBridge.tsx:33`), behind two `requestAnimationFrame`s. That is
the right design for the normal case and produces a genuinely good launch.

The failure case has no floor. If the root bundle fails to evaluate — a
corrupted asset, an exception at module scope in one of the eagerly-imported
providers (`PostHogProvider` calls `posthog.init` at module level), a WKWebView
that never loads — nothing ever calls `hide()` and the app sits on the splash
image indefinitely. `AppErrorBoundary` cannot help; it needs React to be
running.

"App stuck on the launch screen" is a stock rejection, and it is also
unrecoverable for a real user.

**Fix.** Arm a fallback timer in `main.tsx` before rendering — `setTimeout(() =>
SplashScreen.hide(), 8000)`, cleared by the normal path. A blank webview with a
visible error beats a frozen splash: at least the reviewer can screenshot it and
the user can force-quit knowing something is wrong.

---

# P2 — Production quality (all NON-BLOCKING)

## P2-1 · `restorePurchases` is a single flat button with no progress semantics

`RestorePurchasesRow` is correctly placed in Settings (`Settings.tsx:262`) and
`restorePurchases` (`useInAppPurchases.ts:662`) handles the three outcomes with
distinct toasts, including `iap.noPreviousPurchases` — all present in all seven
locales (verified). Good.

What it lacks: `plugin.restorePurchases()` is **not** wrapped in `withTimeout`,
unlike every other store call in the file. The file's own commentary explains at
length that StoreKit calls can hang forever and that a hung call leaves
`finally` unrun — except `setPurchasing(false)` here *is* in a `finally`, so the
spinner does clear on rejection but never on a hang. A hung restore spins
forever. Wrap it, at a longer bound than 15 s (restore legitimately takes a
while).

## P2-2 · `verify-receipt` is the only thing standing between a paid user and nothing

The purchase path credits nothing client-side and calls `verify-receipt`
(`useInAppPurchases.ts:772`) — correct, and the function is deployed (verified:
HTTP 401, not 404). But `AGENTS.md` §4a documents that edge functions deploy
through Lovable on a separate schedule from the client. Ship an iOS build whose
purchase path expects a `verify-receipt` behaviour that is not deployed and
every purchase silently fails to grant.

**Before the archive:** confirm `verify-receipt`, `revenuecat-webhook` and
`_shared/iap.ts` on `main` match what is deployed, and that `PRODUCTS` in
`_shared/iap.ts` lists every SKU in `IAP_PRODUCTS` and `GEM_PACK_PRODUCTS`.

## P2-3 · The bundle is 98.7 MB of web assets, ~60 MB of it video

Verified: `verify-ios-bundle` reports 98.7 MB against a 150 MB ceiling. The
largest single items:

```
11.0M  dist/videos/loading.mp4
 8.5M  dist/assets/guest-welcome-avatar-*.mp4
 8.2M  dist/assets/guest-avatar-animated-*.mp4
 6.3M  dist/assets/woman-2-*.mp4
 6.2M  dist/assets/m1-*.mp4
 5.8M  dist/assets/lost-*.mp4
 2.9M  dist/assets/heic-to-*.js
 2.6M  dist/data/icon-library-meta.json
 1.5M  dist/app-icon-1024.png     ← a web favicon asset, shipped inside the binary
```

The installed app will be well over 100 MB. Not a review problem, but it is the
number on the App Store page next to "Size", and it is the difference between
installing on a train and not. An 11 MB **loading** video is the standout
irony.

`dist/app-icon-1024.png` in particular has no reason to be in the native bundle
— the app icon comes from the asset catalog.

## P2-4 · `heic-to` (2.9 MB) ships for a format iOS hands over already converted

`@capacitor/camera` returns JPEG/PNG by default; `heic-to`/`heic2any` exist for
browser uploads of HEIC files. On the native path they are 2.9 MB of dead
weight. Worth a lazy import gated on `!Capacitor.isNativePlatform()`.

## P2-5 · PostHog initializes at module scope with `autocapture: true`, before any consent

`src/providers/PostHogProvider.tsx:39` runs `posthog.init` at import time with
`autocapture: true`, `person_profiles: "always"`, `capture_pageleave: true`. It
is declared honestly in `PrivacyInfo.xcprivacy` as ProductInteraction /
Analytics / Linked / **not** Tracking, which is defensible (first-party, not
combined with third-party data) — so this passes Apple.

It is a GDPR/ePrivacy exposure rather than an Apple one: EU players are
identified and autocaptured from the first frame with no consent step, in an app
that already has a consent surface (`TrackingConsentGate`) it could reuse. Also
note `posthog.init` at module scope is one of the failure modes behind P1-5.

## P2-6 · The Info.plist declares a photo-library **add** permission the app never uses

`NSPhotoLibraryAddUsageDescription` promises *"MyTrivia saves the avatars and
quiz cards you create to your photo library."* Grep finds no save-to-photos
path: no `@capacitor/filesystem`, no `Camera.savePhoto`, nothing writing to the
library.

Harmless in itself — but it describes a feature that does not exist, which is
the kind of thing that draws a question in review notes, and it is a promise to
users that the app does not keep.

Either build the save (the share sheet already exists) or drop the key.

---

# P3 — Low (all NON-BLOCKING)

## P3-1 · The notification service extension has no entitlements file

`project.pbxproj` sets `CODE_SIGN_ENTITLEMENTS` for the App target only
(`:468`, `:490`); the NotificationService target's build configurations
(`:509-541`) have none.
`com.apple.developer.usernotifications.communication` is therefore on the app
and not on the extension that actually calls `content.updating(from: intent)`.

`NotificationService.swift` degrades correctly — `try?` falls through to the
plain notification — so the cost is styling, never a lost notification, exactly
as its comments claim. But if communication notifications render plain on
device, this is the first thing to check.

## P3-2 · `aps-environment` is `development` in the committed entitlements

`App.entitlements` pins `development` with a comment saying Xcode rewrites it to
`production` on export. That is true for App Store distribution under automatic
signing — but it depends on Xcode behaviour rather than on anything in the repo,
and a TestFlight build whose pushes silently never arrive is a very expensive
afternoon.

**Verify once, after the first archive:** unzip the `.ipa`, run
`codesign -d --entitlements :- Payload/App.app` and confirm
`aps-environment = production`.

## P3-3 · `UIBackgroundModes` is absent — silent/data push will not wake the app

No `remote-notification` background mode is declared. Every push the app sends
today is an alert push (the service extension dresses it), so nothing is broken.
Worth knowing before anyone adds a data-only push and cannot work out why it
never arrives.

## P3-4 · Legal pages localize into all seven languages; the SEO metadata does not

`TermsOfService.tsx` and `PrivacyPolicy.tsx` render from `legal.*` keys and all
seven locales carry them (verified). Good — the paywall's `/terms` link is
correct for every language.

But `index.html`'s `<meta name="description">` and every `og:*` tag are Georgian
only, and `public/manifest.json`'s `description` likewise. Inside the native app
this affects nothing; it affects every shared invite link and the web presence
the App Store listing points at.

## P3-5 · `NotFound.tsx` is hardcoded English and outside the localization system

`"Oops! Page not found"`, `"Return to Home"`, `"404"` — no `useLanguage`. A
Georgian player who taps a stale deep link gets an English 404. Small, visible,
cheap.

## P3-6 · Three shipped pages rely on document scrolling

`AGENTS.md` §4b is emphatic that the document scroller is off for the life of the
app, and that a page which just grows is frozen on device. Scanning
`src/pages/*.tsx` for a `min-h-screen` root with no `overflow-y-auto` and no
`MainLayout` finds five, of which three are in the iOS bundle:

- `NotFound.tsx` — centred, short. Safe today.
- `RoomRedirect.tsx` — centred, short. Safe today.
- `TVLobby.tsx:81` — a centred loading state; the real content at `:123` uses
  `tv-display-container`. Safe today.

None is broken now. All three are one content addition away from being frozen,
and none of them declares the constraint. Add the standard
`h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-y-auto` box, or
a repo-invariant test that fails on a `min-h-screen` page root.

## P3-7 · `contentInset: 'automatic'` alongside an overlaying status bar

`capacitor.config.ts` sets `ios.contentInset: 'automatic'` while
`nativeShell.ts:41` sets `StatusBar.setOverlaysWebView({ overlay: true })` and
the layout does its own insetting through `--safe-top`. These are two systems
claiming the same strip. It currently looks right, so this is a note rather than
a defect — but if a stray gap appears under the notch on some device class, this
pair is the first place to look. `contentInset: 'never'` is the setting that
matches the rest of the design.

---

# P4 — Nice to have (all NON-BLOCKING)

## P4-1 · ✅ NOT A DEFECT — corrected · "Import contacts" is dead code, not a button

**This finding was wrong and is left here corrected rather than deleted.**

The original text called it "a visible, tappable feature that does nothing …
the textbook 2.1 incomplete finding". It is not visible.
`handleImportContacts` at `src/components/team/InviteFriendsModal.tsx:491`
is *defined once and never called* — grep for it returns exactly one hit, the
definition. No JSX references it, so nothing renders an Import-contacts row
and no reviewer can tap one.

I graded it P4 on the reasoning that a reviewer might not open the modal, and
on a second pass nearly promoted it to a pre-submission fix on the reasoning
that they certainly would (`InviteFriendsModal` is used by `RoomLobbyV2` and
`CreateRoomPage`, the multiplayer path the review notes point at). Both
readings were arguing about the wrong thing: the row does not exist.

What is actually there is an unused function and an unused locale string in
seven languages. That is P5 tidy-up, not a submission item.

## P4-2 · `window.open(url, "_blank")` for share links inside the webview

`InviteFriendsModal.tsx:482` falls through to `window.open(url, "_blank")` for
the https share targets (`wa.me`, the X composer). The same file already knows
(`:474-478`) that `window.open` is a silent no-op in WKWebView for custom
schemes and routes those through `window.location.href`. For https URLs
Capacitor intercepts `_blank`, but which of "same webview" or "system browser"
you get has varied across Capacitor versions — and "same webview" means the app
navigates to WhatsApp's website with no way back, which is a genuinely bad
outcome.

Route these through `@capacitor/browser` or `Share` on native, the way the
Messenger branch already does.

## P4-3 · Dead locale strings promising features

`extra.comingSoon`, `extra.gemsPurchaseSoon` (*"Gem purchases coming soon!"*),
`extra.subtitleWait` are defined in every locale and referenced nowhere. Harmless
today; a hazard the moment someone wires one up by autocomplete. Delete them.

## P4-4 · `HelpModal`'s four buttons open `#faq`, `#support`, `#guide`

`src/components/home/HelpModal.tsx:18-36` — three of four actions are
`window.open("#faq", "_blank")` and friends, which do nothing. The component is
only imported by the admin design gallery, which is excluded from the iOS build
(verified by `verify-ios-bundle`), so it cannot be reached in the shipped app.
Fix or delete it before someone mounts it.

## P4-5 · The AASA `NOT` rules sit after the allow patterns

`public/.well-known/apple-app-site-association` lists twelve allow patterns and
then seven `NOT` patterns. iOS evaluates `paths` in order, first match wins — so
`NOT` entries belong **first**. Nothing overlaps today (no allow pattern matches
`/terms`, `/admin`, `/reset-password`…), so the file behaves correctly. It is
one added wildcard away from not doing so.

---

# P5 — Technical debt (all NON-BLOCKING)

## P5-1 · `src/hooks/useInAppPurchases.ts` is ~800 lines and is the highest-risk file in the app

It carries the plugin loader, the timeout wrapper, configure/logIn lifecycle,
offerings and the direct-product fallback, purchase, restore, entitlement sync,
and a detached retry loop — with commentary that is genuinely excellent and also
evidence of how many separate incidents are buried in it. Every line of it is
money. It has no unit tests of its own.

Extract the plugin lifecycle (load / configure / logIn) into a module with a
fake plugin behind it, and test the purchase and restore state machines.

## P5-2 · The lucky-spin outcome is chosen on the client

`src/components/game/LuckySpinModal.tsx:80-91` picks the winning segment with
`Math.random()` and then records it. `credit_gameplay_reward` bounds the amount
server-side (per `AGENTS.md` §3), so this is not an economy hole — but the
*outcome* is still the client's to decide, which means the wheel's advertised
odds are not enforced anywhere.

Not a loot box in Apple's sense: spins are earned by watching a rewarded ad, not
bought, so §3.1.1's odds-disclosure requirement does not attach. It would the
moment a spin becomes purchasable with gems.

## P5-3 · `PRE_LAUNCH_CHECKLIST.md` is actively misleading

Its P0 list asks to remove `.env` from git (deliberate — `AGENTS.md` §5), set a
minimum deployment target (done — 15.0), and add a privacy manifest (done). A
newcomer following it will undo working decisions. Either update it or mark it
superseded by this file at the top.

## P5-4 · `README.md` is the unedited Lovable template

`REPLACE_WITH_PROJECT_ID` appears three times. It is not shipped and not
reviewed, but it is the first file anybody opens.

---

# Verified clean — do not re-audit these

Recorded so the next pass can skip them.

| Area | Finding |
|---|---|
| **Payments on device** | Both real-money paths are native-gated. `useProPurchase.ts:41` and `useGemPurchase.ts:34` route to StoreKit on native; Stripe is unreachable from the app. No external purchase links, no steering. §3.1.1 clean. |
| **Restore** | Present in Settings (`Settings.tsx:262`), and on the paywall. §3.1.1 clean. |
| **Account deletion** | `/delete-account` routed (`App.tsx:277`) and reachable from Settings → Privacy, calling `delete-user-account`, which is deployed (verified 401, not 404) and removes the auth user rather than just the profile row. §5.1.1(v) clean. |
| **Sign in with Apple** | Offered first on the auth screen (`Auth.tsx:442`), native `ASAuthorization` sheet on iOS via the Capacitor plugin, `scopes: 'email name'`. §4.8 clean. |
| **UGC moderation** | Report and block wired to `user_reports`/`user_blocks` through `useContentModeration`, surfaced from the content itself via `PlayerOverflowMenu` on creator cards, the player feed and the profile modal. Text filtered through `contentFilter` at 13 call sites including nicknames and quiz creation. ToS carries a zero-tolerance clause (`legal.zeroTolerance`, rendered at `TermsOfService.tsx:91`). Terms + Privacy linked at the point of account creation (`Auth.tsx:487-495`). §1.2 clean. |
| **ATT** | Pre-prompt screen precedes the system dialog and only at a moment tracking is relevant (immediately before an ad); "Not now" leaves the system prompt unasked rather than nagging; `GADDelayAppMeasurementInit` holds measurement until consent. `NSUserTrackingUsageDescription` is written from the player's side. §5.1.2 clean — subject to P1-4 on age. |
| **Privacy manifest** | `PrivacyInfo.xcprivacy` declares tracking, tracking domains, eight collected data types and four required-reason APIs with reason codes. Consistent with the SDKs actually embedded. |
| **Permission strings** | Camera, photo library (read), photo library (add), tracking — all present and specifically worded. No microphone string needed: every `getUserMedia` call passes `audio: false` (verified at both call sites). |
| **Login wall** | None. Guest play works throughout (`isGuest={!user}` across `Index.tsx`); auth is prompted at the point a feature needs an account. §5.1.1(v) clean. |
| **Push permission** | Never asked at launch. Gated on being signed in, once per install, 4 s after the first screen (`PushRegistrar.tsx`). App is fully functional without it. §4.5.4 clean. |
| **No remote-content shell** | `capacitor.config.ts` has no `server` block; the app runs from the bundled `dist/`. Not a repackaged website. §4.2/4.7 clean. |
| **Admin console excluded** | `VITE_INCLUDE_ADMIN=false` in `build:ios`, enforced by `verify-ios-bundle.mjs` (verified: "no admin console"). Dev pages (`/styleguide`, `/docs`, showcases) gated on `INCLUDE_DEV_PAGES`, off in production. |
| **Meta Pixel excluded** | Stripped from `index.html` by the `native:strip` markers under `VITE_NATIVE_BUILD=true`, enforced by the same guard (verified: "no pre-ATT tracking"). `fbpixel.ts` is a no-op when `window.fbq` is absent. |
| **Universal links** | AASA served 200 `application/json` from both `mytrivia.io` and `www.mytrivia.io`, `appID` `T38XQSM4L3.io.mytrivia.app` matching `DEVELOPMENT_TEAM` and the bundle id, both domains in `App.entitlements`. |
| **Edge functions deployed** | All seven probed return 401/400, none 404 — including `send-game-invite-push`, which `AGENTS.md` §4a records as having been 404 at one point. |
| **App icon** | 1024×1024, 8-bit RGB, **no alpha channel** (verified via `file`). Single universal entry, correct for iOS 11+. |
| **Launch screen** | Storyboard-based, `scaleAspectFill`, matched to the React splash's crop and to `SplashScreen.backgroundColor`. No black flash, no second screen. |
| **Orientation / device family** | Portrait only in `Info.plist` (the file iOS actually reads), `TARGETED_DEVICE_FAMILY = 1`, `UIRequiredDeviceCapabilities = arm64`. No claimed-but-broken iPad layout. |
| **AdMob** | `GADApplicationIdentifier` is the **iOS** app id (a wrong-platform id crashes the SDK at launch); real ad unit ids configured in `.env` for both placements, so no demo units in production; 45 SKAdNetwork identifiers declared. Ads are opt-in only — no interstitials, no unsolicited ad gates. |
| **Export compliance** | `ITSAppUsesNonExemptEncryption = false`. HTTPS-only; no ATS exceptions; no `http://` endpoints in `src/`. |
| **No secrets in the bundle** | Scanned `dist/` for `service_role`, `sk_live`, `sk_test`, `SUPABASE_SERVICE` — no matches. Only the anon key, the RevenueCat public SDK key and AdMob unit ids, all public by design. |
| **Build health** | 895 tests pass, both tsconfigs typecheck clean, the iOS build runs end to end through the bundle guard. |

---

# Second pass — 2026-08-25, on `main` @ `7e8ab364`

A fresh look after the P0/P1 work landed, asking only: what is left before
submitting.

**State.** `main` is green. Deploy run #781 ran `npm ci`, typecheck, unit
tests, build and the Playwright smokes and then shipped — so the merged code
is CI-validated, not just locally validated. Re-run here: 917 tests pass,
both tsconfigs clean, iOS bundle 98.4 MB through `verify-ios-bundle`, and
`verify-ios-native` correctly refuses (no `GoogleService-Info.plist` in this
checkout, which is the point of it).

**No new blocking code defects.** The two candidates both dissolved on
inspection:

- **"Import contacts" is not a button.** See the corrected P4-1 above — dead
  code, nothing renders it.
- **Removing the QR *scanner* did not break the QR *display* flows.** The TV
  lobby still shows a QR (`TVLobbyScreenV2`, `TVIdleScreen`, `TVPollScreen`,
  `TVHostController`), and it encodes a URL —
  `${origin}/join/session/${sessionId}`. That is scanned by the phone's own
  camera app, which opens the link, which the AASA routes into the app
  (`/join/*` is in the allow list). It never needed an in-app scanner.

**Checked and fine, worth recording so the next pass skips them:**

- Extra plays sell for coins, gems or a rewarded ad — no real-money path, so
  no IAP surface hiding in `ExtraPlaysOffer`
- `DEFAULT_LANGUAGE` is `en`, so a reviewer with no stored preference gets
  English rather than Georgian
- Offline is handled (`OfflineBanner`, `useNetworkStatus`)
- `extra.iapItemUnavailable`, which the new purchase guard uses, exists in all
  seven locales

**Two things this pass added to the checklist below:** the screenshot size
(the capture script still targets the retired 5.5" slot) and the fact that
Apple has no 13+ age tier, so 12+ is the floor.

**Still-open non-blockers, unchanged:** P2-1 (`restorePurchases` is the one
store call not wrapped in `withTimeout`, so a hung restore spins forever),
P2-6 (`NSPhotoLibraryAddUsageDescription` promises a save-to-photos feature
that does not exist), P2-5 (PostHog autocaptures before any consent step),
and the QR locale strings that the scanner removal orphaned
(`qrScannerTitle`, `invalidQrCode`, `qrNoGameCode`, `qrFooterHint`).
# Third pass — strict reviewer, on `main` @ `cd2190f2`

Read as an App Review reviewer with a low tolerance: not "does the config
parse", but **what does this app contain, and what leaves the device**. The
first two passes audited plumbing. This one audited content and data flow, and
found one blocker they both missed.

## S-1 · ✅ FIXED · The privacy policy never said the app collects photographs — or where they go

**Status: was BLOCKING · Guideline 5.1.1(i) (and App Privacy consistency) · Confidence: Verified**

The app takes a photograph of the user's face and uploads it to a third-party
AI provider. The privacy policy does not mention either fact.

**What actually happens.** `AvatarModal` and `AvatarGeneratorModal` capture a
selfie — system camera or photo library — and call
`supabase.functions.invoke("generate-avatar")`. That function posts to
**`https://fal.run`** (fal.ai); `src/config/sceneAvatarPrompt.ts:14` records
that generation runs on *"GPT Image 2 via fal.ai"*. `animate-avatar` posts to
`https://queue.fal.run`. Two further functions that handle the same images
server-side reach **`api.lightxeditor.com`** (LightX) and **`api.vyro.ai`**
(Vyro); neither is called from the client today, but both process user photos.

**What the policy says.** Its "Data We Collect" section lists exactly four
things — account information, profile data (*"Avatar, country, game
statistics"*), game data, technical data. **A photograph is not among them.**
"Avatar" is the generated output, not the face that was uploaded to produce
it. Grep the whole of `src/` for `fal.ai`, `fal.run`, LightX or Vyro outside a
code comment: nothing. No user-facing surface names any of them.

**Why this is the reviewer-visible kind.** `PrivacyInfo.xcprivacy` already
declares `NSPrivacyCollectedDataTypePhotosorVideos` — correctly. So the App
Privacy label on the listing will say **Photos**, the reviewer taps through to
the privacy policy the listing links, and the policy does not mention photos.
That contradiction is on the two documents Apple puts side by side. 5.1.1(i)
also asks for confirmation that third parties you share data with provide
equal protection — hard to claim for a processor the policy does not name.

It is sharper still because the app is **13+**: a self-declared teenager's
face is going to an undisclosed AI processor.

**Fix** (cheap — it is copy, not code):
1. Add a photograph line to "Data We Collect": what is captured, that it is
   uploaded to generate an avatar, and how long it is kept.
2. Name the AI processors in the third-party list beside Supabase, Firebase,
   AdMob, RevenueCat, Apple, PostHog and ip-api.com.
3. Both policy surfaces — `src/pages/PrivacyPolicyEN.tsx` (hardcoded English)
   and the `legal.*` keys the localized `/privacy-policy` renders, in all
   seven locales.
4. Consider a one-line notice at the point of capture. Not required; it is the
   difference between disclosed and obvious.

## S-2 · ✅ FIXED · The privacy policy contradicted itself on who receives data

**Status: was NON-BLOCKING (P2) · Confidence: Verified**

`legal.withProviders` says data is shared *"With service providers (Supabase,
Cloudflare)"* — two names. The third-party section of the same document lists
seven: Supabase, Firebase, AdMob, RevenueCat, Apple, PostHog, ip-api.com. One
policy, two different answers to the same question. Fold the first into the
second.

## S-3 · ✅ FIXED · The policy was dated "Effective: January 2025"

**Status: was NON-BLOCKING (P3) · Confidence: Verified**

`legal.effectiveDate`. For a 2026 submission that is a document stamped
nineteen months before the build. It costs nothing and it is the first line a
reviewer reads.

---

## What this pass cleared

Recorded because these are the things that sink quiz apps, and they are clean.

**Image rights — clean.** Every picture-guess category (celebrity, movie,
city, sportsman, logo, flag) draws from Wikimedia. Checked the namespace on
all of it: **6,643 image references, 949 distinct images, 100% from
`upload.wikimedia.org/wikipedia/commons/`**. Not one from the
`/wikipedia/en/` fair-use namespace, which is where non-free movie posters and
publicity stills live. Commons is free-licensed by policy, so the 5.2 exposure
that usually kills a picture-quiz app is not present here.

The residual is licence *attribution*: most Commons files are CC BY / CC BY-SA
and ask for credit, and the app shows none. That is a licence-compliance
matter rather than a review blocker — a credits screen listing the source
would close it.

**Image delivery — clean, and better than it looks.** The migrations store
Wikimedia URLs, but nothing hot-links them. `src/utils/questionImage.ts`
rewrites every one through the app's own `/img` edge route, which fetches once
and caches; the file's comment records that direct fetches were already being
429-throttled by Wikimedia. It also handles the native case explicitly — under
`capacitor://localhost` a relative `/img` would reach nobody, so it spells out
`https://mytrivia.io`. Tested live:

```
GET https://mytrivia.io/img?u=<wikimedia jpeg>
  → HTTP/2 200 · content-type: image/jpeg
  → cache-control: public, max-age=31536000, immutable
```

**No new monetisation defects.** Another agent's pricing refactor
(`cd2190f2`) rewrote `useStorePrice` and `proPlans` on top of this work.
Re-checked: the native `"—"` placeholder, `fromStore`, `storeReady` and the
`PRODUCT_NOT_IN_STORE` guard all survived, and every buy button is still gated.

**Also checked:** extra plays sell for coins/gems/rewarded-ad only, so no IAP
surface hides in `ExtraPlaysOffer`; the lucky spin is ad-earned, not
purchasable, so no loot-box odds disclosure attaches.

**Build state:** 918 tests pass, both tsconfigs clean.

---

# The privacy work, and the App Privacy answers

## What was changed

**The policy now says what happens to a photograph.** Both surfaces — the
hardcoded `PrivacyPolicyEN.tsx` and the `legal.*` keys the localized page
renders — gained three collection rows (Photographs, Content You Create,
Approximate Location), a `fal.ai` entry in the third-party list, and a
retention sentence saying a photo lives exactly as long as the avatar it
produced. In all seven languages.

One deliberate limit: the copy claims only what **we** control — we use the
photo to make the avatar, we do not show it to other players, we do not sell
it, deleting the avatar deletes it. An earlier draft also asserted that fal.ai
does not train on it. That is a claim about somebody else's terms, and it was
removed. **Confirm fal.ai's DPA and add the stronger sentence if it is true.**

**S-2:** `withProviders` no longer names its own short list; it points at the
third-party section, so the document answers "who receives your data" once.

**S-3:** effective date is August 2026.

**The manifest was missing two categories.** Chasing S-1 turned up that
`PrivacyInfo.xcprivacy` declared nine data types and the app collects eleven:

- **Gameplay Content** — player-authored quizzes, collections and room names,
  written to `user_quiz_posts`, `quiz_collections` and `game_rooms`, visible
  to other players. Undeclared.
- **Coarse Location** — `country_code`, derived once from the IP address via
  ip-api.com and stored on the profile (`AuthContext.tsx:151`). Undeclared.

Both added. Verify the key spellings against Apple's current list via
Product → Archive → Generate Privacy Report before uploading — an
unrecognised data-type string is an upload-time validation error, not a
silent no-op.

**`src/__tests__/privacyDisclosure.test.ts`** pins all of it: photographs and
the AI processor named on both pages, the copy present in every locale, the
`withProviders` contradiction not returning, and the manifest declaring the
four types that matter. It asserts subject matter rather than wording, so the
copy stays free to improve.

## Per-language policy URLs

App Store Connect takes a privacy policy URL **per App Store localization**,
and `/privacy-policy` could not serve that: it renders in whatever language
the visitor has stored, which for a first-time visitor from the German
storefront is English.

So `/privacy-policy/:lang` and `/terms/:lang` now exist, pinned by path,
ignoring app state entirely (`src/utils/legalLanguage.ts`). They also set
`<html lang>` and the document title, because these are public pages someone
lands on from the App Store rather than in-app screens. An unsupported code
redirects to the preference-following route rather than 404ing, so a mistyped
listing link still shows the policy.

| Locale | Privacy policy URL | Terms URL |
|---|---|---|
| English | `https://mytrivia.io/privacy-policy/en` | `https://mytrivia.io/terms/en` |
| Georgian | `https://mytrivia.io/privacy-policy/ka` | `https://mytrivia.io/terms/ka` |
| German | `https://mytrivia.io/privacy-policy/de` | `https://mytrivia.io/terms/de` |
| Spanish | `https://mytrivia.io/privacy-policy/es` | `https://mytrivia.io/terms/es` |
| French | `https://mytrivia.io/privacy-policy/fr` | `https://mytrivia.io/terms/fr` |
| Italian | `https://mytrivia.io/privacy-policy/it` | `https://mytrivia.io/terms/it` |
| Portuguese | `https://mytrivia.io/privacy-policy/pt` | `https://mytrivia.io/terms/pt` |

These are live only after the next deploy of the web app. Check one before
pasting them into the listing.

## The App Privacy answers

Fill these in under **App Store Connect → your app → App Privacy**. They are
derived from `PrivacyInfo.xcprivacy`, which is the file Xcode's privacy report
aggregates — the two must agree, and a reviewer can see both.

Start by answering **"Do you or your third-party partners collect data from
this app?" → Yes**.

Then, for each type below: **Data Type → collected → linked to the user's
identity? → used for tracking? → purposes**.

| Data type (ASC) | Category | Linked | Tracking | Purpose | Why |
|---|---|---|---|---|---|
| **User ID** | Identifiers | Yes | No | App Functionality, **Analytics** | Supabase account id; PostHog identifies by it |
| **Email Address** | Contact Info | Yes | No | App Functionality, **Analytics** | Sign-up; PostHog receives `$email` |
| **Name** | Contact Info | Yes | No | App Functionality, **Analytics** | Nickname; PostHog receives `$name` |
| **Photos or Videos** | User Content | Yes | No | App Functionality | The avatar selfie, sent to fal.ai |
| **Gameplay Content** | User Content | Yes | No | App Functionality | Player-made quizzes, collections, room names |
| **Coarse Location** | Location | Yes | No | App Functionality | Country from IP, stored as `country_code` |
| **Purchase History** | Purchases | Yes | No | App Functionality, **Analytics** | RevenueCat purchase analytics |
| **Product Interaction** | Usage Data | Yes | No | Analytics, App Functionality | PostHog autocapture |
| **Advertising Data** | Usage Data | **No** | **YES** | **Third-Party Advertising** | Ad impressions/interactions via AdMob |
| **Device ID** | Identifiers | **No** | **YES** | **Third-Party Advertising** | IDFA handed to AdMob, never joined to the account |
| **Crash Data** | Diagnostics | **Yes** | No | App Functionality | PostHog exception capture, against an identified person |

**Performance Data is deliberately absent.** Nothing in `PostHogProvider`
enables web-vitals or performance capture, so it is not declared. PostHog can
turn that on as a *project* setting rather than in this code — if it is on,
add Performance Data (Diagnostics, not linked, Analytics) to **both** the
manifest and App Store Connect.

### The three answers that are easy to get wrong

1. **Device ID and Advertising Data are the "used for tracking: Yes" pair, and
   both are *not* linked.** That tracking flag is what puts *"Data Used to
   Track You"* on the listing and what makes the ATT prompt mandatory rather
   than optional. Not-linked is right for both: the IDFA and the ad
   interactions go to AdMob and are never joined to the account. Do not soften
   tracking to No to make the label look better; `NSPrivacyTracking` is true
   in the manifest and the two would contradict each other.

2. **Photos are "Linked to You".** They are uploaded against an account and
   the avatar is stored on the profile. Answering "Not Linked" would be wrong
   and is exactly the contradiction S-1 was about.

3. **Crash Data is "Linked to You".** PostHog captures exceptions against an
   identified person, so the crash carries the account. Not-linked would be
   the comfortable answer and the wrong one.

4. **Nothing is sold.** The policy says so; keep the CCPA answer consistent.

### Also on that screen

- **Privacy Policy URL** — use the per-language URLs above, one per App Store
  localization.
- **Age rating** — 12+ is the floor for a gate that starts at 13 (Apple has no
  13+ tier). Answer the user-generated-content questions honestly; the app has
  player-made quizzes, nicknames and avatars, and moderation (report, block,
  text filter) is what keeps that from forcing 17+.
---

# Final pass — pre-submission audit

**On `main` @ `6d409cc6` · 2026-08-26 · the last audit before Submit for Review.**

Everything below was re-established from scratch on the current tree and the
current *live* deployment, not carried forward from earlier passes. Where a
fact could be executed, it was.

## What was run and verified this pass

```
npx vitest run                    → 113 files, 1199 tests, all passing
npm run typecheck                 → clean (both tsconfigs)
iOS bundle pipeline               → verify-ios-bundle: ok — 98.4 MB, no admin console, no pre-ATT tracking
verify-ios-native                 → still first in build:ios; correctly refuses without GoogleService-Info.plist
live AASA                         → /leaderboards present (exact + wildcard) — the In-App Events deep link works
live web bundle                   → landing "weltweit" fix shipped; per-language policy copy shipped; trial badge strings shipped
live DB (anon key, read-only)     → premium_categories migration APPLIED: exactly the nine, all is_premium
git diff ec78dce..HEAD -- ios/    → only the two audited changes (camera string, privacy manifest)
```

**Survived the parallel-agent churn** (each re-checked in code, not assumed):
every P0-3 guard (`storeUnavailable` + disabled buy on the paywall,
`storeReady` gating on all four shop surfaces, the `PRODUCT_NOT_IN_STORE`
backstop), the derived 3.1.2 disclosure test, the splash floor, the age
gating, and the privacy work.

**Fixed by other agents, verified here:** the `period_friends` footnote bug
(months-based `periodKeyFor` helper); client/server agreement that the annual
plan grants `pro_plus` (pinned by `proOffer.test.ts`); the gem checkout made
drift-safe in both directions (client sends old + new fields, new server
ignores the old ones).

---

## New findings

### F-1 · P1 · The video host does not honour byte-range requests — streamed video may not play on the device at all

**Status: BLOCKING pending a 5-minute device test · Confidence: Verified against production**

The iOS build ships 5 videos and streams the other **185** (263 MB pruned)
from `https://mytrivia.io/videos/…` — the fallback `videoConfig.ts` uses when
`VITE_VIDEO_BASE_URL` is unset, which it is. Probed live, twice:

```
GET /videos/animals.mp4  with  Range: bytes=0-1023
→ HTTP 200 · content-length: 7839349 (the whole file) · no Accept-Ranges · no Content-Range
```

A range-aware server answers `206` with 1,024 bytes. This one ignores the
header. That matters because WKWebView's media playback is AVFoundation-backed,
and AVFoundation opens streams with a `bytes=0-1` probe **expecting a 206** —
the classic failure mode where a video plays in every desktop browser and does
not start on an iPhone. The category-card backgrounds, map videos and avatar
clips are all in the streamed set, so the blast radius is most of the app's
motion.

The probe is trustworthy: the Range header travels inside the TLS tunnel, so
the sandbox proxy cannot have stripped it. `cf-cache-status: MISS` on every
request also means these files are not being edge-cached (Cloudflare serves
ranges on cache HITs), so each play re-downloads the full file even where
playback tolerates the 200.

**Action, in order:**
1. **Device test first (5 min):** open a category card with a video background
   (any category except the three bundled clips) on a real iPhone. If video
   plays, downgrade this to the caching-only concern; if it never starts,
   it is confirmed.
2. Fix candidates, smallest first: add a `Range` handler for `/videos/*` in
   `worker/index.ts` (read from ASSETS, slice, answer 206 with
   `Content-Range`/`Accept-Ranges`); or put `cache-control` on video responses
   so Cloudflare's edge cache takes over range serving on HIT; or move videos
   to R2/a CDN with native range support.

### F-2 · P0 (operational, live **today**) · `main` promises money terms the deployed backend does not honour

**Status: BLOCKING — and urgent independently of the submission · Confidence: Verified live on the client side**

Four server-side files changed on `main` this session and deploy **only
through Lovable**, which has not deployed them:

| File | What the deployed (old) version does wrong |
|---|---|
| `create-pro-checkout` | **Grants no trial.** The live web paywall already shows the "3 days free" badge and a "გამოსცადე 0 ₾-ად" button (verified in the shipped locales chunk) — a buyer who clicks it today is **charged immediately** against a "free" promise. |
| `_shared/iap.ts` | Maps `io.mytrivia.pro.annual` → tier `pro` (1 friend seat). The paywall sells the year as **PRO + 5 friends**. An iOS annual buyer gets one seat until this deploys. |
| `create-gem-checkout` | Charges USD regardless of language (the new one charges the buyer's currency). Drift-safe — the client still sends the old fields — but the prices shown assume the new behaviour. |
| `_shared/pricing.ts` | New shared price table the two functions above read. |

**Action:** merge is done — **ask Lovable to deploy now** (deploy and nothing
else, per `AGENTS.md` §4a): `create-pro-checkout`, `create-gem-checkout`, and
the functions that consume `_shared/iap.ts` (`verify-receipt`,
`revenuecat-webhook`). Until then the web trial promise is live and false.

### F-3 · P2 · Three migrations on `main` with unverified live state

`premium_categories` is **verified applied** (probed via PostgREST). The other
three added since the audit base cannot be verified with the anon key. Paste
into the Lovable SQL editor (read-only):

```sql
-- 20260915 money_functions_not_anon applied?  expect anon_can_execute = false on every row
SELECT p.oid::regprocedure AS fn,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN
  ('claim_daily_reward','claim_leaderboard_reward','credit_gameplay_reward',
   'exchange_currency','grant_vip_days','ensure_admin_lifetime_pro','update_user_currency');

-- 20260913 daily_reward_ladder applied?  expect true
SELECT prosrc LIKE '%double_coins%' AS ladder_version_live
FROM pg_proc WHERE proname = 'claim_daily_reward';
```

(`level17_backfill` is data-only and re-runnable; running it again is the
verification.)

### F-4 · P2 · The trial footnote could state the sequence in one sentence

With the annual plan selected the screen shows: badge "3 days free", button
"Try for 0 ₾", footnote "59.88 ₾ / year, cancel anytime", and the full 3.1.2
disclosure below. Every element 3.1.2 wants is present, but the canonical
phrasing — *"3 days free, then 59.88 ₾/year"* — is assembled by the reader
rather than stated. A `paywall.footnoteTrial` string ("First {days} days
free, then {price} / {period}") would close the gap. Polish, not a rejection.

---

## The ledger — everything still open, ready to action

This table **supersedes the per-pass checklists above**. One row per open
item; nothing merged into `main` is on it. Owner key: **ASC** = App Store
Connect · **Mac** = Xcode/archive machine · **Device** = real iPhone ·
**Lovable** = server deploy · **Code** = a change in this repo.

### P0 — do not press Submit without these

| # | Owner | Action |
|---|---|---|
| 1 | **Lovable** | **Deploy the edge functions** (F-2). The web trial promise is live and false *today*; iOS annual grants 1 seat instead of 5 until this ships. Deploy `create-pro-checkout`, `create-gem-checkout`, `verify-receipt`, `revenuecat-webhook`. |
| 2 | **ASC** | Attach **all seven IAPs** to the version: 3 subscriptions + 4 gem consumables. "Prepare for Submission" ≠ attached. |
| 3 | **Mac** | `GoogleService-Info.plist` in `ios/App/App/` (`build:ios` hard-refuses without it; verify `BUNDLE_ID` = `io.mytrivia.app`). |
| 4 | **Device** | One sandbox purchase grants PRO end-to-end (sheet → `verify-receipt` → entitlement visible), and **Restore returns it after a full reinstall**. |

### P1 — high; a strict reviewer or the first week of users will find these

| # | Owner | Action |
|---|---|---|
| 5 | **Device** | **F-1 video test:** does a streamed category video play on a real iPhone? If not → Code: range support on `/videos/*`. |
| 6 | **ASC** | **Subscription levels, corrected:** Level 1 = Friends PRO Monthly **and** PRO Annual (both `pro_plus`), Level 2 = PRO Monthly. The earlier advice (monthly+annual together) predates the annual becoming `pro_plus`. |
| 7 | **ASC** | Create the **3-day free introductory offer** on `io.mytrivia.pro.annual`. Until it exists, iOS shows no badge (correct, but the offer is the pitch). Must be 3 days — the app now advertises exactly what the store reports. |
| 8 | **ASC** | App Privacy: add **Gameplay Content** (11 types total); set the privacy URL **per localization** to `/privacy-policy/{lang}` (live, verified); age rating **12+** with honest UGC answers. |
| 9 | **Device** | TestFlight build: push arrives (production APNs) with sender avatar; a shared invite link opens the app; avatar selfie opens the **system camera sheet**; paywall shows the storefront's localized prices and the "unavailable" card when the catalogue is empty. |
| 10 | **Legal** | Confirm fal.ai's DPA; add the "not used for training" sentence to the policy only if their terms support it. |

### P2 — survives review; costs money, trust, or compliance later

| # | Owner | Action |
|---|---|---|
| 11 | Code | `plugin.restorePurchases()` is the one store call not wrapped in `withTimeout` — a hung restore spins forever. |
| 12 | Code | PostHog identifies and autocaptures from first frame with no consent step (GDPR, not Apple — EU users). |
| 13 | Code | `NSPhotoLibraryAddUsageDescription` promises a save-to-photos feature that does not exist: build it or drop the key. |
| 14 | Code | F-4: trial-aware footnote ("First {days} days free, then {price}/{period}"). |
| 15 | Code | `capture-store-screenshots.mjs` renders 1242×2208 (retired 5.5" slot) — match ASC's current required size before generating screenshots. |
| 16 | Lovable | F-3: run the two verification queries above; re-run `level17_backfill` (re-runnable). |
| 17 | Code | Bundle: 98.4 MB, with `heic-to` (2.9 MB) shipped for a format the native path never produces, and `dist/app-icon-1024.png` (1.5 MB) inside the binary. |

### P3 — before the second release

| # | Owner | Action |
|---|---|---|
| 18 | Mac | Read the exported IPA's entitlements (`codesign -d --entitlements :- Payload/App.app`): `aps-environment` = `production`, both `applinks:` domains, Sign in with Apple, Communication Notifications. |
| 19 | Code | The NotificationService target has no entitlements file — communication-notification styling silently degrades to plain pushes. |
| 20 | Code | `NotFound.tsx` is hardcoded English. |
| 21 | Code | Three shipped pages still rely on document scrolling (`NotFound`, `RoomRedirect`, `TVLobby` loading state) — one content addition from frozen on device. |
| 22 | Code | `contentInset: 'automatic'` vs the overlaying status bar — first suspect if a notch gap appears. |
| 23 | Code | `index.html` meta/og description and `manifest.json` are Georgian-only — affects shared links, not the binary. |

### P4 / P5 — housekeeping

| # | Owner | Action |
|---|---|---|
| 24 | Code | `window.open(url, "_blank")` for https share links inside the webview — route through `@capacitor/browser`/`Share` like the Messenger branch. |
| 25 | Code | Dead strings (`extra.comingSoon`, `gemsPurchaseSoon`, the four orphaned QR keys, `handleImportContacts`) and the unused `HelpModal` with `#faq` anchors. |
| 26 | Code | AASA `NOT` rules sit after the allow patterns — first-match-wins makes that one wildcard away from wrong. |
| 27 | Code | `useInAppPurchases.ts` (~800 lines, all money, no unit tests of its own); lucky-spin outcome chosen client-side; `PRE_LAUNCH_CHECKLIST.md` still actively misleading; `README.md` still the Lovable template. |

**Bottom line.** The repo itself is submission-ready: 1199 tests green and
every code-side blocker from all four passes is merged. What stands between
this build and the Submit button is **rows 1–4**, plus the two device checks
most likely to surprise (rows 5 and 9). Row 1 is urgent even if the
submission slips — it is live now.

---

# Off-repo checklist

Not answerable from this repository. Confirm each before pressing Submit.
Nothing below is optional — each line is a way the submission fails that no
test in this repo can see.

## Xcode / archive

- [ ] `GoogleService-Info.plist` in `ios/App/App/`, `BUNDLE_ID` = `io.mytrivia.app` (**P0-1**). `npm run build:ios` now refuses to start without it
- [ ] `pod install` run after `cap sync ios`
- [ ] `MARKETING_VERSION` bumped from `1.0` if this is not the first submission; `CURRENT_PROJECT_VERSION` (30) unique per upload
- [ ] Capabilities ticked on the App ID: Push, Sign in with Apple, Associated Domains, **Communication Notifications**
- [ ] **The exported `.ipa` carries production entitlements.** Do not infer this from the entitlements file, which pins `development` on purpose — read the archive:
      `unzip -o App.ipa && codesign -d --entitlements :- Payload/App.app`
      Expect `aps-environment` = `production`, `com.apple.developer.applesignin`, both `applinks:` domains, and `com.apple.developer.usernotifications.communication` (**P3-2**)
- [ ] Product → Archive → Generate Privacy Report reviewed — a third-party SDK updated to a version without its own manifest fails the upload even though nothing in ours changed

## App Store Connect

### In-app purchases

**Every IAP visible in the submitted binary must exist, be correctly
configured, and be attached to this version.** On a first submission they are
reviewed *with* the build; one that is merely "Ready to Submit" and not
attached comes back as *"we were unable to locate the in-app purchase."*

Confirmed present as of this writing — every product the app can sell exists,
all of them at "Prepare for Submission".

**Subscriptions**

| Level | Reference name | Product ID | Duration |
|---|---|---|---|
| 1 | Friends PRO Monthly | `io.mytrivia.proplus.monthly` | 1 month |
| 2 | PRO Monthly | `io.mytrivia.pro.monthly` | 1 month |
| 3 | PRO Annual | `io.mytrivia.pro.annual` | 1 year |

**Consumables** — all four gem packs, ids matching `GEM_PACKS` in
`src/config/gemPacks.ts` and `PRODUCTS` in `supabase/functions/_shared/iap.ts`
exactly (checked):

| Reference name | Product ID |
|---|---|
| 100 gems | `io.mytrivia.gems.100` |
| 500 gems | `io.mytrivia.gems.500` |
| 1500 gems | `io.mytrivia.gems.1500` |
| 5000 gems | `io.mytrivia.gems.5000` |

So the catalogue is complete. What remains is configuration and attachment.

- [ ] **Subscription levels — CORRECTED, the earlier advice here is superseded.**
      This item originally said to put PRO Monthly and PRO Annual on the same
      level. That was right when both granted the `pro` tier and is **wrong
      now**: the pricing rework made the annual plan grant `pro_plus` (five
      friend seats — see `src/config/proPlans.ts` and `_shared/iap.ts`, which
      agree and are pinned by `proOffer.test.ts`). Levels order by service
      level, so the correct arrangement is now:
      **Level 1: Friends PRO Monthly + PRO Annual** (both `pro_plus`) ·
      **Level 2: PRO Monthly** (`pro`). As configured in ASC today (annual at
      level 3, below both monthlies) an annual purchase is a *downgrade* from
      either monthly and defers to period end — still a revenue bug, now with
      the opposite fix from the one first written here
- [ ] **All seven products are attached to this version**, not merely created. "Prepare for Submission" means the product exists and is *not yet submitted* — on a first submission each one has to be selected in the version's In-App Purchases section, or review cannot see it
- [ ] Every product has a **price** set in every storefront you ship to, not just the primary one
- [ ] `io.mytrivia.pro.weekly` is in `IAP_PRODUCTS` but has no product and no paywall row. That is deliberate forward-compat (the comment there says the query asks for it so the row can appear the day it exists), and it costs only a slightly wider StoreKit query — nothing to fix, just do not be surprised by it
- [ ] `io.mytrivia.adfree` is **not** attached — the app no longer sells it (**P1-1**)
- [ ] Each IAP has a review screenshot and review notes
- [ ] **PRO Annual's introductory offer.** The app no longer claims a trial of its own (**P1-2**): it shows trial copy only if StoreKit reports a free introductory offer on the product. So configure a 1-day free trial if you want the "Try 1 day free" line back — and if you do not, nothing in the app lies about it

### Listing

- [ ] App Privacy answers match `PrivacyInfo.xcprivacy` line for line — including Device ID / Third-Party Advertising / **used for tracking: yes**
- [ ] App Privacy answers filled in from the table above — **Device ID and Advertising Data are the "used for tracking: Yes" pair, and both are *not* linked** (**S-1**)
- [ ] Privacy Policy URL set **per App Store localization**, using the `/privacy-policy/:lang` URLs
- [ ] fal.ai's DPA confirmed, and the stronger "not used for training" sentence added to the policy if their terms support it
- [ ] **Age rating matches the now-13+ behaviour** (**P1-4**). Note Apple has
      no 13+ tier — the ladder is 4+, 9+, 12+, 17+ — so **12+ is the floor**
      that is consistent with a gate starting at 13. The questionnaire, the
      age gate and the privacy policy all have to tell the same story; 4+ on
      an app whose own gate starts at 13 is the contradiction a reviewer
      notices. Answer the user-generated-content questions honestly (the app
      has player-made quizzes, nicknames and avatars) — moderation exists
      (report, block, text filter), which is what keeps that answer from
      forcing 17+- [ ] Standard Apple EULA selected, or a custom one supplied, and its link matches the in-app `/terms`
- [ ] Support URL and Privacy Policy URL both resolve
- [ ] **Screenshots at the size App Store Connect currently asks for.**
      `scripts/capture-store-screenshots.mjs` renders at `414×736 @3x` =
      **1242×2208**, which is the old 5.5" slot — ASC has since moved the
      required iPhone size up, so check what its media manager demands before
      generating and change `DEVICE` in that script to match. Portrait,
      iPhone only, and of this build

### Review notes

Write them so a reviewer never has to guess. Cover, explicitly:

- [ ] **Guest mode** — the app is fully playable without an account, so no demo account is needed. Say this outright; otherwise they may assume a login wall and ask for credentials
- [ ] **How to reach the paywall** — name the taps (Discover → the PRO card; or play until the free games run out)
- [ ] **How to reach Restore Purchases** — Settings → Restore Purchases. Reviewers look for this before almost anything else
- [ ] **How to test multiplayer** — a second device is not available to them, so say what a single reviewer can see: create a room, the invite/share flow, and what the TV/host screens do
- [ ] Anything about the app that reads oddly without context (the Georgian-first content, the ATT pre-prompt appearing before an ad rather than at launch)

## On device, before archiving

Sandbox behaviour differs from the simulator; do these on real hardware.

- [ ] **A sandbox purchase completes and grants PRO** — payment sheet, then the entitlement actually appears in the app (it is granted server-side by `verify-receipt`, so this tests the whole chain, not just StoreKit)
- [ ] **Restore works after a reinstall.** Delete the app, reinstall, sign in, Settings → Restore Purchases, and confirm PRO comes back. This is the flow a reviewer runs and the one a real user needs
- [ ] **Prices are the storefront's, and localized** — StoreKit's own strings, never a `$` figure on a non-US storefront (**P0-3**). With no catalogue the paywall must show the "plans unavailable" card and a disabled button; the shop surfaces must show `—` and refuse to sell
- [ ] The auto-renewal disclosure is visible under the buy button on the paywall **and** on the out-of-plays modal (**P0-2**)
- [ ] **The avatar camera opens the system camera sheet and returns a photo** (**P1-3**). This is the path that changed — it is no longer an in-webview `<video>`
- [ ] **Push works on a distribution build**, not just a debug one. TestFlight is the honest test: development APNs and production APNs are different endpoints, and a token from the wrong one silently never delivers. Confirm the sender's avatar renders (communication notifications) and the badge clears on foreground
- [ ] **A universal link opens the app, not Safari.** Send yourself an invite link and tap it from Messages. Fresh installs need a moment for the AASA to be fetched, so test after the app has been launched once
- [ ] Airplane mode: no screen spins forever
