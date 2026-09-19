# Submission readiness — MyTrivia 1.0 (66)

**Date:** 2026-09-19
**Build:** 66 · **Submission:** `d1d303a2` (9 items, `READY_FOR_REVIEW`, **not submitted**)

Every line below was verified against the live App Store Connect API, the
shipped IPA, or the ASC web UI today. Nothing is asserted from memory. Where I
could not verify something, it says so rather than being counted as passing.

---

## VERDICT

**Two items block a confident submission**, and neither is metadata:

1. **`revenuecat-webhook` has not been redeployed** — server-side
2. **Build 66 has never been purchase-tested on a device** — the one thing that
   has gone wrong six times running

Everything Apple actually wrote up in both rejections is now cleared and
evidenced. The residual risk is not paperwork; it is whether a purchase
completes end to end on a real phone.

---

## CLEARED — with evidence

### Both rejections, item by item

| Rejection | Guideline | State | Evidence |
|---|---|---|---|
| Advertising not declared | 2.3.6 | ✅ | `advertising: true` (API + questionnaire UI) |
| UGC not declared | 2.3.6 | ✅ | `userGeneratedContent: true` (API + UI) |
| No Restore Purchases | 3.1.1 | ✅ | three surfaces — paywall, shop, Settings — each answering in a `GameModal` |
| IAP buttons unresponsive | 2.1(b) | ⚠️ | root causes fixed (see below); **not device-verified on 66** |
| IAPs not submitted with binary | 2.1(b) | ✅ | all 7 in submission `d1d303a2` |
| Each IAP needs a review screenshot | 2.1(b) | ✅ | 4 consumables uploaded + verified; 3 subs already had them |
| ATT prompt not found | 2.1 | ✅ | `NSUserTrackingUsageDescription` present; not re-raised in the 2nd rejection |

### What actually caused "buttons unresponsive", all fixed

| Fault | Fix |
|---|---|
| `finally` never ran — two unbounded awaits above it | both bounded |
| `ensureIdentified` swallowed failure → charge against `$RCAnonymousID` | reports failure; `purchase()` now **refuses to charge** |
| `!synced.success` returned without announcing | announces, with the server's own reason |
| `catch` reported only through a swallowed toast | announces, carrying Apple's message |
| `storeInit` cached a resolved-empty catalogue forever | throws instead; retries 2s/5s/15s + on app resume |
| PRO written but UI never re-read it | `applyEntitlement` from `customerInfo` + realtime |

### Metadata & build

| Item | State |
|---|---|
| Age rating | advertising ✓ · UGC ✓ · contests `FREQUENT` · simulatedGambling `INFREQUENT` · **16+** |
| `pro.annual` description | *"Double XP, no ads, VIP badge and 5 friend invites."* — matches paywall + `pro_plus` grant |
| Screenshots | 6.7" / 6.5" / 5.5" for all 6 locales |
| Localizations | all 6 complete (description, keywords, supportUrl) |
| Privacy policy | set for all 6 locales |
| Demo account | required ✓, name + password set, notes 1960 chars |
| Review contact | name, email, phone all set |
| Content rights | `USES_THIRD_PARTY_CONTENT` |
| Build 66 IPA | v1.0 (66) · appex 66 · iOS 15.4 · privacy manifest ✓ · `Apple Distribution` · `get-task-allow: false` · `aps-environment: production` · `usesNonExemptEncryption: false` |
| Diagnostics | `loggingBehavior` and timing logs **removed** from 66 |

### Guidelines beyond the rejections

| Guideline | Item | State |
|---|---|---|
| 5.1.1(v) | Account deletion | ✅ `/delete-account` + Settings entry |
| 4.8 | Sign in with Apple beside Google | ✅ |
| 5.1.1 | ATT + camera + photo usage strings | ✅ |
| 1.2 | UGC report / block / server-side `blocked_terms` | ✅ |
| 3.1.2 | Auto-renewal, cancellation, payment, Terms + Privacy | ✅ |
| 3.1.1 | No external payment on native (`NATIVE_BUILD` compiles Stripe out) | ✅ |
| 2.3.1 | Unreleased surfaces excluded; `verify-ios-bundle` fails if a chunk leaks | ✅ |

