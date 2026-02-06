

# Fix: Coin Balance Race Condition in Game Results

## Problem Identified

There is a critical race condition in `MatchResultScreen.tsx` that corrupts the player's coin balance after every game.

### Root Cause

On line 364 of `MatchResultScreen.tsx`:
```js
coins: (currentProfile.coins || 0) + levelUpCoins,
```

This does an **absolute overwrite** of the `coins` column using a stale snapshot (`initialProfileRef`). It races against the atomic RPC calls from `awardWin()` / `awardDraw()` which already correctly updated coins in the database.

### What Happens (Win example)

```text
1. User starts with 2,000 coins
2. VSScreen: deductStake() -> RPC deducts 500 -> DB: 1,500
3. initialProfileRef captures coins: 1,500
4. User wins
5. awardWin() -> RPC adds 1,000 -> DB: 2,500  (correct!)
6. updateProfile({ coins: 1,500 + 0 }) -> DB: 1,500  (OVERWRITES win reward!)
```

The player wins but ends up with 1,500 instead of 2,500. The win reward is silently erased.

### Secondary Issue: Double-Write in useCurrency

Every `addCoins` / `spendCoins` call does TWO database writes:
1. Atomic RPC: `update_user_currency` (correct, locked)
2. Redundant `updateProfile({ coins: X })` (absolute write, can race)

If two currency operations overlap, the second `updateProfile` from the first operation can overwrite the RPC result of the second operation.

## Fix

### File 1: `src/components/game/MatchResultScreen.tsx`

**Remove `coins` from the `updateProfile` call.** Currency changes are already handled by the RPC-based `awardWin/awardDraw/awardLose`. Adding `coins` here creates the overwrite.

For level-up coins, use the atomic `addCoins()` function instead of an absolute write.

**Before:**
```js
await updateProfile({
  total_points: newPoints,
  games_played: ...,
  // ...other stats...
  coins: (currentProfile.coins || 0) + levelUpCoins,  // BUG: overwrites RPC results
});
```

**After:**
```js
await updateProfile({
  total_points: newPoints,
  games_played: ...,
  // ...other stats...
  // coins removed -- handled by awardWin/awardDraw/awardLose RPC calls
});

// Level-up coins added atomically via RPC (separate from game rewards)
if (levelUpCoins > 0) {
  await addCoins(levelUpCoins);
}
```

This requires importing `addCoins` from `useGameStake` or `useCurrency`. Since `useCurrency` is already available via `useGameStake`'s internals, we'll use `useCurrency` directly.

### File 2: `src/hooks/useCurrency.ts`

**Replace the redundant `updateProfile` DB write with a local-only state update** after RPC calls. The RPC already updated the database -- we just need to sync local state.

**Before (in addCoins/spendCoins/addGems/spendGems):**
```js
if (data && data.length > 0) {
  await updateProfile({ coins: data[0].new_coins, gems: data[0].new_gems });
}
```

**After:**
```js
if (data && data.length > 0) {
  // Only sync local state -- DB already updated by RPC
  await updateProfile({ coins: data[0].new_coins, gems: data[0].new_gems });
}
```

Actually, the `updateProfile` call here is problematic because it does a second DB write. We should instead create a lightweight local-only profile setter. But since `updateProfile` also does `setProfile(data)` which syncs the UI, and changing it requires modifying `AuthContext`, a safer minimal fix is:

- In `AuthContext.tsx`, add a `setProfileLocal` method that updates React state without a DB write
- In `useCurrency.ts`, use `setProfileLocal` instead of `updateProfile` after RPC calls

### File 3: `src/contexts/AuthContext.tsx`

Add a new `setProfileLocal` method to update the profile in React state without writing to the database:

```ts
const setProfileLocal = (updates: Partial<Profile>) => {
  lastLocalUpdateRef.current = Date.now();
  setProfile(prev => prev ? { ...prev, ...updates } : prev);
};
```

Export it through the context so `useCurrency` can use it.

## Summary of Changes

| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Add `setProfileLocal` method for local-only state updates |
| `src/hooks/useCurrency.ts` | Replace `updateProfile` with `setProfileLocal` after RPC calls to prevent double DB writes |
| `src/components/game/MatchResultScreen.tsx` | Remove `coins` from `updateProfile` call; use atomic `addCoins()` for level-up coins |

## Expected Results After Fix

Starting with 2,000 coins:
- **Win**: 2,000 - 500 (stake) + 1,000 (reward) = **2,500 coins** (net +500)
- **Draw**: 2,000 - 500 (stake) + 250 (refund) = **1,750 coins** (net -250)
- **Lose**: 2,000 - 500 (stake) = **1,500 coins** (net -500)

