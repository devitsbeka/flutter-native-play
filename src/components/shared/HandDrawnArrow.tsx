import { motion } from "framer-motion";

interface HandDrawnArrowProps {
  className?: string;
  color?: string;
  size?: number;
}

export function HandDrawnArrow({ 
  className = "", 
  color = "#6B7280",
  size = 48 
}: HandDrawnArrowProps) {
  return (
    <motion.svg
      width={size}
      height={size * 1.2}
      viewBox="0 0 48 58"
      fill="none"
      className={className}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
    >
      {/* Hand-drawn curved arrow pointing down */}
      <motion.path
        d="M24 4 C20 8, 18 16, 20 24 C22 32, 26 38, 24 46"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.6, duration: 0.6, ease: "easeOut" }}
        style={{
          filter: "url(#hand-drawn-filter)"
        }}
      />
      {/* Arrow head - left side */}
      <motion.path
        d="M18 40 C20 44, 23 47, 24 50"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 1.1, duration: 0.3 }}
      />
      {/* Arrow head - right side */}
      <motion.path
        d="M30 40 C28 44, 25 47, 24 50"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 1.1, duration: 0.3 }}
      />
      {/* Filter for hand-drawn effect */}
      <defs>
        <filter id="hand-drawn-filter">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1" />
        </filter>
      </defs>
    </motion.svg>
  );
}
