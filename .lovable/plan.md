

## Fix: Slow Video Load on Category Page (3-4 Second Delay)

### Root Cause

When you tap a category card on the Discover page and navigate to the CategoryPage, the header video takes 3-4 seconds to appear because of **three compounding delays**:

1. **No poster image**: The `PingPongVideo` on the CategoryPage is never given a `posterUrl`, even though you already have first-frame JPEG images for every category (the `CATEGORY_IMAGES` map in `videoConfig.ts`). Without a poster, the user sees nothing until the full video downloads and decodes.

2. **Load queue bottleneck**: The Discover page's videos may still hold slots in the global load queue (max 4 concurrent). When the CategoryPage mounts, its single header video calls `acquire()` and can get stuck waiting for Discover videos to release their slots -- even though those videos are no longer visible.

3. **No preloading on hover**: When the user hovers/touches a category card, the code preloads the `CategoryPage` JavaScript bundle, but it does **not** start prefetching the actual video file. Starting the video download 200-500ms earlier (on hover) would eliminate most of the perceived delay.

### Solution (3 changes)

#### Change 1: Show poster image instantly while video loads

**File: `src/pages/CategoryPage.tsx`**

Import `CATEGORY_IMAGES` and pass the matching poster image to `PingPongVideo`. The poster JPEG is tiny (~15-30KB) and shows immediately, so users see the category visual within milliseconds while the video downloads in the background.

```
Before:
<PingPongVideo 
  src={CATEGORY_VIDEOS[...]}
  forceDesktopQuality
/>

After:
<PingPongVideo 
  src={CATEGORY_VIDEOS[...]}
  posterUrl={CATEGORY_IMAGES[categoryKey]}
  forceDesktopQuality
/>
```

#### Change 2: Clear the load queue on page navigation

**File: `src/utils/videoLoadQueue.ts`**

Add a `reset()` method that clears all queued and active slots. This lets the CategoryPage's video start loading immediately without waiting for Discover page videos to finish.

**File: `src/pages/CategoryPage.tsx`**

Call `videoLoadQueue.reset()` on mount so the header video gets immediate priority.

#### Change 3: Prefetch the HD video on card hover/touch

**File: `src/components/discover/AirbnbCategoryCard.tsx`**

When the user hovers or touches a category card, start a `<link rel="prefetch">` for the HD video URL. This uses idle browser bandwidth to begin downloading the video before the user even taps. By the time the CategoryPage mounts, the video may already be partially or fully cached.

### Summary

| File | Change |
|------|--------|
| `src/pages/CategoryPage.tsx` | Pass `posterUrl` from `CATEGORY_IMAGES`; reset load queue on mount |
| `src/utils/videoLoadQueue.ts` | Add `reset()` method to clear all slots |
| `src/components/discover/AirbnbCategoryCard.tsx` | Prefetch HD video URL on hover/touch |

### Expected Result

- **Instant**: Poster image appears immediately (no gray/empty header)
- **~0.5-1s**: Video starts playing (vs 3-4s before), since queue is clear and video may already be prefetching
- **Smooth**: Poster fades out as video fades in with the existing 700ms CSS transition

