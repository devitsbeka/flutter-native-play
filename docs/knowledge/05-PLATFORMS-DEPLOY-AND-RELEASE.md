# MyTrivia — platforms, deployment and release

*Three surfaces, three completely different deploy paths, and the App Review
record. Written 2026-09-06 from `main` @ `21717c9`. Console state is marked
off-repo and drifts.*

---

## 1. The three deploy paths, and why confusing them costs days

| Surface | Trigger | Latency |
|---|---|---|
| **Web app** | Merge to `main` → `.github/workflows/deploy.yml` → Cloudflare Workers | ~2–3.5 minutes, automatic |
| **Server (migrations + edge functions)** | Merge to `main`, then **ask Lovable to deploy**. Nothing automatic | Human-in-the-loop |
| **iOS** | `npm run build:ios`, then archive in Xcode **on a Mac** | Manual |

The single most common mistake in this project is assuming a merge shipped
something server-side. **It did not.** A merge deploys the web app and nothing
else.

## 2. Web — Cloudflare

Cloudflare Workers serves `./dist` from the edge, with **unmetered bandwidth** —
which is exactly why it was chosen, given the build carries ~280 MB of video.
`worker/index.ts` handles a few routes (`/img`, `/videos/*` range slicing, room
link previews) and hands everything else to the assets binding.

Domains, declared in `wrangler.toml`: `mytrivia.io` and `www.mytrivia.io`, both
custom domains Cloudflare manages the DNS for. `workers_dev = true` is kept
deliberately as a fallback and staging target — declaring `routes` turns it off
by default, which would take the Worker offline entirely if the custom-domain
attach failed.

**The deploy workflow** (`deploy.yml`, on push to `main`, `paths-ignore` for
markdown and `docs/`): check Cloudflare credentials → `npm ci` → typecheck →
unit tests → build → Playwright smokes against the built bundle → publish.
Concurrency group `deploy-production`, cancel-in-progress. Note the path filter
means an **empty commit will not trigger a deploy** — `--allow-empty` is not a
way to retry; use "Re-run all jobs" or the `workflow_dispatch`.

**Verifying what is actually live.** Every build stamps an id into
`version.json`:

```sh
curl -s https://mytrivia.io/version.json      # {"build":"msozdn5e"}
python3 -c "import datetime;print(datetime.datetime.utcfromtimestamp(int('msozdn5e',36)/1000))"
```

The id is `Date.now().toString(36)` at build time, so it decodes to when the
build was made. Comparing `assets/index-*.js` hashes no longer works as a check,
because the build id is part of the bundle and two builds of the same commit
produce different hashes.

**"I merged a fix but I don't see it."** Deploys land on the server; a *page*
only picks them up when it reloads. Settings shows the running build id at the
bottom; if it differs from `version.json`, that page is stale and tapping the
line pulls the new build. `useFreshBuildGuard` normally handles this
automatically — it polls `version.json` every 45 seconds and on tab focus and
reloads when the ids differ, **never during a live game**. A page running a
build older than that guard cannot rescue itself and needs one manual refresh.

## 3. Server — through Lovable, not the CLI

**Nobody on the team has a Supabase personal access token or dashboard CLI
access**, and none of the workflows run `supabase functions deploy`. This is
settled and has been asked more than once: stop proposing
`npx supabase functions deploy` and stop asking for `SUPABASE_ACCESS_TOKEN`.

**A Supabase MCP server in a session is not this project.** One may be connected
— with `apply_migration`, `execute_sql`, `list_migrations` — and it belongs to a
*different account*. MyTrivia's database is the one Lovable owns, project ref
`sqwpzezkhpqkdyltvsim`. Those tools do not reach it, and pointing them at
whatever project they *do* reach would be writing to someone else's database.
**Check the ref before believing you have access, and assume you do not.**

**The way to run SQL** is to hand the operator a link to the migration's raw
file on `main`, which they paste into the Lovable SQL editor. To confirm
something applied, give them a read-only `SELECT` to paste back rather than
guessing — and some of it is checkable from a session with the anon key in
`.env` (see `03-BACKEND-DATA-AND-SECURITY.md` §8).

Two consequences to plan around:

