
# Plan: Multiple UI Improvements

## Overview

This plan addresses several UI improvements:
1. **Flag icon shape** - Change from circular to rectangular flag
2. **Username font** - Use Google Sans (same as league title) for usernames
3. **Remove logo** from main page header (keep in desktop nav)
4. **Power-ups summary** - Always show on one line in shop page
5. **Instant count update with animation** after purchase
6. **Fix mobile shop page scroll** - Currently stuck with no scroll

---

## Step 1: Change Flag Icon to Rectangle

### File: `src/components/shared/FlagIcon.tsx`

**Current:** Uses `hatscripts.github.io/circle-flags` (circular flags)
**Change:** Use `flagcdn.com` for rectangular flags, remove `rounded-full`

```typescript
// Before: Uses circle-flags and rounded-full
src={`https://hatscripts.github.io/circle-flags/flags/${code}.svg`}
className={cn(sizeClasses[size], "rounded-full object-cover", className)}

// After: Uses flagcdn.com for rectangular flags
src={`https://flagcdn.com/w40/${code}.svg`}
className={cn(sizeClasses[size], "rounded-sm object-cover", className)}
```

Also adjust size classes for rectangular aspect ratio:
```typescript
const sizeClasses = {
  sm: "w-6 h-4",   // Rectangular 3:2 ratio
  md: "w-8 h-5",
  lg: "w-12 h-8",
};
```

---

## Step 2: Use Google Sans Font for Usernames

### File: `src/pages/Index.tsx`

The username display currently uses `font-slackey`. Change to match the leaderboard league title font which uses Google Sans with `fontWeight: 700`.

**Lines 744, 834** - Update username spans:
```typescript
// Before:
<span className="font-slackey text-gray-800 capitalize" style={{ fontSize: 28 }}>

// After: Use Google Sans like league titles
<span className="font-sans text-gray-800 capitalize font-bold" style={{ fontSize: 28 }}>
```

**Note:** `font-sans` in tailwind.config.ts is already configured to use "Google Sans" as the first font, which is the same font used for the league title in Leaderboards.tsx.

---

## Step 3: Remove Logo from Main Page Header

### File: `src/pages/Index.tsx`

Remove the logo from the mobile/tablet header on the main page. The logo will remain in the desktop side navigation (UnifiedDesktopNav).

**Lines 436-437** - Remove these lines:
```typescript
// REMOVE these:
<MyTriviaLiveLogo size="sm" className="md:hidden" />
<MyTriviaLiveLogo size="md" className="hidden md:flex" />
```

---

## Step 4: Power-Ups Summary Always on One Line

### File: `src/components/shop/PowerUpsSummary.tsx`

**Current:** Uses `md:grid md:grid-cols-2` which creates 2x2 grid on tablet
**Change:** Use `flex-nowrap` always to keep all 4 items on one line

```typescript
// Before (line 25):
<div className="flex flex-wrap md:grid md:grid-cols-2 lg:flex lg:flex-nowrap items-center gap-1.5 md:gap-2">

// After: Always single line
<div className="flex flex-nowrap items-center gap-1.5 md:gap-2">
```

Also reduce min-width to fit better:
```typescript
// Before:
className="... min-w-[52px] md:min-w-[56px]"

// After:
className="... min-w-[48px]"
```

---

## Step 5: Instant Count Update with Animation

### File: `src/components/shop/PowerUpsSummary.tsx`

Add animation support using framer-motion to show a "pop" effect when counts change.

Add key based on count value and wrap in AnimatePresence:
```typescript
import { motion, AnimatePresence } from "framer-motion";

// Wrap the count span with animation
<AnimatePresence mode="wait">
  <motion.span
    key={powerUps[type]} // Key changes when count changes, triggers animation
    initial={{ scale: 1.4, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    exit={{ scale: 0.8, opacity: 0 }}
    transition={{ type: "spring", stiffness: 500, damping: 25 }}
    className="text-xs font-bold text-foreground/90"
  >
    {powerUps[type]}
  </motion.span>
</AnimatePresence>
```

---

## Step 6: Fix Mobile Shop Page Scroll

### File: `src/pages/PowerUps.tsx`

**Problem:** The MainLayout uses `disableScroll` by default which blocks scrolling on mobile. The shop page doesn't need disabled scroll.

Also ensure the main content area has proper overflow settings.

**Line 238** - MainLayout already has proper settings, but the inner container may need adjustment:

```typescript
// Line 251: Update the main content area styling
<div className="flex-1 relative pb-24 md:pb-0 bg-transparent scroll-smooth scrollbar-hide xl:mr-[320px]">

// Should have explicit overflow-y-auto for mobile
<div className="flex-1 relative pb-24 md:pb-0 bg-transparent scroll-smooth scrollbar-hide xl:mr-[320px] overflow-y-auto">
```

Additionally, check if the parent flex container needs `min-h-0` to allow flex child to scroll:

```typescript
// Line 249:
<div className="flex flex-1">

// Add min-h-0 for proper flex scroll behavior
<div className="flex flex-1 min-h-0">
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/shared/FlagIcon.tsx` | Rectangular flag with updated sizes |
| `src/pages/Index.tsx` | Remove header logo, use `font-sans font-bold` for username |
| `src/components/shop/PowerUpsSummary.tsx` | Always one line, add count animation |
| `src/pages/PowerUps.tsx` | Fix mobile scroll with `overflow-y-auto` and `min-h-0` |

---

## Technical Notes

- The Google Sans font is already configured in `tailwind.config.ts` as the first font in `fontFamily.sans`
- The league titles use `style={{ fontFamily: "'Google Sans', sans-serif", fontWeight: 700 }}` which is equivalent to `font-sans font-bold` in Tailwind
- Using `AnimatePresence` with a key based on count ensures the animation triggers only when the count actually changes
- Adding `min-h-0` to flex containers is a common fix for enabling proper scroll behavior in nested flex layouts
