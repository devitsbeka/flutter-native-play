
# Fix Mobile PRO Carousel Card Design

## Overview
Redesign the `MobileProCarousel` component to add a horizontal header banner with "გახდი PRO" branding, fix card edge styling, and add a mascot character with a crown.

## Current State
- Simple centered title with "გახდი PRO" in a small pill
- Cards have rounded corners but may have clipping issues
- No mascot character illustration

## Changes

### 1. Add Mascot Character Image
Copy the uploaded mascot image (blue character with crown) from user-uploads to the project assets.

**Action:** Copy `user-uploads://image-1769988843.png` to `src/assets/pro-mascot.png`

### 2. Redesign Header Section
Replace the current simple pill title with a full-width horizontal header banner:

**Layout:**
```text
╭────────────────────────────────────────╮
│  👑 გახდი PRO              [Mascot]   │
│  ────────────────────────  [Image]    │
╰────────────────────────────────────────╯
```

**Styling:**
- Light background: `bg-gradient-to-r from-purple-100/80 via-pink-50/60 to-purple-100/80`
- Soft purple shadow underneath (matching reference image)
- Crown icon on left side of text
- Mascot character image positioned on the right side
- Rounded corners: `rounded-2xl`

### 3. Fix Card Edge Styling
- Ensure rounded corners are consistent (`rounded-2xl` everywhere)
- Add proper overflow handling
- Remove any clipping issues with the gradient background
- Add subtle inner shadow for depth

### 4. Updated Component Structure

```text
MobileProCarousel
├── Header Banner
│   ├── Crown icon + "გახდი PRO" text (left)
│   └── Mascot image (right, 60-80px)
├── Carousel Container
│   └── Animated PRO Cards (Solo/Family)
└── Dot Indicators
```

---

## Technical Implementation

### File Changes

**1. Copy asset:**
- `user-uploads://image-1769988843.png` → `src/assets/pro-mascot.png`

**2. Update `src/components/shop/MobileProCarousel.tsx`:**

```typescript
// New imports
import proMascot from "@/assets/pro-mascot.png";
import iconVipCrown from "@/assets/icons/icon-vip-crown.png";

// Replace title section with horizontal header banner
<div className="relative mb-4 rounded-2xl overflow-hidden"
  style={{
    background: "linear-gradient(135deg, rgba(233,213,255,0.8) 0%, rgba(251,207,232,0.6) 50%, rgba(233,213,255,0.8) 100%)",
    boxShadow: "0 8px 32px rgba(147,51,234,0.15), 0 4px 16px rgba(168,85,247,0.1)"
  }}
>
  <div className="flex items-center justify-between px-4 py-3">
    {/* Left: Crown + Text */}
    <div className="flex items-center gap-2">
      <img src={iconVipCrown} className="w-7 h-7" />
      <h2 className="text-lg font-bold text-purple-900">გახდი PRO</h2>
    </div>
    {/* Right: Mascot */}
    <img src={proMascot} className="w-16 h-16 object-contain" />
  </div>
</div>
```

**Card styling fixes:**
- Add `rounded-3xl` to card container
- Use `overflow-hidden` properly
- Improve box-shadow for better depth
- Fix any edge clipping on gradient borders

---

## Visual Reference

The header will match the reference images showing:
- Soft lavender/pink gradient background
- Purple crown icon on left
- Bold Georgian text "გახდი PRO"
- Character mascot (blue character with yellow crown) on the right side
- Soft purple shadow underneath the banner

---

## Files Summary

| File | Action |
|------|--------|
| `src/assets/pro-mascot.png` | Create (copy from user upload) |
| `src/components/shop/MobileProCarousel.tsx` | Modify header and card styling |

---

## Testing
- Verify header displays correctly with mascot
- Check card edges are properly rounded without clipping
- Test on mobile and tablet viewports
- Confirm carousel animation still works
- Verify checkout buttons still function
