import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type PlayButtonTone = "green" | "muted";

/**
 * The two faces this button has.
 *
 * `green` is the one everything uses: mint-to-emerald, bright border, deep
 * lip, glow. `muted` is the same button in slate, for a call to action that
 * is still pressable but has nothing to act on yet — nobody picked, nothing
 * chosen. It is not a disabled state and does not read as one: the lip and
 * the white label stay, only the colour leaves.
 */
const TONES: Record<PlayButtonTone, { border: string; shadow: string; face: string }> = {
  green: {
    border: "#34d399",
    shadow: "0px 6px 0px 0px #047857, 0px 10px 24px 0px rgba(16,185,129,0.5)",
    face: "linear-gradient(to bottom, #6ee7b7, #10b981 50%, #059669)",
  },
  muted: {
    border: "#cbd5e1",
    shadow: "0px 6px 0px 0px #475569",
    face: "linear-gradient(to bottom, #b6c0cc, #94a3b8 50%, #7d8b9c)",
  },
};

interface GreenPlayButtonProps {
  onClick?: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  /** Defaults to green. `muted` is the same shape with nothing to act on. */
  tone?: PlayButtonTone;
}

/**
 * The main page's chunky green play button (Figma: quick play), shared so
 * every "play" call to action across the app reads the same: mint-to-emerald
 * gradient face, bright green border, deep green lip and glow.
 *
 * Sizing stays with the caller through className — the home scene places it
 * absolutely, category pages stretch it in a row.
 */
export function GreenPlayButton({ onClick, icon, children, className, disabled, tone = "green" }: GreenPlayButtonProps) {
  const palette = TONES[tone];

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.97, y: 2 }}
      className={cn(
        "relative flex items-center justify-center gap-2 rounded-[24px] border-[3px] border-solid",
        "disabled:opacity-60",
        className
      )}
      style={{ borderColor: palette.border, boxShadow: palette.shadow }}
    >
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none rounded-[20px]"
        style={{ backgroundImage: palette.face }}
      />
      {icon && <span className="relative flex items-center text-white">{icon}</span>}
      <span className="relative font-bold text-white drop-shadow-[0px_4px_3px_rgba(0,0,0,0.07)] whitespace-nowrap">
        {children}
      </span>
    </motion.button>
  );
}

export default GreenPlayButton;
