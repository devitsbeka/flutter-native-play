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

### 1a. Deal with the existing app record first

There is already a record on App Store Connect (Apple ID `6757699196`, name
"MyTrivia", status *1.0 Prepare for Submission*) left over from Lovable. Its
bundle id is:

```
app.lovable.f54c9281c7aa40a48ea74b75d0ffa3d4
```

**A bundle id cannot be changed after the record is created.** This repo is
built around `io.mytrivia.app` — `capacitor.config.ts`, the Xcode project,
`src/config/site.ts`, and the `apple-app-site-association` file that carries
`T38XQSM4L3.io.mytrivia.app`. Reusing the record means adopting the Lovable
id permanently, in crash reports, the App ID list, and the AASA.

The record has **never been released**, so throwing it away costs nothing —
no users, no reviews, no ratings, no App Store URL in circulation. Replacing
it now is free; changing your mind later is not.

- [ ] **Rename the old record** (App Information → Name → e.g. "MyTrivia
      Legacy") and save. This releases the name "MyTrivia" so the new record
      can claim it — an app name is held exclusively by whichever record
      reserved it, including an unreleased one.
- [ ] **Delete the old record** once the new one is up (My Apps → the app →
      App Information → Delete App). Available because it never shipped.

If you'd rather keep the record, the alternative is to change this repo's
bundle id to `app.lovable.f54c…` in the four places above. It works, and it's
a worse identifier forever. The recommendation is to replace the record.

### 1b. Register the App ID, then create the record

Order matters: App Store Connect populates its bundle-id dropdown from
registered App IDs, so an unregistered `io.mytrivia.app` simply won't appear.

- [ ] **Register App ID `io.mytrivia.app`** (Certificates, Identifiers &
      Profiles → Identifiers) with four capabilities:
      In-App Purchase · Push Notifications · Sign in with Apple ·
      Associated Domains
- [ ] **Create the new App Store Connect record** against that bundle id and
      reserve the name "MyTrivia"

### 1c. Create the seven products

Both subscriptions are **monthly**. PRO and Friends PRO are feature tiers
(1 vs 5 friend invites), not billing periods, and the app renders both with a
"/month" label — see `PRO_TIERS` in `components/profile/ProPlansSection.tsx`.
Creating the $7.99 one as a yearly product would undercharge by 12x and put a
price on screen that doesn't match the one Apple charges, which is a
guideline 2.3.1 rejection on the same screen that shows it.

Subscriptions need a **Subscription Group** before any can be created. Put
both in the **same group** — that's what lets a subscriber move between tiers
as an upgrade rather than a second, parallel subscription.

| Product ID | Type | Duration | Price | Grants |
|---|---|---|---|---|
| `io.mytrivia.pro.monthly` | Auto-renewable | 1 month | $3.99 | `pro` |
| `io.mytrivia.proplus.monthly` | Auto-renewable | 1 month | $7.99 | `pro_plus` |
| `io.mytrivia.adfree` | Non-consumable | — | (your call) | `ad_free` |
| `io.mytrivia.gems.100` | Consumable | — | $0.79 | 100 gems |
| `io.mytrivia.gems.500` | Consumable | — | $3.19 | 500 gems |
| `io.mytrivia.gems.1500` | Consumable | — | $7.99 | 1500 gems |
| `io.mytrivia.gems.5000` | Consumable | — | $23.99 | 5000 gems |

- [ ] **Create all seven**, and check each identifier against
      `PRODUCTS` in `supabase/functions/_shared/iap.ts` character by
      character. That table is the only thing that turns a purchase into an
      entitlement; an id that doesn't match it means the purchase succeeds,
      Apple takes the money, and the user gets nothing. There is no error
      anywhere in that path.
- [ ] **Mirror all seven in RevenueCat and attach them to an offering.**
      Products that exist in RevenueCat but sit outside an offering are not
      returned to the app. The paywall reads its prices from StoreKit now, so
      a product missing from the offering renders the compiled fallback
      price instead of the real localized one.

The self-check once this is done: on a device, a paywall showing `$3.99`
means the chain is broken somewhere and it fell back to the number compiled
into the bundle. A paywall showing a real store price — including the right
currency for the storefront — means App Store Connect, RevenueCat and the
offering are all wired correctly. See `src/hooks/useStorePrice.ts`.

## 2. Third-party accounts

- [ ] **Supabase Apple provider** — add `io.mytrivia.app` to the Apple
      provider's **Client IDs** (Authentication → Providers → Apple). Native
      Sign in with Apple sends the bundle id as the client id
      (`AuthContext.tsx:330`) and Supabase validates the token audience
      against that list. Miss it and every native Apple sign-in fails while
      the web flow keeps working, which makes it read as a device problem.
      Guideline 4.8 makes this mandatory, not optional, because Google
      sign-in is offered.
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
