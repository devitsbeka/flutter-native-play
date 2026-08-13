import { createPortal } from "react-dom";
import type { ReactNode } from "react";

/**
 * Renders full-screen overlay markup into <body>.
 *
 * `position: fixed` is only viewport-relative while no ancestor establishes a
 * containing block for it — and transform, filter, backdrop-filter, perspective,
 * will-change and contain: paint (which `content-visibility: auto` implies) all
 * do. Header bars and cards in this app use several of those, so an overlay
 * rendered where its trigger lives can silently end up sized to a header strip
 * or clipped inside a card. Portalling to <body> keeps it viewport-relative
 * wherever the trigger sits.
 */
export function portal(node: ReactNode): ReactNode {
  if (typeof document === "undefined") return node;
  return createPortal(node, document.body);
}
