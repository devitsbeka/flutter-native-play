
# Plan: Fix Leaderboard Background Display Issues

## Problems Identified

### 1. Mobile Background Issues
- **Container height is too restrictive**: `h-[35vh]` creates inconsistent sizing across devices
- **`backgroundSize: 'cover'`** zooms/crops the image to fill, causing quality loss
- **Inconsistent positioning**: Gold tier uses `-55px` offset, others use `-105px`

### 2. Desktop/Tablet Background Issues
- **`backgroundSize: '100% auto'`** doesn't account for aspect ratio - on wide screens the image appears short, on narrow screens it overflows
- **No tablet breakpoint**: Tablets (768px-1024px) incorrectly use mobile layout

### 3. General Quality Issues
- Using CSS `background-image` instead of `<img>` loses browser optimizations
- No responsive image loading (no srcset/sizes)
- Images may be compressed artifacts from being scaled improperly

---

## Solution

Replace the CSS background approach with a proper `<img>` element and use `object-fit: contain` to preserve aspect ratio while ensuring the image looks crisp.

### Strategy by Device

| Device | Approach |
|--------|----------|
| **Mobile** (< 768px) | Use `<img>` with `object-fit: contain` and `object-position: top center` in a taller container |
| **Tablet** (768px - 1024px) | Use `<img>` with `object-fit: cover` centered, with controlled max-height |
| **Desktop** (> 1024px) | Use `<img>` with `object-fit: cover` and `object-position: top center` |

---

## Technical Changes

### File: `src/components/leaderboard/LeaderboardHeroBackground.tsx`

**Key Changes:**

1. **Replace CSS backgrounds with `<img>` elements**
   - Better browser optimization and native lazy loading
   - Proper scaling with `object-fit`

2. **Use `object-fit: contain` on mobile** to prevent cropping/zooming
   - Image will scale to fit without distortion
   - Add background color to fill empty space

3. **Add tablet breakpoint handling**
   - Tablets should get desktop background but with adjusted sizing

4. **Increase mobile container height** 
   - Change from `h-[35vh]` to `h-[45vh] min-h-[280px]` for better proportions

5. **Consistent positioning**
   - Remove the tier-specific offset calculations that cause inconsistency

### Code Structure:

```tsx
// Mobile: <img> with object-contain for crisp display
{isMobile ? (
  <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-primary/10 to-background">
    <img
      src={TIER_BACKGROUNDS[currentTier] ?? leaderboardBgSilver}
      alt=""
      className="w-full h-full object-contain object-top"
      loading="eager"
    />
  </div>
) : (
  // Desktop/Tablet: <img> with object-cover + mask for fade
  <div className="absolute inset-0 w-full h-full">
    <img
      src={leaderboardBgDesktop}
      alt=""
      className="w-full h-full object-cover object-top"
      loading="eager"
      style={{
        maskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
      }}
    />
  </div>
)}
```

### Container Height Adjustments:

```tsx
// Before:
className={`relative w-full overflow-hidden ${isMobile ? 'h-[35vh]' : 'min-h-screen'}`}

// After:
className={`relative w-full overflow-hidden ${
  isMobile 
    ? 'h-[45vh] min-h-[280px] max-h-[400px]' 
    : 'min-h-screen'
}`}
```

---

## Visual Comparison

```text
BEFORE (Mobile):
┌─────────────────────┐
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  ← Image zoomed/cropped
│▓▓  TROPHY  ▓▓▓▓▓▓▓▓▓│    to fill container
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
└─────────────────────┘

AFTER (Mobile):
┌─────────────────────┐
│                     │  ← Gradient background fills gaps
│    ┌──────────┐     │
│    │  TROPHY  │     │  ← Image contained, crisp
│    └──────────┘     │
│                     │
└─────────────────────┘
```

---

## Additional Optimizations

### 1. Add Smooth Transitions
Keep the existing `transition-all duration-500` for tier switching but apply to the `<img>` opacity.

### 2. Preload Critical Images
Add preload hints for the background images to improve perceived performance:

```tsx
// In the component or via link tags
<link rel="preload" href={leaderboardBgDesktop} as="image" />
```

### 3. Consider WebP Format
If the PNG files are large, consider converting to WebP for better compression without quality loss.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/leaderboard/LeaderboardHeroBackground.tsx` | Replace CSS backgrounds with `<img>`, adjust container sizing, use `object-fit` properly |

---

## Expected Results

- **Mobile**: Images display at their natural aspect ratio without zoom/crop distortion
- **Tablet**: Properly scaled background matching desktop style
- **Desktop**: Crisp full-width background with proper mask fade
- **All devices**: Consistent visual quality, no pixelation or blur from improper scaling
