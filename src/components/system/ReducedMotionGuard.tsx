import { useEffect } from "react";

/**
 * Stops the endless decorative animation for players who asked for no motion.
 *
 * The app runs a few hundred infinite loops — sparkles, pulses, glows, drifting
 * orbs — and several live in chrome that is on screen on every route, so a
 * phone sitting on any screen composites at 60fps for as long as the app is
 * open. That is a steady power draw with nothing happening, and it is what
 * players described as the phone getting hot enough for iOS to intervene.
 *
 * Reduce Motion is the lever they already have, but neither half of the
 * obvious fix covers this on its own:
 *
 *  - Framer Motion's `reducedMotion="user"` only drops TRANSFORM animations.
 *    Measured on the home screen it took 59 running animations to 58, because
 *    the decorative loops here animate opacity, which it deliberately keeps.
 *  - The CSS media query only reaches CSS keyframes, not the ~130 loops that
 *    Framer Motion drives through the Web Animations API.
 *
 * So this pauses the animations themselves, whatever created them, using the
 * one property that separates decoration from communication: an infinite
 * iteration count. A loop that never ends is ambient; anything finite is an
 * entrance, an exit or a transition, and those still play so the interface
 * does not read as broken.
 *
 * Runs only while the setting is on, and re-sweeps because React mounts new
 * animated elements as the player moves around.
 */
export function ReducedMotionGuard() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: number | undefined;

    const sweep = () => {
      // Pausing, not cancelling: cancelling hands the element back to its base
      // style, which Framer Motion notices and re-drives — a fight that costs
      // more than the animation did.
      for (const animation of document.getAnimations()) {
        if (animation.playState !== "running") continue;
        const timing = animation.effect?.getTiming();
        if (timing?.iterations === Infinity) {
          try {
            animation.pause();
          } catch {
            /* an animation that vanished mid-sweep is already not running */
          }
        }
      }
    };

    const start = () => {
      if (timer !== undefined) return;
      sweep();
      timer = window.setInterval(sweep, 2000);
    };
    const stop = () => {
      if (timer === undefined) return;
      window.clearInterval(timer);
      timer = undefined;
    };

    const onChange = () => (query.matches ? start() : stop());
    onChange();
    query.addEventListener("change", onChange);

    return () => {
      query.removeEventListener("change", onChange);
      stop();
    };
  }, []);

  return null;
}
