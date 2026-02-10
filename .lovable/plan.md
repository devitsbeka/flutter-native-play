

## Fix: Videos Never Rendering on Desktop

### Root Cause

The video system has a **Desktop HD tier** that generates URLs like `/videos/desktop/animals.webm` for viewports >= 1024px. However, the `public/videos/desktop/` directory is **completely empty** -- these files were never uploaded.

This affects users in two ways:

1. **`PingPongVideo` with `forceDesktopQuality`** (used on CategoryPage): The primary WebM source points to a non-existent file. While the browser should fall back to the MP4 `<source>`, the video stays at `opacity-0` until `canplay` fires, and in some browsers/conditions the fallback silently fails.

2. **`useResponsiveVideo` on desktop viewports** (>= 1024px): All video components default to desktop HD WebM URLs that 404. The `getAllVideoUrls()` function also returns these broken URLs for Service Worker caching, so SW caching silently fails for all videos.

3. **No error recovery**: When videos fail to load, components stay permanently at `opacity-0` with no retry or fallback mechanism.

### Fix Strategy

Since desktop HD WebM files don't exist and only standard 720p WebM files are available, remove the desktop HD tier entirely and add error recovery.

### Changes

| File | Change |
|------|--------|
| `src/config/videoConfig.ts` | Remove `toDesktopHdWebmUrl()`, `isDesktopHdViewport()`. Update `getAllVideoUrls()` and `getResponsiveVideoSrc()` to always use standard 720p WebM. |
| `src/hooks/useResponsiveVideo.ts` | Remove desktop HD branch -- always return standard WebM via `toWebmUrl()`. Remove imports of `toDesktopHdWebmUrl` and `isDesktopHdViewport`. |
| `src/components/shared/PingPongVideo.tsx` | Remove `forceDesktopQuality` prop and `toDesktopHdWebmUrl` import. Add an `onerror` handler on the video element that sets `isReady = true` anyway (so the poster image stays visible instead of permanent blank). |
| `src/components/shared/SinglePlayVideo.tsx` | No changes needed (doesn't use desktop HD). |
| `src/pages/CategoryPage.tsx` | Remove `forceDesktopQuality` prop from the `PingPongVideo` usage (line 243). |

### Technical Details

**videoConfig.ts changes:**
- `getAllVideoUrls()`: Remove the `isDesktopHdViewport()` branch, always use `toWebmUrl()`
- `getResponsiveVideoSrc()`: Remove the desktop HD branch
- Keep `toDesktopHdWebmUrl` export (mark deprecated) to avoid breaking any other imports, or remove if no other usages exist

**PingPongVideo.tsx error recovery:**
- Add `onError` handler to the `<video>` element to catch cases where both sources fail
- When error occurs, release the queue slot and keep poster image visible
- This prevents the permanent blank state even if video files are missing or network issues occur

**useResponsiveVideo.ts simplification:**
- Two tiers remain: standard 720p WebM for all viewports, with MP4 fallback
- This matches the actual files available in `public/videos/`
