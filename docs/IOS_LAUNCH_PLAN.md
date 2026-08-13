# MyTrivia iOS — Audit & Launch Plan

Target: a native iOS app on TestFlight, then submitted for App Store review.

Audited at commit `54ffa71` on 2026-08-13. Everything in the Audit section
below was verified against the code in this repo, not assumed.

> **Status — P0, P1, P2 and most of P3 done.** The remaining work is either
> account paperwork or needs a device or an ffmpeg machine. See
> [`ACTION_ITEMS.md`](../ACTION_ITEMS.md) for what is on you, and "Status" at
> the end for what has landed.
>
> Executing the plan surfaced **eleven findings the read-only audit missed** —
> S1-6 through S1-9, S2-6 through S2-10, S3-7 and S3-8. All are fixed. The
> pattern worth noticing: four of them were complete backends with no client
> (push tokens, reporting, blocking), and three were web APIs that silently do
> nothing on iOS.

---

## Part 1 — Audit

### 1.1 What actually exists

| Area | State |
|---|---|
| App shell | React 18 + Vite 5 + Tailwind, `react-router` v6, ~400 source files |
| Native wrapper | **Capacitor 8**, configured but *never generated* — there is no `ios/` directory |
| Backend | Supabase: 70 edge functions, 230 migrations |
| IAP | RevenueCat Capacitor plugin wired in `useInAppPurchases.ts` |
| Ads | AdMob community plugin in `adService.ts` (rewarded + interstitial) |
| Auth | Supabase, with native Apple Sign-In via `@capacitor-community/apple-sign-in` |
| Legal | `/privacy-policy`, `/terms`, `/support`, `/delete-account` routes all exist |
| Build health | `npm run typecheck` passes; `npm run build` succeeds |

The repo is in better shape than the missing `ios/` folder suggests — the
web app is mature, the native plugin layer is already written, and the
compliance pages exist. The work is not "build an iOS app from scratch."
It is "generate the native project, close a set of real defects, and get
through review."

### 1.2 Stale document warning

`docs/MOBILE_MASTERPLAN.md` specifies **React Native + Expo in a monorepo**,
with a 4–6 month timeline. The codebase went a different way: **Capacitor,
in-place, no monorepo**. Every dependency, hook, and service confirms this.

That masterplan should be treated as superseded for iOS. Following it would
mean discarding working RevenueCat/AdMob/Apple-Sign-In integrations and
starting a rewrite. This plan replaces it.

### 1.3 Findings

Severity: **S1** = blocks submission or is a live security/revenue hole.
**S2** = will likely draw a rejection or a bad first review.
**S3** = quality gap that a "very high level" release shouldn't ship with.

---

#### S1-1 — `verify-receipt` verifies nothing. Any signed-in user can grant themselves VIP.

`supabase/functions/verify-receipt/index.ts`

The function accepts `{ receiptData, productId, userId }` from the request
body and writes a VIP subscription row. It never contacts Apple's
`verifyReceipt`/App Store Server API, never calls the RevenueCat API, and
never checks that a transaction exists. `receiptData` is stored verbatim
into `apple_original_transaction_id` — an arbitrary client-supplied string.

Worse, `userId` is taken from the body rather than from the verified JWT.
`verify_jwt = true` is set (config.toml:162), so the caller must be logged
in — but *any* logged-in user can call it with:

```
{ "receiptData": "anything", "productId": "io.mytrivia.vip.annual", "userId": "<any uuid>" }
```

…and receive 365 days of VIP, for themselves or for anyone else. There is
no refund/expiry revocation path either: a cancelled or refunded
subscription stays active until the fabricated `expires_at` passes.

