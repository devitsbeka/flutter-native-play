
## Fix: Video Quality & Playback on Discover + Category Pages

### Issue 1: Category Page Header Video - Poor Quality on Mobile

**Root cause**: The `PingPongVideo` component uses `useResponsiveVideo()` which serves mobile WebM files at 480px width (CRF 30) for ANY mobile viewport. But the category page header spans the full screen width at 48vh height -- this requires much higher resolution than a small card thumbnail.

On an iPhone 14 Pro (390px @ 3x = 1170 physical pixels), a 480px WebM is being stretched to fill 1170+ physical pixels, resulting in visible blurriness.

**Fix**: Add an optional `forceDesktop` prop to `PingPongVideo` that bypasses the mobile WebM and always serves the desktop 720px WebM. Use this prop in the `CategoryPage.tsx` header where the video fills the screen.

### Issue 2: Discover Page - Videos Not Playing / Blank Cards

**Root cause**: The Discover page uses `CategoryCarousel` which renders multiple `AirbnbCategoryCard` components, each containing a `PingPongVideo`. The `videoLoadQueue` limits concurrent video downloads to 3, so only 3 cards load at a time. When scrolling horizontally, cards that leave the viewport release their slot, but new cards entering the view have to wait.

The real problem is that the `PingPongVideo` already has IntersectionObserver logic to play/pause based on visibility, but the load queue (max 3 concurrent) combined with multiple carousels creates contention. The user sees blank pastel backgrounds where videos are queued but not yet loaded.

**Fix**: Implement a "play only the centered/visible card" strategy for the carousel:
- In `PingPongVideo`, add support for an `active` prop that controls whether the video should play
- When `active=false`, pause the video and release the load queue slot
- In `CategoryCarousel`, track which card is most centered in the scroll viewport using an IntersectionObserver with a tighter threshold, and only set `active=true` for the most visible card
- This ensures only 1 video per carousel loads at a time, freeing slots for other carousels

### Changes

**File: `src/components/shared/PingPongVideo.tsx`**
1. Add `forceDesktopQuality?: boolean` prop -- when true, skip the mobile WebM and use desktop WebM directly
2. Add `active?: boolean` prop (default `true`) -- when false, don't load or play the video
3. Update the responsive video logic to respect `forceDesktopQuality`
4. Update the IntersectionObserver + queue logic to also check `active` state

**File: `src/pages/CategoryPage.tsx`**
1. Add `forceDesktopQuality` to the header `PingPongVideo` to always serve 720px WebM instead of 480px mobile variant

**File: `src/components/discover/AirbnbCategoryCard.tsx`**
1. Accept new `isVideoActive?: boolean` prop and pass it to `PingPongVideo` as `active`

**File: `src/components/discover/CategoryCarousel.tsx`**
1. Use IntersectionObserver on each card with `threshold: 0.7` to detect which card is most visible
2. Track `activeCardIndex` state
3. Pass `isVideoActive={index === activeCardIndex}` to each `AirbnbCategoryCard`
4. On scroll stop, only the centered card's video plays -- all others show their poster image

**File: `scripts/convert-videos-webm.sh`** (recommendation only, not a code change)
- For future re-encodes: increase `MOBILE_MAX_WIDTH` from 480 to 540 and lower `MOBILE_CRF` from 30 to 28 for better card quality
- This is a local script change and won't affect the app code

### Summary

| File | Change |
|---|---|
| `PingPongVideo.tsx` | Add `forceDesktopQuality` and `active` props |
| `CategoryPage.tsx` | Use `forceDesktopQuality` on header video |
| `AirbnbCategoryCard.tsx` | Accept and forward `isVideoActive` prop |
| `CategoryCarousel.tsx` | Track centered card, only activate its video |

### Result
- Category page header: crisp 720px video on all devices (no more blurry stretched 480px mobile video)
- Discover page: only the card you're looking at plays video, others show poster image. Scrolling to a new card triggers that card's video. This eliminates blank cards and reduces network/CPU load from trying to play 15+ videos simultaneously.
