

## Tighten Guest Play Limit: Block After 5 Plays

### Current Behavior
- Guests can play up to **10 games** before being blocked
- After every game (plays 1-9), a dismissible registration modal appears that users can close and keep playing
- Only at play 10 does the modal become blocking (non-dismissible)

### New Behavior
- Reduce the limit from 10 to **5 games**
- Plays 1-2: no modal, guest plays freely
- Plays 3-4: dismissible modal appears encouraging sign-up, but guest can close and continue
- Play 5+: **blocking modal** -- guest must sign in or register to continue playing

### Changes

**File: `src/hooks/useGuestPlays.ts`**
- Change `MAX_GUEST_PLAYS` from `10` to `5`

**File: `src/pages/Game.tsx`**
- Update the guest check logic so the first 2 plays are free (no modal), plays 3-4 show a dismissible modal, and play 5+ is blocking
- Current logic shows the modal after every play (playsUsed > 0). Change the threshold so the dismissible interstitial only appears after 2+ plays

### Technical Details

| File | Change |
|------|--------|
| `src/hooks/useGuestPlays.ts` | `MAX_GUEST_PLAYS = 5` (line 5) |
| `src/pages/Game.tsx` | Change `guestData.playsUsed > 0` to `guestData.playsUsed >= 2` so first 2 games have no interruption, then plays 3-4 get a dismissible prompt, play 5 is hard-blocked |

### Summary

| Plays | Experience |
|-------|-----------|
| 1-2 | Play freely, no modal |
| 3-4 | Dismissible sign-up modal before each game, can close and continue |
| 5+ | Blocking modal, must register to play |

