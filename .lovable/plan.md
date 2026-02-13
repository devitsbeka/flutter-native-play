

## Fix Gift Modal for PRO Users + Add Real Rewards

### Problem
1. The BetaGiftModal keeps appearing for PRO/admin users despite the VIP check, because:
   - The `giftClaimed` state in `PlayerProfileContext` is plain React state (`useState(false)`) that resets on every page refresh
   - There may be a race condition where `vipLoading` is still true when the eligibility check runs
2. When clicking "მიიღე საჩუქარი", the modal only activates VIP status but does not grant any tangible rewards (coins, power-ups)

### Changes

#### 1. Fix VIP guard in `PlayerProfileContext.tsx`
- Add `isVip` and `vipLoading` checks to the auto-open effect so the modal never opens for PRO users
- Read `giftClaimed` initial state from localStorage so it persists across refreshes

#### 2. Harden `useReturnGiftEligibility` in `BetaGiftModal.tsx`
- The hook already checks `isVip`, but ensure it also handles the edge case where `vipLoading` completes after the initial check by watching for VIP status changes

#### 3. Add real rewards to `BetaGiftModal` claim handler
When user clicks "მიიღე საჩუქარი", in addition to activating 10-day VIP:
- Grant 150 coins (same as level-up milestone) via `update_user_currency` RPC
- Grant 1 random power-up (from freeze, 5050, replace, time-drain) via `user_power_ups` table upsert
- Show the rewards in the success phase UI (coin icon + power-up icon)

### Technical Details

| File | Change |
|------|--------|
| `src/contexts/PlayerProfileContext.tsx` | Add VIP guard to auto-open effect; persist `giftClaimed` to localStorage |
| `src/components/shared/BetaGiftModal.tsx` | Grant 150 coins + 1 random power-up in `handleClaim`; show reward items in success phase |

**PlayerProfileContext.tsx changes:**
- Import `useAuth` and `useVipStatus`
- Initialize `giftClaimed` from localStorage: `useState(() => user ? localStorage.getItem(key) === 'true' : false)`
- Update auto-open effect: `if (isEligible && !giftClaimed && !isVip && !vipLoading)`
- On claim, write to localStorage

**BetaGiftModal.tsx `handleClaim` additions:**
```
// After activateVip succeeds:
// 1. Grant coins
await supabase.rpc("update_user_currency", { p_user_id: user.id, p_coins_delta: 150 });
// 2. Grant random power-up
const types = ["5050", "freeze", "replace", "time-drain"];
const randomType = types[Math.floor(Math.random() * types.length)];
// Upsert into user_power_ups
```

**BetaGiftModal.tsx success phase:**
- Add reward display section showing "+150 coins" and "+1 [power-up name]" with icons (same style as LevelUpModal rewards)
