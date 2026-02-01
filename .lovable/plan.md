
# Replace PRO Mascot with New Character

## Overview
Replace the current mascot image in the "გახდი PRO" header banner with the new blue character mascot (with yellow crown) that the user uploaded, and flip it horizontally so it faces left toward the text.

## Current State
- `src/assets/pro-mascot.png` - Current mascot image (appears as a weird screenshot)
- Used in `MobileProCarousel.tsx` line 90 without any transform

## Changes

### 1. Replace Mascot Asset

**Action:** Copy the new mascot image to replace the existing one

| Source | Destination |
|--------|-------------|
| `user-uploads://image-1769989547.png` (blue character with crown) | `src/assets/pro-mascot.png` |

### 2. Apply Horizontal Flip

**File:** `src/components/shop/MobileProCarousel.tsx`

Add CSS transform to flip the mascot horizontally so it faces the "გახდი PRO" text:

**Line 90 - Before:**
```tsx
<img src={proMascot} alt="" className="w-16 h-16 object-contain" />
```

**After:**
```tsx
<img 
  src={proMascot} 
  alt="" 
  className="w-16 h-16 object-contain" 
  style={{ transform: "scaleX(-1)" }}
/>
```

---

## Visual Result

```text
╭────────────────────────────────────────╮
│  👑 გახდი PRO          [Blue Mascot]  │
│                        (facing left)   │
╰────────────────────────────────────────╯
```

The mascot will be the friendly blue fuzzy character with yellow crown, flipped to face toward the text on the left.

---

## Files Summary

| File | Action |
|------|--------|
| `src/assets/pro-mascot.png` | Replace with new mascot image |
| `src/components/shop/MobileProCarousel.tsx` | Add `transform: scaleX(-1)` to flip image |

---

## Testing
- Verify mascot displays correctly in header banner
- Confirm mascot is flipped to face left
- Check sizing is appropriate (w-16 h-16)
- Test on mobile viewport
