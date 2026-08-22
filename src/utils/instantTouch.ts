import type * as React from "react";

/**
 * iOS Safari does not deliver a `click` for every tap: the tap that stops a
 * momentum scroll (and sometimes the first tap around sticky/backdrop-blur
 * bars) fires pointer/touch events but no click, so click-only buttons need
 * a second or third tap. The Team tab bar fixed this by acting on
 * pointerdown for touch — this is that pattern made reusable.
 *
 * After our handler has already run on pointerdown, the browser may still
 * dispatch the tap's compatibility click on finger lift. By then the handler
 * has typically opened something under the finger, and the stray click would
 * press a control inside it (or the backdrop, closing it again) — so the
 * next click is swallowed at document capture until a new press starts.
 */
export function swallowNextClick(windowMs = 700): void {
  const swallow = (ev: MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    cleanup();
  };
  const cleanup = () => {
    document.removeEventListener("click", swallow, true);
    document.removeEventListener("pointerdown", cleanup, true);
    window.clearTimeout(timer);
  };
  document.addEventListener("click", swallow, true);
  // A fresh press means the pending ghost click already happened or never
  // will — stop guarding so the new tap's own click goes through.
  document.addEventListener("pointerdown", cleanup, true);
  const timer = window.setTimeout(cleanup, windowMs);
}

/** Spread onto a button so touch runs `action` on pointerdown (instant, and
 * immune to the swallowed-click taps above) while mouse and keyboard keep
 * the normal click path. */
export function instantTouchProps(action: () => void): {
  onPointerDown: (e: React.PointerEvent) => void;
  onClick: () => void;
} {
  return {
    onPointerDown: (e) => {
      if (e.pointerType === "touch") {
        e.preventDefault();
        swallowNextClick();
        action();
      }
    },
    onClick: action,
  };
}
