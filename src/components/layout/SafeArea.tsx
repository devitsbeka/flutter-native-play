import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Edge = "top" | "bottom" | "left" | "right";

interface SafeAreaProps extends HTMLAttributes<HTMLDivElement> {
  /** Which edges to pad. Defaults to top and bottom, the two that matter on a phone. */
  edges?: Edge[];
  /**
   * Also reserve room for the on-screen keyboard at the bottom edge. For
   * footers and sticky action bars that would otherwise end up underneath it.
   */
  avoidKeyboard?: boolean;
  /** Extra padding added on top of the inset, per edge. */
  inset?: string;
}

const EDGE_VAR: Record<Edge, string> = {
  top: "var(--safe-top)",
  bottom: "var(--safe-bottom)",
  left: "var(--safe-left)",
  right: "var(--safe-right)",
};

/**
 * Pads its children clear of the notch, the home indicator and the keyboard.
 *
 * Exists so that screens stop each solving this for themselves: safe-area
 * handling was spread across about twenty components as ad-hoc
 * `env(safe-area-inset-*)` calls, which means the ones nobody thought about
 * are the ones that collide with the status bar on a Dynamic Island device.
 *
 * Adding `inset` rather than nesting a padded div keeps the two in one
 * `max()`, so a screen asking for 16px of breathing room gets 16px on a
 * device with no notch and the notch height on one that has it — not both
 * stacked.
 */
export const SafeArea = forwardRef<HTMLDivElement, SafeAreaProps>(function SafeArea(
  { edges = ["top", "bottom"], avoidKeyboard = false, inset, className, style, children, ...rest },
  ref,
) {
  const pad = (edge: Edge) => {
    const base = EDGE_VAR[edge];
    const withKeyboard =
      edge === "bottom" && avoidKeyboard
        ? `calc(${base} + var(--keyboard-height))`
        : base;
    return inset ? `max(${inset}, ${withKeyboard})` : withKeyboard;
  };

  return (
    <div
      ref={ref}
      className={cn(className)}
      style={{
        ...(edges.includes("top") && { paddingTop: pad("top") }),
        ...(edges.includes("bottom") && { paddingBottom: pad("bottom") }),
        ...(edges.includes("left") && { paddingLeft: pad("left") }),
        ...(edges.includes("right") && { paddingRight: pad("right") }),
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
});
