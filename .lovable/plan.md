
# Plan: Fix Logo Visibility - Move to Header Area

## Problem Identified

The logo ("MyTrivia LIVE") is currently placed inside the main content area where the floating action buttons (reward icons) overlap and obscure it. This happens on all screen sizes.

**Current structure:**
```
┌────────────────────────────────────────────────┐
│ ☰                                          🔔  │  ← Header (no logo)
├────────────────────────────────────────────────┤
│                                                │
│     🎁   🔮  MyTrivia LIVE  📦   ⚡           │  ← Logo BEHIND icons!
│              (OVERLAID!)                       │
│            (avatar circle)                     │
│                                                │
└────────────────────────────────────────────────┘
```

---

## Solution

Move the logo to the header section:
- **Desktop/Tablet**: Display logo BEFORE the search bar with `size="md"` (28px)
- **Mobile**: Display logo centered in header with `size="sm"` (20px)
- Remove logo from the main content area (all 3 viewport sections)

**New structure:**
```
Desktop/Tablet:
┌────────────────────────────────────────────────┐
│ [MyTrivia LIVE]  [🔍 ძებნა...       ]      🔔  │  ← Logo in header
├────────────────────────────────────────────────┤
│                                                │
│     🎁   🔮   📦   ⚡                          │  ← Icons without overlap
│            (avatar circle)                     │
│                                                │
└────────────────────────────────────────────────┘

Mobile:
┌──────────────────────────────┐
│ ☰    [MyTrivia LIVE]     🔔  │  ← Logo centered in header
├──────────────────────────────┤
│                              │
│    🎁   🔮   📦   ⚡         │
│        (avatar)              │
│                              │
└──────────────────────────────┘
```

---

## Technical Changes

### File: `src/pages/Index.tsx`

**1. Update header section (lines 433-439)** - Add logo to header:

```typescript
{/* Center: Logo + Spotlight */}
<div className="flex-1 flex justify-center md:justify-start items-center gap-4">
  {/* Logo - visible on all screens, md size on desktop/tablet, sm on mobile */}
  <MyTriviaLiveLogo size="sm" className="md:hidden" />
  <MyTriviaLiveLogo size="md" className="hidden md:flex" />
  
  {/* Spotlight Search Bar - Hidden on mobile */}
  <div className="hidden md:flex flex-1">
    <SpotlightSearch />
  </div>
</div>
```

**2. Remove logo from md-xl layout (lines 573-581)**:
Delete the logo motion.div inside the md:flex xl:hidden section

**3. Remove logo from xl+ layout (lines 799-807)**:
Delete the logo motion.div inside the xl:flex section

**4. Remove logo from mobile layout (lines 902-910)**:
Delete the logo motion.div inside the md:hidden section

---

## Size Reference

| Screen | Logo Size | Font Size |
|--------|-----------|-----------|
| Mobile | `sm` | 20px |
| Tablet (md) | `md` | 28px |
| Desktop (lg+) | `md` | 28px |

The user specifically requested NOT to use `lg` (40px) or `xl` (48px) sizes.

---

## Summary

| File | Action |
|------|--------|
| `Index.tsx` header (line 433-439) | Add logo before search bar |
| `Index.tsx` md-xl section (line 573-581) | Remove logo |
| `Index.tsx` xl+ section (line 799-807) | Remove logo |
| `Index.tsx` mobile section (line 902-910) | Remove logo |

This ensures the logo is always visible in the header, never overlaid by floating elements, and uses medium size on desktop/tablet as requested.
