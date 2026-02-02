
# Restore Video Background to Mobile PRO Carousel

## Problem Identified

The `MobileProCarousel` component on the shop page is showing a **static PNG image** (`pro-mascot.png`) instead of a video. The desktop version (`ShopRightSidebar`) uses `shopbg.mp4` as an animated background, but the mobile carousel uses a static image.

---

## Current Implementation

| View | Component | Background |
|------|-----------|------------|
| Desktop (xl+) | `ShopRightSidebar` | `shopbg.mp4` (video) |
| Mobile/Tablet | `MobileProCarousel` | `pro-mascot.png` (static image) |

---

## Solution

Replace the static mascot image with a video background in the `MobileProCarousel`, similar to how the desktop sidebar works. Two options:

### Option A: Use the same `shopbg.mp4` video
Use the existing mascot video that's already working on desktop.

### Option B: Create mascot area with video
Keep the mascot area but replace the PNG with a video version if available.

**Recommended: Option A** - Use the same video background as desktop for consistency.

---

## Technical Changes

### File: `src/components/shop/MobileProCarousel.tsx`

**Changes:**
1. Import `shopbg.mp4` instead of `pro-mascot.png`
2. Replace the `<img>` element with a `<video>` element
3. Adjust styling for video background in the mascot area

**Current code (lines 6, 183-189):**
```tsx
import proMascot from "@/assets/pro-mascot.png";

// In the render:
<div className="w-[140px] flex-shrink-0 relative overflow-hidden">
  <img 
    src={proMascot} 
    alt="" 
    className="absolute inset-0 w-full h-full object-cover object-top"
  />
</div>
```

**New code:**
```tsx
import shopBgVideo from "@/assets/shopbg.mp4";

// In the render:
<div className="w-[140px] flex-shrink-0 relative overflow-hidden">
  <video
    autoPlay
    loop
    muted
    playsInline
    className="absolute inset-0 w-full h-full object-cover"
  >
    <source src={shopBgVideo} type="video/mp4" />
  </video>
</div>
```

---

## Visual Result

```text
Before (static image):       After (video):
╭─────────────────────╮     ╭─────────────────────╮
│ Solo PRO     [IMG]  │     │ Solo PRO     [▶VIDEO]│
│ ₾9.99       static  │     │ ₾9.99       animated │
│ • Benefits   ████   │     │ • Benefits   ████   │
│ [შეძენა]     ████   │     │ [შეძენა]     ████   │
╰─────────────────────╯     ╰─────────────────────╯
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/shop/MobileProCarousel.tsx` | Replace static mascot image with video background |
