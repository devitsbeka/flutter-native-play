import { useMemo } from "react";
import { getResponsiveVideoSrc } from "@/config/videoConfig";

/**
 * Returns WebM and MP4 source URLs for the current viewport.
 * Mobile viewports get the 480px mobile WebM; desktop gets 720px WebM.
 * MP4 is always the fallback.
 */
export function useResponsiveVideo(mp4Url: string): {
  webm: string;
  mp4: string;
} {
  return useMemo(() => getResponsiveVideoSrc(mp4Url), [mp4Url]);
}
