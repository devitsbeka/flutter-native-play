

## Fix: Play Limit Check Must Run Before Coin Check

### Root Cause
In `src/pages/Index.tsx`, the `handlePlayClick` function checks conditions in this order:
1. Line 301: `hasEnoughCoins` -- opens "Not Enough Coins" modal and returns
2. Line 307: `canPlay` -- opens Invite Friends modal (never reached!)

Since the user has 0 coins and the stake is 500, the coin modal always fires first, blocking the invite modal entirely.

### Fix

**File: `src/pages/Index.tsx`**

Swap the order of the two checks so the play limit (invite modal) is evaluated **before** the coin balance:

```
// BEFORE (current):
1. Check coins -> show NotEnoughCoinsModal
2. Check play limit -> show InviteFriendsModal  (never reached)

// AFTER (fixed):
1. Check play limit -> show InviteFriendsModal
2. Check coins -> show NotEnoughCoinsModal
```

Specifically, move lines 307-310 (`if (!canPlay && !isVip)`) above lines 301-303 (`if (!hasEnoughCoins)`). This is a 2-line block swap, no other changes needed.

