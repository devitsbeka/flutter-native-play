# MyTrivia Mobile Masterplan

Native iOS + Android apps (React Native + Expo, full parity with the web
experience) plus a Facebook Instant Games quick-play build — sharing the
existing Supabase backend and TypeScript business logic.

**Decisions locked in:**
- **Stack:** React Native + Expo in a monorepo; web app stays as-is.
- **Monetization:** RevenueCat-managed native IAP (VIP subscription + gem
  packs) **and** AdMob ads (rewarded + capped interstitials).
- **Facebook:** Instant Games quick-play variant (core trivia loop, FB
  identity, challenge-a-friend), not full parity.
- **Mobile v1 scope:** full parity with web (multiplayer, TV controller,
  VIP, shop, friends included). The 3D world map is the only flagged
  stretch item.

**Ordering logic:** Phases 0–1 unblock everything else (accounts have
multi-day approval lead times — start them first). Phases 2→6 are the
mobile app itself, in dependency order. Phase 7 (Instant Games) is
independent of mobile and can run in parallel any time after Phase 0.
Phase 8 is ongoing ops after launch.

Rough sequencing for one developer + Claude: 0+1 in week one (accounts in
the background), 2 in weeks 1–3, 3 in weeks 3–12, 4–5 in weeks 10–16,
6 in weeks 14–18, 7 as a 3–4 week track whenever parallelizable.
Full-parity v1 in stores: **~4–6 months**.

---

## Phase 0 — Monorepo & shared core

The foundation everything else sits on: one repo, shared TypeScript
packages, so game logic is written once and used by web, mobile, and
Instant Games.

- [ ] Convert repo to a workspace monorepo (npm workspaces + Turborepo):
      `apps/web` (current Vite app moved intact), `apps/mobile` (Expo),
      `apps/instant` (FB Instant build), `packages/core`,
      `packages/config` (shared tsconfig/eslint).
- [ ] Extract into `packages/core` (platform-agnostic, no DOM/react-dom
      imports — enforce with eslint rule):
      - [ ] Supabase client factory (storage adapter injected per platform)
            + generated `types.ts` as the single source of truth.
      - [ ] Auth logic from `AuthContext` (session, profile, sign-in/up/out).
      - [ ] Economy hooks: `useCurrency`, `useGameStake`, `usePlayLimit`,
            `useRewardTimers`, level/XP math (`calculateLevel`).
      - [ ] Game engine: question fetching, scoring, timers, power-up
            effects, star thresholds.
      - [ ] Missions, streaks, daily rewards, chest logic.
      - [ ] Multiplayer/realtime room sync (Supabase channels — works in RN).
      - [ ] i18n locale files (ka/en/es/fr/de/it/pt) + `t()` runtime.
- [ ] Web app consumes `packages/core`; verify zero behavior change
      (tests + preview screenshots) before any mobile work starts.
- [ ] CI: GitHub Actions matrix — web build/test as today, plus
      typecheck/tests for `packages/core` and `apps/mobile`.
- [ ] Environments: dev/prod Supabase env handling for all three apps;
      never ship service keys in clients.

## Phase 1 — Accounts, identifiers & compliance groundwork

Everything here has external lead times — file it all in week one.

- [ ] Apple Developer Program enrollment ($99/yr; D-U-N-S needed if
      enrolling as a company).
- [ ] Google Play Console account ($25 once). Note: new individual
      accounts must run a closed test with 12+ testers for 14 days before
      production access — plan the beta phase around this.
- [ ] Meta for Developers account + app (Instant Games product) — also
      grab it early because review queues are slow.
- [ ] AdMob account + app registrations (iOS/Android ad unit IDs).
- [ ] RevenueCat account, project, and both store app configs.
- [ ] Reserve identity: bundle ID `io.mytrivia.app` (replace the Lovable
      `app.lovable.*` id), app name "MyTrivia" in both stores.
- [ ] Sentry (or equivalent) project for mobile crash reporting.
- [ ] Compliance inventory (drives store forms later):
      - [ ] Data collected → App Privacy "nutrition labels" (Apple) and
            Data Safety form (Google): account data, purchase history,
            PostHog analytics, AdMob identifiers.
      - [ ] Account deletion: in-app path required by both stores — reuse
            the existing `/delete-account` flow natively.
      - [ ] Sign in with Apple is mandatory on iOS because Google login is
            offered — already supported in Supabase auth; verify natively.
      - [ ] ATT prompt (iOS 14.5+) before ad personalization; Google UMP
            consent flow for EEA/UK users.
      - [ ] Privacy policy + terms URLs (already exist) linked in listings.

## Phase 2 — Mobile app shell: navigation, design system, platform feel

The "meaningfully native" layer. Get this right before porting features.

- [ ] Expo app scaffold: latest SDK, TypeScript, Hermes, expo-router
      (native stack + bottom tabs), New Architecture on.
