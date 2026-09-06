# MyTrivia — economy and monetization

*Every number a model needs, with the file it lives in. Written 2026-09-06 from
`main` @ `21717c9`. Values read out of `src/config/`; store and console state is
marked as off-repo.*

---

## 1. Where the numbers live

| File | Holds |
|---|---|
| `src/config/rewardConfig.ts` | The spine: stakes, regeneration, daily rewards, chest, spin table, level-up, gem rate, starting balance, power-up prices, VIP gem prices, multiplayer payouts, feed-trivia payouts |
| `src/config/pricing.ts` | Every real-money price, in every currency the app charges in |
| `src/config/proPlans.ts` | The three subscription rows and the tier each grants |
| `src/config/gemPacks.ts` | The four gem consumables and their store product ids |
| `src/config/extraPlays.ts` | What another game costs once the free five are gone |
| `src/config/shopDeals.ts` | The rotating daily and hourly deals |
| `src/config/bundleContents.ts` | What each bundle grants — shared by the grant step and the receipt so the two cannot drift |
| `src/config/leaderboardRewards.ts` | The weekly top-10 prize ladder |
| `src/utils/multiplayerPayout.ts` | Room placement payouts |
| `economy_config` (table) | Runtime overrides for much of the above, editable from the admin Economy console **without a deploy** |

Several of these are *mirrors* of a server rule, pinned together by a test that
reads the SQL migration. `extraPlays.ts` mirrors `buy_extra_plays`;
`proPlans.friendSeats` mirrors `pro_seat_allowance`; `partyCategories`'
100-point payout mirrors `settle_most_likely_votes`; `gemPacks` mirrors
`PRODUCTS` in `supabase/functions/_shared/iap.ts`. **The database is always the
authority**; the client copy exists so a button can render without a round trip.

## 2. Currencies

- **Coins** — earned by playing.
- **Gems** — premium, bought with money or won rarely.
- **Exchange rate: 1 gem = 500 coins.** Gems → coins only, via
  `exchange_currency`, at the server's rate; sub-gem amounts are rejected.
- **New player grant: 3,000 coins + 3 gems.**

All balance changes go through `update_user_currency`, which refuses positive
deltas from a signed-in caller. Wallet columns are locked against direct client
writes.

## 3. The play economy

| Parameter | Value |
|---|---|
| Quick Game stake | **500 coins** — win returns +500, loss forfeits, draw neutral. PRO skips it entirely |
| Free plays | **5 per rolling 3-hour window**, counted server-side by `consume_free_play()` against `free_plays_used` / `free_plays_window_start` columns the client cannot write |
| Extra plays | 1 game = 500 coins **or** 1 gem **or** 1 rewarded ad · 3 games = 1,500 coins **or** 3 gems (no ad — an ad worth three would make gems the worse deal) |
| Rewarded ad cap | 5 per day |
| Legacy fallback rule | Lifetime free games + one regenerating play every 3 hours |
| Free-tier campaign cap | One level per standard category; the picture-guess categories are fully free; nine premium categories are PRO-only |

`usePlayLimit` deliberately ships **two rules at once**: if the migration has not
reached the database it detects the missing columns and falls back to the legacy
rule, switching over automatically once the columns appear. Neither deploy
ordering can lock a player out.

When plays run out the player can wait out a live countdown, watch a rewarded ad
for +1, spend gems, or subscribe.

## 4. Subscriptions — PRO, Friends PRO, and seats

Two tiers, three purchasable rows. **The tiers are feature tiers, not billing
periods**, and what separates them is how many friends they carry.

| Row | Product id | Tier granted | Seats | USD | GEL | EUR |
|---|---|---|---|---|---|---|
| Monthly | `io.mytrivia.pro.monthly` | `pro` | 1 | $3.99 | 4.99 ₾ | €3.99 |
| Friends PRO monthly | `io.mytrivia.proplus.monthly` | `pro_plus` | 5 | $7.99 | 9.99 ₾ | €7.99 |
| Annual | `io.mytrivia.pro.annual` | **`pro_plus`** | 5 | $23.88 | 59.88 ₾ | €23.88 |
| *(defined, not created)* | `io.mytrivia.pro.weekly` | — | — | — | — | — |

