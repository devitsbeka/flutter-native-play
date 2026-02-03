
# Plan: Fix PRO Card Logic, Hide No-Ads for VIP Users, and Fix 404

## Issues Identified

### Issue 1: "გახდი VIP" Button Goes to 404
**Root Cause**: In `src/pages/Index.tsx` line 515, `onAdFreeClick={() => navigate("/shop")}` navigates to `/shop`, but this route doesn't exist. The shop is at `/power-ups`.

### Issue 2: No-Ads Card Shows for VIP Users  
**Root Cause**: The `DesktopActionCards` component doesn't check VIP status. It always renders the "რეკლამის გარეშე" card.

### Issue 3: Button Text Logic Wrong
**Current Behavior**: When user has Solo PRO, Family card shows "გაუმჯობესება" (Upgrade)
**Expected Behavior**: When user has Solo PRO, Family card should show "შეძენა" (Purchase)

---

## Technical Changes

### File 1: `src/pages/Index.tsx`
**Fix**: Change navigation from `/shop` to `/power-ups`

```text
Line 515: Change navigate("/shop") → navigate("/power-ups")
```

### File 2: `src/components/home/DesktopActionCards.tsx`
**Fix**: Add VIP status check to hide the "რეკლამის გარეშე" card when user is VIP/PRO

1. Import `useVipStatus` hook
2. Add `isVip` check inside the component
3. Conditionally render the No-Ads card only when `!isVip`

```typescript
import { useVipStatus } from "@/hooks/useVipStatus";

export function DesktopActionCards({ ... }) {
  const { isVip } = useVipStatus();
  // ...
  
  return (
    <div>
      {/* Other cards */}
      
      {/* No-Ads Card - only show if not VIP */}
      {!isVip && (
        <ActionCard
          iconSrc={adFreeIcon}
          title="რეკლამის გარეშე"
          ...
        />
      )}
    </div>
  );
}
```

### File 3: `src/components/shop/MobileProCarousel.tsx`
**Fix**: Update button text logic

**Current Logic:**
- Solo PRO user → Solo: "აქტიური", Family: "გაუმჯობესება"

**New Logic:**
- Solo PRO user → Solo: "აქტიური", Family: "შეძენა"

```typescript
// Update getButtonText function
const getButtonText = (tierId: SimplifiedTier, currentTier: string | undefined) => {
  const normalizedTier = currentTier === "standard" ? "solo" : currentTier;
  
  // User has Family PRO (top tier) - both cards show active
  if (normalizedTier === "family" || normalizedTier === "pro_plus") {
    return { text: "აქტიური", isActive: true };
  }
  
  // User has Solo PRO - Solo active, Family shows "შეძენა" (not upgrade)
  if (normalizedTier === "solo" || normalizedTier === "pro") {
    if (tierId === "solo") return { text: "აქტიური", isActive: true };
    if (tierId === "family") return { text: "შეძენა", isActive: false };
  }
  
  // No subscription
  return { text: "შეძენა", isActive: false };
};
```

---

## Expected Behavior After Fix

| Scenario | No-Ads Card | Solo Card Button | Family Card Button |
|----------|-------------|------------------|-------------------|
| No PRO | ✅ Visible | შეძენა | შეძენა |
| Has Solo PRO | ❌ Hidden | აქტიური | შეძენა |
| Has Family PRO | ❌ Hidden | აქტიური | აქტიური |

| Button | Current Navigation | Fixed Navigation |
|--------|-------------------|------------------|
| "გახდი VIP" (No-Ads card) | /shop → 404 | /power-ups ✅ |

---

## Files to Modify

1. **src/pages/Index.tsx** - Fix navigation path
2. **src/components/home/DesktopActionCards.tsx** - Add VIP check to hide No-Ads card  
3. **src/components/shop/MobileProCarousel.tsx** - Update button text logic
