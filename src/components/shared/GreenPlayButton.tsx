import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GreenPlayButtonProps {
  onClick?: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

/**
 * The main page's chunky green play button (Figma: quick play), shared so
 * every "play" call to action across the app reads the same: mint-to-emerald
 * gradient face, bright green border, deep green lip and glow.
 *
 * Sizing stays with the caller through className — the home scene places it
 * absolutely, category pages stretch it in a row.
 */
export function GreenPlayButton({ onClick, icon, children, className, disabled }: GreenPlayButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.97, y: 2 }}
      className={cn(
        "relative flex items-center justify-center gap-2 rounded-[24px] border-[3px] border-solid border-[#34d399]",
        "shadow-[0px_6px_0px_0px_#047857,0px_10px_24px_0px_rgba(16,185,129,0.5)] disabled:opacity-60",
        className
      )}
    >
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none rounded-[20px]"
        style={{ backgroundImage: "linear-gradient(to bottom, #6ee7b7, #10b981 50%, #059669)" }}
      />
      {icon && <span className="relative flex items-center text-white">{icon}</span>}
      <span className="relative font-bold text-white drop-shadow-[0px_4px_3px_rgba(0,0,0,0.07)] whitespace-nowrap">
        {children}
      </span>
    </motion.button>
  );
}

export default GreenPlayButton;