The annual row grants `pro_plus` on purpose — in lari the year costs the same
per month as the monthly plan, and what it buys is the four extra seats. In
dollars and euro it is also half the monthly rate. The `tier` field is the only
thing that decides seat count, so getting it wrong would sell five seats and
hand over one; `src/__tests__/proOffer.test.ts` reads the SQL to keep client and
server agreed.

**PRO benefits**: 2× XP · unlimited plays (no free-play window) · no game stake ·
no ads · 4 daily spins instead of 1 · one free power-up of each type daily · PRO
badge and exclusive frames · unlimited rooms, trivia, collections and avatar
generations · **1 PRO seat to give a friend**. `pro_plus` adds enhanced daily
rewards (1.5×) and **5 seats**.

**PRO seats** are a referral mechanism embedded in the price ladder: a seat is
full PRO for another player, lasting as long as the subscription that paid for
it, revocable at any time. Every rule lives in the database —
`grant_pro_seat` reads the granter from `auth.uid()` and the allowance from the
paid subscription, and a trigger on `vip_subscriptions` expires seats when the
paying subscription ends. Seats are given to accounts that already exist; the
old flow granted at signup, the insert was refused by RLS, and the friend saw a
success message and received nothing.

**Gating** is centralized in `useProGating(feature)` — `rooms`, `trivia`,
`collection`, `avatar`, `animation`, `general` — which **queues** requests made
while subscription status is still loading rather than letting them through, and
shows `ProRequiredModal` otherwise.

**PRO can also be bought with gems**: day 30 · 2 days 55 · week 100 (52% off
daily) · month 250 (72% off).

**Free trials are split by platform, deliberately.** `trialDays` in
`proPlans.ts` is the **web** offer and must match `TRIAL_DAYS` in
`create-pro-checkout` or Stripe will not honour it. On a phone it is ignored
entirely — only App Store Connect can grant a trial, so the paywall reads it off
the store product (`IAPProduct.introFreeDays`). Advertising a trial StoreKit
will not honour is a 2.3.1 rejection.

**On native, an empty StoreKit catalogue yields an empty plan list, and that is
correct.** It used to fall back to a monthly row priced from a hardcoded USD
figure — two rejections on one screen: a price Apple would not charge (2.3.1)
and a purchase that cannot complete (2.1). The paywall now renders an explicit
"store unavailable" state with a disabled button.

## 5. Consumables — gems

| Product id | Price (USD) | Gems | Gems per $ |
|---|---|---|---|
| `io.mytrivia.gems.100` | $0.99 | 100 | 101 |
| `io.mytrivia.gems.500` | $3.99 | 500 | 125 |
| `io.mytrivia.gems.1500` | $12.99 | 1,500 | 116 |
| `io.mytrivia.gems.5000` | $34.99 | 5,000 | 143 |

GEL: 2.72 · 10.97 · 35.72 · 96.22 ₾. EUR mirrors USD.

**Known pricing defect:** the 1,500 pack is worse value per dollar than the 500
pack (116 vs 125), which gives a buyer a reason to purchase two 500s instead.
Any price below **$11.97** restores a monotonic curve. Prices stay editable;
product ids never do.

`gems` in `gemPacks.ts` is the **total credited** — base plus bonus, the number
the card promises. That distinction is not cosmetic: the shop once advertised
"700 +200" and passed `value: 700` to checkout, so the bonus was never granted
on any platform. Adding a pack means adding it here, creating the consumable in
App Store Connect and RevenueCat, **and** adding it to `PRODUCTS` in
`supabase/functions/_shared/iap.ts`, which decides how many gems it grants.
`repo-invariants.test.ts` fails if those disagree.

## 6. Prices are never converted

`src/config/pricing.ts` is one table because the app once had three answers to
"what does PRO cost": one surface said $3.99, the checkout charged 9.99 ₾, and a
third multiplied the first by 2.75 — so a Georgian buyer was quoted 10.97 ₾ and
charged 9.99 ₾. Gems had the same fault in reverse.

**The rule: nothing is converted, ever. A price exists in each currency or it
does not exist, and the figure shown is the figure taken.**

