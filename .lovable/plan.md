
# Plan: Fix MyTrivia LIVE Logo Transparency

## Problem

The current logo (`src/assets/mytrivia-live-logo.png`) is a PNG file with a **white background baked in**. When displayed on colored backgrounds (like the purple splash screen), the white rectangle is visible behind the logo.

## Solution

Replace the PNG-based logo with a **CSS/HTML text-based logo component** that is naturally transparent. The project already has:
- `font-slackey` (Slackey font) configured in Tailwind
- `LiveBadge` component with the pulsing red badge

## Changes

### File: `src/components/shared/MyTriviaLiveLogo.tsx`

Replace the PNG image approach with a text-based approach:

**Current approach:**
```tsx
<img src={myTriviaLogo} alt="MyTrivia LIVE" />
```

**New approach:**
```tsx
<div className="flex items-center gap-1.5">
  <span className="font-slackey text-black" style={{ fontSize }}>
    MyTrivia
  </span>
  <LiveBadge size={size} />
</div>
```

### Key Implementation Details:

1. Remove the PNG import
2. Use `font-slackey` class for the "MyTrivia" text
3. Create a reusable `LiveBadge` that accepts size prop
4. Support existing size variants (sm, md, lg) with appropriate font sizes
5. Add `textColor` prop for light/dark background usage (black text on light, white text on dark)

### Size Mapping:
| Size | Font Size | Badge Scale |
|------|-----------|-------------|
| sm   | 20px      | 0.8         |
| md   | 28px      | 1.0         |
| lg   | 40px      | 1.2         |
| xl   | 48px      | 1.4         |

### File: `src/components/social/LiveBadge.tsx`

Add a `size` prop to scale the badge appropriately:
- Small: `text-[8px]`, dot `w-1 h-1`
- Medium: `text-[9px]`, dot `w-1.5 h-1.5` (current default)
- Large: `text-[11px]`, dot `w-2 h-2`

### Files That Use Logo (will benefit automatically):
- `src/pages/Loading.tsx`
- `src/components/SplashScreen.tsx`
- `src/components/tv/TVPairingScreenV3.tsx`
- `src/components/tv/TVBrandingOverlay.tsx`

## Result

The logo will now render with a **transparent background**, blending naturally with any background color - purple splash screens, dark TV overlays, etc.
