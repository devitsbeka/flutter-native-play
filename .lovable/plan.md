
# Plan: Fix Logo, Font, and Flag Issues

## Overview

This plan fixes 3 issues visible in the mobile main page:
1. **Logo missing from mobile header** - Add it back (was removed in previous change)
2. **Username font** - Ensure Google Sans is working properly
3. **Flag broken image** - Fix the flagcdn.com URL format (using `.svg` but needs `.png`)

---

## Issue 1: Show Logo on Mobile Header

### File: `src/pages/Index.tsx`

The logo was previously removed from the header. Add it back for mobile only.

**Lines 433-434** - Add logo back to the center section:

```typescript
// Before:
{/* Center: Spotlight */}
<div className="flex-1 flex justify-center md:justify-start items-center gap-4">

// After: Add logo for mobile
{/* Center: Logo (mobile) + Spotlight (tablet/desktop) */}
<div className="flex-1 flex justify-center md:justify-start items-center gap-4">
  {/* Logo - visible only on mobile */}
  <MyTriviaLiveLogo size="sm" className="md:hidden" />
```

---

## Issue 2: Verify Username Font

The username font was already changed to `font-sans font-bold` in the previous edit (lines 740 and 827 in Index.tsx). This should work correctly since `font-sans` is configured in tailwind to use "Google Sans" as the primary font.

However, the current code shows:
```typescript
<span className="font-sans text-gray-800 capitalize font-bold" style={{ fontSize: 28 }}>
```

This is correct - Google Sans is applied via the `font-sans` class. No changes needed here.

---

## Issue 3: Fix Broken Flag Image

### File: `src/components/shared/FlagIcon.tsx`

**Root Cause:** The URL `https://flagcdn.com/w40/ge.svg` returns 404. The correct format is `.png` not `.svg`.

**Line 20** - Change file extension:

```typescript
// Before:
src={`https://flagcdn.com/w40/${code}.svg`}

// After: Use PNG format
src={`https://flagcdn.com/w40/${code}.png`}
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Add `MyTriviaLiveLogo` back to mobile header |
| `src/components/shared/FlagIcon.tsx` | Change flag URL from `.svg` to `.png` |

---

## Technical Notes

- The `MyTriviaLiveLogo` component is already imported in Index.tsx
- flagcdn.com's width-based paths (`/w40/`) only support PNG format, not SVG
- The username font is already using Google Sans via `font-sans` class