Currency follows language: `ka` → GEL, `en` → USD, `de`/`es`/`fr`/`it`/`pt` →
EUR, anything unlisted → USD (a euro price is a closer guess for a Spanish
speaker than a lari one). On a phone **none of this is displayed** — StoreKit
hands back the storefront's own localized string and that always wins, because
quoting a price Apple will not charge is a 2.3.1 rejection. These are the web's
prices and what a device shows in the moment before the store answers.

`formatMoney` writes money the way the buyer's language writes it — "9,99 €",
"$3.99", "9.99 ₾" — with a hand-written path for GEL because engines disagree on
whether to print "GEL 9.99" or "₾9.99".

## 7. Coin faucets

| Source | Payout |
|---|---|
| Daily reward, 7-day cycle | 200 / 300 / 400 / 500 / 750 / 1,000 / 1,500 coins, +1 gem on day 7 (~6,750/week) |
| Treasure chest | 50–250 coins per 24h, +1 gem at weekends |
| Lucky spin | 100–500 coins, rare 1 gem, or a power-up. 1/day free, 4/day PRO, +2 per ad |
| Level completion | `score × 10 + stars × 20` |
| Account level-up | 150 coins + 1 random power-up, every 20 correct answers |
| Multiplayer 1st | `min(500 × opponents beaten, 1,000) + own score`; 2nd/3rd half their score; others 100 |
| Feed trivia | 5 coins + 5 XP per correct, +25 coins / +10 XP perfect, 50 coins for a full collection |
| Most Likely To | 100 flat for voting with the majority |
| Missions | XP + coins + gems + power-ups, granted instantly |
| Mission streak (30 days) | 300 coins + 15 gems + 250 XP |
| Weekly category leaderboard | 1st: 2,000 coins + 25 gems + exclusive frame, down to 150 coins + 1 gem at 10th |

**Power-up prices** (coins), priced against the 500-coin stake: 50/50 = 150 ·
Freeze = 100 · Time Drain = 100 · Replace = 75.

**The pressure point.** A free player's weekly faucet (~6,750 coins) funds
roughly 13 staked games, against a free-play ceiling of up to 40 a day. The gap
between what a player wants to play and what the faucet funds is what PRO and
gems are sold into. Change any of the 3-hour window, the 500-coin stake or the
daily faucet and the whole conversion curve moves — and all three are
runtime-tunable, so the economy can be rebalanced against real data without an
app release.

## 8. The shop

`/power-ups`. Sections: **Coins** (500 → 15,000 for 1 → 24 gems, with escalating
bonuses) · **Gems for real money** · **PRO** · **Powers** (×3 packs) ·
**Mega Powers** (2× or 10× of all four, 12–30% off) · **Frames** · starter and
mega bundles.

**Rotating deals** are the hero row: a **daily deal** rotating at local midnight
and an **hourly flash deal** rotating on the hour, each bundling PRO time +
powers + coins at 40–55% off. Which deal is active derives from the date/hour,
so every player sees the same offer simultaneously. Every deal carries PRO time,
because the banner draws three fixed tiles (PRO, powers, coins) and one without
it would claim something the purchase does not grant. Deals never contain raw
gems — that is the currency you buy them *with*.

`config/bundleContents.ts` is the single source of truth for what a bundle
grants, shared by the grant step and the transaction receipt so they cannot
drift. `purchase_transactions`, `gem_purchases`, `shop_products` and
`iap_products` record everything; `verify-receipt` validates native purchases
and `stripe-gem-webhook` completes web ones (and is required to verify its
signature — an invariant test refuses a webhook that just `JSON.parse`s the body).

## 9. Advertising

**Rewarded video only, and strictly opt-in.** An ad plays only when a player
presses a button that says so: extra plays after the free window, bonus spins,
power-ups. There are **no interstitials** — the interstitial code path exists in
`adService.ts` but has no call sites anywhere in the app, by deliberate product
policy. PRO subscribers and all web users bypass ads entirely.

The rewarded gate **fails open**: a 12-second deadline before the ad appears,
120 seconds once it is visibly playing, one retry on genuine failure, and
`onProceed` always runs exactly once. A broken ad network can never trap a
player behind a spinner — which also means ad impressions are not guaranteed per
gated action.