This is simultaneously a revenue leak, a data-integrity hole (one user can
write to another user's subscription row), and — because entitlement state
is unverifiable — a plausible App Store review question.

#### S1-2 — Gem purchases route to Stripe web checkout on iOS. Guideline 3.1.1 rejection.

`src/hooks/useGemPurchase.ts`

Unlike `useProPurchase.ts` (which correctly branches on
`Capacitor.isNativePlatform()` and uses RevenueCat), the gem hook has **no
native branch at all**. It calls `create-gem-checkout` and then:

```ts
window.location.href = data.url;   // → Stripe Checkout
```

Gems are in-app currency — digital goods consumed inside the app. Sending
an iOS user to an external web payment page for them violates **App Store
Review Guideline 3.1.1 (In-App Purchase)**. This is one of the most
reliably-caught rejection reasons there is.

Reachable from two places in the shipping UI:
`src/components/home/NotEnoughGemsModal.tsx:41` and
`src/pages/PowerUps.tsx:75`.

Compounding it: `IAP_PRODUCTS` in `useInAppPurchases.ts` defines only
`VIP_MONTHLY`, `VIP_ANNUAL`, `AD_FREE`. **There are no gem consumable
SKUs at all** — so there is currently nothing to switch the iOS path over
to. The products have to be created before the code can be fixed.

#### S1-3 — No `ios/` project exists, and the deployment target is set to a version Capacitor 8 rejects.

`capacitor.config.ts` declares `ios: { minVersion: '14.0' }`. But the
installed `@capacitor/ios@8.0.0` podspec requires:

```
s.ios.deployment_target = '15.0'
```

`pod install` will fail on this mismatch. It has never surfaced because
`npx cap add ios` has never been run.

#### S1-4 — No Privacy Manifest (`PrivacyInfo.xcprivacy`).

Apple has required privacy manifests since May 2024 for apps that use
required-reason APIs or embed SDKs on Apple's designated list. This app
will embed **Google Mobile Ads (AdMob), RevenueCat, and Firebase/FCM** —
all three are on that list. App Store Connect rejects uploads that are
missing the manifest or the SDKs' signatures.

Nothing exists yet because there is no native project, but this must be
authored deliberately — it is not generated for you.

#### S1-5 — `app-icon-1024.png` is a JPEG with a `.png` extension.

```
public/app-icon-1024.png: JPEG image data, JFIF standard 1.01, 1024x1024
```

The intended App Store marketing icon is the wrong format. The Xcode asset
catalog and App Store Connect both require a true PNG, 1024×1024, **no
alpha channel, no transparency, no rounded corners**. `apple-touch-icon.png`
is a genuine 1024×1024 RGB PNG and is the better starting point.

#### S1-6 — RLS let any user write their own subscription row. **(Fixed in P0.1)**

`supabase/migrations/20260101115003_*.sql`

`vip_subscriptions` carried these two policies:

```sql
CREATE POLICY "Users can insert their own VIP subscription"
  ON public.vip_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own VIP subscription"
  ON public.vip_subscriptions FOR UPDATE USING (auth.uid() = user_id);
```

So PRO did not require going near `verify-receipt` at all. From the browser
console of any signed-in session:

```js
supabase.from('vip_subscriptions')
  .insert({ user_id: <me>, vip_tier: 'pro_plus', expires_at: '2099-01-01' })
```

Found while wiring the real verification path — the audit read the edge
function but not the table's policies. Both policies are dropped; the two
client writes that depended on them (`activateVip`, the admin lifetime
self-grant) now go through `SECURITY DEFINER` functions.

#### S1-7 — `update_user_currency` grants unlimited currency. **(Fixed — bounded, see below)**

`supabase/migrations/20260110002224_*.sql`

The RPC is `SECURITY DEFINER`, granted to `authenticated`, takes `p_user_id`
as a parameter, and never checked who was calling:

```js
supabase.rpc('update_user_currency', { p_user_id: <anyone>, p_gems_delta: 999999 })
```

Cross-user tampering — draining a rival's balance or topping up a friend's
— is blocked: the function rejects a target that isn't the caller.

Self-crediting mattered more, because gems buy PRO days through the shop, so
minting gems reached a free subscription one step further round than the
routes S1-1 and S1-6 closed.

**The shape of the fix.** Clients may still *spend* freely — a debit can only
hurt the person making it — but a positive delta from a signed-in caller is
now refused outright. Every credit goes through a function that either
decides the amount itself or bounds it:

| Function | Owns |
|---|---|
| `claim_daily_reward` | Which day of the streak, what it pays, the PRO Plus bonus, the once-per-day guard |
| `claim_leaderboard_reward` | Reads the payout off the row being claimed; credit, frame and badge in one transaction |
| `exchange_currency` | The 500:1 rate, and both sides of the trade atomically |
| `credit_gameplay_reward` | Per-award and per-day ceilings per reward kind, plus the ledger row |

The first three are fully authoritative. The fourth is the honest
compromise: quiz payouts, level-ups, spins, chests, missions, stake wins and
shop grants still arrive from the client, because the server does not replay
the game that produced them. They are checked against `currency_grant_limits`
and written to `currency_grants`.

That turns "unlimited, instant, invisible" into "at most the daily cap for
one category, and every unit of it on the record". **The remaining step is
server-side scoring** — until the server can derive a quiz payout itself,
those kinds are bounded rather than verified. The caps are set well above
legitimate play, so anything hitting them is a bug or abuse, and the ledger
is what makes the difference visible.

Three things were fixed on the way past. The exchange rate was
client-supplied on *both* sides, so one gem could have bought any number of
coins. The daily-reward payout was read from a table in the client bundle —
which had drifted to entirely different numbers from `REWARDS.DAILY_REWARDS`
in `rewardConfig.ts`, the config a test asserts on and nothing grants from.
And the leaderboard claim relayed the server's own payout figure back to it
across four round trips, with a hand-written rollback for the case where the
claim stuck but the credit failed.

#### S1-8 — "Delete account" deleted a profile row, not an account. **(Fixed in P2.6)**

`src/pages/SettingsPrivacy.tsx`

Settings → Privacy → Delete account ran:

```ts
await supabase.from("profiles").delete().eq("user_id", user.id);
await signOut();
```

That is not a deletion. **The auth user survived — you could sign straight
back in** — and roughly twenty-five related tables kept every row: game
plays, friendships, chat messages, push tokens, subscriptions, purchase
history.

`delete-user-account`, the edge function that genuinely removes all of it,
existed and was correct. It was only reachable from `/delete-account`, a
route nothing in the app linked to. So the working implementation was
unreachable and the reachable one didn't work.

The audit checked that the route and the function existed and marked P2.6 as
mostly done. It didn't read the handler the Settings button actually calls.
Guideline 5.1.1(v) is specific about this, and it's the flow a reviewer
clicks.

#### S2-1 — Third-party tracking fires before ATT authorization.

`index.html` loads the **Meta Pixel** (`fbevents.js`) unconditionally in
`<head>` and immediately calls `fbq('track', 'PageView')`. PostHog also
initialises from the app bootstrap. Inside the iOS binary, both run before
the ATT prompt is ever shown.

Separately, `adService.initialize()` is called from a bare `useEffect` in
`useAds.ts:34`, which triggers `trackingService.requestAuthorization()` —
so the system ATT dialog appears **the moment any screen mounting `useAds`
loads**, with no explaining pre-prompt. Apple's own guidance, and every
piece of field data, says a cold ATT prompt with no context gets denied
and irritates reviewers.

The Meta Pixel in particular has no business being in the native build.

#### S2-2 — Interstitial ads are wired to Google's *test* ad unit IDs.

`src/services/adService.ts:18-21`

```ts
// TODO(owner): replace these Google TEST interstitial IDs with real per-platform unit IDs.
android: 'ca-app-pub-3940256099942544/1033173712',
ios:     'ca-app-pub-3940256099942544/4411468910',
```

These are Google's public demo units. Shipped as-is, interstitials earn
zero revenue. The rewarded unit is a real ID but the *same* ID is reused
for iOS and Android (line 13 flags this as unresolved), which corrupts
per-platform reporting and eCPM optimisation.

#### S2-3 — Push notifications: server is built, client never registers.

`@capacitor/push-notifications` is a dependency. `send-push-notification`
is a complete FCM v1 sender with an `apns` payload block, reading device
tokens from a `push_tokens` table that exists in migrations.

But there is **no client-side registration anywhere**. No
`usePushNotifications.ts` (referenced in `src/data/documentation/` but the
file does not exist), no `PushNotifications.register()`, no `registration`
listener, no code that ever writes a row to `push_tokens`. The table will
be empty forever, so every send is a no-op.

Also note: iOS push through FCM requires an **APNs authentication key
(.p8)** uploaded to Firebase, plus the Push Notifications capability and
an APNs entitlement on the App ID. None of that exists yet.

#### S2-4 — Bundle is ~394 MB, of which 276 MB is video, and it all ships inside the IPA.

```
dist        394M
├─ videos   276M   (184 files)
├─ assets   103M
└─ avatars  7.4M
```

Capacitor copies `webDir` (`dist`) wholesale into the app bundle. Videos
are referenced by root-relative path (`/videos/art.mp4` etc. in
`src/config/videoConfig.ts`) with no CDN fallback.

App Store hard limits are not the problem (4 GB uncompressed). The problem
is the **cellular download threshold** — above it, iOS warns the user and
may require Wi-Fi. A ~400 MB trivia app is a serious install-conversion
tax and a poor first impression.

The existing mitigation doesn't help here: `public/sw.js` caches videos via
a Service Worker, but Service Workers are unreliable-to-unavailable under
Capacitor's `capacitor://localhost` scheme on iOS. On device, the caching
layer is effectively dead code and the videos are simply bundled.

#### S2-5 — The admin console is compiled into the shipping bundle.

`src/App.tsx:34` — `const INCLUDE_ADMIN = import.meta.env.VITE_INCLUDE_ADMIN !== 'false'`

The default is **on**. The build output confirms it: `Dashboard` (225 kB),
`IconAssignment` (80 kB), `Import` (88 kB), `QuestionStudio` (68 kB),
`ContentManager`, `AdventureMapAdmin`, and more are all emitted. Unless
`VITE_INCLUDE_ADMIN=false` is explicitly set for the iOS build, the App
Store binary contains a full content-management console.

Two costs: needless size, and reviewer risk — App Review reacts badly to
hidden or non-functional surfaces inside a consumer app.

#### S2-6 — The `infoPlist` block in `capacitor.config.ts` was never applied. **(Fixed in P0.4)**

`capacitor.config.ts`

The config declared a portrait lock and four permission usage strings —
camera, photo library, photo library add, and ATT. Generating the project
and running `cap sync` showed none of them reaching `ios/App/App/Info.plist`:
the plist still carried the template's landscape orientations and had zero
usage descriptions.

This mattered more than it looks. iOS **terminates the app** the instant it
touches the camera without `NSCameraUsageDescription` — so the avatar
capture flow would have crashed on first use, and the orientation lock the
team believed was in place wasn't. The block had been sitting in the repo
providing false assurance.

Usage strings and orientation now live in `Info.plist`, which is the file
iOS actually reads, and the inert config block is gone.

#### S2-7 — Capacitor 8 defaults to SPM, which silently drops RevenueCat. **(Fixed in P0.4)**

`npx cap add ios` emitted a warning that is easy to scroll past:

```
[warn] @revenuecat/purchases-capacitor does not have a Package.swift
[warn] Some installed packages are not compatable with SPM
```

…and then generated a `Package.swift` listing five plugins. RevenueCat was
not among them. The JS import would still resolve, so the failure would only
appear at runtime, on device, as every purchase call failing against a
native plugin that was never linked into the binary.

The project is generated with `--packagemanager Cocoapods` instead, where
the plugin's `.podspec` is picked up and all six plugins resolve.

#### S2-8 — The generated app icon was Capacitor's placeholder. **(Fixed in P2.5)**

`ios/App/App/Assets.xcassets/AppIcon.appiconset/`

`cap add ios` writes its own default icon into the asset catalog, and it
stays there until someone replaces it. Nothing in the generation output says
so. Combined with S1-5 — the marketing icon being a JPEG — the app had no
correct icon anywhere: the one in the binary was Capacitor's, and the one
intended for App Store Connect was the wrong format.

Both are now the real 1024×1024 brand PNG, RGB, no alpha, sourced from
`apple-touch-icon.png` which was the only correct copy in the repo.

#### S3-7 — `npm run typecheck` was checking nothing. **(Fixed)**

`tsconfig.json` / `package.json`

The root `tsconfig.json` carries `"files": []` and two project references.
`tsc --noEmit` against it resolves to an empty program and exits 0 —
unconditionally, regardless of the state of the code. The script had been
reporting success without compiling a single file, including on every run
earlier in this branch.

Found by accident: a change that added a required argument to six exported
functions still "passed". Pointed at the app and node projects, the first
real run produced 23 errors, all of them that change's own call sites — which
is how all nineteen were located.

Worth assuming any pre-existing type error in the codebase has never been
seen. The tree is clean now, but it was never actually checked before.

#### S3-1 — Missing native lifecycle plugins.

Not in `package.json`: `@capacitor/splash-screen`, `@capacitor/status-bar`,
`@capacitor/app`, `@capacitor/keyboard`, `@capacitor/preferences`,
`@capacitor/network`.

Consequences: no controlled launch screen (white flash into the webview),
no status-bar style control, **no handling of `appUrlOpen`** (so universal
links and OAuth deep-link returns won't route), no keyboard-inset handling
on text entry, and auth/session state stuck in `localStorage`, which iOS
can evict under storage pressure.

#### S3-2 — Safe-area coverage is partial.

`env(safe-area-inset-*)` appears in roughly 20 components — quiz screens,
multiplayer, several modals. It is applied ad hoc per component rather than
through a shared layout primitive. On a notched/Dynamic-Island device, any
screen that was missed will collide with the status bar or home indicator.
This needs a device sweep, not a code audit.

#### S3-3 — Platform detection is done by sniffing a global.

`adService.ts:109` and `trackingService.ts:21` both use:

```ts
typeof (window as any).Capacitor !== 'undefined'
```

Capacitor injects that global in web contexts too. The correct check —
used properly elsewhere in `useInAppPurchases.ts` and `useCamera.ts` — is
`Capacitor.isNativePlatform()`. Today it degrades gracefully via a
try/catch, so it isn't causing a visible bug, but it's a false signal in
the two services that decide whether to run ads and request tracking.

#### S3-4 — `.env` is committed to the repository.

`git ls-files` shows `.env` tracked, and `.gitignore` does not exclude it.
It currently holds only the Supabase URL, project ID, and *publishable*
(anon) key — all designed to be public, so this is **not** a live secret
leak. It is still a bad pattern: the file is now the obvious place for
someone to add `VITE_REVENUECAT_IOS_API_KEY` and commit it.

#### S3-5 — RevenueCat log level is pinned to DEBUG in all builds.

`useInAppPurchases.ts:79` — `setLogLevel({ level: LOG_LEVEL?.DEBUG })`,
unconditionally. Purchase internals will be written to the device console
in production.

#### S3-6 — RevenueCat API keys fall back to placeholder strings.

`useInAppPurchases.ts:75-76` defaults to `"appl_CONFIGURE_IN_ENV"` when
`VITE_REVENUECAT_IOS_API_KEY` is unset. `configure()` will be called with
a bogus key and the failure surfaces only as a console warning — products
silently come back empty and the paywall renders with nothing to buy. This
should fail loudly at build time instead.

---

## Part 2 — The plan

Six priority bands. **P0–P2 are mandatory before a TestFlight build is
worth sending to anyone.** P3–P4 are what make it a high-quality release
rather than a wrapped website. P5 is the submission itself.

Bands are ordered by dependency, and P0's account work should start on day
one because it has external lead time.

---

### P0 — Stop the bleeding, and start the clock on accounts

*Nothing else matters if the entitlement system can be bypassed or the
build can't be signed.*

**P0.1 — Rewrite `verify-receipt` into real server-side verification.** *(S1-1)*
- Derive `userId` **from the verified JWT**, never from the request body.
- Replace the fake grant with one of:
  - **Preferred:** drop client-driven verification entirely and make
    **RevenueCat webhooks** the only writer of entitlement state. Add a
    `revenuecat-webhook` edge function (`verify_jwt = false`, authenticated
    by the RevenueCat `Authorization` header secret) that handles
    `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`,
    `BILLING_ISSUE`, `PRODUCT_CHANGE`, and `REFUND`. This is the only
    design that correctly handles renewals and revocations.
  - Or, if keeping the client call: validate against the **App Store Server
    API** (`/inApps/v1/subscriptions/{transactionId}`) with a signed JWT,
    and reject anything that doesn't verify.
- Enforce uniqueness on `apple_original_transaction_id` so one transaction
  cannot be replayed across accounts.
- Add an RLS-level guarantee that `vip_subscriptions` is service-role
  write-only.
- Write a test that a forged call is rejected.

**P0.2 — Create gem consumable products and remove the iOS Stripe path.** *(S1-2)*
- Define the gem SKUs (suggest 4 tiers, e.g. `io.mytrivia.gems.{small,medium,large,mega}`)
  in App Store Connect as **Consumables**, and mirror them in RevenueCat.
- Extend `IAP_PRODUCTS` and add a `TIER_TO_NATIVE_PRODUCT`-style map for gems.
- Branch `useGemPurchase` on `Capacitor.isNativePlatform()` exactly the way
  `useProPurchase` already does.
- Grant gems server-side off the verified purchase (same webhook as P0.1) —
  never client-side.
- Audit for any other outbound payment link: on iOS there must be **no**
  link, button, or copy pointing at web checkout.

**P0.3 — Fix the deployment target.** *(S1-3)*
- Set `minVersion: '15.0'` in `capacitor.config.ts` (Capacitor 8's floor).
  Consider 16.0 — it drops <2% of active devices and simplifies the
  WebView baseline.

**P0.4 — Generate and commit the native project.**
- `npm run build && npx cap add ios && npx cap sync ios`
- Commit `ios/` (Capacitor's convention — the project is a build input,
  not an artifact). Add `ios/App/Pods/` and `ios/App/build/` to `.gitignore`.
- Verify `pod install` completes and the app launches in Simulator.

**P0.5 — Start the external-lead-time items now, in parallel.**
- Apple Developer Program enrollment (D-U-N-S required for an
  organisation account; this alone can take 1–2 weeks).
- Register App ID `io.mytrivia.app` with capabilities: **In-App Purchase,
  Push Notifications, Sign in with Apple, Associated Domains**.
- Create the App Store Connect app record; reserve the name "MyTrivia".
- RevenueCat project + iOS app config; generate the iOS API key.
- AdMob: register the iOS app, create **dedicated iOS** rewarded and
  interstitial units.
- Firebase project + **APNs .p8 auth key** uploaded (needed for P2.3).
- Sentry (or equivalent) project for iOS crash reporting.
- Apple's paid-apps agreement and banking/tax forms — **IAP will not
  return products until this is complete**, and it blocks all purchase
  testing.

**Exit criteria:** forged entitlement calls are rejected; no external
payment path on iOS; `ios/` builds and runs in Simulator; all accounts
filed.

---

### P1 — Make it a real native app, not a hosted webview

**P1.1 — Add the missing lifecycle plugins.** *(S3-1)*
- `@capacitor/splash-screen`, `@capacitor/status-bar`, `@capacitor/app`,
  `@capacitor/keyboard`, `@capacitor/preferences`, `@capacitor/network`.

**P1.2 — Launch experience.**
- Author a proper storyboard launch screen matching the app's first paint
  (brand wash, centred mark) so there is no white flash.
- Hide the splash programmatically once React has mounted and the first
  route is painted — not on a fixed timer.
- Set the status-bar style to match the `#f8e6ff` page wash.

**P1.3 — Move session storage off `localStorage`.**
- Give the Supabase client a `@capacitor/preferences`-backed storage
  adapter on native. `localStorage` in a WKWebView is evictable; users
  being silently logged out is one of the most common Capacitor
  complaints.

**P1.4 — Deep links and universal links.**
- Handle `appUrlOpen` via `@capacitor/app` and route it into the router.
- Configure Associated Domains for `mytrivia.io` and publish
  `.well-known/apple-app-site-association` (unsigned JSON,
  `application/json`, no redirect).
- Verify: challenge invites (`/challenge/*`), referral links, and the OAuth
  return leg all resolve inside the app rather than bouncing to Safari.

**P1.5 — Fix the safe-area story properly.** *(S3-2)*
- Introduce a shared `SafeAreaLayout` / CSS-variable approach rather than
  per-component `env()` calls, then sweep every route on a Dynamic Island
  device and an iPhone SE.

**P1.6 — Correct platform detection.** *(S3-3)*
- Replace both `window.Capacitor` sniffs with `Capacitor.isNativePlatform()`.

**P1.7 — Exclude the admin console from the iOS build.** *(S2-5)*
- Set `VITE_INCLUDE_ADMIN=false` in the iOS build command and assert it in
  CI so it can't regress.

**Exit criteria:** app launches cleanly with no flash, survives being
backgrounded for a day without logging out, and every deep link opens
in-app.

---

### P2 — Store compliance

*This band is what App Review actually inspects. Treat it literally.*

**P2.1 — Author `PrivacyInfo.xcprivacy`.** *(S1-4)*
- Declare data types collected: account/identity, purchase history, product
  interaction, device identifiers (via AdMob), crash and performance data.
- Declare required-reason API usage: `UserDefaults` (CA92.1) and file
  timestamp APIs, which Capacitor and its plugins use.
- Confirm AdMob, RevenueCat, and Firebase ship their own signed manifests
  at the versions you pin.
- Verify by generating the privacy report in Xcode (Product → Archive →
  Generate Privacy Report) before the first upload.

**P2.2 — Fix the tracking and ATT sequencing.** *(S2-1)*
- **Remove the Meta Pixel from the native build.** It has no place in the
  iOS binary; keep it on web only.
- Move ATT out of `adService.initialize()`. Show a branded pre-prompt
  explaining the benefit, then request ATT — and only after the user has
  seen real app content (post-onboarding, not on first paint).
- Gate PostHog's identified/autocapture behaviour on ATT status, and make
  sure nothing identifying is sent before authorization.
- Configure AdMob for non-personalized ads when ATT is denied (`npa: '1'`)
  — the child/teen path already does this; extend it to the denied case.

**P2.3 — Ship working push notifications.** *(S2-3)*
- Write `usePushNotifications.ts`: request permission at a *contextual*
  moment (not on launch), `register()`, listen for `registration`, and
  upsert the token into `push_tokens` with `platform: 'ios'`.
- Handle `pushNotificationActionPerformed` → deep link to the right screen.
- Upload the APNs .p8 to Firebase; enable the Push capability in Xcode.
- End-to-end test: real device, app killed, notification delivered, tap
  opens the correct route.

**P2.4 — Real ad unit IDs.** *(S2-2)*
- Replace the two Google test interstitial IDs with the real iOS units.
- Give iOS its own rewarded unit.
- Add `GADApplicationIdentifier` and `SKAdNetworkItems` to `Info.plist`.
- Serve `app-ads.txt` from `mytrivia.io`.

**P2.5 — Correct app icon.** *(S1-5)*
- Produce a true 1024×1024 PNG, **no alpha**, from the `apple-touch-icon.png`
  source; generate the full asset catalog. Add dark and tinted variants
  (iOS 18) while you're there.

**P2.6 — Account deletion, discoverable in-app.**
- `/delete-account` and the `delete-user-account` function already exist —
  confirm the entry point is reachable from Settings in **at most two taps**
  and that deletion actually removes data. Apple checks this specifically.

**P2.7 — App Privacy nutrition labels** in App Store Connect, matching
`PrivacyInfo.xcprivacy` exactly. Mismatches get flagged.

**P2.8 — Age rating.** Answer the questionnaire honestly: the app has ads,
user-generated quiz content, and social features. Expect 12+. If UGC is
user-visible, Apple requires a content-reporting/blocking mechanism
(Guideline 1.2) — confirm one exists or build it.

**Exit criteria:** a build uploads to App Store Connect without a single
privacy or entitlement warning.

---

### P3 — Size, performance, and native feel

**P3.1 — Get the bundle under control.** *(S2-4)*
- Move `public/videos` (276 MB) to CDN/Supabase Storage and stream it.
  Keep a small on-device set — the 5–8 clips needed for first-run and the
  most-played categories — and lazily fetch the rest with a native cache
  (`@capacitor/filesystem`), since the Service Worker won't help on iOS.
- Re-encode what stays: H.264/HEVC MP4 at mobile bitrate; the existing
  `scripts/convert-videos-webm.sh` shows the pipeline is already understood.
- Lazy-load `heic2any` (1.35 MB) and `heic-to` (3.0 MB) — these fire only
  on HEIC upload but are currently emitted as top-level chunks.
- Drop `WorldMapCanvas` (909 kB of Three.js) from the initial graph if the
  3D map isn't in the v1 iOS scope.
- **Target: IPA under 150 MB.** From ~394 MB that's aggressive but very
  achievable — the videos alone get you most of the way.

**P3.2 — Performance budget.**
- Cold start to interactive under 2s on an iPhone SE (2nd gen).
- 60fps on quiz transitions; profile the GSAP/framer-motion work in the
  WebView specifically — it behaves differently from mobile Safari.
- Memory ceiling check: WKWebView gets jetsammed harder than Safari.

**P3.3 — Native interaction polish.**
- Map `@capacitor/haptics` to game events: correct, wrong, streak, reward,
  level-up. This is the single cheapest thing that makes a Capacitor app
  feel native.
- Disable webview overscroll/bounce and long-press text selection where
  they read as "this is a website".
- Keyboard inset handling on every text input.

**P3.4 — Offline and error states.**
- `@capacitor/network` → a real offline banner (`OfflineBanner` exists).
- Persist react-query to storage so a cold launch on a bad connection
  shows cached content rather than skeletons.
- Verify every native failure path degrades: ad fails to load, IAP
  unavailable, push denied, camera denied.

**P3.5 — Accessibility.**
- VoiceOver pass over the quiz loop (timer announcements, answer buttons,
  results).
- Dynamic Type: verify Georgian and English text at the largest accessible
  sizes without clipping.
- Touch targets ≥ 44pt.
- Respect Reduce Motion for the GSAP/Spline animations.

**P3.6 — Housekeeping.** *(S3-3 through S3-6)*
- RevenueCat log level DEBUG only in dev builds.
- Fail the build if `VITE_REVENUECAT_IOS_API_KEY` is unset, instead of
  falling back to a placeholder.
- Remove `.env` from git, add it to `.gitignore`, document the required
  vars in `.env.example`.

---

### P4 — Release engineering

**P4.1 — Signing and identifiers.**
- App Store distribution certificate + provisioning profile.
- Prefer Xcode Cloud or Fastlane Match for team-shareable signing.

**P4.2 — Build pipeline.**
- CI job: `typecheck` → `test` → `build` (with `VITE_INCLUDE_ADMIN=false`)
  → `cap sync ios` → archive → upload to TestFlight.
- Bake in a version/build-number bump so uploads never collide.
- Xcode Cloud is the lowest-friction option here given there's no existing
  Fastlane setup.

**P4.3 — Crash and analytics.**
- Sentry with iOS release tracking and source maps for the web layer —
  without source maps, WebView stack traces are unreadable.
- Confirm the PostHog event taxonomy carries a `platform: 'ios'` dimension
  so mobile can be separated from web.

**P4.4 — Test the money paths for real.**
- StoreKit sandbox: purchase VIP monthly, annual, each gem tier.
- **Restore purchases** — Apple explicitly tests this and rejects for it.
- Subscription upgrade/downgrade/cancel, and the grace/billing-retry state.
- Confirm the RevenueCat webhook writes the same state the web Stripe path
  writes, so entitlements agree across platforms.
- Refund revocation actually removes VIP.

**P4.5 — Device matrix.** iPhone SE (smallest supported), a current
Dynamic Island iPhone, and an iPad (even if iPad isn't a target, the app
runs in compatibility mode and reviewers do open it).

---

### P5 — TestFlight, then submission

**P5.1 — Internal TestFlight.** Upload, verify the build processes without
an ITMS email, smoke-test on real hardware.

**P5.2 — External TestFlight beta.**
- 20+ testers, minimum two weeks.
- External TestFlight requires its own (lighter) Beta App Review — budget
  a day or two.
- Gate progression on: **crash-free sessions ≥ 99.5%**, no P0 bugs open,
  purchase funnel completing on real devices.

**P5.3 — Store listing.**
- Localized (ka + en) name, subtitle, keywords, description.
- Screenshots for 6.9" and 6.5" displays (Apple's current required set),
  localized per language.
- App preview video (15–30s) — optional but a meaningful conversion lever.
- Support URL and marketing URL → the existing `/support` route.

**P5.4 — Review prep.** This is where most first submissions die.
- **Demo account** with a pre-seeded profile, VIP already active, and
  friends/rooms populated — a reviewer who can't get past an empty state
  rejects.
- Review notes explaining: how trivia content is sourced and moderated, how
  multiplayer/TV mode works (reviewers routinely can't figure out
  join-by-code without instructions), and what each IAP grants.
- Export compliance: standard HTTPS-only exemption
  (`ITSAppUsesNonExemptEncryption = false`).
- Confirm every `Info.plist` usage string is specific — the current camera
  string "Take your profile photo" is fine; the ATT string
  ("This identifier will be used to deliver personalized ads to you.")
  should be rewritten to state the user benefit.

**P5.5 — Submit with phased release.** 7-day phased rollout, monitoring
crash-free rate and RevenueCat purchase success at each step. Have a
hotfix branch ready.

---

## Effort estimate

| Band | Scope | Estimate |
|---|---|---|
| P0 | Security rewrite, IAP products, native project | 1–1.5 weeks (+ account lead time in parallel) |
| P1 | Native shell, deep links, safe areas | 1–1.5 weeks |
| P2 | Privacy manifest, ATT, push, ads, icons | 1–1.5 weeks |
| P3 | Bundle diet, performance, a11y, polish | 1.5–2 weeks |
| P4 | Signing, CI, purchase testing, devices | ~1 week |
| P5 | Beta (2 weeks fixed) + listing + review | 3–4 weeks |

**Realistic path to "submitted for review": 8–11 weeks**, with the two-week
external beta and Apple's review queue as the incompressible parts. P0's
account enrollment must start immediately or it becomes the critical path.

---

## The three things most likely to go wrong

1. **The entitlement rewrite (P0.1) is not a patch — it's a redesign.**
   Getting RevenueCat webhooks to agree with the existing Stripe-written
   subscription state, across two platforms, is the single hardest piece of
   work in this plan. Start it first.

2. **Guideline 3.1.1 (P0.2) is a hard gate with a product dependency.**
   The code fix is small; creating, pricing, and getting the gem
   consumables approved is not, and it can't start until the paid-apps
   agreement is signed.

3. **The 276 MB of video (P3.1) is the difference between an app people
   install and one they abandon at the download prompt.** It's classified
   P3 because it doesn't block review — but it will quietly cost more
   users than any other item on this list.

---

## Status

### Done

| Item | What landed |
|---|---|
| **P0.1** | `verify-receipt` rewritten — user from JWT, purchases from RevenueCat's API, no client input at all. New `revenuecat-webhook` for renewals, cancellations and refunds, made idempotent by an `iap_events` ledger. `vip_subscriptions` write policies dropped; `grant_vip_days` and `ensure_admin_lifetime_pro` replace the two client writes. Unique index stops one transaction activating two accounts. |
| **P0.2** | Four gem consumables defined in `src/config/gemPacks.ts` alongside the packs they sell. `useGemPurchase` branches on native. Both checkout functions refuse a `capacitor://` origin as a regression backstop. Seven tests lock the pack/SKU mapping. |
| **P0.3** | `minVersion` 14.0 → 15.0, matching the Capacitor 8 podspec. Generated project confirms `IPHONEOS_DEPLOYMENT_TARGET = 15.0`. |
| **P0.4** | `ios/` generated and committed, CocoaPods, all six plugins in the Podfile. `Info.plist` authored with real usage strings, portrait lock, AdMob identifier and the encryption exemption. |

Two correctness bugs were fixed in passing, both in the tier mapping:
`verify-receipt` wrote `vip_tier: 'vip'`, which matches no branch in
`VIP_BENEFITS_BY_TIER`, so **annual subscribers were silently reading as
monthly** — `isProPlus()` returned false for someone who had just paid for
the year. And subscription expiry was derived from the word "monthly" in a
product id rather than read from the store, which is what let a cancelled
subscription stay active until a date we had invented. Expiry now comes
from RevenueCat.

| **Currency** | Credits are no longer client-named. Three claim functions own their amounts outright; the rest are capped per-award and per-day and written to a `currency_grants` ledger. Reward kind is a required argument, so a new credit path is a compile error until someone prices it. |
| **P1.1–P1.3** | Six lifecycle plugins added. Splash hides on first paint across two frames. Sessions moved to Preferences/UserDefaults — `localStorage` in WKWebView is evictable, and losing it logs the user out silently. |
| **P1.4** | `appUrlOpen` handled, both OAuth shapes plus content links. `apple-app-site-association` written with paths matched to the real routes, legal and support deliberately excluded. |
| **P1.5–P1.7** | `SafeArea` primitive and CSS inset tokens, including a keyboard height the shell publishes. Platform detection corrected in the two services that gate ads and tracking. `build:ios` excludes the admin console and strips the Meta Pixel, with a verifier that fails the build if either returns. |
| **P2.1** | `PrivacyInfo.xcprivacy` authored and registered in the Xcode Resources phase — dropping the file in the folder alone would not have reached the bundle. Tracking domains listed so iOS fails closed if an ad request ever precedes ATT. |
| **P2.2** | ATT moved out of ad initialisation to the moment a player chooses to watch an ad, behind a context screen. Declining the pre-prompt leaves the system dialog unasked rather than spending the one chance iOS gives. Denial drives `npa=1` on every request. |
| **P2.3** | `usePushNotifications` — registration, token refresh on relaunch, tap routing, and row removal on unregister. Never prompts on mount. |
| **P2.4** | Ad unit IDs from the environment, with a loud console warning when falling back to a demo unit. `app-ads.txt` and the SKAdNetwork list added. |
| **P2.5** | Real 1024×1024 brand icon, RGB, no alpha, in both the asset catalog and `public/`. |
| **P2.6** | Settings deletion now calls `delete-user-account` instead of dropping a profile row. |

| **P3.1** | Video library pruned out of the iOS bundle and streamed instead: **394 MB → 130 MB**. The verifier enforces a 150 MB ceiling. |
| **P3.3** | Haptics routed through the plugin — `navigator.vibrate` does not exist in WKWebView, so all eleven call sites were silent no-ops on iPhone. |
| **P3.4** | Offline detection reads `@capacitor/network`; `navigator.onLine` stays `true` in a WKWebView with no signal, so the banner never appeared. |
| **P3.6** | RevenueCat no longer configures with a placeholder key, DEBUG logging is dev-only, `.env` untracked with `.env.example` added. |
| **Guideline 1.2** | Reporting and blocking built — `user_reports` and `user_blocks` had existed with correct RLS and no client at all. Blocked authors filtered from the feed; managed from Settings → Privacy. |

### Not done

**P2.7 / P2.8 — nutrition labels and age rating.** Both are forms in App Store
Connect, so they need the account. The answers must match
`PrivacyInfo.xcprivacy` exactly — that file is the source to fill them from.
Expect 12+ given ads, user-generated quizzes and social features; if
user-generated content is visible to other players, Guideline 1.2 also wants
a reporting and blocking mechanism, which has not been checked for.

**P0.5 — accounts. This is now the only thing blocking progress.** Nothing
here can be done from the repo; it is all paperwork on the account holder's
side. Apple Developer enrolment, the App ID with its four capabilities, the
App Store Connect record, RevenueCat, AdMob, Firebase with an APNs key, and —
the one that blocks all purchase testing — the paid-apps agreement and
banking forms.

Three values need filling in before the new code does anything:

| Value | Where | Without it |
|---|---|---|
| `REVENUECAT_SECRET_API_KEY` | Supabase secret | Entitlement sync cannot ask RevenueCat what a user owns |
| `REVENUECAT_WEBHOOK_SECRET` | Supabase secret + RevenueCat dashboard | The webhook refuses to run rather than accept unauthenticated calls |
| Apple Team ID | `public/.well-known/apple-app-site-association` | Universal links silently keep opening in Safari |

**Server-side scoring.** The remaining half of S1-7. Gameplay rewards are
bounded and logged, not verified. Worth doing before the economy carries real
money, and it is a project rather than a patch.

**The safe-area sweep.** The primitive exists; converting the ~20 screens
that hand-roll `env(safe-area-inset-*)` needs a device, so it belongs with
the P3 device matrix rather than here.


---

## What the audit missed, and why

Eleven findings only appeared once the work was done rather than read. They
fall into three groups, and the groups are more useful than the list.

**Complete backends with no client.** Push notifications had a full FCM
sender reading a table nothing ever wrote to. `user_reports` and
`user_blocks` had correct RLS, an admin review path, and no caller. In each
case the schema and the server function looked finished, and the audit
checked that they existed. Existence was not the question.

**Web APIs that do nothing on iOS.** `navigator.vibrate` has never been
implemented in WKWebView, so every haptic call was a no-op on iPhone.
`navigator.onLine` stays `true` on a phone with no signal, so the offline
banner never showed. WebM only became playable in WKWebView in iOS 17.4,
below which the video source chain silently falls through to the desktop MP4.
All three read as implemented in the source and are absent on the device.

**Configuration that looked applied and wasn't.** The `infoPlist` block in
`capacitor.config.ts` never reached the generated plist. `npm run typecheck`
resolved to an empty program and passed unconditionally. RevenueCat
configured happily with a placeholder key. Each failed silently in the
direction of appearing to work.

The general lesson for the rest of this plan: for anything on the remaining
list, "the code exists" is not evidence it runs. The P4 device matrix and the
P5 beta are where the equivalents of these get caught, which is why neither
should be compressed.
