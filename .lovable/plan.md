
# Plan: Update PRO Card Button Text Logic

## Requirements

| Card | User Has Solo PRO | User Has Family PRO | No PRO |
|------|-------------------|---------------------|--------|
| **სოლო PRO (Pink)** | გაუმჯობესება | - | შეძენა |
| **სამეგობრო PRO (Purple)** | შეძენა | აქტიური | შეძენა |

---

## Technical Changes

### File: `src/components/shop/MobileProCarousel.tsx`

#### 1. Update ctaText values (lines 21 and 36)

Both tiers should have "შეძენა" as the default CTA text:

```typescript
// Line 21: Solo PRO
ctaText: "შეძენა",

// Line 36: Family PRO  
ctaText: "შეძენა",
```

#### 2. Update button rendering logic (lines 167-183)

Replace the current button text logic with a new function that determines the correct text:

```typescript
// Add helper function to get button text
const getButtonText = (tierId: SimplifiedTier, currentTier: SimplifiedTier | undefined) => {
  // User has Family PRO (top tier)
  if (currentTier === "family") {
    if (tierId === "family") return { text: "აქტიური", isActive: true };
    if (tierId === "solo") return { text: "აქტიური", isActive: true }; // Solo is included in Family
  }
  
  // User has Solo PRO
  if (currentTier === "solo") {
    if (tierId === "solo") return { text: "აქტიური", isActive: true };
    if (tierId === "family") return { text: "გაუმჯობესება", isActive: false }; // Upgrade option
  }
  
  // No subscription - show "შეძენა" for all
  return { text: "შეძენა", isActive: false };
};
```

#### 3. Update button JSX to use the helper function

```typescript
{(() => {
  const buttonState = getButtonText(tier.id, currentTier);
  
  if (buttonState.isActive) {
    return (
      <>
        <Check className="w-4 h-4" />
        {buttonState.text}
      </>
    );
  }
  
  if (isProcessing) {
    return (
      <>
        <Loader2 className="w-4 h-4 animate-spin" />
        მუშავდება...
      </>
    );
  }
  
  return (
    <>
      {buttonState.text}
      <ChevronRight className="w-4 h-4" />
    </>
  );
})()}
```

#### 4. Update button disabled state and styling

The button should be disabled only when it shows "აქტიური", and should remain clickable for "გაუმჯობესება":

```typescript
// Update disabled condition
disabled={getButtonText(tier.id, currentTier).isActive || isProcessing}
```

---

## Button State Matrix

| Scenario | Solo Card Button | Family Card Button |
|----------|------------------|-------------------|
| No subscription | შეძენა (clickable) | შეძენა (clickable) |
| Has Solo PRO | აქტიური (disabled) | გაუმჯობესება (clickable) |
| Has Family PRO | აქტიური (disabled) | აქტიური (disabled) |