- **A new function is not live because it is on `main`.** Existing functions get
  redeployed from `main`; one Lovable has never seen has to be deployed
  explicitly. `send-game-invite-push` sat at HTTP **404** while every other
  function answered 401 — that is what this looks like from outside.
- **Shipping an iOS build deploys nothing server-side.** The archive carries the
  client only. A client calling a function that was never deployed fails exactly
  where the failure is hardest to see, and where the call is fire-and-forget —
  as the invite push deliberately is — it fails **silently**.

**When asking Lovable, ask for the deploy and nothing else.** It syncs the whole
repo, and every extra pass is a chance for it to regenerate
`src/integrations/supabase/types.ts`, which costs six RPCs and two dozen build
errors (see `06-RULES-GOTCHAS-AND-HISTORY.md` §1).

This is also a concentration risk worth naming in any diligence: **production
deploys depend on a vendor relationship**, and a buyer should confirm account
ownership and the path to direct control.

## 4. iOS

| | |
|---|---|
| Bundle id | `io.mytrivia.app` |
| Store name | *MyTrivia: Party Quiz Game*; `CFBundleDisplayName` is `MyTrivia` |
| Apple Team | `T38XQSM4L3` |
| Deployment target | **iOS 15.0** — Capacitor 8's own podspec sets it; declaring 14.0 in `capacitor.config.ts` does not lower the floor, it just makes `pod install` fail on the mismatch |
| Orientation | Portrait-locked (in `Info.plist`, **not** in `capacitor.config.ts` — an `infoPlist` block there is not merged by `cap add`/`cap sync`) |
| Devices | iPhone only |
| Bundle size | ~98 MB of web assets after video pruning (down from ~394 MB) |

**Native files**: `ios/App/App/` carries `Info.plist`, `App.entitlements`,
`PrivacyInfo.xcprivacy`, `AppDelegate.swift`, `MainViewController.swift` and
`AppTrackingPlugin.swift`, plus a `NotificationService` extension target.

**The build command**:

```
npm run build:ios
  → scripts/verify-ios-native.mjs   # FIRST — fails with the console path if
                                    #   GoogleService-Info.plist is missing,
                                    #   is for the wrong BUNDLE_ID, or carries
                                    #   a GADApplicationIdentifier that is not
                                    #   an iOS app id
  → VITE_INCLUDE_ADMIN=false VITE_NATIVE_BUILD=true vite build
  → scripts/prune-ios-videos.mjs    # ships 5 videos, streams the other ~185
  → scripts/verify-ios-bundle.mjs   # asserts: no admin console, no pre-ATT tracking
  → cap sync ios
```

Then archive in Xcode on a Mac.

**Native plugins**: AdMob, Apple Sign In, Firebase Messaging, App, Browser,
Camera, Haptics, Keyboard, Network, Preferences, Share, Splash Screen, Status
Bar, RevenueCat Purchases.

**AdMob app id lives in `Info.plist` as `GADApplicationIdentifier`, not in
`capacitor.config.ts`.** iOS does not read the Capacitor key. It once held the
*Android* app id — same publisher, different platform — and recent SDK versions
raise on an app id that does not resolve to an iOS app, which is a crash on
launch before the app paints. That would have been the first thing a reviewer hit.

**Splash**: `launchAutoHide: false`; the app takes its own splash down once React
has painted its first route (`NativeBridge`). A timer instead either uncovers a
blank webview or holds a still image over a ready app — both read as slowness.
Background `#bcabee`, matching the LaunchScreen storyboard.

**The webview does not scroll.** `nativeShell.ts` calls
`Keyboard.setScroll({ isDisabled: true })`, whose iOS implementation is
`webView.scrollView.scrollEnabled = NO`, killing the document scroller for the
life of the app — deliberately, so iOS cannot drag the page around when the
keyboard opens. Consequences in `06-RULES-GOTCHAS-AND-HISTORY.md` §2.

**Android** is a configured Capacitor target with **no generated project**. A
known, scoped body of work rather than a rewrite, since the entire app layer is
shared. `screenOrientation` would have to be set by hand in
`AndroidManifest.xml`, and Android needs its own AdMob app id there.

## 5. Environment and secrets

**`.env` is tracked on purpose** and the repository is **public**. It holds only:

