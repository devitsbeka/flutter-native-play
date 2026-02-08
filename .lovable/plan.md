
## Fix Video Blinking, Quality, and Smooth Rendering

### Root Cause Analysis

After tracing through the code, I found **3 distinct bugs** causing the poor experience:

---

### Bug 1: Videos blink on scroll (opacity tied to `isInView`)

In `PingPongVideo.tsx` line 172-174, the video opacity class is:
```
isReady && isInView ? 'opacity-100' : 'opacity-0'
```

This means even when a video is fully loaded (`isReady = true`), scrolling it out of view (`isInView = false`) forces it to `opacity-0`. When scrolling back, it fades back in with a 500ms CSS transition -- creating the visible "blink/flash".

**Fix**: Once `isReady` is true, always show `opacity-100`. The video is already paused when out of view (saving CPU), so hiding it visually is unnecessary and harmful. The last frame should remain visible.

---

### Bug 2: CategoryGrid loads ALL videos simultaneously (no activation control)

`CategoryGrid.tsx` never passes `isVideoActive` to `AirbnbCategoryCard`. Since `active` defaults to `true` in PingPongVideo, every single card in the grid tries to load its video immediately. With 15-30 categories visible, this overwhelms the load queue (max 3 concurrent), causing most videos to sit in the queue indefinitely and never render.

**Fix**: Add an IntersectionObserver to `CategoryGrid` that only activates videos for cards currently in the viewport (plus a small margin). Cards far off-screen won't even attempt to load.

---

### Bug 3: Load queue never releases slots for loaded videos

In `PingPongVideo.tsx`, when a video finishes loading (`isReady = true`) and the user scrolls away, the slot is released (line 70-73). But when the user scrolls back and the video is already ready, `isReady` is true so it skips the queue (line 78-81) -- this is correct. However, the initial load path acquires a slot (`acquire`) and only releases it when leaving view. If the user never scrolls away, the slot stays occupied forever, blocking other videos from loading.

**Fix**: Release the queue slot as soon as the video is ready (after `canplay`), not just when leaving view. The slot is only needed during the download phase.

---

### Changes

**File 1: `src/components/shared/PingPongVideo.tsx`**

1. Change opacity condition from `isReady && isInView` to just `isReady` -- once loaded, video stays visible (no more blinking)
2. Release queue slot immediately after `isReady` becomes true (not just on leave-view)
3. Increase the transition from 500ms to 700ms for a smoother fade-in on first load
4. Clean up event listeners properly (current code returns a cleanup function from `loadVideo` that is never called)

**File 2: `src/components/discover/CategoryGrid.tsx`**

1. Add per-card IntersectionObserver tracking to determine which cards are in/near viewport
2. Pass `isVideoActive` to each `AirbnbCategoryCard` based on viewport proximity
3. This prevents 30+ simultaneous video load attempts in the grid view

**File 3: `src/utils/videoLoadQueue.ts`**

1. Increase `maxConcurrent` from 3 to 4 for desktop (more bandwidth available)
2. Add a `has(url)` method so PingPongVideo can check if a slot is already held without re-acquiring

### Technical Details

Updated opacity logic in PingPongVideo:
```text
Before: className={`... ${isReady && isInView ? 'opacity-100' : 'opacity-0'}`}
After:  className={`... ${isReady ? 'opacity-100' : 'opacity-0'}`}
```

Updated slot release timing:
```text
Before: release slot only when leaving viewport
After:  release slot as soon as video fires 'canplay' (download complete)
```

CategoryGrid viewport activation:
```text
Each card wrapper gets an IntersectionObserver with rootMargin="300px".
Only cards within viewport + 300px margin get isVideoActive=true.
Cards far away get isVideoActive=false (video won't load).
```

| File | Change |
|------|--------|
| `src/components/shared/PingPongVideo.tsx` | Remove `isInView` from opacity; release slot on ready; fix event cleanup |
| `src/components/discover/CategoryGrid.tsx` | Add viewport-based `isVideoActive` per card |
| `src/utils/videoLoadQueue.ts` | Increase max concurrent to 4; add `has()` method |
