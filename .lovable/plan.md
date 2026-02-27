

# Fix: Don't Show "აქტიური" (Active) Badge for Expired PRO Subscriptions

## Problem
The shop page shows "აქტიური" (active) on PRO tier cards even when the subscription has expired. Meanwhile, the home page correctly shows the user has 0 free games and no PRO benefits. This creates a confusing inconsistency.

## Root Cause
Three components determine "active" status by checking if a subscription **record exists** (`subscription?.vip_tier`), without verifying that the subscription hasn't expired. The `isVip` boolean from `VipContext` correctly checks expiry via `isAfter(expires_at, now)`, but these components don't use it.

## Affected Files

### 1. `src/components/shop/MobileProCarousel.tsx`
- Line 25: `const currentTier = subscription?.vip_tier;` -- should only be set when `isVip` is true
- **Fix:** Also destructure `isVip` from `useVipStatus()`, then set `currentTier = isVip ? subscription?.vip_tier : undefined`

### 2. `src/components/shop/ShopRightSidebar.tsx`
- Line 45: `const currentTier = subscription?.vip_tier;` -- same issue
- **Fix:** Same pattern: gate `currentTier` behind `isVip`

### 3. `src/components/team/TeamProSidebar.tsx`
- Line 12: `const currentTier = subscription?.vip_tier;` -- same issue
- **Fix:** Same pattern: gate `currentTier` behind `isVip`

## Changes (all 3 files follow the same pattern)

**Before:**
```typescript
const { subscription } = useVipStatus();
const currentTier = subscription?.vip_tier;
```

**After:**
```typescript
const { subscription, isVip } = useVipStatus();
const currentTier = isVip ? subscription?.vip_tier : undefined;
```

This single-line change in each file ensures:
- Expired subscriptions no longer show the green "აქტიური" badge
- Expired users see the normal "purchase" buttons instead of disabled "active" buttons
- The shop page behavior matches the home page PRO status

## Impact
- 3 files changed, 1 line each
- No new dependencies
- No database changes needed