**App Tracking Transparency** is asked **at launch** from `NativeBridge`, behind
a full-screen explanation whose single action leads to Apple's own dialog,
through a dedicated `AppTrackingPlugin.swift` that waits for the app to be
active. This is a correction: deferring the prompt to the first ad is excellent
for opt-in rates and is what got build 34 rejected under guideline 2.1 — ads are
opt-in, so App Review never reached one and reported the prompt missing. Three
further suppressors compounded it (a VIP early-return above the consent call, a
"Not now" that wrote a permanent localStorage flag, and ATT riding on the AdMob
plugin's dynamic import). `src/__tests__/trackingConsent.test.ts` locks in all
four fixes. **Do not "improve" this by moving the prompt back behind a feature.**

Child-directed treatment and under-age-of-consent handling derive from the age
gate.

**Ad unit ids** live in `.env` (public — they identify a placement and authorize
nothing). Note the punctuation, because the two are easy to swap and neither
fails loudly: an **app id** uses `~` and lives in `Info.plist` as
`GADApplicationIdentifier`; an **ad unit** uses `/`. Unset, `adService.ts` falls
back to Google's demo units, which serve ads perfectly and earn nothing — which
was the state for some time. *(Off-repo: confirm the real units are live in the
AdMob console.)*

## 10. The dormant line — ad-free

`io.mytrivia.adfree` was a non-consumable whose only entry point was
`AdFreeModal`, which `Index` rendered and never opened. A product App Review
cannot reach is a 2.1 rejection the moment it is attached to a submission, and
PRO already includes ad removal — so the id was **removed from `IAP_PRODUCTS`
and deliberately not created in App Store Connect**. The server still recognises
it (`PRODUCTS.AD_FREE` in `_shared/iap.ts`) so any existing entitlement keeps
resolving on restore. Selling it again means giving it a real entry point first,
not just putting the id back.

## 11. Cost structure

No dollar figures, because there is no usage to measure. These are the lines a
model must carry:

| Line | Driver |
|---|---|
| App Store commission | Gross IAP revenue; Small Business Program rate applies below the annual threshold — verify the current rate at model time |
| Stripe fees | Web checkout volume. Web is the lower-commission channel — a margin argument for driving web purchases where store rules permit |
| RevenueCat | Tracked subscription revenue above a free tier |
| Supabase | Database size, realtime connections, edge invocations, storage. **The line most sensitive to concurrency, not to registered users** — realtime multiplayer and TV mode are connection-intensive |
| Cloudflare Workers | Requests. Bandwidth is unmetered, which is why it was chosen for a build carrying ~280 MB of video |
| AI inference | New content produced. Variable and throttleable |
| Avatar / cover generation | **The cost line worth watching**: a free, non-paying, highly engaged user can consume per-user AI image and video generation. Quotas exist and are enforced separately for scenes and portraits (5 per type PRO, 2 free) |
| Firebase FCM | Push volume; negligible at this scale |
| Apple Developer Program | $99 / year |

## 12. What a financial model cannot get from this repo

Revenue to date is **$0** — the product has never been publicly released.
Everything below is **UNKNOWN, post-launch data required**: installs and CAC by
channel; D1/D7/D30 retention; free→paying conversion; subscription mix;
subscription churn; gem pack frequency and mix; rewarded-ad eCPM in Georgia and
elsewhere; ARPDAU/ARPPU; the viral coefficient from TV mode, challenge links and
PRO seats; Supabase cost per thousand DAU.

What the app *can* tell you on day one, because the instrumentation is already
built: PostHog with identity bootstrapped on the first event, purchase
analytics, session tracking, an admin economy-health and revenue dashboard, a
`currency_grants` ledger for every credit, an `iap_events` ledger for every
purchase event, and per-question analytics counters.

**Recommended approach:** treat §§2–8 as fixed mechanics, run scenarios over the
unknowns, and re-base after 30 days of live data. The economy is runtime-tunable,
so the balance can be moved to meet the model rather than the model rewritten to
meet the balance.

## 13. Channel inconsistencies worth knowing

- The tiers are named differently across surfaces — **"Friends PRO"** on the
  store, **"Family PRO"** on web — for the same product.
- Web gem checkout historically recorded amounts in a field named `amount_gel`
  while charging USD. A reporting-hygiene item, not a charging error; the
  pricing rework addressed the charging side.
- The gem ladder is non-monotonic in value (§5).
