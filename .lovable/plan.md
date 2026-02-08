

## Fix Video Quality and Eliminate Card Jumping

### Problem Analysis

Three root causes create the poor video experience:

1. **Low-quality mobile videos**: On mobile, the system routes to `/videos/mobile/*.webm` (likely 480p), producing blurry backgrounds. The desktop WebM files (`/videos/*.webm`) are good quality but never served on mobile.

2. **Missing poster images**: The `CATEGORY_IMAGES` config references `/images/categories/*.jpg` files, but that directory is empty. Without poster images, cards show a blank/transparent area until the video fully loads, creating an unfinished look.

3. **Video jumping on scroll**: The combination of `scroll-smooth` + `snap-mandatory` on the carousel, plus the intersection-observer-based active card system (only the centered card loads its video), causes videos to constantly load/unload as you scroll. Each transition triggers the opacity animation (0 to 100), making cards visually "jump" between blank and loaded states.

### Solution

#### Change 1: Use desktop-quality WebM on all devices (remove mobile variant routing)

**File: `src/hooks/useResponsiveVideo.ts`**

Stop routing mobile devices to the low-quality `/videos/mobile/` folder. Always serve the desktop WebM files (`/videos/*.webm`) which are already compressed and good quality. The mobile variants were causing the blurry appearance.

The hook will always return `toWebmUrl()` regardless of breakpoint.

#### Change 2: Use static JPEG poster images from `CATEGORY_IMAGES` config -- generate them from video first frames

Since `/images/categories/` is empty, the poster system silently fails. Instead of relying on missing files, we will switch the poster strategy:

**File: `src/components/discover/AirbnbCategoryCard.tsx`**

Remove the `posterUrl` prop from PingPongVideo since the images don't exist. Instead, rely on the pastel gradient background (which is already rendered) as the fallback while videos load. The gradient is always visible and matches the card's color scheme, so there's no blank state.

#### Change 3: Keep videos loaded once ready -- don't unload on scroll

**File: `src/components/shared/PingPongVideo.tsx`**

The current behavior pauses AND resets video state when it leaves the viewport. This means scrolling back requires re-loading. Instead:
- Keep the video element loaded once it has played (don't reset `isReady` when leaving view)
- Only pause playback when out of view (save CPU), but keep the last frame visible
- Resume playback when scrolling back into view without re-triggering the load queue
- This eliminates the blank-to-loaded "jump" on re-scroll

#### Change 4: Remove `scroll-smooth` from carousel to prevent CSS-animated scroll fighting with snap

**File: `src/components/discover/CategoryCarousel.tsx`**

Remove `scroll-smooth` class from the scrollable container. Native touch scrolling with `snap-x snap-mandatory` works better without CSS smooth scrolling, which can create janky interactions on mobile Safari. The programmatic scroll buttons (desktop only) will keep their own `behavior: "smooth"`.

#### Change 5: Allow more cards to have active video playback in carousel

**File: `src/components/discover/CategoryCarousel.tsx`**

Currently only `index === activeCardIndex` gets `isVideoActive={true}`, meaning only 1 card plays at a time. Expand this to also activate the adjacent cards (activeCardIndex +/- 1). This pre-loads neighboring videos so they're ready when the user scrolls, eliminating the blank frame flash.

#### Change 6: Update video preloader to always use desktop WebM URLs

**File: `src/config/videoConfig.ts`**

Update `getAllVideoUrls()` to always return desktop WebM URLs (remove the mobile branch) so the service worker pre-caches the correct high-quality files.

### Technical Details

| File | Change |
|------|--------|
| `src/hooks/useResponsiveVideo.ts` | Always return desktop WebM URL |
| `src/config/videoConfig.ts` | `getAllVideoUrls()` always uses `toWebmUrl()` (no mobile branch) |
| `src/components/shared/PingPongVideo.tsx` | Keep video loaded once ready; only pause/resume on visibility |
| `src/components/discover/AirbnbCategoryCard.tsx` | Remove broken `posterUrl` prop |
| `src/components/discover/CategoryCarousel.tsx` | Remove `scroll-smooth`; activate adjacent cards |

### Expected Result
- All devices get sharp, high-quality video backgrounds
- No more blank cards or "jumping" between empty and loaded states
- Smooth scrolling without janky CSS transitions fighting snap points
- Adjacent cards pre-loaded so scrolling feels instant