- `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_PUBLISHABLE_KEY` — the project ref and the **anon** key, public
  by design;
- `VITE_REVENUECAT_IOS_API_KEY` — the `appl_…` **public SDK** key, which ships
  inside the binary and identifies the app without authorizing anything;
- `VITE_ADMOB_IOS_INTERSTITIAL`, `VITE_ADMOB_IOS_REWARDED` — ad unit ids, also
  public;
- `VITE_FACEBOOK_APP_ID` — currently empty; handled, and the share falls back to
  the system share sheet.

Three separate builders read this file — the GitHub deploy workflow, Lovable,
and local builds — and removing it broke two of them.

**Real secrets are Supabase platform secrets and must never be committed**: the
RevenueCat `sk_` secret key (V1, not V2), the RevenueCat webhook secret, the
Stripe keys, the AI gateway and fal.ai credentials. A secret in a `VITE_` var is
compiled into the bundle.

**`vite build` refuses to build without the Supabase values.** That guard exists
because Vite inlines `undefined` for an unset `VITE_*` var: the build succeeds,
deploys, and the app cannot reach its backend, with nothing in CI to explain
why. If a build fails with *"Refusing to build without VITE_SUPABASE_URL"*, the
fix is to supply the value — not to remove the check.

Other build flags: `VITE_INCLUDE_ADMIN=false` (tree-shakes the admin console
out), `VITE_INCLUDE_DEV_PAGES=true` (puts the dev/doc pages back),
`VITE_NATIVE_BUILD=true`, `VITE_PUBLIC_SITE_URL` (staging link generation),
`VITE_VIDEO_BASE_URL` (unset, so streamed video falls back to
`https://mytrivia.io/videos/…`).

## 6. CI

| Workflow | Runs on | Does |
|---|---|---|
| `deploy.yml` | push to `main` | typecheck → unit tests → build → Playwright smokes → publish to Cloudflare |
| `pr-checks.yml` | every PR (paths-ignore markdown/docs) | **checks** job: `npm ci` → typecheck → unit tests → build. **entitlements** job: a Postgres 16 service container, apply the shim and all migrations, then execute the SQL assertion suites (entitlements, currency, PRO seats, room rounds, invite links, and the rest) |
| `qodana_code_quality.yml` | manual | static analysis |

PR checks deliberately **do not** run the Playwright smokes — `deploy.yml`
already pays for those on `main` and they are the expensive part (a Chromium
download plus ~6 minutes).

Two notes with history: PRs had no CI at all until recently, so the first thing
that ran against a branch was the production deploy, *after* merge — which is
how untracking `.env` nearly shipped. And `npm run typecheck` was a no-op for a
while because the root tsconfig carries `files: []` with project references, so
`tsc --noEmit` resolved to an empty program and passed unconditionally; it points
at the real projects now.

## 7. Release status — iOS

**Version 1.0. Build 34 was submitted and rejected under guideline 2.1** (ATT
prompt reported missing — see `04-ECONOMY-AND-MONETIZATION.md` §9 for the cause
and the fix). Everything blocking is configuration, forms or a device; **no
unbuilt features stand between the current state and a submitted build.**

### Complete

- Web app live and auto-deploying.
- iOS project generated and committed, CocoaPods configured, all native plugins
  integrated. `Info.plist` with real usage strings, portrait lock and encryption
  exemption; `PrivacyInfo.xcprivacy` authored and registered.
- App Store Connect record on the permanent bundle id `io.mytrivia.app`. (A
  prior vendor-generated record on `app.lovable.f54c9281…` was deleted before it
  could lock in the wrong identity — Apple never lets a bundle id be renamed.)
- Subscription group **MyTrivia PRO** and four gem consumables created,
  localized, with review screenshots, all reading *Ready to Submit*.
  Subscriptions read "Prepare for Submission" instead, which is the same state
  in different words and does not clear until the first build ships. **Not to be
  confused with "Missing Metadata"**, which looks similar and means StoreKit
  returns nothing at all.
- RevenueCat project rebuilt: iOS app on the right bundle id, In-App Purchase key
  uploaded, all products imported, a `default` offering with one product per
  package, webhook returning 200, secret key confirmed **V1**.
