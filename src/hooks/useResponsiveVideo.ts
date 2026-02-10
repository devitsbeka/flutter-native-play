import { useMemo } from "react";
import { toWebmUrl } from "@/config/videoConfig";

/**
 * Returns WebM and MP4 source URLs for the current viewport.
 * Always uses standard 720px WebM with MP4 fallback.
 */
export function useResponsiveVideo(mp4Url: string): {
  webm: string;
  mp4: string;
} {
  return useMemo(() => {
    return { webm: toWebmUrl(mp4Url), mp4: mp4Url };
  }, [mp4Url]);
}
