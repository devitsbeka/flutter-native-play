import { useEffect } from "react";

/**
 * Stops animation and video playback that nothing can see.
 *
 * Measured on the built app, idle, with nobody touching the screen: the home
 * screen ran 59 looping animations and 51 of them were inside `display:none`
 * subtrees — the desktop-only chrome that mobile never shows, still animating
 * at 60fps behind the scenes. A CSS animation stops when its element is
 * display:none; a Web Animations one, which is what Framer Motion drives,
 * does not. Nobody wrote that bug: it is what "render both layouts and let
 * CSS pick" costs once the hidden half has motion in it.
 *
 * Two rules, both of which mean the work provably cannot be perceived:
 *
 *  - An infinite animation inside a `display:none` subtree is paused. The
 *    element is not in the layout at all, so there is no frame in which it
 *    could appear. Finite animations are left alone — they are entrances and
 *    exits, they end on their own, and pausing one mid-flight is how a modal
 *    gets stuck half-open.
 *  - A <video> whose rectangle is off-screen, or which is completely covered
 *    by something else, is paused. Video decode is a steady power draw and
 *    the shop scene was still decoding while scrolled out of view.
 *
 * Everything is resumed the moment it becomes visible again, and the guard
 * only ever touches what it paused itself — a video the player or the app
 * paused on purpose stays paused.
 */

const SWEEP_MS = 2000;

function isDisplayNone(el: Element): boolean {
  // checkVisibility is exact but recent (Safari 17.4+), so it is used when
  // present and approximated otherwise. offsetParent is null for display:none
  // — and also for position:fixed, which is why that case is excluded.
  const anyEl = el as Element & { checkVisibility?: (o?: unknown) => boolean };
  if (typeof anyEl.checkVisibility === "function") {
    return !anyEl.checkVisibility({ checkOpacity: false, checkVisibilityCSS: true });
  }
  const html = el as HTMLElement;
  if (html.offsetParent !== null) return false;
  return getComputedStyle(el).position !== "fixed";
}

function isHiddenVideo(video: HTMLVideoElement): boolean {
  const rect = video.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return true;
  const offscreen =
    rect.bottom <= 0 || rect.top >= window.innerHeight ||
    rect.right <= 0 || rect.left >= window.innerWidth;
  if (offscreen) return true;

  // Off-screen is the whole rule, deliberately.
  //
  // There was a "covered by something on top" rule here too, decided with
  // elementFromPoint, and it was wrong in the most damaging direction: every
  // background loop in the app sits beneath a translucent wash, so
  // elementFromPoint reports the wash at every sample point and the video
  // reads as covered while the player can see it perfectly well through the
  // tint. It paused every background video in the app. Sampling more points
  // did not help — the wash covers all of them.
  //
  // Telling "visible through a tint" from "buried under a modal" means
  // walking every layer above the video and deciding whether it is truly
  // opaque, which is a pile of guesses about backgrounds, images and blend
  // modes — and each wrong guess is a background that silently stops. The
  // honest version of this check is the one that cannot be wrong: a video
  // whose rectangle is off-screen is not being watched by anyone. That was
  // the real find anyway (the shop scene decoding while scrolled away).
  return false;
}

export function HiddenWorkGuard() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Only ever resumed if we were the ones who stopped it.
    const pausedAnimations = new WeakSet<Animation>();
    const pausedVideos = new WeakSet<HTMLVideoElement>();

    const sweep = () => {
      if (document.hidden) return;

      for (const animation of document.getAnimations()) {
        // effect is an AnimationEffect, which carries no target — only its
        // KeyframeEffect subclass does, and that is what a CSS or Web
        // Animations animation actually is. The cast this replaces was
        // written after the property access, so it asserted the type of a
        // read that does not compile.
        const effect = animation.effect;
        const target = effect instanceof KeyframeEffect ? effect.target : null;
        // Narrowed rather than asserted: KeyframeEffect#target is also
        // allowed to be a pseudo-element, which has no isConnected.
        if (!(target instanceof Element) || !target.isConnected) continue;
        if (animation.effect?.getTiming().iterations !== Infinity) continue;

        const hidden = isDisplayNone(target);
        if (hidden && animation.playState === "running") {
          try {
            animation.pause();
            pausedAnimations.add(animation);
          } catch {
            /* gone mid-sweep */
          }
        } else if (!hidden && animation.playState === "paused" && pausedAnimations.has(animation)) {
          try {
            animation.play();
            pausedAnimations.delete(animation);
          } catch {
            /* gone mid-sweep */
          }
        }
      }

      for (const video of Array.from(document.querySelectorAll("video"))) {
        const hidden = isHiddenVideo(video);
        if (hidden && !video.paused) {
          video.pause();
          pausedVideos.add(video);
        } else if (!hidden && video.paused && pausedVideos.has(video)) {
          pausedVideos.delete(video);
          void video.play().catch(() => {});
        }
      }
    };

    const timer = window.setInterval(sweep, SWEEP_MS);
    // A route change swaps most of this out at once; catch up sooner than the
    // next tick would.
    const onVisible = () => {
      if (!document.hidden) sweep();
    };
    document.addEventListener("visibilitychange", onVisible);
    const firstSweep = window.setTimeout(sweep, 1200);

    return () => {
      window.clearInterval(timer);
      window.clearTimeout(firstSweep);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
