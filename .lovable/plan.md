

# Plan: Fix Question Mark Icon Style & My Powers Visibility

## Problems Identified

### 1. Question Mark Icon Has Container
From screenshot: The help (?) icon has a circular gray container with shadow, while the bell icon next to it is just the icon without any background.

**Current code in `ShopHeader.tsx` (lines 54-62):**
```tsx
<motion.button
  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
  style={{ boxShadow: "0 3px 0 hsl(var(--border))" }}
>
  <HelpCircle className="w-5 h-5 text-muted-foreground" />
</motion.button>
```

**Bell icon style in `HeaderActions.tsx` (line 31):**
```tsx
className="relative p-2 rounded-full hover:bg-white/30 transition-colors"
```

### 2. My Powers Section Not Visible
The `MyPowersSection` is included in `ShopStandardLayout` but the `useShopPageData` query has `enabled: !!user?.id`. When loading or for non-logged-in users, the data defaults correctly, but there may be a rendering timing issue.

---

## Solution

| File | Change |
|------|--------|
| `src/components/shop/ShopHeader.tsx` | Remove container background from help button, match bell icon style |
| `src/components/shop/MyPowersSection.tsx` | Remove dependency on `useShopPageData`, use passed-in data from parent |

---

## Technical Changes

### 1. Fix Question Mark Icon (ShopHeader.tsx)

Remove the gray circular container and shadow, make it match the bell icon style:

```tsx
// Before (lines 54-62)
<motion.button
  onClick={onHelpClick}
  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
  style={{ boxShadow: "0 3px 0 hsl(var(--border))" }}
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95, y: 2 }}
>
  <HelpCircle className="w-5 h-5 text-muted-foreground" />
</motion.button>

// After - matches bell icon style
<motion.button
  onClick={onHelpClick}
  className="relative p-2 rounded-full hover:bg-white/30 transition-colors"
  whileHover={{ scale: 1.1 }}
  whileTap={{ scale: 0.9 }}
>
  <HelpCircle className="w-5 h-5 text-gray-600" />
</motion.button>
```

### 2. Fix My Powers Section Visibility

The issue is that `MyPowersSection` calls `useShopPageData()` internally, but the parent (`PowerUps.tsx`) also calls it. This creates duplicate queries and the section may not re-render when data arrives.

**Solution**: Pass the power-ups data from parent instead of fetching internally:

```tsx
// In MyPowersSection.tsx
// Before
const { data: shopData } = useShopPageData();
const count = shopData.powerUps[type] ?? 0;

// After - receive powerUps as prop
interface MyPowersSectionProps {
  powerUps: Record<PowerUpType, number>;
  onPurchaseSingle: (powerType: PowerUpType) => Promise<void>;
  isPurchasing: string | null;
}

export function MyPowersSection({ powerUps, onPurchaseSingle, isPurchasing }: MyPowersSectionProps) {
  // Use passed powerUps directly
  const count = powerUps[type] ?? 0;
}
```

```tsx
// In ShopStandardLayout.tsx - pass powerUps from parent
interface ShopStandardLayoutProps {
  powerUps: Record<PowerUpType, number>; // Add this
  // ... existing props
}

<MyPowersSection
  powerUps={powerUps}  // Pass down
  onPurchaseSingle={onSinglePowerPurchase}
  isPurchasing={isPurchasing}
/>
```

```tsx
// In PowerUps.tsx - pass shopData.powerUps
<ShopStandardLayout
  powerUps={shopData.powerUps}  // Add this
  sections={SHOP_SECTIONS}
  // ... rest
/>
```

---

## Visual Result

### Header Icons (Before → After)
```text
Before:  🔔  [(?)]  ← Question mark has gray circle + shadow
After:   🔔   ?     ← Both icons same minimal style
```

### My Powers Section
```text
Before: Section appears briefly, then disappears
After:  Section renders immediately with correct data
```

---

## Files to Modify

1. **`src/components/shop/ShopHeader.tsx`** - Remove container from help icon
2. **`src/components/shop/MyPowersSection.tsx`** - Accept powerUps as prop
3. **`src/components/shop/ShopStandardLayout.tsx`** - Pass powerUps prop
4. **`src/pages/PowerUps.tsx`** - Pass shopData.powerUps to layout

