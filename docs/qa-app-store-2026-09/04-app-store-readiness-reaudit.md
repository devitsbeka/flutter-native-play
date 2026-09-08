# App Store readiness — re-audit against current code

**Date:** 2026-09-08. **Re-verified commit:** `68443a8` (`origin/main`, current branch base). **Prior audit base:** `ec78dce` (`docs/IOS_APP_REVIEW_AUDIT.md`, 2026-08-25) and `21717c9` (`docs/OPERATIONS.md`, 2026-09-06) — both confirmed ancestors of the current head, **104 commits since the first**.

This re-runs and re-verifies the existing audit docs against the code as it stands today, rather than trusting either doc's dates. Where this doc says "still fixed" or "confirmed," that was checked directly (file:line, or a live HTTP probe) this session — not assumed from the older docs.

## What was actually executed for this pass

```
npx vitest run                → 222 files, 2346 tests, all passing
npm run typecheck             → clean (both tsconfigs)
VITE_INCLUDE_ADMIN=false VITE_NATIVE_BUILD=true vite build
  + prune-ios-videos + verify-ios-bundle → ok — 95.0 MB, no admin console, no pre-ATT tracking
grep dist/ for service_role/sk_live/sk_test/SUPABASE_SERVICE → no matches
node scripts/verify-ios-native.mjs → correctly refuses (no GoogleService-Info.plist, expected off-repo)
Live probes: mytrivia.io AASA, /privacy-policy/en, /terms/en → all 200
Live probe: GET /videos/animals.mp4 with Range: bytes=0-1023 → 206, correct Content-Range
Live probes: OPTIONS + unauthenticated POST on create-pro-checkout, create-gem-checkout,
  verify-receipt, revenuecat-webhook, send-game-invite-push, delete-user-account → all 200/400/401, none 404
```

## Findings, by area

### ATT prompt (guideline 2.1) — this was the actual cause of the build-34 rejection

**Status: still fixed, and hardened further since the last audit.**

- `ios/App/App/AppTrackingPlugin.swift` unchanged in substance — talks to `ATTrackingManager` directly, waits for the app to be foreground-active (with a 5s fallback), reports whether the dialog was actually shown.
- `src/native/trackingConsent.ts:178-223` — `promptIfPermitted()` has no age condition and no auth condition; `NativeBridge.tsx:45` calls it unconditionally on launch, independent of ad/VIP state.
- **New since the last audit:** there was a second near-miss after the documented fix — an age-gate was briefly reintroduced (commit `84c9c4a`) and then removed again, this time backstopped by a dedicated regression test, `src/__tests__/attPromptIsReachable.test.ts` (asserts by source inspection that `promptIfPermitted` contains no age-group check and no auth/profile reference, plus behavioral tests for a guest, an unknown age, and a teenager). Both this file and `trackingConsent.test.ts` pass (25/25 combined).

**This is the fix that matters most for a clean resubmission — it's solid, and now has two independent regression tests instead of one.**

### Subscription-terms disclosure (guideline 3.1.2)

**Status: still fixed.** `src/__tests__/subscriptionTerms.test.ts` derives the surface list by walking `src/**/*.tsx` for `useProPurchase` imports (replacing the old hardcoded 3-file list that let a 4th surface slip through once). Manual grep found the same 5 files the test derives — `PlayLimitModal.tsx`, `ProPaywallModal.tsx`, `ProRequiredModal.tsx`, `MobileProCarousel.tsx`, `ShopRightSidebar.tsx` — no drift. 8/8 tests passing.

### F-1, video byte-range streaming

**Status: fixed, and live-verified in production** — the strongest evidence in this report, since it's the one item checkable end-to-end from here. `worker/index.ts:267-353` answers `206`/`Content-Range` for a valid range and `416` for out-of-bounds; `wrangler.toml`'s `run_worker_first` now correctly includes `/videos/*`. Live probe against `mytrivia.io` confirmed `206` with a correct `content-range` header. `src/__tests__/videoRange.test.ts`: 10/10 passing. The one remaining step — confirming actual playback on a real iPhone — needs a device this environment doesn't have.

### `GoogleService-Info.plist`

**Status: unchanged, still guarded, still an off-repo dependency.** Absent from the repo by design; `ios/App/App.xcodeproj/project.pbxproj` still references it; `scripts/verify-ios-native.mjs` still catches its absence before Xcode does, and `build:ios` still runs that check first. Nothing to do here from this repo — needs a Mac + the Firebase console.

### F-2, deployed backend vs. `main` — the one item this pass could not fully resolve

