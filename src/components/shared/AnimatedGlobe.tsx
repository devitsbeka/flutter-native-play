import { motion } from "framer-motion";

interface AnimatedGlobeProps {
  className?: string;
}

export function AnimatedGlobe({ className }: AnimatedGlobeProps) {
  return (
    <div className={className}>
      <motion.svg
        viewBox="0 0 400 400"
        className="w-full h-full"
        animate={{ rotate: 360 }}
        transition={{
          duration: 60,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        {/* Globe circle outline */}
        <circle
          cx="200"
          cy="200"
          r="180"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.3"
        />
        
        {/* Horizontal latitude lines */}
        <ellipse
          cx="200"
          cy="200"
          rx="180"
          ry="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.2"
        />
        <ellipse
          cx="200"
          cy="140"
          rx="150"
          ry="35"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.15"
        />
        <ellipse
          cx="200"
          cy="260"
          rx="150"
          ry="35"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.15"
        />
        <ellipse
          cx="200"
          cy="80"
          rx="90"
          ry="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.1"
        />
        <ellipse
          cx="200"
          cy="320"
          rx="90"
          ry="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.1"
        />
        
        {/* Vertical longitude lines */}
        <ellipse
          cx="200"
          cy="200"
          rx="60"
          ry="180"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.2"
        />
        <ellipse
          cx="200"
          cy="200"
          rx="120"
          ry="180"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.15"
        />
        <ellipse
          cx="200"
          cy="200"
          rx="180"
          ry="180"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.1"
          transform="rotate(30 200 200)"
        />
        <ellipse
          cx="200"
          cy="200"
          rx="180"
          ry="180"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.1"
          transform="rotate(-30 200 200)"
        />
        
        {/* Center vertical line */}
        <line
          x1="200"
          y1="20"
          x2="200"
          y2="380"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.2"
        />
        
        {/* Center horizontal line */}
        <line
          x1="20"
          y1="200"
          x2="380"
          y2="200"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.2"
        />
        
        {/* Decorative dots representing locations */}
        <circle cx="140" cy="160" r="4" fill="currentColor" opacity="0.3" />
        <circle cx="260" cy="180" r="3" fill="currentColor" opacity="0.25" />
        <circle cx="180" cy="240" r="3.5" fill="currentColor" opacity="0.2" />
        <circle cx="240" cy="130" r="2.5" fill="currentColor" opacity="0.2" />
        <circle cx="300" cy="220" r="3" fill="currentColor" opacity="0.15" />
        <circle cx="120" cy="210" r="2" fill="currentColor" opacity="0.15" />
      </motion.svg>
    </div>
  );
}
