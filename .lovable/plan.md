
# Plan: Separate "My Powers" Section with Individual Purchase Buttons

## Overview

Restructure the Power-Ups shop page to have two distinct sections:
1. **"ჩემი ძალები" (My Powers)** - Shows current power-up inventory with + buttons to buy individual powers
2. **"ძალები" (Powers)** - Shows the existing shop packs

## Current Structure
```text
[Shop Header]
[Hero Carousel / PRO Carousel]
[Powers Section - packs of 3]
[Mega Powers]
[VIP]
...
```

## New Structure
```text
[Shop Header]
[Hero Carousel / PRO Carousel]
[ჩემი ძალები Section]  ← NEW
  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
  │ 50  │ │ ❄️  │ │ 🔄  │ │ ⏱️  │
  │ /50 │ │     │ │     │ │     │
  │ 45  │ │ 49  │ │ 11  │ │ 22  │
  │ [+] │ │ [+] │ │ [+] │ │ [+] │
  └─────┘ └─────┘ └─────┘ └─────┘
[ძალები Section - packs]
[Mega Powers]
[VIP]
...
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/shop/MyPowersSection.tsx` | Create | New section showing user's powers with + buttons |
| `src/components/shop/ShopStandardLayout.tsx` | Modify | Add MyPowersSection above the powers grid |
| `src/pages/PowerUps.tsx` | Modify | Pass purchase handler to MyPowersSection |

---

## Technical Implementation

### 1. Create MyPowersSection Component

New component that displays:
- Section title: "ჩემი ძალები"
- 4 power-up cards in a row (matching the screenshot design)
- Each card shows: icon, count, and a + button to buy 1 more

**Design from screenshot:**
- White pill-shaped cards with icon + count
- Horizontal layout with 4 items
- + button triggers purchase of single power-up (1 gem each)

```tsx
// Structure for each power card
<div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white shadow-sm">
  <img src={powerIcon} className="w-6 h-6" />
  <span className="font-bold">{count}</span>
  <button className="w-6 h-6 bg-purple-500 rounded-full text-white">+</button>
</div>
```

### 2. Update ShopStandardLayout

Insert `<MyPowersSection />` after the hero carousel and before the existing powers section:

```tsx
{/* My Powers Section - before product grids */}
<MyPowersSection 
  onPurchaseSingle={onSinglePowerPurchase}
/>

{/* Then existing Product Sections */}
{displaySections.map((section, index) => (
  ...
))}
```

### 3. Single Power Purchase Logic

Add single power purchase capability (1 power = 1 gem):

```tsx
// In PowerUps.tsx - new handler
const handleSinglePowerPurchase = async (powerType: PowerUpType) => {
  if (!user) {
    setShowAuthModal(true);
    return;
  }
  
  if (gems < 1) {
    setRequiredGems(1);
    setShowNotEnoughGemsModal(true);
    return;
  }
  
  const spent = await spendGems(1, {
    productId: `single_${powerType}`,
    productType: "powerup",
    valueReceived: { [powerType]: 1 },
  });
  
  if (spent) {
    await addPowerUp(powerType, 1);
    await refetch();
    playSound("reward");
  }
};
```

---

## Visual Design (from screenshots)

The "My Powers" row will look like:

```text
ჩემი ძალები

┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
│  🔶  45   │ │  ❄️  49   │ │  🔄  11   │ │  ⏱️  22   │
│    [+]    │ │    [+]    │ │    [+]    │ │    [+]    │
└───────────┘ └───────────┘ └───────────┘ └───────────┘

ძალები (shop packs below)
```

Each + button purchases 1 power for 1 gem.

---

## Props Flow

```text
PowerUps.tsx
    │
    ├─ handleSinglePowerPurchase(powerType)
    │
    └─ ShopStandardLayout
           │
           └─ MyPowersSection
                  │
                  └─ onPurchaseSingle(powerType)
```

---

## Summary

1. **Create** `MyPowersSection.tsx` - Shows current power counts with + purchase buttons
2. **Modify** `ShopStandardLayout.tsx` - Insert new section before powers grid
3. **Modify** `PowerUps.tsx` - Add single power purchase handler
4. Each + button buys 1 power for 1 gem
5. Section title: "ჩემი ძალები", packs section stays as "ძალები"
