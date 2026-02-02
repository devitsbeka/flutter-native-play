
# Plan: Add No-Ads Card to Desktop and Tablet Layouts

## Problem Analysis

Currently, the "no-ads" icon is only shown on mobile in the curved action buttons above the avatar (line 1017 in Index.tsx). On desktop and tablet:
- The **DesktopActionCards** component (shown in the right side panel on lg+ screens) only includes: Daily Rewards, Missions, Chest, and Powers
- There's no Ad-Free/No-Ads card in the desktop layout

The user wants the no-ads card to also appear on desktop and tablet layouts.

---

## Solution

Add a new "No-Ads" card to the `DesktopActionCards` component, following the same pattern as the existing cards (Daily Rewards, Missions, etc.).

---

## Technical Changes

### File 1: `src/components/home/DesktopActionCards.tsx`

#### Change 1.1: Import the ad-free icon

**Location: Line 7**
```typescript
// ADD after powersIcon import:
import adFreeIcon from "@/assets/icons/icon-ad-free.png";
```

#### Change 1.2: Add onAdFreeClick prop to interface

**Location: Lines 12-18**
```typescript
interface DesktopActionCardsProps {
  onDailyRewardsClick: () => void;
  onMissionsClick: () => void;
  onChestClick: () => void;
  onPowersClick: () => void;
  onAdFreeClick: () => void;  // ADD THIS
  vertical?: boolean;
}
```

#### Change 1.3: Destructure the new prop

**Location: Lines 246-252**
```typescript
export function DesktopActionCards({
  onDailyRewardsClick,
  onMissionsClick,
  onChestClick,
  onPowersClick,
  onAdFreeClick,  // ADD THIS
  vertical = false,
}: DesktopActionCardsProps) {
```

#### Change 1.4: Add the No-Ads ActionCard

**Location: After line 320 (after Powers Card, before closing div)**
```typescript
{/* No-Ads Card */}
<ActionCard
  iconSrc={adFreeIcon}
  title="რეკლამის გარეშე"
  statusText="პრემიუმ გამოცდილება"
  expandedDetails="ითამაშე რეკლამების გარეშე და მიიღე ექსკლუზიური შეღავათები."
  actionLabel="გახდი VIP"
  onClick={onAdFreeClick}
  bgGradient=""
  particleColor=""
  delay={0.3}
/>
```

---

### File 2: `src/pages/Index.tsx`

#### Change 2.1: Pass onAdFreeClick to DesktopActionCards

**Location: Lines 510-516** - Update the DesktopActionCards usage

```typescript
<DesktopActionCards
  onDailyRewardsClick={() => setIsDailyRewardsOpen(true)}
  onMissionsClick={() => setShowMissionsModal(true)}
  onChestClick={() => setIsChestModalOpen(true)}
  onPowersClick={() => setShowMyPowersModal(true)}
  onAdFreeClick={() => setIsAdFreeModalOpen(true)}  // ADD THIS
  vertical
/>
```

---

## Summary

| Location | Change |
|----------|--------|
| DesktopActionCards.tsx | Import ad-free icon |
| DesktopActionCards.tsx | Add `onAdFreeClick` prop to interface |
| DesktopActionCards.tsx | Add No-Ads ActionCard component |
| Index.tsx | Pass `onAdFreeClick` handler |

---

## Expected Result

- A new "რეკლამის გარეშე" (No-Ads) card appears in the right sidebar on desktop/tablet
- Uses the same ad-free icon (`icon-ad-free.png`) that's used on mobile
- Clicking it opens the AdFreeModal (same behavior as mobile)
- Card style matches the existing Daily Rewards, Missions, Chest, and Powers cards
