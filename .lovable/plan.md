
# Plan: Complete the PRO Benefits Implementation

## Overview
Fix the gaps between promised and implemented PRO benefits to ensure users get everything they're paying for.

---

## Issues to Fix

### Issue 1: Daily Free Power-ups Not Working
**Status:** Hook exists but unused

**Solution:** Integrate `useDailyVipRewards` into the app flow
- Option A: Auto-claim on app open/login
- Option B: Add a claimable UI element in rewards section

**Files to modify:**
- `src/App.tsx` or `src/hooks/useAuth.ts` - Add auto-claim on login
- Alternative: `src/components/home/DailyRewardsModal.tsx` - Show VIP power-ups section

---

### Issue 2: Ads Not Skipped for VIP
**Status:** Not implemented

**Solution:** Add VIP check in ad service

**File to modify:** `src/services/adService.ts`

Add method:
```typescript
async shouldShowAd(isVip: boolean): Promise<boolean> {
  return !isVip;
}
```

Then modify `showRewardedAd` and `showRewardedAdWithPreload` to check VIP status before showing.

---

### Issue 3: Tier-Specific Benefits Not Differentiated
**Status:** All VIP users get same benefits regardless of tier

**Problem:** `pro_plus` promises extra features:
- "VIP ბეჯი + ფრეიმები" (implies more/better frames)
- "ყოველდღიური ჯილდოები" (implies special daily rewards)

**Solutions:**
1. **Update VIP_BENEFITS to be tier-aware** - Show different lists per tier
2. **Add PRO Plus exclusive frames** - More frames for higher tier
3. **Enhance daily rewards for PRO Plus** - Better daily rewards (more coins/gems/power-ups)

---

## Implementation Details

### Step 1: Enable Daily Power-up Auto-Claim

**File:** `src/contexts/PlayerProfileContext.tsx` or create new `src/hooks/useVipBenefitsAutoGrant.ts`

```typescript
// On user login and isVip change:
useEffect(() => {
  if (user && isVip) {
    const { canClaimPowerUps, claimDailyPowerUps } = useDailyVipRewards();
    if (canClaimPowerUps) {
      claimDailyPowerUps();
    }
  }
}, [user, isVip]);
```

### Step 2: Add VIP Check to Ad Service

**File:** `src/services/adService.ts`

Add at class level:
```typescript
private isVipUser = false;

setVipStatus(isVip: boolean) {
  this.isVipUser = isVip;
}

async showRewardedAdWithPreload(callbacks?: AdServiceCallbacks): Promise<boolean> {
  // Skip ad for VIP users
  if (this.isVipUser) {
    callbacks?.onRewardEarned?.({ type: 'vip_skip', amount: 1 });
    return true; // Return success without showing ad
  }
  // ... existing logic
}
```

### Step 3: Create Tier-Aware Benefits Hook

**File:** `src/hooks/useVipStatus.ts`

Add tier-specific benefits:
```typescript
export const VIP_BENEFITS_BY_TIER = {
  pro: [
    { icon: "⭐", title: "2x XP", description: "..." },
    { icon: "🚫", title: "რეკლამების გარეშე", description: "..." },
    { icon: "👑", title: "VIP ბეჯი", description: "..." },
    { icon: "👥", title: "1 მეგობრის მოწვევა", description: "..." },
  ],
  pro_plus: [
    { icon: "⭐", title: "2x XP", description: "..." },
    { icon: "🚫", title: "რეკლამების გარეშე", description: "..." },
    { icon: "👑", title: "VIP ბეჯი", description: "..." },
    { icon: "🎨", title: "ექსკლუზიური ჩარჩოები", description: "3 VIP ჩარჩო" },
    { icon: "⚡", title: "უფასო ძალები", description: "ყოველდღე 4 ძალა" },
    { icon: "🎁", title: "გაძლიერებული ჯილდოები", description: "+50% ყოველდღიური ჯილდო" },
    { icon: "👥", title: "5 მეგობრის მოწვევა", description: "..." },
  ],
};
```

### Step 4: Enhance Daily Rewards for PRO Plus

**File:** `src/components/home/DailyRewardsModal.tsx`

Add VIP bonus multiplier:
```typescript
const vipBonusMultiplier = subscription?.vip_tier === 'pro_plus' ? 1.5 : 1;
const finalCoins = Math.floor(baseCoins * vipBonusMultiplier);
```

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/services/adService.ts` | Modify | Add VIP ad skip |
| `src/hooks/useVipStatus.ts` | Modify | Add tier-aware benefits |
| `src/components/home/DailyRewardsModal.tsx` | Modify | VIP bonus for PRO Plus |
| `src/contexts/PlayerProfileContext.tsx` | Modify | Auto-grant daily VIP power-ups |
| `src/hooks/useDailyVipRewards.ts` | Keep | Already implemented, just needs integration |

---

## Decision Points for You

1. **Daily Power-ups Delivery:** 
   - Auto-claim silently on login? 
   - Or show toast notification "VIP: მიღებულია 4 ძალა! ⚡"?

2. **PRO Plus Enhanced Rewards:**
   - +50% daily rewards?
   - Or entirely separate reward track?

3. **Ad Skipping:**
   - Skip all ads completely?
   - Or auto-reward without watching (give reward immediately)?

---

## Summary

The core benefits (2x XP, spins, frames, badge) ARE implemented. The gaps are:
1. **Daily power-ups** - Code exists, just not connected
2. **Ad-free** - Missing VIP check in ad service  
3. **Tier differentiation** - PRO Plus should get more than basic PRO

These can be fixed without major rewrites - mostly integration work.
