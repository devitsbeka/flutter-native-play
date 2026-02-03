
# Plan: Fix VIP Tier Value Mismatch

## Root Cause
The `getButtonText` function in `MobileProCarousel.tsx` checks for `currentTier === "solo"` or `currentTier === "family"`, but the database stores `vip_tier` as `"standard"`.

**Current flow:**
```
Database: vip_tier = "standard"
           ↓
Code checks: currentTier === "solo" or "family"
           ↓
Result: No match → Shows "შეძენა" for everyone
```

## Solution
Update the `getButtonText` function to also recognize `"standard"` as an active VIP tier. Since "standard" is the basic VIP tier stored in the database, it should be treated as equivalent to "solo" PRO.

---

## Technical Changes

### File: `src/components/shop/MobileProCarousel.tsx`

#### Update `getButtonText` function (lines 38-53)

Add logic to recognize "standard" as the Solo PRO tier:

```typescript
// Helper function to determine button text and state
const getButtonText = (tierId: SimplifiedTier, currentTier: string | undefined) => {
  // Normalize tier: "standard" from DB maps to "solo" in UI
  const normalizedTier = currentTier === "standard" ? "solo" : currentTier;
  
  // User has Family PRO (top tier) - both cards show active
  if (normalizedTier === "family" || normalizedTier === "pro_plus") {
    return { text: "აქტიური", isActive: true };
  }
  
  // User has Solo PRO (or "standard" from old system)
  if (normalizedTier === "solo" || normalizedTier === "pro") {
    if (tierId === "solo") return { text: "აქტიური", isActive: true };
    if (tierId === "family") return { text: "გაუმჯობესება", isActive: false }; // Upgrade option
  }
  
  // No subscription - show "შეძენა" for all
  return { text: "შეძენა", isActive: false };
};
```

#### Update `currentTier` type (line 66)

Change from `SimplifiedTier | undefined` to `string | undefined` to accept database values:

```typescript
const currentTier = subscription?.vip_tier;
```

---

## Tier Mapping

| Database Value | UI Tier | Button Behavior |
|----------------|---------|-----------------|
| `"standard"` | Solo PRO | Solo: აქტიური, Family: გაუმჯობესება |
| `"solo"` | Solo PRO | Solo: აქტიური, Family: გაუმჯობესება |
| `"pro"` | Solo PRO | Solo: აქტიური, Family: გაუმჯობესება |
| `"family"` | Family PRO | Both: აქტიური |
| `"pro_plus"` | Family PRO | Both: აქტიური |
| `undefined` | No PRO | Both: შეძენა |

---

## Expected Result
Users with `vip_tier = "standard"` will now see:
- **სოლო PRO card**: "აქტიური" (disabled)
- **სამეგობრო PRO card**: "გაუმჯობესება" (clickable)
