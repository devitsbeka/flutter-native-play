# Plan: Lifetime Play Limit for Non-PRO Users (5 Games Total)

## ✅ IMPLEMENTED

---

## Summary

Replaced the **daily** play limit system with a **lifetime** 5-game limit for non-PRO users. Once a user plays 5 games total, they must upgrade to PRO to continue playing.

---

## Files Modified

| File | Changes |
|------|---------|
| `src/hooks/usePlayLimit.ts` | **NEW** - Simple hook using `profile.games_played` for lifetime limit |
| `src/pages/Index.tsx` | Updated to use `usePlayLimit`, shows PRO modal when exhausted |
| `src/components/game/MatchResultScreen.tsx` | Added limit check on "Play Again" button |
| `src/components/home/PlayLimitModal.tsx` | **NEW** - Handles both guest registration and PRO upgrade prompts |

---

## Behavior

| User Type | Limit | When Exhausted |
|-----------|-------|----------------|
| **Guest** | 5 games (localStorage) | Show registration modal |
| **Registered Non-PRO** | 5 games lifetime | Show PRO upgrade modal |
| **PRO Users** | Unlimited | N/A |

---

## Data Source

Uses existing `profiles.games_played` column (already incremented after each game in `MatchResultScreen.tsx`). No database schema changes required.

---

## What Happens When Limit is Reached

1. **On Home Screen**: Play button shows `0/5`, clicking opens PRO modal
2. **After Game (Play Again)**: Checks if `games_played >= 5`, shows PRO modal if limit reached
3. **PRO Users**: Unlimited plays, no limits shown


