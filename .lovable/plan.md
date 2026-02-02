
# Plan: Update PRO Tier Benefits and Swap Colors

## Current State
- **სოლო PRO**: Purple gradient, 4 benefits
- **სამეგობრო PRO**: Pink gradient, 4 benefits

## Target State (from images)
- **სოლო PRO**: Pink gradient, 3 benefits
- **სამეგობრო PRO**: Purple gradient, 3 benefits

---

## Technical Changes

### File: `src/components/shop/MobileProCarousel.tsx`

#### Update PRO_TIERS array (lines 8-40)

```typescript
const PRO_TIERS = [
  {
    id: "solo" as const,
    nameKa: "სოლო PRO",
    price: 9.99,
    icon: Crown,
    benefits: [
      "უფასო თამაშში",
      "ყველა PRO ფუნქცია",
      "რეკლამის გარეშე",
    ],
    // SWAP: Now using Pink gradient (was on Family)
    gradient: "linear-gradient(135deg, #EC4899 0%, #DB2777 50%, #BE185D 100%)",
    shadow: "#9D174D",
    ctaText: "გააქტიურება",
  },
  {
    id: "family" as const,
    nameKa: "სამეგობრო PRO",
    price: 19.99,
    icon: Users,
    benefits: [
      "SOLO PRO + 5 მეგობარი",
      "ყველა PRO ფუნქცია",
      "რეკლამის გარეშე",
    ],
    // SWAP: Now using Purple gradient (was on Solo)
    gradient: "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 50%, #5B21B6 100%)",
    shadow: "#4C1D95",
    popular: true,
    ctaText: "შეძენა",
  },
];
```

---

## Summary of Changes

| Tier | Before | After |
|------|--------|-------|
| **სოლო PRO Color** | Purple | Pink |
| **სოლო PRO Benefits** | 4 items (2x XP, No-ads, +3 spins, VIP badge) | 3 items (Free game, All PRO, No-ads) |
| **სამეგობრო PRO Color** | Pink | Purple |
| **სამეგობრო PRO Benefits** | 4 items (Solo+5, Power-ups, Free game, No-ads) | 3 items (Solo+5 friends, All PRO, No-ads) |

---

## Note
The text "ყველა PRO ფუნქცია" (All PRO features) is a summary reference - it implies users get all the active benefits without listing each one explicitly. This is a cleaner marketing approach.