- [ ] Navigation architecture mirroring the web IA: tabs = Home,
      Discover, Play, Leaderboard, Profile; modals as native sheets.
- [ ] Platform-adaptive behavior (not one-size-fits-both):
      - [ ] iOS: swipe-back everywhere, large-title headers where they fit,
            native sheets with detents, SF Symbols for system-ish icons,
            haptics via expo-haptics mapped to game events.
      - [ ] Android: Material 3 components, predictive back, edge-to-edge,
            dynamic color (Material You) applied to the neutral surfaces
            (keep brand purple for identity), splash screen API.
- [ ] Design tokens package: port the Tailwind theme (colors, radii,
      spacing, type scale) into a shared tokens file consumed by RN styles.
- [ ] Typography: bundle Nunito + a Georgian-complete face (e.g. Noto Sans
      Georgian) — verify every screen renders Georgian correctly.
- [ ] Core component kit in RN: buttons (with the green play-button
      treatment), cards, stat pills, progress bars, avatar circle, badge,
      toast/snackbar per platform.
- [ ] Animation stack: Reanimated 3 (+ Skia only where needed) replacing
      GSAP/framer-motion equivalents; respect Reduce Motion.
- [ ] Lists on FlashList; images via expo-image with caching.
- [ ] Dark mode + Dynamic Type / font-scale audit baked into the kit from
      day one (cheaper than retrofitting).

## Phase 3 — Feature parity build-out

Port order chosen so each step is shippable to TestFlight/internal track.

- [ ] **3.1 Auth & session**: native Apple Sign-In
      (expo-apple-authentication), native Google Sign-In, email/username
      flows; session in expo-secure-store; deep-link auth callbacks.
- [ ] **3.2 Home**: logged-in home (mobile design), guest home,
      onboarding/signup modals, side menu, welcome flow.
- [ ] **3.3 Core quiz loop**: categories, level select, quiz screen
      (timer, questions, answers, in-game power-ups), results + stars/XP,
      play-limit + regen timer UX.
- [ ] **3.4 Economy**: coins/gems wallet, power-up inventory + use,
      missions, daily rewards, chest, streaks (UI only — logic already in
      `packages/core`).
- [ ] **3.5 Profile & social**: profile, avatar capture/pick
      (expo-image-picker/camera), animated avatars, friends list, invite
      links (universal links + Android App Links → `mytrivia.io/challenge/*`).
- [ ] **3.6 Leaderboards, notifications, settings**: leaderboards,
      notification center, settings (name/password/privacy), language
      switcher, account deletion.
- [ ] **3.7 Push notifications**: expo-notifications with APNs + FCM;
      Android channels (rewards, social, system); server-side send from
      Supabase edge functions; deep links from notification taps.
- [ ] **3.8 Multiplayer**: realtime rooms (lobby, start sync, rounds,
      results) over Supabase channels; challenge deep links; reconnect
      handling on app background/foreground.
- [ ] **3.9 TV mode (phone as controller)**: join by code + QR scan
      (expo-camera); controller screens; TV display itself stays web.
- [ ] **3.10 VIP**: status display, benefits gating (purchase flow itself
      lands in Phase 4).
- [ ] **Stretch — 3D world map**: R3F runs in RN via
      `@react-three/fiber/native` + expo-gl; port `packages/`-ready world
      code later. V1 ships the standard mobile home instead.

## Phase 4 — Monetization: native IAP + ads

- [ ] **RevenueCat IAP**
      - [ ] Products in both stores: VIP monthly + yearly (subscription
            group on iOS), 3–4 gem pack consumables; localized pricing.
      - [ ] react-native-purchases integration; entitlement "vip" +
            consumable grant flow.
      - [ ] RevenueCat webhook → Supabase edge function → same
            `subscription`/gems state the web writes; Supabase stays the
            single source of truth so web + mobile entitlements agree.
      - [ ] Restore purchases, family sharing setting, grace-period /
            billing-retry handling, refund revocation via webhook.
      - [ ] Paywall + gem shop screens per platform conventions (App Store
            review is strict here: price, term, restore button visible).
      - [ ] Keep Stripe on web only; never link out to web checkout from
            the iOS app (guideline 3.1.1).
- [ ] **AdMob** (react-native-google-mobile-ads)
      - [ ] Rewarded ads wired to existing mechanics: extra play when
            free plays exhausted, coin top-up, second-chance in quiz.
      - [ ] Interstitials only at natural breaks (post-results), frequency
            capped; no banners in gameplay.
      - [ ] ATT prompt sequencing (context screen → ATT) + UMP consent for
            EEA; non-personalized ads fallback.
      - [ ] VIP removes interstitials (selling point).
      - [ ] app-ads.txt served from mytrivia.io.

## Phase 5 — Native polish pass

What makes it feel like a real iOS app and a real Android app rather than
a port. Do after parity, before store screenshots.

