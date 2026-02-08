import { useMemo } from "react";
import {
  toWebmUrl,
  toDesktopHdWebmUrl,
  isMobileViewport,
  isDesktopHdViewport,
} from "@/config/videoConfig";

/**
 * Returns WebM and MP4 source URLs sized for the current viewport.
 *
 * Three tiers:
 * - Desktop HD (>= 1024px): 1280px WebM for crisp playback on large screens
 * - Desktop/Tablet (768-1023px): 720px WebM
 * - Mobile (< 768px): 720px WebM (mobile variant removed for simplicity)
 *
 * MP4 is always the original for browser fallback.
 */
export function useResponsiveVideo(mp4Url: string): {
  webm: string;
  mp4: string;
} {
  return useMemo(() => {
    const webm = isDesktopHdViewport()
      ? toDesktopHdWebmUrl(mp4Url)
      : toWebmUrl(mp4Url);
    return { webm, mp4: mp4Url };
  }, [mp4Url]);
}