### Server

| Change | State | Evidence |
|---|---|---|
| `verify-receipt` | ✅ deployed | returns `{"success":true,...}` in 0.84s |
| `_shared/iap.ts` (23505 no longer kills the sync) | ✅ via `verify-receipt` | Lovable confirmed bundling |
| `vip_subscriptions` realtime | ✅ applied | websocket subscribe returned `ok` with a subscription id |

---

## PENDING

### P1 · `revenuecat-webhook` not redeployed — MEDIUM

The endpoint is live (`401` in 0.79s), but it was **not** included in Lovable's
deploy, so it still bundles the **old** `_shared/iap.ts` — the version where a
`23505` on `vip_subscriptions_apple_txn_unique` throws and takes the whole sync
down.

**Why it matters:** this is the path RevenueCat uses for renewals,
cancellations and retries. It is not on the reviewer's first-purchase path, so
it is unlikely to cause *this* rejection — but it is the exact failure that
silently stopped every gem purchase from crediting for days.

**Fix:** one Lovable deploy of `revenuecat-webhook`. No build needed.

### P2 · Build 66 not device-tested — HIGH

Builds 57, 58, 59, 60, 62 and 64 each fixed a real bug and each still failed on
the device. 66 is the first build with everything combined **and it has never
completed a purchase on a phone.**

13 behavioural tests now execute the real hook against a mocked plugin and
would have caught all six historical bugs — but a mock is not StoreKit.

**Fix:** on build 66, confirm: gem purchase → modal + balance; PRO → instant
unlock without relaunch; restore signed-out → proper modal; failed purchase →
Apple's own message.

---

## CANNOT VERIFY — stated rather than assumed

- **Which `_shared/iap.ts` each deployed function bundles.** Supabase exposes no
  version endpoint. P1 is inferred from Lovable deploying only `verify-receipt`.
- **App Privacy nutrition label.** `appDataUsages` and `appPrivacyDetails` return
  404 for this key's role. Previously recorded as declaring tracking (Device ID
  + Advertising Data), consistent with the ATT string and the two Google ad
  domains in the privacy manifest — but not re-confirmed today.
- **Whether Apple's sandbox will behave for the reviewer.** A device capture
  caught four consecutive purchases failing with RevenueCat code 2 (*"problem
  communicating with the Store"*) — an Apple-side fault. Build 65+ now surfaces
  that message instead of going silent, which is the best mitigation available,
  but it cannot prevent a reviewer hitting the same thing.

---

## CORRECTIONS to the earlier audit (`APP_REVIEW_AUDIT_2026-09-19.md`)

Two findings in that document were **wrong** and are withdrawn:

**H4 — "prices come from the compiled fallback, not the store."** False. When
`getOfferings()` returns empty, `initStore` falls back to
`getProducts(ALL_PRODUCT_IDS)`, which returns real StoreKit products, and
`useStorePrice` renders `product.price` (`priceString`) with `fromStore: true`.
The device log confirms all 7 products carrying real prices (`$0.99`, `$12.99`…).
The in-app error string claiming otherwise is itself misleading. **No 2.3.1
price risk.**

**B1's detection method.** The ASC API relationships for IAP review screenshots
(`appStoreReviewScreenshot`, `images`, `versions`) return **404 for this key's
role**, so the audit reported MISSING whether or not a screenshot existed.
Verification is by reloading the IAP page — done for all four.

---

## Submission contents — `d1d303a2`

```
appStoreVersion   1.0 (build 66)      READY_FOR_REVIEW
inAppPurchase     gems.100/500/1500/5000   ×4
subscription      pro.monthly, pro.annual, proplus.monthly   ×3
subscriptionGroup MyTrivia PRO         ×1
                                       = 9 items, submitted: null
```

Old submissions `71c735ab` and `6fdcd50e` are both `COMPLETE`.

---

## Recommendation

Do **P1** (one Lovable deploy) and **P2** (one purchase on a phone). Neither
needs a new build. With both done, every finding from both rejections is closed
with evidence and the remaining risk is Apple's sandbox, which no app controls.

Submitting before P2 would mean shipping a purchase flow that has failed on a
device six times and has not been seen working once.
