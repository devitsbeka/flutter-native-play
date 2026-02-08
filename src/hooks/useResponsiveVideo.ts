import { useMemo } from "react";
import { toWebmUrl } from "@/config/videoConfig";

/**
 * Returns WebM and MP4 source URLs sized for the current viewport.
 * Mobile (< md breakpoint): serves smaller mobile WebM.
 * Desktop: serves full-size WebM.
 * MP4 is always the original for browser fallback.
 */
export function useResponsiveVideo(mp4Url: string): {
  webm: string;
  mp4: string;
} {
  // Always serve desktop-quality WebM on all devices
  return useMemo(
    () => ({
      webm: toWebmUrl(mp4Url),
      mp4: mp4Url,
    }),
    [mp4Url]
  );
}
