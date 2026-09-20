# Why a paid PRO subscription never unlocked PRO

**Date:** 2026-09-20 · **Fix:** `4023a3705` · **Build:** 70

The symptom, reported six times across six builds and in these words:

> i am subscribed and i still see that subscribe for PRO button on shops page,
> when i click on it it shows IOS FUCKING MODAL saying i already subscribed for
> it, when i dismiss it it shows HEY CONGRATS YOU SUBSCRIBED NOW kinda thing as
> if I JUST subscribed

Each of the six previous builds fixed a real bug on that path and none of them
fixed *this* one, because this one is not on the client at all.

---

## The measurement

Not inferred. RevenueCat's own customer record for the app user id the device
was running as (`215a70e6-d279-4815-956e-12fc3b5fdfe1`), sandbox data shown:

```
Customer history
  Resubscribed to Friends PRO Monthly (io.mytrivia.proplus.monthly)   19 Sep 17:27
  Got their purchases transferred from a22491af-e2a1-4072-bee0-…      19 Sep 17:00
Entitlements
  Friends PRO Monthly — Subscription · renews in 2 hours
```

RevenueCat had the subscription, on the right customer, active and renewing.
The app showed no PRO. So the break is between RevenueCat and
`vip_subscriptions` — which is `verify-receipt` → `_shared/iap.ts`.

Project settings, same session:

| Setting | Value |
|---|---|
| Transferring purchases seen on multiple App User IDs | **Transfer to new App User ID** |
| Use a different behavior for sandbox | off |
| Sandbox testing access | Anybody |

So the transfer is *intended*. The subscription is meant to follow the person.

---

## The cause

`vip_subscriptions` carries a partial unique index on
`apple_original_transaction_id`, so one store subscription can never light up
two accounts. `syncSubscription` upserts with `onConflict: "user_id"` — so a
row holding that transaction under a **different** `user_id` does not merge,
it raises `23505`.

The handler returned `{ tier: null }` and gave up. Permanently: the collision
was with a row nothing would ever clear, so the next purchase, the next
restore and every launch after that hit the same wall.

Signing in as a second Supabase account on the same phone is all it takes —
a reinstall, a deleted-and-recreated account, a tester. RevenueCat moves the
subscription and says so. Our table did not move with it.

### A second fault in the same line

The key it collided on was `original_purchase_date` alone:

```ts
transactionId: (sub?.original_purchase_date as string) ?? productId,
```

That has **second precision**. Two unrelated people subscribing in the same
second collide on the unique index, and the second one is refused the
subscription they have just paid for.

---

## The fix

**Server** (`_shared/iapEntitlements.ts`) — on `23505`, complete the transfer:
find who holds the transaction, release the claim, expire the row if the store
granted it, retry the write once. An admin grant or a referral reward in the
same row keeps its expiry and only stops claiming the transaction, so somebody
else's purchase cannot cancel it.

The key is now `productId:original_purchase_date` — one subscription, and
still stable across renewals, which `store_transaction_id` is not.

**Client** (`useInAppPurchases.ts`) — reconcile once per signed-in session on
launch. `syncEntitlements` previously ran only from a purchase, a restore or
the gem poll, so a subscription the database had failed to record stayed
unrecorded until the player thought to press Restore Purchases. That is
verbatim the other report: *"when i exited app and launched it again it still
showed Buy button for Solo PRO regardless of fact that I already
subscribed."* Detached and silent — it refreshes what is on screen and
announces nothing, because a launch must never produce a congratulations
modal.

**Structure** — the rules moved to `_shared/iapEntitlements.ts`, free of Deno
globals and `https://` imports, so a test can execute them instead of reading
them. `iap.ts` keeps the secret key and the fetch and re-exports the rest;
`deno check` passes on all three functions that import it.

---

## What it is checked with

12 new tests, **each confirmed to fail against the unfixed code**:

| File | Covers |
|---|---|
| `subscriptionFollowsTheBuyer.test.ts` | the transfer, the admin-grant exception, the give-up path, the unrelated-row scope, and the transaction key (scoped by product, stable across renewal, present with no purchase date) |
| `purchaseFlow.behaviour.test.tsx` | the launch reconcile: runs once, refreshes VIP, announces nothing, does not repeat on remount, retries after a failure, stays out when signed out |

Full suite: **3409 passing**, three consecutive clean runs. `npm run
typecheck`, `npm run build`, and `deno check` on `verify-receipt`,
`revenuecat-webhook` and `stripe-gem-webhook` all pass.

---

## What has to happen for this to take effect

1. **Lovable must deploy `verify-receipt` and `revenuecat-webhook`.** The
   server half is inert until then, and shipping an iOS build deploys nothing
   server-side. Prompt: `~/Desktop/mytrivia-lovable/deploy-prompt-2026-09-20.txt`
2. **Build 70 must be installed** for the client half.

After the deploy, the stuck account heals itself on the next sync without any
SQL: the new key (`io.mytrivia.proplus.monthly:…`) does not collide with the
bare date the old row holds, so the write simply succeeds, and the old row is
expired by its own next sync.

---

## Not the cause — checked and ruled out

- **"Unattached products" in RevenueCat.** The dashboard shows Friends PRO
  Monthly under *Unattached products*, meaning no RevenueCat *Entitlement*
  contains it, so `customerInfo.entitlements.active` is empty. Harmless here:
  nothing in this codebase reads `entitlements` — the server reads
  `subscriber.subscriptions` and the client reads
  `customerInfo.activeSubscriptions`, both of which are product-keyed and
  populated. Worth configuring if RevenueCat paywalls are ever used; not a bug
  today.
- **Transfer behaviour.** Already the permissive setting. Changing it would
  have made this worse, not better.
