import { useEffect } from "react";

/**
 * Restarts suspended background videos the moment the player touches
 * anything.
 *
 * iOS Safari in Low Power Mode refuses autoplay and paints its grey ▶ over
 * the paused frame — on the home screen that is a play button sitting on
 * the player's own scene. The CSS that hides
 * ::-webkit-media-controls-start-playback-button is already in index.css
 * and modern Safari ignores it for this glyph, so hiding is not available;
 * what IS allowed is play() issued during a user gesture. Any tap or
 * scroll-end anywhere resumes every paused autoplay video, which both
 * starts the loop and removes the glyph.
 *
 * Videos that manage their own playback (SmartAvatar's ref-driven player,
 * the ping-pong loops) don't carry the autoplay attribute and are left
 * alone.
 */
export function AutoplayRescue() {
  useEffect(() => {
    const resume = () => {
      document.querySelectorAll<HTMLVideoElement>("video[autoplay]").forEach((v) => {
        if (v.paused && !v.ended) v.play().catch(() => {});
      });
    };
    const opts: AddEventListenerOptions = { passive: true };
    document.addEventListener("touchend", resume, opts);
    document.addEventListener("pointerup", resume, opts);
    document.addEventListener("visibilitychange", resume);
    return () => {
      document.removeEventListener("touchend", resume);
      document.removeEventListener("pointerup", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, []);

  return null;
}
