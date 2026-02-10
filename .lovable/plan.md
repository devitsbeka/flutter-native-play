

## Fix Build Error + Leaderboard AI Coin Overlap

### 1. Fix Build Error in `PowerUps.tsx` (line 272)

The ternary `item.currency === "lari" ? "lari" : "gems"` is redundant and causes a type error because TypeScript infers `item.currency` as `"coins" | "gems"` at that point (the `"lari"` branch is unreachable in the type system).

Both `ShopItem.currency` and `trackShopItemPurchased` accept the same type `"gems" | "coins" | "lari"`, so the fix is to pass `item.currency` directly:

```
// Before
currency: item.currency === "lari" ? "lari" : "gems",

// After
currency: item.currency,
```

| File | Change |
|------|--------|
| `src/pages/PowerUps.tsx` | Line 272: replace ternary with `item.currency` |

### 2. Fix AI User Coin Overlap in Leaderboard

In `src/hooks/useLeaderboardPrefetch.ts`, the default AI coin ranges overlap between tiers:
- Bronze: 200 -- 1,500
- Silver: 1,000 -- 2,500 (overlaps with Bronze)
- Gold: 5,000 -- 9,000

Fix by ensuring strict separation:
- Bronze: 200 -- 900
- Silver: 1,500 -- 3,500
- Gold: 5,000 -- 9,000

| File | Change |
|------|--------|
| `src/hooks/useLeaderboardPrefetch.ts` | Lines 34-37: adjust `maxAiCoins` and `minAiCoins` defaults to eliminate tier overlap |

