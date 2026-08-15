# Launch runbook — MyTrivia on iOS

Everything left between here and a submitted build, in the order it has to
happen. The ordering is not cosmetic: four of these steps create identifiers
that Apple never lets you change, and three of them are inputs to steps that
come later.

Where a step can be verified, the check is written next to it. A step with no
check is a step you find out about from a rejection.

- **Phase 1–2** are App Store Connect surgery and must be done in order.
- **Phase 3–5** are third-party consoles and can be done in any order, in
  parallel, once Phase 2 is finished.
- **Phase 6–7** need a Mac.
- **Phase 8–10** are the submission itself.

Repo state as of writing: 0 type errors, 428 tests passing, iOS bundle
130.3 MB, deployment target iOS 15.0, `MARKETING_VERSION 1.0`,
`CURRENT_PROJECT_VERSION 1`.

---

## Phase 1 — Replace the app record

The record on App Store Connect (Apple ID `6757699196`) was created by
Lovable and carries the bundle id
`app.lovable.f54c9281c7aa40a48ea74b75d0ffa3d4`.

**A bundle id is permanent.** It cannot be edited after the record exists.
This repo is built around `io.mytrivia.app` in four places —
`capacitor.config.ts`, the Xcode project, `src/config/site.ts`, and the
`apple-app-site-association` file that carries `T38XQSM4L3.io.mytrivia.app`
for deep links.

The record has never been released. No users, no reviews, no ratings, no App
Store URL in circulation. Replacing it costs nothing now and is impossible
later.

> The alternative is to keep the record and change the repo's bundle id to
> `app.lovable.f54c…`. That works. It also means a Lovable hash is your app's
> permanent identity in crash reports, MDM, the App ID list and every
> universal link, forever. Not recommended.

### 1.1 Free the name

An app name is held exclusively by whichever record reserved it, including an
unreleased one. "MyTrivia" is currently held by the old record, so the new
record cannot claim it until this is done.

- [ ] App Store Connect → the old app → **App Information** → **Name** →
      change to `MyTrivia Legacy` → **Save**

**Check:** the header still reads "MyTrivia Party" (that's the internal
record name, separate from the store name) but the Name field now says
MyTrivia Legacy.

### 1.2 Register the App ID

Do this **before** creating the new record. App Store Connect builds its
bundle-id dropdown from registered App IDs — an unregistered `io.mytrivia.app`
simply will not appear in the list, and there is no "type it in" option.

