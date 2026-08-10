import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SunsetButtonProps {
  onClick?: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

/**
 * The pink-to-orange call to action used across reward surfaces (missions,
 * level up, notification rewards, chest). Kept in one place so the gradient,
 * its light pink stroke and deep pink lip stay identical everywhere.
 */
export function SunsetButton({ onClick, icon, children, className, disabled }: SunsetButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.97, y: 2 }}
      className={cn(
        "flex h-12 w-full items-center justify-center gap-2 rounded-full font-display text-base font-bold text-white disabled:opacity-70",
        className
      )}
      style={{
        background: "linear-gradient(90deg, #F25CA2 0%, #FF9A3D 100%)",
        border: "2px solid #FBB1D0",
        boxShadow: "0 4px 0 0 #D6427F, inset 0 1.5px 0 0 rgba(255,255,255,0.4)",
      }}
    >
      {icon}
      {children}
    </motion.button>
  );
}

export default SunsetButton;
