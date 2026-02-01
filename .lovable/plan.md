

# Fix No-Ads Navigation & Add Mobile PRO Carousel

## Overview
Two changes are needed:
1. Fix the "no-ads" icon button that incorrectly navigates to leaderboards instead of the shop page
2. Add a PRO subscription cards carousel on mobile/tablet devices in the shop page, replacing the current hero carousel

## Changes

### 1. Fix No-Ads Icon Navigation (Bug Fix)

**Current Issue:**
The "no-ads" button in the home page orbit navigates users to `/leaderboards` instead of the shop page.

**File:** `src/pages/Index.tsx`

**Change:**
Line ~990: Change `navigate("/leaderboards")` to `navigate("/power-ups")` for the `adFreeIcon` button.

```typescript
// Before
onClick={() => navigate("/leaderboards")}

// After  
onClick={() => navigate("/power-ups")}
```

---

### 2. Add Mobile PRO Cards Carousel

**Goal:**
On mobile and tablet (below `xl` breakpoint), show a carousel with "გახდი PRO" (Solo PRO) and "სამეგობრო PRO" (Family PRO) subscription cards above the powers section, replacing the current hero carousel.

**Implementation:**

#### New Component: `src/components/shop/MobileProCarousel.tsx`

Create a new carousel component specifically for mobile/tablet that displays:
- **სოლო PRO** (₾9.99/month) - Purple gradient card with Crown icon
- **სამეგობრო PRO** (₾19.99/month) - Pink gradient card with Users icon, "TOP" badge

Features:
- Swipeable carousel with dot indicators
- Uses existing PRO tier data from `ShopRightSidebar`
- Triggers `useProPurchase` hook for Stripe checkout
- Shows benefits and pricing
- Respects current subscription status (shows "აქტიური" badge if subscribed)

#### Modify: `src/components/shop/ShopStandardLayout.tsx`

- Import the new `MobileProCarousel` component
- Import `useIsMobile` hook for responsive detection
- Conditionally render:
  - **Desktop (xl+):** Keep existing `ShopHeroCarousel`
  - **Mobile/Tablet (<xl):** Show `MobileProCarousel` instead

```typescript
// Conditional carousel based on screen size
{isDesktop ? (
  <ShopHeroCarousel onSlideClick={handleSlideClick} />
) : (
  <MobileProCarousel />
)}
```

---

## Technical Details

### Mobile PRO Carousel Component Structure

```text
MobileProCarousel
├── Uses useProPurchase hook for checkout
├── Uses useVipStatus for current subscription
├── Swipeable container (touch gestures)
├── PRO Tier Cards
│   ├── Solo PRO Card
│   │   ├── Crown icon
│   │   ├── Price: ₾9.99/month
│   │   └── Benefits list
│   └── სამეგობრო PRO Card
│       ├── Users icon
│       ├── "TOP" badge
│       ├── Price: ₾19.99/month
│       └── Benefits list
└── Dot pagination indicators
```

### Responsive Breakpoints

- **xl (1280px+):** Desktop - Show existing hero carousel + right sidebar
- **< xl:** Mobile/Tablet - Show PRO carousel, hide right sidebar (already hidden)

### Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/pages/Index.tsx` | Modify | Fix navigation from `/leaderboards` to `/power-ups` |
| `src/components/shop/MobileProCarousel.tsx` | Create | New carousel for PRO tiers on mobile |
| `src/components/shop/ShopStandardLayout.tsx` | Modify | Conditionally render appropriate carousel |

---

## Testing Checklist
- [ ] Clicking no-ads icon navigates to shop page
- [ ] Mobile: PRO carousel appears above powers section
- [ ] Mobile: Can swipe between Solo and Family PRO cards
- [ ] Mobile: Tapping card initiates Stripe checkout
- [ ] Tablet: Same behavior as mobile
- [ ] Desktop: Original hero carousel still shows (no PRO carousel)
- [ ] Active subscription shows "აქტიური" badge correctly

