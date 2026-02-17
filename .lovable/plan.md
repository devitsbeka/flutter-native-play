

## Fix: Move Coin Rewards to Post-Game (Win +500, Lose -500)

### Problem

The current pre-paid stake model deducts 500 coins in `VSScreen` when an opponent is found, then awards 1000 on win or 0 on loss. This creates:
- A race condition between the pre-game deduction and the post-game `updateProfile` call (which replaces the entire profile state via `.select().single()`)
- Unreliable coin tracking -- the deduction happens in a different component than the reward
- Confusing UX where the loss "already happened" before the result screen shows

### Solution

Switch to a **post-game model** where all coin changes happen in `MatchResultScreen`:
- Win: `addCoins(500)` -- net +500
- Lose: `spendCoins(500)` -- net -500
- Draw: no coin change (net 0)

### Technical Changes

**1. `src/components/game/VSScreen.tsx`**
- Remove the `deductStake` call and `stakeDeducted` state
- Remove the `useGameStake` import (no longer needed here)

**2. `src/hooks/useGameStake.ts`**
- Simplify the hook: remove `deductStake` (no longer pre-paid)
- `awardWin` calls `addCoins(500)` (just the profit)
- `awardLose` calls `spendCoins(500)` (deduct on loss)
- `awardDraw` gives 0 (no change)
- Update `netWinProfit` to 500, `netLoss` to 500
- VIP users: `awardLose` still does nothing (free play), `awardWin` still gives 500

**3. `src/components/game/MatchResultScreen.tsx`**
- `awardLose()` is now async (calls `spendCoins`), so `await` it
- Display values remain the same: win shows "+500", lose shows "-500"

**4. `src/config/rewardConfig.ts`**
- Update `GAME_WIN_REWARD` from 1000 to 500 (direct profit, not "both stakes")
- `GAME_DRAW_REFUND` from 250 to 0 (no coins change on draw)

### Coin Flow After Fix

| Result | Non-VIP | VIP |
|--------|---------|-----|
| Win    | +500    | +500 |
| Lose   | -500    | 0 (free play) |
| Draw   | 0       | 0 |