- [ ] Haptic map audit: distinct feedback for correct/wrong/streak/reward.
- [ ] iOS: app icon variants (dark/tinted), quick actions (Play, Daily
      Reward), Live Activity for multiplayer round countdown (stretch),
      Game Center leaderboard mirror (optional — decide before submission).
- [ ] Android: themed (Material You) icon, home-screen widget for
      streak/daily mission (stretch), notification channel fine-tuning.
- [ ] Accessibility: VoiceOver/TalkBack pass over quiz flow (announce
      timer, answers, results), touch targets ≥44pt/48dp, contrast check.
- [ ] Performance budget: cold start < 2s on mid-range Android, 60fps
      quiz transitions, bundle size audit, react-query offline persistence
      + graceful offline states.
- [ ] Localization QA sweep in ka + en on both platforms (text overflow,
      Georgian line-breaking).

## Phase 6 — QA, beta, store submission

- [ ] Test rig: Maestro E2E for the golden paths (signup → play → result →
      IAP sandbox → restore), unit tests live in `packages/core`.
- [ ] Device matrix: small iPhone SE, current iPhone, budget Android,
      flagship Android, tablet sanity check.
- [ ] EAS Build + Submit pipelines; EAS Update (OTA) for JS-only fixes;
      Sentry release tracking; PostHog events mirrored from web taxonomy.
- [ ] TestFlight beta + Play closed track: recruit 15+ testers (satisfies
      Google's 12-tester/14-day rule), run ≥2 weeks, fix top crashes.
- [ ] Store listings: localized (ka/en) titles, descriptions, keyword
      research; screenshots per device class; 15–30s preview video; age
      rating questionnaires (expect 4+/Everyone with ads disclosure).
- [ ] Review prep: demo account for reviewers, notes explaining trivia
      content + multiplayer, IAP screenshots, export compliance (standard
      encryption exemption).
- [ ] Submit both; phased rollout (10% → 100% on Play, phased release on
      App Store); monitor crash-free rate ≥99.5% before scaling rollout.

## Phase 7 — Facebook Instant Games (parallel track)

Quick-play HTML5 variant on the existing question backend. Runs inside
Facebook/Messenger mobile surfaces; built from `apps/instant`.

- [ ] Meta app config: Instant Games product, `fbapp-config.json`,
      platform settings, test users.
- [ ] `apps/instant` build: Vite, aggressive budget — tiny initial bundle
      (loading screen + FBInstant handshake first, everything else lazy),
      asset pass (compressed sprites, no 3D, system-ish fonts).
- [ ] FBInstant SDK lifecycle: `initializeAsync` → progressive
      `setLoadingProgress` → `startGameAsync`.
- [ ] Identity bridge: FB signed player info verified in a Supabase edge
      function → maps to a lightweight guest identity (server-side
      verification of the signature, never trust client).
- [ ] Game design for the surface: 10-question quick rounds, daily
      challenge, streaks; Georgian + English question pools.
- [ ] Social loops (the reason to be there): `context.chooseAsync`
      challenge-a-friend with score to beat, custom share payloads,
      FB leaderboards API per context, bot re-engagement messages
      (respect messaging policy windows).
- [ ] Monetization v1: rewarded video via Audience Network placement IDs;
      Instant Games IAP later if traction.
- [ ] Analytics: FBInstant events + PostHog with a `platform=instant`
      dimension.
- [ ] Submission: Instant Games review with test instructions; iterate on
      rejection feedback (common: loading time, broken context flows).

## Phase 8 — Launch & live ops

- [ ] Release train: fortnightly app releases, EAS Update hotfixes
      between; keep web/mobile/instant on the same `packages/core` version.
- [ ] Dashboards: store analytics + RevenueCat + AdMob + PostHog rollups;
      KPIs: D1/D7 retention, crash-free %, ARPDAU, rewarded-ad engagement,
      Instant Games K-factor (invites sent per player).
- [ ] Review-response routine and store-listing A/B tests (Play Store
      experiments, App Store product page optimization).
- [ ] Post-launch backlog seeds: 3D world map on mobile, widgets/Live
      Activities from Phase 5 stretch list, Instant Games IAP, tablet/iPad
      layout, Game Center/Play Games achievements.

---

## Key risks to keep in view

1. **The `packages/core` extraction is the whole ballgame.** If web-only
   assumptions (DOM, localStorage, framer-motion) leak into shared code,
   every later phase pays for it. Gate Phase 2 on a clean extraction.
2. **Full parity is a long first release.** Ship every 3.x milestone to
   TestFlight/internal track as it lands so feedback arrives continuously,
   not at month four.
3. **App Store review of IAP + ads + ATT** is the likeliest rejection
   source — follow the Phase 4 checklist literally.
4. **Google's 14-day closed-test rule** hard-gates Play production access —
   start the closed test the moment 3.3 (core loop) is stable.
5. **Instant Games loading budget** is a real review criterion — keep
   `apps/instant` free of the main app's heavy dependencies from day one.
