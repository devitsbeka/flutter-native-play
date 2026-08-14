# Action items — things only you can do

Everything here blocks progress and cannot be done from inside the repo.
Ordered by what unblocks the most downstream work.

> **Doing the work?** Follow
> [`docs/LAUNCH_RUNBOOK.md`](docs/LAUNCH_RUNBOOK.md) instead — same items,
> arranged in the order they have to happen, with the verification step for
> each. This file is the inventory; the runbook is the sequence.

Full context for each is in [`docs/IOS_LAUNCH_PLAN.md`](docs/IOS_LAUNCH_PLAN.md).

---

## 1. Apple Developer portal — the account exists, the setup does not

Enrolment is done (`hello@itsbeka.com`, Team ID `T38XQSM4L3`), the Paid
Applications Agreement is signed, and the banking and tax forms are in. That
removes every step on this list that had a waiting period attached. What
remains is configuration, and **the order below matters** — three of these
steps create things Apple will never let you rename.

- [x] ~~Enrol in the Apple Developer Program~~
- [x] ~~Paid Applications Agreement, banking, tax~~ — done. This was the one
      gate in front of StoreKit returning any products at all.

### 1a–1c. Done

The Lovable record (bundle id `app.lovable.f54c9281…`, permanent and wrong)
was deleted and replaced. Everything below is confirmed against the code.

- [x] ~~Old record deleted, name released~~
- [x] ~~App ID `io.mytrivia.app` registered~~ — In-App Purchase, Push
      Notifications, Sign In with Apple, Associated Domains
- [x] ~~New App Store Connect record~~ — **MyTrivia: Party Quiz Game**.
      The long name is the store listing only; `CFBundleDisplayName` is
      `MyTrivia`, so the home screen icon reads MyTrivia either way
- [x] ~~Subscription group **MyTrivia PRO**~~ — `io.mytrivia.proplus.monthly`
      at level 1, `io.mytrivia.pro.monthly` at level 2, both **1 month**
- [x] ~~Four gem consumables~~ — `.100` $0.99 · `.500` $3.99 · `.1500` $12.99
      · `.5000` $34.99. All six ids verified character-for-character against
      `PRODUCTS` in `supabase/functions/_shared/iap.ts`

Still open on the products:

- [x] ~~Localizations and review screenshots on all six~~ — every product
      reads **Ready to Submit** in App Store Connect and in RevenueCat, which
      is the same fact seen twice: RevenueCat mirrors Apple's status, so six
      green rows there means StoreKit will return them in sandbox.

      Subscriptions show "Prepare for Submission" rather than "Ready to
      Submit". Same state, different wording, and it does not clear until the
      first build ships — "your first subscription group must be submitted
      with a new app version". Not to be confused with **Missing Metadata**,
      which looks similar and means StoreKit returns nothing at all.

      Screenshots were captured with `scripts/capture-store-screenshots.mjs`
      against the dev server. App Store Connect validates them against real
      device resolutions, not the 640x920 minimum its own documentation
      quotes — a 780x986 crop was rejected, the same content as a full
      1242x2208 screen was accepted.

- [ ] **`io.mytrivia.adfree` — deliberately not created.** `AdFreeModal` is
      mounted in `Index.tsx` but `setIsAdFreeModalOpen(true)` is never called,
      so nothing in the app can open it. An in-app purchase with no reachable
      path is a question at review. Wire up an entry point first; products can
      be added any time.
- [ ] **The 1500 pack is worse value than the 500 pack** — 116 gems per dollar
      against 125. Nothing breaks, but it gives a buyer a reason to buy two
      500s instead. Any price below **$11.97** puts the curve back in order.
      Prices stay editable; ids do not.

## 2. Third-party accounts

- [x] ~~**Supabase Apple provider**~~ — Services ID `io.mytrivia.signin`, the
      bundle id in the Client IDs list, secret generated from the Sign in with
      Apple key. **The secret is a JWT Apple caps at six months** — regenerate
      before it lapses or new web sign-ins start failing, silently, while
      existing sessions and the native path carry on working.
- [x] ~~**RevenueCat**~~ — project rebuilt, iOS app on `io.mytrivia.app` with
      the In-App Purchase key uploaded, all six products imported, webhook
      returning 200, secret key confirmed **V1** (a V2 key returns 403 code
      7723 against the `/subscribers` endpoint `_shared/iap.ts` calls, and
      every symptom of that is server-side).
- [x] ~~**RevenueCat offering**~~ — `default`, six packages, one product each.
      Worth recording how this went wrong once: the `gems_5000` package was
      wired to `io.mytrivia.gems.1500`, leaving the 5000 pack in no package at
      all. Nothing announced it. `products` is built from offering packages, so
      the pack would have shown the `$34.99` compiled into the bundle instead
      of the store price — right by coincidence in the US, wrong everywhere
      else, on the screen a reviewer taps to buy. `purchase()` now logs when it
      falls through to the no-package path.
