

# Plan: Optimize Category Video Background Performance

## Problem Summary

Category video backgrounds render too slowly, especially on first visit. The current setup has several performance bottlenecks:

| Issue | Impact |
|-------|--------|
| Large video files (uncompressed) | Slow downloads, high bandwidth |
| No poster/placeholder images | Users see blank space while video loads |
| 20+ videos loading simultaneously | Network congestion, memory pressure |
| No mobile-optimized video sizes | Same large files served to all devices |
| Service Worker cache miss on first visit | All videos hit network |

---

## Recommended Solutions

### Solution 1: Add Static Poster Images (Quick Win)

Generate JPEG first-frame images for each video and display them instantly while video loads.

**Implementation:**
1. Create `/public/images/categories/` folder with JPG files
2. Update PingPongVideo to show poster immediately
3. Fade video in over poster once ready

**Changes to `PingPongVideo.tsx`:**
```tsx
interface PingPongVideoProps {
  src: string;
  posterUrl?: string;  // Add poster support
  // ...
}

// Show poster image immediately, fade in video when ready
return (
  <div ref={containerRef} className="absolute inset-0">
    {/* Poster shows instantly */}
    {posterUrl && (
      <img 
        src={posterUrl} 
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
    )}
    {/* Video fades in when ready */}
    <video ... className={isReady ? 'opacity-100' : 'opacity-0'} />
  </div>
);
```

**Pass poster from AirbnbCategoryCard:**
```tsx
import { CATEGORY_IMAGES } from "@/config/videoConfig";

<PingPongVideo 
  src={videoUrl} 
  posterUrl={CATEGORY_IMAGES[categoryId]}
/>
```

---

### Solution 2: Lazy Load Videos More Aggressively

Only load videos that are actually visible on screen, not just "near" the viewport.

**Changes to `PingPongVideo.tsx`:**
```tsx
// Reduce preload distance - only load when nearly visible
rootMargin = "50px"  // Was 200px

// Add priority prop for above-the-fold videos
interface PingPongVideoProps {
  priority?: boolean; // Load immediately if true
}
```

---

### Solution 3: Limit Concurrent Video Loads

Create a video loading queue that limits to 2-3 concurrent downloads.

**New file: `src/utils/videoLoadQueue.ts`**
```tsx
class VideoLoadQueue {
  private queue: string[] = [];
  private loading: Set<string> = new Set();
  private maxConcurrent = 2;

  async loadVideo(url: string): Promise<void> {
    if (this.loading.size >= this.maxConcurrent) {
      // Wait in queue
      await new Promise(resolve => {
        this.queue.push(url);
        // ... resolve when slot available
      });
    }
    // ... load video
  }
}
```

---

### Solution 4: Compress Video Files (Requires Asset Work)

**Current state:** Videos are likely 1-5MB each (50+ files = 100MB+ total)

**Recommended specs for web:**
| Property | Mobile | Desktop |
|----------|--------|---------|
| Resolution | 480p | 720p |
| Bitrate | 500-800 kbps | 1-2 Mbps |
| Format | MP4 H.264 | MP4 H.264 |
| Duration | 3-6 seconds | 3-6 seconds |
| Target size | 100-300KB | 300-600KB |

**FFmpeg command for compression:**
```bash
ffmpeg -i input.mp4 -vf "scale=480:-2" -c:v libx264 -crf 28 -preset slow -an output-mobile.mp4
```

---

### Solution 5: Use WebM with MP4 Fallback

WebM (VP9) offers 30-50% better compression than H.264.

```tsx
<video>
  <source src="/videos/art.webm" type="video/webm" />
  <source src="/videos/art.mp4" type="video/mp4" />
</video>
```

---

## Recommended Implementation Order

| Priority | Solution | Effort | Impact |
|----------|----------|--------|--------|
| 1 | Add poster images | Low | High - instant visual feedback |
| 2 | Reduce rootMargin to 50px | Very Low | Medium - fewer concurrent loads |
| 3 | Compress video files | Medium | Very High - faster downloads |
| 4 | Limit concurrent loads | Medium | High - prevents network congestion |
| 5 | Add WebM format | High | Medium - better compression |

---

## Technical Changes Summary

### Files to Modify

| File | Change |
|------|--------|
| `src/components/shared/PingPongVideo.tsx` | Add poster support, reduce rootMargin |
| `src/components/discover/AirbnbCategoryCard.tsx` | Pass posterUrl from CATEGORY_IMAGES |
| `/public/images/categories/*.jpg` | Create poster images (need to be uploaded manually) |

### Files to Create

| File | Purpose |
|------|---------|
| `src/utils/videoLoadQueue.ts` | Optional: Queue for concurrent load limiting |

---

## Quick Implementation (Code Changes Only)

If you want me to implement the code-side optimizations immediately, I can:

1. Update PingPongVideo to support poster images with graceful fade-in
2. Reduce the Intersection Observer rootMargin from 200px to 50px
3. Update AirbnbCategoryCard to pass poster URLs

Note: You'll need to manually create/upload the poster images to `/public/images/categories/` - these should be JPEG screenshots of the first frame of each video at around 400x300 resolution.

---

## Generating Poster Images

You can generate poster images from your videos using FFmpeg:

```bash
# For each video, extract first frame as JPEG
for f in public/videos/*.mp4; do
  name=$(basename "$f" .mp4)
  ffmpeg -i "$f" -vframes 1 -q:v 2 "public/images/categories/${name}.jpg"
done
```

Or I can implement a runtime fallback that extracts the first frame using Canvas (already have `videoFrameExtractor.ts`), but static images will be faster.

