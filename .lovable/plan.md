

## Fix Desktop/Tablet Video Quality

### Problem

All videos (both WebM and MP4) are encoded at **720px width** by the optimization scripts. On desktop/tablet screens where the video fills 1200-1920px wide areas, this 720px video gets stretched 2-3x, causing visible blur and pixelation.

The conversion pipeline (`scripts/convert-videos-webm.sh`) has these settings:
- Desktop WebM: 720px width, CRF 28
- Mobile WebM: 480px width, CRF 30

720px is fine for mobile (375px device = crisp at 2x retina), but far too small for desktop.

### Solution

Create a **three-tier video resolution system** and update the serving logic:

| Tier | Max Width | CRF | Use Case |
|------|-----------|-----|----------|
| Mobile | 480px | 30 | Phone screens (< 768px) |
| Desktop (current) | 720px | 28 | Tablet/small desktop |
| Desktop HD (new) | 1280px | 26 | Large desktop screens (>= 1024px) |

### Changes

#### Change 1: Update video conversion script to create HD desktop variants

**File: `scripts/convert-videos-webm.sh`**

Add a third tier: "desktop HD" at 1280px width, stored in `public/videos/desktop/` folder. This creates files like `/videos/desktop/mathematics.webm` alongside the existing `/videos/mathematics.webm`.

Settings for the HD tier:
- Max width: 1280px (sharp on 1440p/1920p screens)
- CRF: 26 (higher quality than 28 but still well-compressed for VP9)
- Same VP9 codec and other settings

#### Change 2: Add desktop HD URL helper

**File: `src/config/videoConfig.ts`**

Add a `toDesktopHdWebmUrl()` function that maps `/videos/math.mp4` to `/videos/desktop/math.webm`. Also update `getAllVideoUrls()` to preload the HD variants on desktop.

```
// New function
export function toDesktopHdWebmUrl(mp4Url: string): string {
  const lastSlash = mp4Url.lastIndexOf("/");
  const dir = mp4Url.substring(0, lastSlash);
  const filename = mp4Url.substring(lastSlash + 1).replace(/\.mp4$/, ".webm");
  return dir + "/desktop/" + filename;
}
```

#### Change 3: Serve HD variants on desktop/tablet

**File: `src/hooks/useResponsiveVideo.ts`**

Update the hook to return:
- Desktop HD WebM (1280px) when viewport >= 1024px
- Regular WebM (720px) when viewport < 1024px (mobile/small tablets)

This uses a `matchMedia` check to determine which tier to serve.

#### Change 4: PingPongVideo `forceDesktopQuality` now means HD

**File: `src/components/shared/PingPongVideo.tsx`**

When `forceDesktopQuality` is true (used on the category page header), always use the desktop HD URL regardless of viewport. This ensures the large header video on category pages is always crisp.

### What you need to do after these code changes

After approving this plan, you will need to **re-run the updated conversion script** on your original high-resolution source MP4 files to generate the new `/videos/desktop/*.webm` files:

```
bash scripts/convert-videos-webm.sh
```

The script will create the `public/videos/desktop/` folder with 1280px-wide WebM files. Without these files, the code will gracefully fall back to the existing 720px WebM (via the MP4 `<source>` fallback).

### Technical Details

| File | Change |
|------|--------|
| `scripts/convert-videos-webm.sh` | Add desktop HD tier (1280px, CRF 26) in `public/videos/desktop/` |
| `src/config/videoConfig.ts` | Add `toDesktopHdWebmUrl()` helper; update `getAllVideoUrls()` for desktop preloading |
| `src/hooks/useResponsiveVideo.ts` | Return desktop HD URL when viewport >= 1024px |
| `src/components/shared/PingPongVideo.tsx` | `forceDesktopQuality` uses desktop HD URL |