- [ ] **AdMob** — register the iOS app, create a **dedicated iOS** rewarded
      unit and a **real** interstitial unit (the interstitials currently point
      at Google's demo units, which serve ads and earn nothing)
- [ ] **Firebase** — project, plus an **APNs authentication key (.p8)**
      uploaded. Push cannot deliver to iOS without it.
- [ ] **Sentry** or equivalent — iOS crash reporting

## 3. Values to fill in

Until these are set, the code that depends on them is inert. It fails loudly
rather than silently — that was deliberate — but it still doesn't work.

| Value | Where it goes | What breaks without it |
|---|---|---|
| `REVENUECAT_SECRET_API_KEY` | Supabase secret | Re-issued for the rebuilt project and set. Must still be a **V1** key — a V2 key returns 403 code 7723 against the `/subscribers` endpoint the code uses |
| `REVENUECAT_WEBHOOK_SECRET` | Supabase secret + RevenueCat | Rotate alongside the rebuilt project. Supabase only ever shows a digest, so the old value cannot be read back to paste into the new webhook — generate a fresh one and set it in both places. The mechanism itself was verified: wrong and missing secrets both rejected with 401, correct one accepted |
| ~~`VITE_REVENUECAT_IOS_API_KEY`~~ | ~~Build env~~ | **Done** — re-issued for the rebuilt RevenueCat project and committed to `.env`. Public by design: it ships inside the binary and identifies the app, it does not authorise anything |
| `VITE_ADMOB_IOS_REWARDED` | Build env | Falls back to a demo unit — ads show, revenue is zero |
| `VITE_ADMOB_IOS_INTERSTITIAL` | Build env | Same |
| `VITE_VIDEO_BASE_URL` | Build env | Native falls back to `https://mytrivia.io`; set it explicitly if videos move |
| ~~Apple **Team ID**~~ | ~~AASA file~~ | **Done** — `T38XQSM4L3` |

Neither RevenueCat secret goes in the repo, in
`.env`, or in a workflow — they are platform secrets, and the secret key can
read and modify every subscriber on the account. See
[`supabase/functions/README-entitlements.md`](supabase/functions/README-entitlements.md).

`.env` **is** tracked, deliberately: it holds only the Supabase project ref
and the publishable anon key, both public by design, and three build systems
read it — the GitHub deploy workflow, Lovable, and local builds. Untracking it
broke two of them. `.env.example` documents the rest.

## 4. Xcode — needs a Mac

None of this can be done from a Linux container, and it is the last
structural gap. There is currently **no `.entitlements` file** in the
project: Capacitor does not generate one, and it is created by adding the
capabilities below. Without it Push, Sign in with Apple and Associated
Domains are all inert regardless of what the App ID says.

- [ ] Set the **Team** on the App target
- [ ] Add the **Associated Domains** capability:
      `applinks:mytrivia.io` and `applinks:www.mytrivia.io`
- [ ] Add the **Push Notifications** capability
- [ ] Add the **Sign in with Apple** capability
- [ ] Run **Product → Archive → Generate Privacy Report** and check it against
      `ios/App/App/PrivacyInfo.xcprivacy` before the first upload

## 5. Deploy-side

- [ ] **Optional but tidier: add the Supabase build values as repository
      secrets** — `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`,
      `VITE_SUPABASE_PUBLISHABLE_KEY`.

      Nothing is broken without this. `.env` used to be committed and the
      deploy workflow relied on it; untracking the file would have made
      production builds compile with an undefined backend and deploy an app
      that could not reach Supabase at all. The workflow now passes the values
      explicitly, falling back to the public project ref and anon key that
      were in this repo's history anyway. Setting the secrets overrides the
      fallbacks and is the better long-term home for them.

      `vite build` now refuses outright when those two values are missing,
      rather than shipping a bundle that compiles and is dead on arrival.

- [ ] Confirm `https://mytrivia.io/.well-known/apple-app-site-association`
      returns **200**, `content-type: application/json`, and **no redirect**.
      Apple's CDN is strict about all three and fails silently if any is
      wrong. `curl -sI` it after deploying.
- [ ] Confirm `https://mytrivia.io/app-ads.txt` is reachable, and that the
      developer website on both store listings points at that domain — AdMob
      matches the two, and a mismatch means the file is never found.
- [ ] Confirm the host serving `VITE_VIDEO_BASE_URL` serves `/videos/*`,
      including the `mobile/` subdirectory. **The iOS build no longer ships
      the video library** — it streams it.

## 6. Video encoding — needs ffmpeg

The iOS bundle went from 394 MB to **130 MB** by pruning the video library
out of it and streaming instead. Two follow-ups need a machine with ffmpeg,
which this environment doesn't have.

- [ ] **Generate `public/videos/mobile/*.mp4`** — the script is written, it
      just needs a machine with ffmpeg:

      ```bash
      brew install ffmpeg          # if needed
      bash scripts/convert-videos-mobile-mp4.sh
      ```

      Then set `VITE_MOBILE_MP4_AVAILABLE=true` in `.env` and rebuild. The
      files existing is **not** what switches this on — `getResponsiveVideoSrc`
      reads the flag, so without it phones keep getting the desktop MP4.

      Only WebM variants were ever generated, and **WKWebView cannot play WebM
      below iOS 17.4** while this app supports iOS 15. So on most iPhones in
      service the `<source>` chain skips every WebM and falls through to the
      *desktop* MP4 — 720p, several megabytes each, 63 of them. The mobile
      tier exists and is empty for exactly the devices that need it most.

      Encoding is H.264 main/4.0, yuv420p, `+faststart`, 480px, no audio —
      chosen for the iOS 15 floor rather than for size. Takes a while at
      `preset slow`; it is a one-time cost and re-running skips what exists.

- [ ] **Re-encode or move the 8 MP4s imported from `src/assets/`** — 46 MB.

      These are bundled as ES module imports, so the video pruning doesn't
      reach them. They are the single largest remaining item in the bundle.
      Moving them to `public/videos/` and referencing them by path would let
      them stream like everything else.

Between them those two items are 88 MB of the remaining 130 MB.

---

## 7. A decision on images — 48 MB, but it's your artwork

The 125 PNGs across `src/assets/` and `public/images/` are **57.2 MB**. I
measured the options rather than guessing, and the result is not what I
assumed when I first wrote this list:

| Approach | Result | Quality |
|---|---|---|
| Lossless PNG recompression | **No gain at all** (files get *larger*) | Pixel-identical |
| PNG palette quantisation | 57.2 → 12.0 MB (79% off) | **Visibly degraded** — worst case a 239/255 delta |
| **WebP lossless** | **57.2 → 30.2 MB (47% off)** | **Pixel-identical — no decision needed** |
| WebP q95 | 57.2 → 9.3 MB (84% off) | Lossy, near-transparent |
| WebP q90 | 57.2 → 7.1 MB (88% off) | Lossy, usually still fine on UI art |

Two things worth knowing. The PNGs are **already optimally compressed** —
there is no free lossless win hiding in them, which is what I'd assumed.
And a per-file quality gate on quantisation converts almost nothing, so
that route is all-or-nothing degradation.

WebP is the real option, and it's supported in WKWebView from iOS 14, so the
iOS 15 floor is no constraint.

**Lossless WebP is free money**: 27 MB off, pixel-identical output, nothing to
review. That alone takes the bundle from 130 MB to about **103 MB**.

Going lossy at q90 would take it to roughly **82 MB** instead — but that's a
judgement call on your own artwork, which is why it's here rather than done.

- [ ] **Confirm you want the image set converted to WebP, and at what
      quality.** Say "lossless" and I'll just do it — there's no downside to
      weigh. Say q90/q95 and I'll produce a before/after sheet for you to
      eyeball first. Either way I'll implement it as a build-time conversion so
      no import paths change.

## 8. Decisions I need from you

- [ ] **Gem pack pricing.** Four consumables are defined
      (`io.mytrivia.gems.{100,500,1500,5000}`) matching the packs the web shop
      already sells at $0.79 / $3.19 / $7.99 / $23.99. Confirm those prices,
      or give me the tiers you want, before they're created in App Store
      Connect — changing a live IAP price is far more painful than getting it
      right first.

- [ ] **Age rating.** Expect 12+ given ads and social features. The
      questionnaire is in App Store Connect, so it needs the account.

      The Guideline 1.2 half of this is **now handled**: reporting and
      blocking are built. `user_reports` and `user_blocks` had existed in the
      schema with correct RLS and an admin review path since early on, and
      nothing in the app had ever written to either — the same shape as the
      push tokens table. Blocked players are filtered from the feed, and
      Settings → Privacy lists who you've blocked with a way back.

- [ ] **iPad.** Not currently a target, but the app runs in compatibility mode
      and reviewers do open it. Worth ten minutes on a simulator to decide
      whether it's acceptable or needs hiding.

---

## Not blocked — what I can keep doing

P3 performance and accessibility work, and the remaining bundle reduction
that doesn't need ffmpeg. P4 (signing, CI, purchase testing) and P5
(TestFlight, listing, submission) are gated on section 1.
