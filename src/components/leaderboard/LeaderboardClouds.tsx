import { memo } from "react";
import { motion } from "framer-motion";

/**
 * Realistic fluffy clouds using CSS blur and blend modes
 * Optimized for performance with proper React patterns
 */

interface CloudProps {
  size: number;
  startY: number;
  duration: number;
  delay: number;
  opacity: number;
  id: string;
}

// Simple fluffy cloud using CSS blur - performant and realistic
function FluffyCloud({ size, startY, duration, delay, opacity }: CloudProps) {
  return (
    <motion.div
      className="absolute pointer-events-none will-change-transform"
      style={{ 
        top: `${startY}%`,
        width: size,
        height: size * 0.5,
        mixBlendMode: 'plus-lighter',
      }}
      initial={{ x: -size - 50, opacity: 0 }}
      animate={{ 
        x: 'calc(100vw + 100px)',
        opacity: [0, opacity, opacity, opacity, 0],
      }}
      transition={{
        x: { duration, delay, repeat: Infinity, ease: "linear" },
        opacity: { duration, delay, repeat: Infinity, ease: "linear", times: [0, 0.1, 0.5, 0.9, 1] },
      }}
    >
      {/* Pure CSS fluffy clouds using layered blurred circles */}
      <div 
        className="w-full h-full relative"
        style={{ filter: 'blur(18px)' }}
      >
        {/* Main cloud body */}
        <div 
          className="absolute rounded-full bg-white"
          style={{
            width: '55%',
            height: '75%',
            left: '22%',
            top: '25%',
            opacity: 0.9,
          }}
        />
        {/* Left puff */}
        <div 
          className="absolute rounded-full bg-white"
          style={{
            width: '40%',
            height: '60%',
            left: '5%',
            top: '40%',
            opacity: 0.8,
          }}
        />
        {/* Right puff */}
        <div 
          className="absolute rounded-full bg-white"
          style={{
            width: '45%',
            height: '65%',
            right: '5%',
            top: '35%',
            opacity: 0.8,
          }}
        />
        {/* Top left puff */}
        <div 
          className="absolute rounded-full bg-white"
          style={{
            width: '32%',
            height: '50%',
            left: '18%',
            top: '5%',
            opacity: 0.85,
          }}
        />
        {/* Top right puff */}
        <div 
          className="absolute rounded-full bg-white"
          style={{
            width: '38%',
            height: '55%',
            right: '18%',
            top: '8%',
            opacity: 0.85,
          }}
        />
        {/* Center highlight */}
        <div 
          className="absolute rounded-full bg-white"
          style={{
            width: '30%',
            height: '45%',
            left: '35%',
            top: '15%',
            opacity: 0.95,
          }}
        />
      </div>
    </motion.div>
  );
}

// Cloud configuration - varied sizes and timings for natural look
const CLOUD_CONFIG: Omit<CloudProps, 'id'>[] = [
  { size: 350, startY: 4, duration: 65, delay: 0, opacity: 0.7 },
  { size: 280, startY: 16, duration: 52, delay: 10, opacity: 0.55 },
  { size: 400, startY: 8, duration: 72, delay: 18, opacity: 0.6 },
  { size: 320, startY: 20, duration: 58, delay: 30, opacity: 0.5 },
  { size: 260, startY: 6, duration: 48, delay: 40, opacity: 0.65 },
  { size: 380, startY: 14, duration: 62, delay: 50, opacity: 0.55 },
];

function LeaderboardCloudsComponent() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[6]">
      {CLOUD_CONFIG.map((cloud, index) => (
        <FluffyCloud key={`cloud-${index}`} {...cloud} id={`cloud-${index}`} />
      ))}
    </div>
  );
}

export const LeaderboardClouds = memo(LeaderboardCloudsComponent);
