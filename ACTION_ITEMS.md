# Action items — things only you can do

Everything here blocks progress and cannot be done from inside the repo.
Ordered by what unblocks the most downstream work.

Full context for each is in [`docs/IOS_LAUNCH_PLAN.md`](docs/IOS_LAUNCH_PLAN.md).

---

## 1. Apple Developer account — blocks everything

Nothing in P3 onward can be verified without this, and the enrolment itself
has a lead time measured in weeks if you enrol as a company (D-U-N-S number
required).

- [ ] **Enrol in the Apple Developer Program** ($99/yr)
- [ ] **Register App ID `io.mytrivia.app`** with these capabilities:
      In-App Purchase · Push Notifications · Sign in with Apple ·
      Associated Domains
- [ ] **Create the App Store Connect record** and reserve the name "MyTrivia"
- [ ] **Sign the Paid Applications Agreement and complete the banking and tax
      forms.** This one is easy to leave for later and shouldn't be:
      **StoreKit returns zero products until it clears**, so no purchase can
      be tested at all — sandbox included.

## 2. Third-party accounts

- [ ] **RevenueCat** — create the project and the iOS app config
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
| ~~`REVENUECAT_SECRET_API_KEY`~~ | ~~Supabase secret~~ | **Done and verified.** Must be a **V1** key — a V2 key returns 403 code 7723 against the `/subscribers` endpoint the code uses |
| ~~`REVENUECAT_WEBHOOK_SECRET`~~ | ~~Supabase secret + RevenueCat~~ | **Done and verified** — wrong and missing secrets both rejected with 401, correct one accepted |
| ~~`VITE_REVENUECAT_IOS_API_KEY`~~ | ~~Build env~~ | **Done** — in `.env.example`; copy to your local `.env` |
| `VITE_ADMOB_IOS_REWARDED` | Build env | Falls back to a demo unit — ads show, revenue is zero |
| `VITE_ADMOB_IOS_INTERSTITIAL` | Build env | Same |
| `VITE_VIDEO_BASE_URL` | Build env | Native falls back to `https://mytrivia.io`; set it explicitly if videos move |
| ~~Apple **Team ID**~~ | ~~AASA file~~ | **Done** — `T38XQSM4L3` |

Both RevenueCat secrets are set and verified. Neither goes in the repo, in
`.env`, or in a workflow — they are platform secrets, and the secret key can
read and modify every subscriber on the account. See
[`supabase/functions/README-entitlements.md`](supabase/functions/README-entitlements.md).

`.env` **is** tracked, deliberately: it holds only the Supabase project ref
and the publishable anon key, both public by design, and three build systems
read it — the GitHub deploy workflow, Lovable, and local builds. Untracking it
broke two of them. `.env.example` documents the rest.

## 4. Xcode, once you have the account

These need the Xcode UI and a signing identity:

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

- [ ] **Generate `public/videos/mobile/*.mp4`** (480px, H.264).

      Only the WebM variants were ever generated. **WebM does not play in
      WKWebView below iOS 17.4**, and this app supports iOS 15 — so on most
      iPhones in service the `<source>` chain skips the WebM and falls through
      to the *desktop* MP4, several megabytes each. Extend
      `scripts/convert-videos-webm.sh` to emit H.264 at the mobile size, then
      set `VITE_MOBILE_MP4_AVAILABLE=true`. The code already prefers them when
      that flag is on.

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
