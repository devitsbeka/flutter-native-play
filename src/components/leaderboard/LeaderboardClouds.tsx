import { memo, useId } from "react";
import { motion } from "framer-motion";

/**
 * Realistic clouds using SVG feTurbulence filter
 * Based on: https://css-tricks.com/drawing-realistic-clouds-with-svg-and-css/
 */

interface CloudProps {
  size: number;
  startY: number;
  duration: number;
  delay: number;
  opacity: number;
}

const RealisticCloud = memo(({ size, startY, duration, delay, opacity }: CloudProps) => {
  const filterId = useId();
  
  return (
    <motion.div
      className="absolute pointer-events-none will-change-transform"
      style={{ 
        top: `${startY}%`,
        width: size,
        height: size * 0.6,
        mixBlendMode: 'screen',
      }}
      initial={{ x: -size - 50 }}
      animate={{ x: 'calc(100vw + 100px)' }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "linear",
      }}
    >
      {/* SVG with feTurbulence filter for realistic cloud effect */}
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 500 300"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            {/* Create fractal noise pattern */}
            <feTurbulence 
              type="fractalNoise" 
              baseFrequency="0.012" 
              numOctaves="4" 
              seed={Math.floor(delay * 10)}
              result="turbulence"
            />
            {/* Displacement for organic shape */}
            <feDisplacementMap 
              in="SourceGraphic" 
              in2="turbulence" 
              scale="50" 
              xChannelSelector="R" 
              yChannelSelector="G"
              result="displaced"
            />
            {/* Gaussian blur for softness */}
            <feGaussianBlur in="displaced" stdDeviation="8" result="blurred" />
            {/* Composite to blend */}
            <feComposite in="blurred" in2="SourceGraphic" operator="over" />
          </filter>
        </defs>
        
        {/* Cloud shape - multiple overlapping ellipses */}
        <g filter={`url(#${filterId})`} opacity={opacity}>
          <ellipse cx="150" cy="180" rx="120" ry="80" fill="white" />
          <ellipse cx="250" cy="150" rx="140" ry="100" fill="white" />
          <ellipse cx="380" cy="170" rx="100" ry="70" fill="white" />
          <ellipse cx="200" cy="130" rx="90" ry="60" fill="white" />
          <ellipse cx="320" cy="140" rx="110" ry="75" fill="white" />
        </g>
      </svg>
    </motion.div>
  );
});

RealisticCloud.displayName = 'RealisticCloud';

// Simple fluffy cloud variant (CSS-based, more performant)
const FluffyCloud = memo(({ size, startY, duration, delay, opacity }: CloudProps) => {
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
      {/* Pure CSS fluffy clouds using layered radial gradients */}
      <div 
        className="w-full h-full relative"
        style={{
          filter: 'blur(15px)',
        }}
      >
        {/* Main cloud body */}
        <div 
          className="absolute rounded-full bg-white/90"
          style={{
            width: '60%',
            height: '80%',
            left: '20%',
            top: '20%',
          }}
        />
        {/* Left puff */}
        <div 
          className="absolute rounded-full bg-white/80"
          style={{
            width: '45%',
            height: '65%',
            left: '0%',
            top: '35%',
          }}
        />
        {/* Right puff */}
        <div 
          className="absolute rounded-full bg-white/80"
          style={{
            width: '50%',
            height: '70%',
            right: '0%',
            top: '30%',
          }}
        />
        {/* Top puffs */}
        <div 
          className="absolute rounded-full bg-white/85"
          style={{
            width: '35%',
            height: '55%',
            left: '15%',
            top: '0%',
          }}
        />
        <div 
          className="absolute rounded-full bg-white/85"
          style={{
            width: '40%',
            height: '60%',
            right: '20%',
            top: '5%',
          }}
        />
      </div>
    </motion.div>
  );
});

FluffyCloud.displayName = 'FluffyCloud';

// Cloud configuration - varied sizes and timings for natural look
const CLOUD_CONFIG: CloudProps[] = [
  { size: 380, startY: 3, duration: 60, delay: 0, opacity: 0.75 },
  { size: 280, startY: 18, duration: 50, delay: 8, opacity: 0.6 },
  { size: 320, startY: 8, duration: 55, delay: 15, opacity: 0.65 },
  { size: 420, startY: 22, duration: 70, delay: 25, opacity: 0.5 },
  { size: 250, startY: 5, duration: 45, delay: 35, opacity: 0.7 },
  { size: 350, startY: 15, duration: 58, delay: 42, opacity: 0.55 },
];

export const LeaderboardClouds = memo(function LeaderboardClouds() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[6]">
      {CLOUD_CONFIG.map((cloud, index) => (
        // Alternate between realistic SVG and fluffy CSS clouds
        index % 2 === 0 ? (
          <FluffyCloud key={`fluffy-${index}`} {...cloud} />
        ) : (
          <RealisticCloud key={`realistic-${index}`} {...cloud} />
        )
      ))}
    </div>
  );
});