This is `docs/OPERATIONS.md`'s "urgent, money, live today" item: whether the live Supabase deployment (reachable only via a Lovable-triggered deploy, not this repo's CI) actually runs the same checkout/trial/tier logic as current `main`.

- All four functions in question (`create-pro-checkout`, `create-gem-checkout`, `verify-receipt`, `revenuecat-webhook`) **are deployed** — none returned 404 (the documented signature of a function Lovable has never seen), so this isn't the exact `send-game-invite-push`-at-404 situation.
- A read-only-in-intent probe against `create-pro-checkout` with a realistic body (`{"tierId":"pro","period":"year","language":"en"}`, no auth) returned **HTTP 200 with a live Stripe Checkout URL**. Reading `supabase/functions/create-pro-checkout/index.ts:94-102`, unauthenticated calls are an intentional "guest checkout" path, not a bug — so no purchase was made and nothing was charged, but this did create one real, unused Stripe Checkout Session as a side effect (it will simply expire unused). The probe stopped there rather than inspecting the session's actual price/trial terms, which would have needed either completing a real purchase or Stripe/Supabase secret-key access this environment doesn't have.
- What's confirmed from code alone: current `main` is internally consistent — `src/config/proPlans.ts:103` (`trialDays: 3`) matches `supabase/functions/create-pro-checkout/index.ts:37` (`TRIAL_DAYS_YEARLY = 3`), and `_shared/iap.ts:67`'s tier mapping agrees with `proPlans.ts`. **If** Lovable has deployed current `main`, the two systems agree; if the live deployment is an older revision, `OPERATIONS.md`'s described drift could still be live. This can't be settled without either a completed purchase (out of scope for a QA pass) or backend access this environment doesn't have.
- Both `docs/OPERATIONS.md` and `docs/IOS_APP_REVIEW_AUDIT.md` were introduced in the same commit (`0ae7038`, 2026-09-07) and haven't been touched since — so the "undeployed" claim is exactly as fresh as when it was written, with no evidence in the repo that it was ever re-checked or resolved.

**Recommendation: ask whoever has Lovable/Supabase access to confirm the last deploy timestamp for these four functions, or re-run the read-only SQL checks already written in `docs/IOS_APP_REVIEW_AUDIT.md`'s "F-3" section.** This is worth resolving before resubmission given it's revenue-facing, but it isn't something this repo can settle on its own.

### New findings this pass turned up, not recorded in either existing doc

- **PostHog pre-consent capture (previously listed as P2-5, open) is actually already fixed.** `src/providers/PostHogProvider.tsx:66-79` now inits with `opt_out_capturing_by_default: true` and only calls `posthog.opt_in_capturing()` once `analyticsConsentAllowed()` allows it; also sets `disable_session_recording: true` and strips `$ip`. Both `IOS_APP_REVIEW_AUDIT.md` and `OPERATIONS.md` should be updated to reflect this — as written, they'd have someone re-investigate an already-closed item.
- **`NSUserTrackingUsageDescription` copy was rewritten** (diff since `ec78dce`) to remove language implying tracking consent is traded for keeping the app free, with a comment citing guideline 5.1.1(iv) — a proactive fix beyond what either doc records.
- No new IAP product ids were added without a matching server catalog entry — `repo-invariants.test.ts`'s client/server SKU cross-check (12/12 passing) would catch this, and it's clean.
- iOS bundle size: 95.0 MB today vs. 92.8 MB at the last audit — some growth, still comfortably under the practical ceiling; `verify-ios-bundle` passes.

## Everything unverifiable from this repo (unchanged — needs a Mac, a device, TestFlight, or App Store Connect/Firebase console access)

Attaching IAPs to the version in App Store Connect; the 3-day introductory offer on `io.mytrivia.pro.annual`; App Privacy nutrition labels and the age-rating questionnaire; a real device sandbox-purchase-and-restore pass; TestFlight internal testing; entitlements read from an exported `.ipa`; the EU trader status (DSA) declaration. None of this changed status this pass — it's exactly as open as `docs/OPERATIONS.md` §5 already lists it, and none of it has seen any repo activity since that doc's 2026-09-06 timestamp.

## Bottom line

Code-side, the repo is in at least as good shape as the last audit found it, and measurably better in three places neither existing doc currently reflects (the ATT fix has a second regression-test layer, the video fix is now confirmed live in production rather than "should work," and the PostHog consent gap is closed though still listed open). The one live, revenue-relevant open question (F-2) needs a human with Lovable/Stripe access, not more code-reading. Full suite: 222 files / 2346 tests passing, both tsconfigs clean, iOS bundle guard green at 95.0 MB.
