

# Plan: Lifetime Play Limit for Non-PRO Users (5 Games Total)

## Summary

Replace the current **daily** play limit system with a **lifetime** 5-game limit for non-PRO users. Once a user plays 5 games total, they must upgrade to PRO to continue playing.

---

## Current Behavior

| Feature | Current Implementation |
|---------|------------------------|
| Play Limit | **5 per day** (resets daily, tracked in `user_daily_plays` table) |
| Guest Limit | 3 games lifetime (localStorage) |
| PRO Users | Unlimited plays |
| "Play Again" | Starts matchmaking without checking limit |

---

## Proposed Changes

| Feature | New Behavior |
|---------|-------------|
| Play Limit | **5 total lifetime** games for registered non-PRO users |
| Storage | Track in `profiles` table using existing `games_played` column |
| "Play Again" | Check limit before starting new game |
| When Exhausted | Show PRO upgrade modal |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useDailyPlays.ts` | Rename to `usePlayLimit.ts`, change logic from daily to lifetime |
| `src/pages/Index.tsx` | Update references to use lifetime limit |
| `src/components/game/MatchResultScreen.tsx` | Add play limit check on "Play Again" |
| `src/contexts/GameContext.tsx` | Add optional limit check before matchmaking |
| `src/components/home/DesktopPlayButtonLarge.tsx` | Update to show lifetime remaining |
| `src/components/home/GuestMaxPlaysModal.tsx` | Rename to `PlayLimitModal.tsx` for both guests and registered users |

---

## Technical Implementation

### 1. New Hook: `usePlayLimit.ts`

Replace `useDailyPlays.ts` with a simpler lifetime-based limit:

```typescript
const MAX_FREE_PLAYS = 5; // Lifetime limit

export function usePlayLimit() {
  const { profile } = useAuth();
  const { isVip } = useVipStatus();
  
  // Total games played is already tracked in profiles.games_played
  const gamesPlayed = profile?.games_played || 0;
  const playsRemaining = Math.max(0, MAX_FREE_PLAYS - gamesPlayed);
  const canPlay = isVip || playsRemaining > 0;
  
  return {
    playsRemaining,
    playsUsed: gamesPlayed,
    maxPlays: MAX_FREE_PLAYS,
    canPlay,
    isVip,
  };
}
```

**Key Insight:** We already track `games_played` in the `profiles` table (updated in `MatchResultScreen.tsx` after each game). No database schema changes needed!

### 2. MatchResultScreen.tsx - Add Limit Check on "Play Again"

```typescript
// Before
const handlePlayAgain = () => {
  startMatchmaking();
};

// After
const handlePlayAgain = async () => {
  // Check if user can play another game
  if (!isVip && gamesPlayed >= MAX_FREE_PLAYS) {
    setShowProModal(true); // Show PRO upgrade modal
    return;
  }
  
  startMatchmaking();
};
```

### 3. Index.tsx - Update Play Button Logic

The current `handlePlayClick` already checks limits. Update to use the new hook:

```typescript
// Replace useDailyPlays with usePlayLimit
const { playsRemaining, maxPlays, canPlay, isVip } = usePlayLimit();

// In handlePlayClick:
if (!canPlay && !isVip) {
  // Show PRO upgrade modal instead of "plays exhausted" message
  setShowProModal(true);
  return;
}
```

### 4. Update Play Button UI

`DesktopPlayButtonLarge.tsx` already displays `playsRemaining/maxPlays`. Just pass the lifetime values instead of daily values.

### 5. Create/Rename Modal for Limit Reached

Update `GuestMaxPlaysModal.tsx` to handle both:
- **Guests**: "Create account to continue" (existing behavior)
- **Registered Non-PRO**: "Upgrade to PRO for unlimited games"

---

## Data Flow

```
Profile.games_played (existing column)
         ↓
usePlayLimit() hook (new, simple logic)
         ↓
playsRemaining = 5 - games_played
         ↓
┌─────────────────────────────────┐
│ Index.tsx (Play button)         │ → Checks limit
│ MatchResultScreen (Play Again)  │ → Checks limit
│ GameContext (startMatchmaking)  │ → Optional check
└─────────────────────────────────┘
         ↓
Show ProUpgradeModal if limit reached
```

---

## What Happens When Limit is Reached

1. **On Home Screen**: Play button becomes grayed out with hourglass icon, shows `0/5`
2. **Clicking Play**: Opens PRO upgrade modal (not the guest registration modal)
3. **After Game (Play Again)**: 
   - Check if `games_played >= 5`
   - If yes, show PRO modal
   - If no, start matchmaking

---

## Backward Compatibility

- Users who've already played >5 games:
  - They can't play anymore unless they go PRO
  - This is intentional as per the new limit
- Daily plays table (`user_daily_plays`):
  - Can keep for now (doesn't interfere)
  - Or migrate/remove in a future cleanup

---

## UI Copy (Georgian)

| Context | Text |
|---------|------|
| Limit Reached Modal Title | "თამაშების ლიმიტი ამოწურულია" |
| Modal Description | "უფასო 5 თამაში ამოიწურა. გახდი PRO და ითამაშე შეუზღუდავად!" |
| Upgrade Button | "გახდი PRO" |

---

## Summary of Changes

1. **Create `usePlayLimit.ts`** - Simple hook using `profile.games_played`
2. **Update `Index.tsx`** - Use new hook, show PRO modal when exhausted
3. **Update `MatchResultScreen.tsx`** - Check limit on "Play Again"
4. **Update/Create `PlayLimitModal.tsx`** - Handle both guest and non-PRO scenarios
5. **Keep existing references to `useDailyPlays`** - They can coexist or be migrated later

No database changes required - we reuse the existing `profiles.games_played` column.

