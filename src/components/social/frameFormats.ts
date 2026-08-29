import type { SafeInsets } from "@/components/social/StarQuestionFrame";

/**
 * One entry per surface the pipeline posts to, at the size that network
 * renders best, with the platform chrome's keep-clear zones (safeInsets, in
 * canvas px) so nothing important sits under UI:
 *  - IG Stories/Reels: ~250px of UI at the top, ~310px at the bottom
 *  - TikTok: ~140px right rail (like/comment/share), ~500px caption zone at
 *    the bottom, ~130px top
 *  - YouTube Shorts: title/controls, ~120px top / ~360px bottom
 * Feed and thumbnail canvases have no overlaid chrome.
 *
 * Shared between the admin carousel and the draft renderer so a saved frame
 * re-renders exactly as previewed.
 */
export interface FrameFormat {
  key: string;
  label: string;
  w: number;
  h: number;
  safeInsets?: SafeInsets;
}

export const FORMATS: FrameFormat[] = [
  { key: "ig-feed", label: "Instagram · FB Feed (4:5)", w: 1080, h: 1350 },
  {
    key: "ig-story",
    label: "IG Story / Reel",
    w: 1080,
    h: 1920,
    safeInsets: { top: 250, bottom: 310 },
  },
  {
    key: "tiktok",
    label: "TikTok",
    w: 1080,
    h: 1920,
    safeInsets: { top: 130, bottom: 500, right: 140 },
  },
  {
    key: "yt-short",
    label: "YouTube Short",
    w: 1080,
    h: 1920,
    safeInsets: { top: 120, bottom: 360 },
  },
  { key: "square", label: "IG · FB Square", w: 1080, h: 1080 },
  { key: "fb-land", label: "Facebook Landscape / Link", w: 1200, h: 630 },
  { key: "yt-thumb", label: "YouTube Thumbnail", w: 1280, h: 720 },
  { key: "appstore", label: "App Store 6.5″", w: 1242, h: 2688 },
];

export const formatByKey = (key: string): FrameFormat | undefined =>
  FORMATS.find((f) => f.key === key);
