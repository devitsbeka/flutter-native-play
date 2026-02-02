
# Plan: Fix Triple Logo Issue - Show Only One Logo

## Problem

Currently in `Index.tsx`, there are 3 separate `MyTriviaLiveLogo` components:
```typescript
<MyTriviaLiveLogo size="sm" className="md:hidden" />
<MyTriviaLiveLogo size="sm" className="hidden md:block lg:hidden" />
<MyTriviaLiveLogo size="md" className="hidden lg:block" />
```

All 3 are visible because the inline `display: 'inline-flex'` style in the component (added to fix wrapping) overrides Tailwind's `hidden` class.

---

## Solution

Replace the 3 separate logo components with a single `responsive` logo that handles sizing automatically based on breakpoints.

---

## Technical Changes

### File: `src/pages/Index.tsx`

**Lines 434-439**: Replace 3 logos with 1 responsive logo

```typescript
// BEFORE (3 logos, all visible):
<div className="flex-1 flex justify-center md:justify-start items-center gap-4">
  {/* Logo - sm on mobile/tablet, md on desktop - single line always */}
  <MyTriviaLiveLogo size="sm" className="md:hidden" />
  <MyTriviaLiveLogo size="sm" className="hidden md:block lg:hidden" />
  <MyTriviaLiveLogo size="md" className="hidden lg:block" />
</div>

// AFTER (1 logo with responsive sizing):
<div className="flex-1 flex justify-center md:justify-start items-center gap-4">
  {/* Logo - responsive sizing: sm on mobile/tablet, md on desktop */}
  <MyTriviaLiveLogo responsive />
</div>
```

The `responsive` prop already handles:
- Mobile (xs, sm): `sm` size (20px)
- Tablet (md): `sm` size (20px)
- Desktop (lg, xl, 2xl): `md` size (28px)

---

## Summary

| Location | Change | Purpose |
|----------|--------|---------|
| Index.tsx (lines 436-438) | Replace 3 logos with `<MyTriviaLiveLogo responsive />` | Show only 1 logo that auto-sizes |

---

## Result

- Only 1 logo will render on all screen sizes
- Logo automatically adjusts size based on viewport:
  - Mobile/Tablet: 20px font (sm)
  - Desktop: 28px font (md)
- Wrapping is still prevented by the inline styles
