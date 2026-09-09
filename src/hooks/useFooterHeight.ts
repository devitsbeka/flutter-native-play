import { useLayoutEffect, useRef, useState } from "react";

/**
 * The height of the floating footer, so the list above it can be padded by
 * exactly that much and every answer stays scrollable into view.
 *
 * The footer is out of flow — that is what lets the answers run underneath
 * it instead of being clipped short of it — so nothing reserves its space
 * automatically, and its height moves with the feedback card's text.
 */
export function useFooterHeight<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setHeight(el.offsetHeight);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, height] as const;
}
