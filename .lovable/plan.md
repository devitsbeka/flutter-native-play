
# Plan: Replace CSS Logo with PNG Logo Image

## Overview

Replace the current CSS/font-based "MyTrivia LIVE" logo with the actual uploaded logo image (`MyTriviaLIVE_logo.png`) across all pages and components.

---

## Step 1: Copy Logo to Assets

Copy the uploaded logo image to the project assets folder:
```
user-uploads://MyTriviaLIVE_logo.png → src/assets/mytrivia-live-logo.png
```

---

## Step 2: Update MyTriviaLiveLogo Component

**File:** `src/components/shared/MyTriviaLiveLogo.tsx`

Replace the CSS-based logo with an `<img>` tag that uses the PNG. Keep the size variants for different contexts.

| Size | Height | Use Case |
|------|--------|----------|
| `sm` | 28px | Compact headers |
| `md` | 36px | Main header |
| `lg` | 56px | Featured/hero areas |

The component will now simply render the image at different sizes instead of constructing the logo from text + badge.

---

## Step 3: Update Loading Page

**File:** `src/pages/Loading.tsx`

Replace the inline CSS logo (lines 66-101) with an imported image.

For the loading/splash context, use a larger version with optional white text shadow filter for visibility on dark backgrounds.

---

## Step 4: Update SplashScreen

**File:** `src/components/SplashScreen.tsx`

Replace the inline CSS logo (lines 168-201) with the imported image, similar to Loading page changes.

---

## Step 5: Update TV Pairing Screen

**File:** `src/components/tv/TVPairingScreenV3.tsx`

Replace the inline CSS logo (lines 52-86) with the imported image for TV display context.

---

## Step 6: Update TV Branding Overlay

**File:** `src/components/tv/TVBrandingOverlay.tsx`

Replace the CSS logo (lines 23-38) with an image version. For TV contexts with dark backgrounds, may need filter/brightness adjustments.

---

## Visual Comparison

### Current (CSS-based):
```
┌────────────────────────────────────┐
│ MyTrivia [font] + [● LIVE badge]   │
│ Built with CSS, animations, colors │
└────────────────────────────────────┘
```

### After (Image-based):
```
┌────────────────────────────────────┐
│ [MyTriviaLIVE_logo.png image]      │
│ Single image asset, scales cleanly │
└────────────────────────────────────┘
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/assets/` | Add `mytrivia-live-logo.png` |
| `src/components/shared/MyTriviaLiveLogo.tsx` | Replace with image-based logo |
| `src/pages/Loading.tsx` | Replace inline CSS logo with image |
| `src/components/SplashScreen.tsx` | Replace inline CSS logo with image |
| `src/components/tv/TVPairingScreenV3.tsx` | Replace inline CSS logo with image |
| `src/components/tv/TVBrandingOverlay.tsx` | Replace inline CSS logo with image |

---

## Technical Notes

- Import the image as ES6 module: `import myTriviaLogo from "@/assets/mytrivia-live-logo.png"`
- Use `height` CSS property for consistent sizing (width auto-scales)
- For dark backgrounds (Loading, Splash, TV), may need `filter: drop-shadow()` for visibility
- Keep motion animations for entrance effects where they exist
- Remove the blinking dot animation since it's now part of the static image
