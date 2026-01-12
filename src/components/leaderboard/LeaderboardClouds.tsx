import { memo } from "react";
import { motion } from "framer-motion";

interface CloudProps {
  size: 'small' | 'medium' | 'large';
  startY: number;
  duration: number;
  delay: number;
  opacity: number;
  blur?: number;
}

const Cloud = memo(({ size, startY, duration, delay, opacity, blur = 8 }: CloudProps) => {
  const sizes = {
    small: { width: 80, height: 40 },
    medium: { width: 120, height: 60 },
    large: { width: 180, height: 80 },
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
      initial={{ x: -width - 50 }}
      animate={{ x: 'calc(100vw + 50px)' }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "linear",
      }}
    >
      <svg viewBox="0 0 180 80" className="w-full h-full">
        <ellipse cx="45" cy="50" rx="40" ry="25" fill="white" opacity={opacity} />
        <ellipse cx="90" cy="40" rx="50" ry="30" fill="white" opacity={opacity * 1.1} />
        <ellipse cx="140" cy="45" rx="35" ry="25" fill="white" opacity={opacity * 0.9} />
        <ellipse cx="70" cy="55" rx="30" ry="20" fill="white" opacity={opacity * 0.8} />
      </svg>
    </motion.div>
  );
});

Cloud.displayName = 'Cloud';

// Cloud configuration for consistent, realistic look
const CLOUD_CONFIG: CloudProps[] = [
  { size: 'large', startY: 5, duration: 55, delay: 0, opacity: 0.65, blur: 10 },
  { size: 'medium', startY: 18, duration: 42, delay: 8, opacity: 0.5, blur: 8 },
  { size: 'small', startY: 8, duration: 48, delay: 15, opacity: 0.55, blur: 6 },
  { size: 'medium', startY: 28, duration: 60, delay: 22, opacity: 0.4, blur: 12 },
  { size: 'small', startY: 14, duration: 38, delay: 30, opacity: 0.5, blur: 7 },
  { size: 'large', startY: 22, duration: 65, delay: 35, opacity: 0.35, blur: 14 },
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