- [ ] [developer.apple.com](https://developer.apple.com/account) →
      **Certificates, Identifiers & Profiles** → **Identifiers** → **+** →
      **App IDs** → **App**
- [ ] Description: `MyTrivia` · Bundle ID: **Explicit** → `io.mytrivia.app`
- [ ] Tick four capabilities:
      - **In-App Purchase**
      - **Push Notifications**
      - **Sign In with Apple** (leave it as primary App ID)
      - **Associated Domains**
- [ ] Register

**Check:** the identifier appears in the list with all four capabilities
shown as enabled. Missing any one of them makes the corresponding Xcode
capability in Phase 6 fail to provision.

### 1.3 Create the new record

- [ ] App Store Connect → **Apps** → **+** → **New App**
- [ ] Platform **iOS** · Name **MyTrivia** · Primary language **English (U.S.)**
- [ ] Bundle ID → select **io.mytrivia.app** from the dropdown
- [ ] SKU: `io.mytrivia.app` (internal only, never shown to users)
- [ ] Full access

**Check:** App Information shows Bundle ID `io.mytrivia.app`. Write down the
new Apple ID number — you need it for TestFlight and for support URLs.

### 1.4 Delete the old record

Only after 1.3 succeeds. Available because it never shipped.

- [ ] Old app → **App Information** → scroll to the bottom → **Delete App**

---

## Phase 2 — Create the products

**Do not start this before Phase 1.3.** In-app purchases belong to an app
record — anything created on the old record is destroyed along with it.

Product ids are permanent too, in the same way bundle ids are: once created,
an id can never be renamed, and never reused even after deletion. Check each
one character by character against `PRODUCTS` in
`supabase/functions/_shared/iap.ts`. That table is the only thing that turns
a purchase into an entitlement — an id that doesn't match it means the
purchase succeeds, Apple charges the card, and the user receives nothing,
with no error raised anywhere along the path.

### 2.1 Subscription group, then the two subscriptions

Both PRO tiers bill **monthly** — they are feature tiers, not billing periods,
and the app renders both with a "/month" label. See `PRO_TIERS` in
`src/components/profile/ProPlansSection.tsx`.

They used to differ by friend invites, 1 against 5. That offer was retired
(`20260814230000_retire_referral_pro_grant.sql`) because it minted PRO for
anyone who called it and never paid out anyway, so the only remaining
difference between the tiers is daily rewards. The App Store descriptions
have to say so:

| Product | Description |
|---|---|
| `io.mytrivia.pro.monthly` | `Double XP, no ads and a VIP badge.` |
| `io.mytrivia.proplus.monthly` | `Double XP, no ads, VIP badge and daily rewards.` |

That text is shown at the moment of purchase, so a benefit listed there and
absent from the app is guideline 2.3.1. "Friends PRO" also now names a tier
with no friend features, and $7.99 against $3.99 is a lot of weight for one
benefit — both worth a decision before submission.
Making either one yearly puts a price on screen that doesn't match what Apple
charges, which is a guideline 2.3.1 rejection on the same screen that shows
it.

Put both in the **same group**. That is what makes a tier change an upgrade
rather than a second, parallel subscription the user is now paying twice for.

- [ ] **Monetization** → **Subscriptions** → **Create** a Subscription Group,
      reference name `MyTrivia PRO`
- [ ] Inside it, create:

| Product ID | Reference name | Duration | Price |
|---|---|---|---|
| `io.mytrivia.pro.monthly` | PRO Monthly | 1 month | $3.99 |
| `io.mytrivia.proplus.monthly` | Friends PRO Monthly | 1 month | $7.99 |

- [ ] Set the **ranking** within the group: Friends PRO above PRO, so moving
      between them is treated as an upgrade
- [ ] Each needs a **localized display name and description**, and a
      **review screenshot** of the paywall (Phase 9 produces these — you can
      come back)

### 2.2 The consumables

**Monetization** → **In-App Purchases** → **Create**:

| Product ID | Type | Price | Grants | gems/$ |
|---|---|---|---|---|
| `io.mytrivia.gems.100` | Consumable | $0.99 | 100 gems | 101 |
| `io.mytrivia.gems.500` | Consumable | $3.99 | 500 gems | 125 |
| `io.mytrivia.gems.1500` | Consumable | $12.99 | 1500 gems | 116 |
| `io.mytrivia.gems.5000` | Consumable | $34.99 | 5000 gems | 143 |

These replaced two contradictory ladders — the `/power-ups` shop sold
30/100/300/700 while the "not enough gems" modal sold 100/500/1500/5000 at
four to eight times more gems per dollar. Both surfaces build from
`src/config/gemPacks.ts` now, and `_shared/iap.ts` must agree with it or a
purchase grants nothing; the repo invariant test enforces that.

**The 1500 pack is worse value than the 500 pack** — 116 gems per dollar
against 125. Not strictly dominated (you do get 3x the gems), so nothing
breaks, but it gives a buyer a reason to buy two 500s instead. Any price
below **$11.97** puts the curve back in order. Prices stay editable in App
Store Connect; product ids do not.

### 2.3 Ad-free — hold off

`io.mytrivia.adfree` is in both catalogs and `AdFreeModal` is mounted in
`Index.tsx`, but **`setIsAdFreeModalOpen(true)` is never called** — nothing in
the app can open it, so the product cannot be bought.

Do not create it yet. An in-app purchase with no reachable path is a question
at review, and products can be added at any time. Wire up an entry point
first, then create it.

**Check:** six products exist, each in state *Ready to Submit* or *Missing
Metadata*. They stay that way until submitted alongside the first build —
"your first in-app purchase must be submitted with a new app version" is
normal and not a problem.

---

## Phase 3 — RevenueCat

The app never talks to StoreKit directly; RevenueCat is the layer in between,
and the server asks RevenueCat what a user owns. Products that exist in
RevenueCat but sit **outside an offering** are not returned to the app at all.

- [ ] Project → **Apps** → iOS app → set **Bundle ID** to `io.mytrivia.app`
- [ ] Upload the **App Store Connect API key** (In-App Purchase key) so
      RevenueCat can validate receipts server-side
- [ ] **Products** → add all six ids, exactly as created in Phase 2
- [ ] **Offerings** → create the default offering → add **all six** products
      as packages. **This is the load-bearing step.** `useInAppPurchases`
      builds its product list from `getOfferings()`, and `purchase()` finds
      the package by walking `offerings.all` — so a product that exists in
      RevenueCat but sits outside every offering cannot be bought at all.
      `targetPackage` stays null and the purchase silently does nothing. The
      paywall also falls back to the price compiled into the bundle.
- [ ] **Entitlements** — *optional, and not what makes this work.*
      `_shared/iap.ts` reads `subscriber.subscriptions` and
      `non_subscriptions`, both keyed by product id, and resolves them through
      its own CATALOG. RevenueCat's entitlement names are never consulted by
      either the client or the server; "entitlement" in this repo means the
      app's `vip_tier`. Creating `pro` and `pro_plus` and attaching the two
      subscriptions is still worth ten seconds — it makes RevenueCat's own
      charts read correctly — but nothing breaks without them. Skip `ad_free`
      until that product exists (see 2.3).
- [ ] Confirm the webhook still points at
      `https://sqwpzezkhpqkdyltvsim.supabase.co/functions/v1/revenuecat-webhook`

Already done and verified, no action needed: `REVENUECAT_SECRET_API_KEY`
(must stay a **V1** key — a V2 key returns 403 code 7723 against the
`/subscribers` endpoint the code uses) and `REVENUECAT_WEBHOOK_SECRET`, both
Supabase platform secrets. Neither goes in the repo.

**Check:** RevenueCat's Offering screen lists six products with prices
pulled from App Store Connect. Blank prices there mean Phase 2 isn't finished
propagating — it can take a few hours after products are created.

---

## Phase 4 — Point Supabase's Apple provider at the new bundle id

Easy to miss, and it breaks sign-in rather than purchases.

Native Sign in with Apple sends `clientId: io.mytrivia.app`
(`AuthContext.tsx:330`, from `APP_BUNDLE_ID`) and hands the resulting identity
token to `supabase.auth.signInWithIdToken`. Supabase validates the token's
audience against its configured client ids. If `io.mytrivia.app` isn't in
that list, every native Apple sign-in fails with an audience mismatch — while
the **web** flow keeps working, which makes it look like a device problem.

- [ ] Supabase dashboard → **Authentication** → **Providers** → **Apple**
- [ ] **Client IDs** — both, comma-separated:
      `io.mytrivia.signin, io.mytrivia.app`

      The Services ID is what the browser flow presents; the bundle id is what
      the native flow presents. Supabase checks an incoming token's audience
      against this list, so a list with only one of them breaks exactly one
      platform and leaves the other looking fine.

- [ ] **Secret Key (for OAuth)** — generated from the Sign in with Apple key,
      with the **Services ID** as Client ID. Putting the bundle id there
      produces a JWT whose `sub` Apple rejects at the token exchange with
      `invalid_client`. The native flow does not use this secret at all.

Supporting objects, if they do not already exist:

| Thing | Value |
|---|---|
| Services ID | `io.mytrivia.signin`, Sign In with Apple enabled |
| Primary App ID | `io.mytrivia.app` |
| Domains | `mytrivia.io, www.mytrivia.io` |
| Return URL | `https://sqwpzezkhpqkdyltvsim.supabase.co/auth/v1/callback` |
| Key | `AuthKey_*.p8` from Keys → Sign in with Apple |

Apple's web configuration is only stored after **Continue** *and* **Save** —
returning to the Services ID page is not confirmation.

Domain verification (`apple-developer-domain-association.txt` under
`public/.well-known/`) is **not** required for sign-in to work. It is required
for Apple's private email relay, so that users who choose "Hide My Email" can
receive mail at their `@privaterelay.appleid.com` address. Configured
separately under More → Configure on the Services ID

Three different `.p8` files come out of the Apple developer account and are
easy to swap by mistake, because two of them are named `AuthKey_*`:

| File | Created under | Belongs to |
|---|---|---|
| `AuthKey_*.p8` (APNs enabled) | Keys → Apple Push Notification service | Firebase, for push |
| `SubscriptionKey_*.p8` | Users and Access → Integrations → In-App Purchase | RevenueCat |
| `AuthKey_*.p8` (Sign in with Apple enabled) | Keys → Sign in with Apple | Supabase's Apple provider secret |

Each downloads exactly once.

**The Apple client secret expires.** It is a JWT and Apple caps its lifetime at
six months, so web Apple sign-in stops working twice a year unless the secret
is regenerated from the same key. Nothing warns you: existing sessions keep
working and only new sign-ins fail. Put a calendar reminder against it. The
native path does not use this secret, so iOS keeps working while the web does
not — the reverse of the Client IDs failure above

**Check:** on device, Apple sign-in completes and lands you signed in. This
one cannot be verified from here — it needs a real build.

Guideline 4.8 requires Sign in with Apple wherever a third-party login is
offered. Google sign-in is offered, so this is not optional.

---

## Phase 5 — The remaining third-party consoles

Independent of each other; do them in any order.

### 5.1 AdMob

- [ ] Register the iOS app under app id `ca-app-pub-1329033152352928~1190114462`
      (already in `capacitor.config.ts`)
- [ ] Create a **dedicated iOS rewarded** unit → `VITE_ADMOB_IOS_REWARDED`
- [ ] Create a **real interstitial** unit → `VITE_ADMOB_IOS_INTERSTITIAL`

The interstitials currently point at Google's demo units. Those serve ads
perfectly and earn exactly nothing, which is why this is easy to ship without
noticing.

- [ ] Confirm `https://mytrivia.io/app-ads.txt` is reachable, and that the
      developer website on the store listing points at that same domain —
      AdMob matches the two, and a mismatch means the file is never found

### 5.2 Firebase / APNs

- [ ] Create the Firebase project, add the iOS app with bundle id
      `io.mytrivia.app`, download `GoogleService-Info.plist`
- [ ] Apple Developer → **Keys** → create an **APNs Auth Key (.p8)**, upload
      it to Firebase Cloud Messaging with your Team ID and Key ID

Without the .p8, push registration succeeds on device and delivery silently
never happens.

**Check:** after a device build, `push_tokens` gains a row on launch. That
table was empty for the app's whole life because no client ever registered —
`PushRegistrar` in `src/native/` is what fixed it, and an empty table after
this phase means something upstream of it is wrong.

### 5.3 Crash reporting

- [ ] Sentry (or equivalent) iOS project, DSN wired in

Optional for approval, but the first TestFlight crash you can't reproduce is
where you'll wish this existed.

---

## Phase 6 — Xcode (needs a Mac)

This is the last structural gap. **There is currently no `.entitlements` file
in the project** — Capacitor doesn't generate one, and it comes into existence
when you add the capabilities below. Until it does, Push, Sign in with Apple
and Associated Domains are inert on device no matter what the App ID says.

```bash
git clone <repo> && cd flutter-native-play
npm ci
cp .env.example .env     # fill in the values, see below
```

- [ ] `open ios/App/App.xcworkspace` — **the workspace, not the project**.
      This repo uses CocoaPods (Capacitor 8's SPM path dropped RevenueCat),
      and opening `.xcodeproj` builds without the pods.
- [ ] Select the **App** target → **Signing & Capabilities** → set **Team** to
      `T38XQSM4L3`, leave *Automatically manage signing* on
- [ ] **+ Capability** → **Push Notifications**
- [ ] **+ Capability** → **Sign in with Apple**
- [ ] **+ Capability** → **Associated Domains** → add two entries:
      - `applinks:mytrivia.io`
      - `applinks:www.mytrivia.io`
- [ ] Drag `GoogleService-Info.plist` into the App target (tick *Copy items if
      needed*)

**Check:** `ios/App/App/App.entitlements` now exists and lists all three.
That file is the actual evidence — the checkboxes in the UI are not.

---

## Phase 7 — Build and verify

### 7.1 Environment

Fill in `.env` from `.env.example`. The ones that matter for a store build:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` | already in the tracked `.env` |
| `VITE_REVENUECAT_IOS_API_KEY` | `appl_mVjLBDRTzwcghHSkuYjqTUpyFzP` |
| `VITE_ADMOB_IOS_REWARDED`, `VITE_ADMOB_IOS_INTERSTITIAL` | from Phase 5.1 |
| `VITE_VIDEO_BASE_URL` | `https://mytrivia.io` |
| `VITE_INCLUDE_ADMIN` | `false` — keeps the admin console out of the binary |
| `VITE_NATIVE_BUILD` | `true` — strips web-only markup such as the Meta Pixel |

`vite build` refuses outright if the two Supabase values are missing, rather
than inlining `undefined` and shipping an app that cannot reach its backend.
If you see *"Refusing to build without VITE_SUPABASE_URL"*, supply the value.

### 7.2 Build

```bash
npm run build:ios
```

That runs `vite build`, prunes the video library out of the bundle,
runs `scripts/verify-ios-bundle.mjs`, and syncs to the iOS project. The verify
step is what catches a bundle that's quietly grown back to 400 MB.

- [ ] Confirm the video CDN actually serves what the app now streams:
      `curl -sI https://mytrivia.io/videos/mobile/` and one real file

### 7.3 On-device smoke test

Run on a real device, not just the simulator — StoreKit, push and ATT all
behave differently there.

- [ ] Paywall shows **real store prices**. Seeing `$3.99` means the chain
      broke and it fell back to the number compiled into the bundle; seeing a
      correctly localized store price means App Store Connect → RevenueCat →
      offering → app is wired end to end (`src/hooks/useStorePrice.ts`)
- [ ] Sandbox-purchase PRO monthly → `vip_subscriptions` gains a row with
      `vip_tier = 'pro'` and an `expires_at` **from the store**
- [ ] Sandbox-purchase a gem pack → gems credited, `currency_grants` gains a
      ledger row
- [ ] **Cancel in the sandbox account** → within minutes the webhook logs an
      `EXPIRATION`/`CANCELLATION` and the row expires **on its own**. This is
      the half that never worked before, because nothing was listening
- [ ] Restore Purchases works on a fresh install
- [ ] Apple sign-in completes (Phase 4)
- [ ] `push_tokens` gains a row
- [ ] Deep link: open `https://mytrivia.io/join/<code>` from Notes → opens the
      app, not Safari
- [ ] Report and block a user; confirm they disappear from the feed and appear
      under Settings → Privacy
- [ ] Account deletion works end to end (guideline 5.1.1(v))
- [ ] Check safe areas on a notched device and on an iPad

### 7.4 Privacy report

- [ ] **Product → Archive → Generate Privacy Report**, and check it against
      `ios/App/App/PrivacyInfo.xcprivacy` before the first upload. A mismatch
      between the manifest and what the SDKs actually declare is rejected at
      upload time, not at review

---

## Phase 8 — TestFlight

- [ ] Archive → **Distribute App** → **App Store Connect** → Upload
- [ ] Wait for processing, then complete the **export compliance** answer.
      The app uses HTTPS only, which is exempt — but it must be answered
- [ ] Internal testing group: yourself. Install from TestFlight and re-run
      the 7.3 list against the **actual TestFlight build**, because that is
      what review will run
- [ ] External testing, if you want real testers, requires a short Beta App
      Review

Bump `CURRENT_PROJECT_VERSION` for every upload — App Store Connect rejects a
duplicate build number, and it's the single most common upload failure.

---

## Phase 9 — Store listing

- [ ] **Screenshots** — 6.9" display required; other sizes are scaled from it.
      Take them on a device or simulator with real content, not placeholder
      data. Check the current required set in App Store Connect rather than
      trusting this line; Apple changes it
- [ ] **Description, keywords, promotional text, support URL, marketing URL**
- [ ] **Privacy Policy URL** — `https://mytrivia.io/privacy-policy`
- [ ] **App Privacy nutrition labels** — must agree with
      `PrivacyInfo.xcprivacy` and with what AdMob, RevenueCat, Firebase and
      Supabase actually collect. Declare identifiers and usage data
- [ ] **EU trader status** (**Business** → Trader Status). Since 2025 the
      Digital Services Act requires a verified trader declaration — legal
      name, address, phone, email — or Apple removes the app from **every EU
      storefront**. Verification takes days, is not part of app review, and
      fails independently of it, so start it early rather than discovering it
      after launch
- [ ] **Age rating** questionnaire — expect 12+ given ads and social features
- [ ] **Sign-in required** → yes → provide a **demo account** with credentials
      in App Review notes. A reviewer who cannot get past the login screen
      rejects on 2.1 without looking at anything else
- [ ] **Review notes**: explain that PRO is a feature tier not a billing
      period, that gems are consumable, and how to reach the paywall and the
      report/block flow. Reviewers do not go looking

Guideline 3.1.2 wants subscription length, price, and links to Terms and
Privacy Policy visible **on the paywall itself**, not only in the listing.
Worth re-reading the paywall against that before submitting.

---

## Phase 10 — Submit

- [ ] Attach the in-app purchases to the version — first submission
      must include them
- [ ] Select the TestFlight build
- [ ] Submit for review

---

## Still open on my side

Not blocking submission, but worth knowing:

- **`public/videos/mobile/*.mp4`** — only WebM variants were ever generated,
  and WebM does not play in WKWebView below iOS 17.4. On most iPhones in
  service the `<source>` chain falls through to the desktop MP4, several MB
  each. Needs ffmpeg, which this environment doesn't have. Then set
  `VITE_MOBILE_MP4_AVAILABLE=true`
- **8 MP4s imported from `src/assets/`** — 46 MB, bundled as ES module
  imports so the pruning doesn't reach them
- **Images** — 57 MB of PNG. Lossless WebP takes 27 MB off with output that is
  pixel-identical. Deprioritised at your request
- **Server-side scoring** — gameplay rewards are bounded and ledgered, not
  verified. A modified client can still claim a plausible score. Bounded is
  not the same as correct, and this is the one economy gap left
