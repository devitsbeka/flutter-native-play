import { memo } from "react";
import { motion } from "framer-motion";

interface CloudProps {
  size: 'small' | 'medium' | 'large' | 'xlarge';
  startY: number;
  duration: number;
  delay: number;
  opacity: number;
  blur?: number;
}

const Cloud = memo(({ size, startY, duration, delay, opacity, blur = 12 }: CloudProps) => {
  const sizes = {
    small: { width: 160, height: 80 },
    medium: { width: 240, height: 120 },
    large: { width: 320, height: 160 },
    xlarge: { width: 420, height: 200 },
  };
  const { width, height } = sizes[size];
  
  return (
    <motion.div
      className="absolute pointer-events-none will-change-transform"
      style={{ 
        top: `${startY}%`,
        width,
        height,
        filter: `blur(${blur}px)`,
      }}
      initial={{ x: -width - 100 }}
      animate={{ x: 'calc(100vw + 100px)' }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "linear",
      }}
    >
      <svg viewBox="0 0 200 100" className="w-full h-full">
        {/* Main cloud body */}
        <ellipse cx="50" cy="60" rx="45" ry="30" fill="white" opacity={opacity} />
        <ellipse cx="100" cy="50" rx="55" ry="38" fill="white" opacity={opacity * 1.15} />
        <ellipse cx="155" cy="55" rx="42" ry="32" fill="white" opacity={opacity} />
        {/* Extra puffs for realism */}
        <ellipse cx="75" cy="45" rx="35" ry="28" fill="white" opacity={opacity * 0.9} />
        <ellipse cx="130" cy="42" rx="40" ry="30" fill="white" opacity={opacity * 0.95} />
        <ellipse cx="100" cy="65" rx="50" ry="25" fill="white" opacity={opacity * 0.85} />
      </svg>
    </motion.div>
  );
});

Cloud.displayName = 'Cloud';

// Cloud configuration - bigger, more visible clouds
const CLOUD_CONFIG: CloudProps[] = [
  { size: 'xlarge', startY: 2, duration: 50, delay: 0, opacity: 0.85, blur: 15 },
  { size: 'large', startY: 15, duration: 40, delay: 5, opacity: 0.75, blur: 12 },
  { size: 'medium', startY: 8, duration: 45, delay: 12, opacity: 0.7, blur: 10 },
  { size: 'xlarge', startY: 25, duration: 55, delay: 18, opacity: 0.65, blur: 18 },
  { size: 'large', startY: 5, duration: 42, delay: 25, opacity: 0.8, blur: 14 },
  { size: 'medium', startY: 20, duration: 38, delay: 32, opacity: 0.7, blur: 11 },
  { size: 'small', startY: 12, duration: 35, delay: 8, opacity: 0.75, blur: 8 },
];

export const LeaderboardClouds = memo(function LeaderboardClouds() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[6]">
      {CLOUD_CONFIG.map((cloud, index) => (
        <Cloud key={index} {...cloud} />
      ))}
    </div>
  );
});
