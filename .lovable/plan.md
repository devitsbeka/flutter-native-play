
## Fix Play Limit Bypass -- Security Audit and Fixes

### Problem Found
There is a critical hole in the play-limit system: **the regen play is never consumed in most entry points**, allowing unlimited free games.

### Root Cause Analysis

The play limit relies on `canPlay = isVip || playsRemaining > 0 || regenPlayAvailable`. When a user exhausts all 5 free plays, `regenPlayAvailable` becomes `true` because `last_play_regen_at` is `null` (first regen is free). This makes `canPlay = true`.

**Hole 1: Regen play consumed in only 1 of 6+ entry points**
- `Index.tsx handlePlayClick` (line 248-252) is the ONLY place that calls `useRegenPlay()` before navigating to `/game`
- All `guardPlay()` call sites (SideMenuDrawer, SpotlightSearch, IslandAdventureMap, VideoAdventureMap, LevelBadge) return `true` when `canPlay` is true but never consume the regen
- `Game.tsx` auto-starts matchmaking if `canPlay` is true, without consuming regen
- Since `last_play_regen_at` stays `null`, `regenPlayAvailable` stays `true` forever -- unlimited free games

**Hole 2: LevelInfoModal "Continue" button bypasses all checks**
- `Index.tsx` line 384-388: the level modal's "Continue" button navigates directly to `/game` with the comment "Play limit is already checked" -- but it is not checked

**Hole 3: `useRegenPlay` doesn't update local profile state**
- After consuming a regen play in the DB, the local `profile` object still has `last_play_regen_at = null` until the realtime subscription delivers the update (could be 1-3 seconds)
- During this window, `canPlay` is still `true`, allowing a second game start

### Solution

Centralize regen consumption in two places to close all holes:

**1. `PlayGuardContext.tsx` -- consume regen when guardPlay allows play**
- When `guardPlay` returns `true` and the user has exhausted free plays and regen is available, auto-consume the regen play
- This covers: SideMenuDrawer, SpotlightSearch, IslandAdventureMap, VideoAdventureMap, LevelBadge

**2. `Game.tsx` -- consume regen before starting matchmaking**
- Add regen consumption check before `startMatchmaking()` as a safety net for direct navigation

**3. `usePlayLimit.ts` -- update local state immediately after consuming regen**
- After `useRegenPlay()` succeeds, immediately mark `regenPlayAvailable = false` in local state using a ref/state, preventing the race condition window

**4. `Index.tsx` -- fix LevelInfoModal "Continue" to go through guardPlay**

### Files to Change

| File | Change |
|------|--------|
| `src/hooks/usePlayLimit.ts` | Add local state to track regen consumption; immediately set `regenPlayAvailable = false` after `useRegenPlay` succeeds |
| `src/contexts/PlayGuardContext.tsx` | Make `guardPlay` async; auto-consume regen when allowing play with exhausted free games |
| `src/pages/Game.tsx` | Add regen consumption before starting matchmaking as safety net |
| `src/pages/Index.tsx` | Fix LevelInfoModal "Continue" to use guardPlay; remove duplicate regen logic from handlePlayClick (now handled by guardPlay) |

### Technical Details

**usePlayLimit.ts changes:**
- Add a `regenConsumedLocally` state/ref that is set to `true` immediately when `useRegenPlay()` succeeds
- Factor this into `regenPlayAvailable` calculation: `regenPlayAvailable = freeGamesExhausted && !isVip && !regenConsumedLocally && (lastRegenAt === null || ...)`
- Reset `regenConsumedLocally` when profile updates via realtime (new `last_play_regen_at` value detected)

**PlayGuardContext.tsx changes:**
- Make `guardPlay` consume regen automatically when it would return `true` but user has exhausted free plays
- Call `useRegenPlay()` inside guardPlay before returning true, when `freeGamesExhausted && regenPlayAvailable`
- Since this is now async, change the pattern: guardPlay still returns a boolean synchronously but triggers regen consumption as a side effect

**Game.tsx changes:**
- Before `startMatchmaking()`, check if user needs to consume a regen play
- If `freeGamesExhausted && regenPlayAvailable && !isVip`, call `useRegenPlay()` first
- This is the last line of defense for direct URL navigation

**Index.tsx changes:**
- LevelInfoModal's "Continue" button should check `guardPlay` before navigating
- Remove duplicate regen consumption from `handlePlayClick` since `guardPlay` now handles it centrally
