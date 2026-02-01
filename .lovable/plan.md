
# Remove "მოიმატე ძალები" Section & Update "სუპერ ძალები" Icons

## Overview
Two changes needed:
1. Remove the "მოიმატე ძალები" (Starter Pack) section from the shop
2. Replace icons in the "სუპერ ძალები" (Super Powers) section with new magical-themed icons

## Current State
- Shop has 7 sections: powers, starter, mega-powers, vip, frames, coins, gems-lari
- "მოიმატე ძალები" is the "starter" section with 3 bundle items
- "სუპერ ძალები" is the "mega-powers" section with 3 items using `iconPowersBottle` for all

## Changes

### 1. Remove "მოიმატე ძალები" Section

**File:** `src/hooks/useShopData.tsx`

Remove the "starter" section from `SHOP_SECTIONS` array (lines 364-369):

```text
Before: 7 sections [powers, starter, mega-powers, vip, frames, coins, gems-lari]
After: 6 sections [powers, mega-powers, vip, frames, coins, gems-lari]
```

The `STARTER_PACK_ITEMS` array definition can remain in the file (unused) or be removed for cleanup.

---

### 2. Add New Icon Assets

Copy uploaded images to project assets:

| Upload | Destination | Usage |
|--------|-------------|-------|
| `magic-orb.png` | `src/assets/icons/magic-orb.png` | Small bundle (პატარა) |
| `magic-portal-1.png` | `src/assets/icons/magic-portal.png` | Medium bundle (საშუალო) |
| Anvil image | `src/assets/icons/magic-forge.png` | Large bundle (დიდი) |

---

### 3. Update "სუპერ ძალები" Icons

**File:** `src/hooks/useShopData.tsx`

Add new imports and update `MEGA_POWERS_ITEMS`:

```typescript
// New imports
import iconMagicOrb from "@/assets/icons/magic-orb.png";
import iconMagicPortal from "@/assets/icons/magic-portal.png";
import iconMagicForge from "@/assets/icons/magic-forge.png";

// Updated MEGA_POWERS_ITEMS
const MEGA_POWERS_ITEMS: ShopItem[] = [
  {
    id: "power_bundle_small",
    name: t("shop.smallPackage"),
    description: `2x ${t("shop.allPowers")}`,
    price: 7,
    currency: "gems",
    icon: <img src={iconMagicOrb} alt="" className="w-[50px] h-[50px] object-contain" />,
    gradient: "transparent",
    savings: 12,
  },
  {
    id: "mega_power_bundle",
    name: t("shop.mediumPackage"),
    description: `5x ${t("shop.allPowers")}`,
    price: 16,
    currency: "gems",
    icon: <img src={iconMagicPortal} alt="" className="w-[50px] h-[50px] object-contain" />,
    gradient: "transparent",
    badge: "popular",
    savings: 20,
  },
  {
    id: "power_bundle_large",
    name: t("shop.largePackage"),
    description: `10x ${t("shop.allPowers")}`,
    price: 28,
    currency: "gems",
    icon: <img src={iconMagicForge} alt="" className="w-[50px] h-[50px] object-contain" />,
    gradient: "transparent",
    badge: "best-value",
    savings: 30,
  },
];
```

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/assets/icons/magic-orb.png` | Create | Copy from user upload (crystal ball) |
| `src/assets/icons/magic-portal.png` | Create | Copy from user upload (portal) |
| `src/assets/icons/magic-forge.png` | Create | Copy from user upload (anvil with fire) |
| `src/hooks/useShopData.tsx` | Modify | Remove starter section, update mega-powers icons |

---

## Visual Result

```text
Shop Sections (After):
1. ძალები (Powers) - Individual power-ups
2. სუპერ ძალები (Super Powers) - NEW ICONS
   - პატარა: Crystal ball orb
   - საშუალო: Magic portal  
   - დიდი: Forge with fire
3. VIP სტატუსი
4. ჩარჩოები (Frames)
5. მონეტები (Coins)
6. ალმასები (Gems)

Removed: "მოიმატე ძალები" section
```

---

## Testing
- Verify "მოიმატე ძალები" section no longer appears in shop
- Verify "სუპერ ძალები" section shows new icons correctly
- Test purchase flow still works for mega power bundles
- Check icons display properly on mobile and desktop
