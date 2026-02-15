

## Add Bronze Variant to "ნახე რეიტინგი" Button

### Problem
The Bronze league button uses the `"gold"` variant (line 48 in `Leaderboards.tsx`):
```
const variant = tier === 3 ? "gold" : tier === 2 ? "silver" : "gold";
```
There's no `"bronze"` variant in ChunkyButton, so Bronze falls back to Gold -- making them identical.

### Fix

**1. `src/components/ui/chunky-button.tsx`** -- Add a `bronze` variant

- Add `"bronze"` to the variant type union on line 6
- Add bronze color definition after the gold block (after line 128), using warm copper/brown tones:
  - Face gradient: from `#CD7F32` (classic bronze) via `#A0522D` (sienna) to `#8B4513` (saddle brown)
  - Depth/border/stroke: darker browns (`#6B3410`, `#7B3F1A`, `#4A2508`)
  - Glow: warm bronze `rgba(205, 127, 50, 0.5)`

**2. `src/pages/Leaderboards.tsx`** -- Use `"bronze"` for tier 1 (line 48)

Change:
```
const variant = tier === 3 ? "gold" : tier === 2 ? "silver" : "gold";
```
To:
```
const variant = tier === 3 ? "gold" : tier === 2 ? "silver" : "bronze";
```

### Result
Each league will have a distinct button color: copper-brown for Bronze, gray for Silver, and gold for Gold.
