

# Fix: PRO Users Should Never See "Stop" Modals

## Problem
PRO users are seeing play-limit and feature-gate modals that should only appear for free users. The root cause is that several components independently check VIP status but don't account for the loading state -- when `isVip` is still `false` during initial fetch, clicking triggers the modal incorrectly.

## Solution
Apply a consistent pattern across all affected components: if VIP status is still loading, never show a blocking modal. If `isVip` is true, always allow the action.

## Changes

### 1. `src/components/social/TriviaPortfolioCard.tsx`
- Import `loading` from `usePlayLimit()`
- In `handlePlayClick`: if `isVip` OR `loading` (VIP not yet determined), navigate directly instead of showing PlayLimitModal

### 2. `src/components/social/PlayerFeedItem.tsx`
- Import `loading` from `usePlayLimit()`
- In `handlePlayClick`: same fix -- if `isVip` OR `loading`, navigate directly

### 3. `src/contexts/PlayGuardContext.tsx`
- Add `loading` from `usePlayLimit()` to the guard check
- In `guardPlay`: if `loading` is true, allow play (don't block while data loads)
- In `guardCategoryPlay`: same -- allow while loading

### 4. `src/hooks/useProGating.ts`
- In `requirePro`: if `loading` is true, execute the callback (don't block while VIP status loads)

### 5. `src/components/game/MatchResultScreen.tsx`
- Already checks `!isVip` correctly, but add `loading` guard so the "play again" button doesn't show the limit modal while VIP data is still loading

## Technical Notes
- The core fix is: **never show a blocking/gating modal while VIP status is still loading**
- All 5 locations that independently show PlayLimitModal or ProRequiredModal will be patched
- The `usePlayLimit` hook already exposes `loading` -- it just isn't being used in most consumers
- `useCategoryPlayLimit` and `useProGating` both have `loading` available from `useVipStatus`