- Server-side entitlement verification plus the renewal/cancellation/refund
  webhook, made idempotent by the `iap_events` ledger.
- Sign in with Apple (native and web), Google OAuth, email, username-only
  signup, and the security-question password reset.
- ATT flow (now at launch), child-directed ad treatment from the age gate.
- Guideline 1.2 compliance: user reporting and blocking.
- Account deletion and data export (5.1.1(v)).
- Per-language legal pages and a support page.
- Apple Developer enrolment, Paid Applications Agreement, banking and tax — the
  one gate in front of StoreKit returning any products at all.

### Outstanding

| Item | Where | Blocking? |
|---|---|---|
| Firebase project + `GoogleService-Info.plist` in the Xcode target, APNs key, service-account secret | Console + Xcode | **Yes — a missing plist crashes the app on launch.** `verify-ios-native.mjs` catches it before Xcode |
| Xcode capabilities: Team, Associated Domains, Push, Sign in with Apple | Needs a Mac | **Yes** — without the entitlements file these are inert |
| App Privacy nutrition labels + age rating questionnaire (expect **12+**) | ASC forms | **Yes** |
| **EU trader status declaration (DSA)** | ASC | **Yes for EU storefronts** — verification takes days, runs independently of app review, and failure removes the app from every EU storefront |
| Subscription **levels**: Level 1 = Friends PRO Monthly + PRO Annual (both `pro_plus`), Level 2 = PRO Monthly (`pro`) | ASC | Revenue bug if wrong — annual currently sits below both monthlies, making it a *downgrade* that defers to period end |
| All products **attached to this version**, not merely created | ASC | Yes — review cannot see an unattached product |
| Review notes: guest mode, how to reach the paywall, how to reach Restore Purchases, how to test multiplayer with one device | Listing | Yes |
| On-device sandbox test: purchase, restore-after-reinstall, push on a distribution build, universal link, camera, deletion, airplane mode | Device | Yes |
| TestFlight upload and internal test | — | Yes |
| Create `io.mytrivia.pro.annual` with its introductory offer | ASC | No — but it is the highest-LTV plan |
| Real AdMob iOS units confirmed live | Console | No — ad revenue is 0 until done |
| Screenshots at the size ASC currently demands (`capture-store-screenshots.mjs` renders 1242×2208, the old 5.5" slot) | Build machine | No |
| Mobile MP4 variants; lossless WebP conversion (~27 MB saving) | Build machine | No |
| Server-side score verification | Engineering | No — but see the economy gap |

**Schedule risks not under the team's control**: Apple's review queue, and EU
trader verification, which has a multi-day turnaround and fails independently of
app review. Budget two to three review cycles for a first submission.

### The audit record

`docs/IOS_APP_REVIEW_AUDIT.md` (82 KB) is four passes written as a reviewer
would work. Verdict at the last full pass: 4 P0, 5 P1, 6 P2, 7 P3, 5 P4, 5 P5,
with most fixed and each carrying a resolution note. Its own summary: *"the
compliance groundwork here is unusually good — privacy manifest, ATT ordering,
report/block, account deletion, restore, IAP-only payments on device,
SKAdNetwork, the bundle guard — and what follows was the last few percent rather
than a rebuild."*

**One open finding worth carrying forward: F-1, byte-range requests.** The iOS
build ships 5 videos and streams ~185 from `https://mytrivia.io/videos/…`.
Probed live, the host answered a `Range: bytes=0-1023` request with **HTTP 200
and the whole file**, no `Accept-Ranges`, no `Content-Range`. WKWebView's media
playback is AVFoundation-backed and AVFoundation opens streams with a
`bytes=0-1` probe *expecting a 206* — the classic failure where video plays in
every desktop browser and never starts on an iPhone. `cf-cache-status: MISS` on
every request also means these files are not edge-cached, so each play
re-downloads the full file. Blast radius is most of the app's motion: category
backgrounds, map videos, avatar clips. Fix candidates, smallest first: a `Range`
handler for `/videos/*` in `worker/index.ts`; `cache-control` on video responses
so Cloudflare's edge cache takes over range serving on HIT; or move the videos to
R2 or a CDN with native range support. A 5-minute device test settles whether it
is fatal or merely wasteful. `src/__tests__/videoRange.test.ts` exists.
