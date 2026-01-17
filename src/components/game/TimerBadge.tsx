import { motion } from "framer-motion";

interface TimerBadgeProps {
  seconds: number;
  maxSeconds?: number;
  compact?: boolean;
}

export function TimerBadge({ seconds, maxSeconds = 20, compact = false }: TimerBadgeProps) {
  const isLow = seconds <= 5;
  const progress = seconds / maxSeconds;
  
  // Compact sizing for header use
  const containerSize = compact ? "w-10 h-10" : "w-16 h-16";
  const svgRadius = compact ? 16 : 28;
  const svgCenter = compact ? 20 : 32;
  const svgViewBox = compact ? "0 0 40 40" : "0 0 64 64";
  const strokeWidth = compact ? 3 : 5;
  const circumference = 2 * Math.PI * svgRadius;
  const fontSize = compact ? "text-sm" : "text-xl";
  const insetSize = compact ? "inset-1" : "inset-2";
  const handleWidth = compact ? "w-2.5" : "w-4";
  const handleHeight = compact ? "h-2" : "h-3";
  
  return (
    <motion.div
      className={`relative ${containerSize}`}
      animate={isLow ? { scale: [1, 1.1, 1] } : {}}
      transition={{ duration: 0.5, repeat: isLow ? Infinity : 0 }}
    >
      {/* Outer ring with progress */}
      <svg className="w-full h-full -rotate-90" viewBox={svgViewBox}>
        {/* Background circle */}
        <circle
          cx={svgCenter}
          cy={svgCenter}
          r={svgRadius}
          fill="none"
          stroke="hsl(200 80% 85%)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={svgCenter}
          cy={svgCenter}
          r={svgRadius}
          fill="none"
          stroke={isLow ? "hsl(0 70% 55%)" : "hsl(200 70% 50%)"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${progress * circumference} ${circumference}`}
          className="transition-all duration-300"
        />
      </svg>
      
      {/* Center with timer */}
      <div 
        className={`absolute ${insetSize} rounded-full flex items-center justify-center`}
        style={{
          background: isLow 
            ? "linear-gradient(180deg, hsl(0 70% 55%) 0%, hsl(0 65% 45%) 100%)"
            : "linear-gradient(180deg, hsl(200 70% 55%) 0%, hsl(200 65% 45%) 100%)",
          boxShadow: "inset 0 2px 0 hsl(0 0% 100% / 0.3), inset 0 -2px 0 hsl(0 0% 0% / 0.2)"
        }}
      >
        <span className={`font-display ${fontSize} text-white font-bold`}>
          {seconds}
        </span>
      </div>
      
      {/* Stopwatch top handle */}
      <div 
        className={`absolute -top-0.5 left-1/2 -translate-x-1/2 ${handleWidth} ${handleHeight} rounded-t-sm`}
        style={{
          background: isLow 
            ? "linear-gradient(180deg, hsl(0 60% 45%) 0%, hsl(0 55% 35%) 100%)"
            : "linear-gradient(180deg, hsl(200 60% 45%) 0%, hsl(200 55% 35%) 100%)"
        }}
      />
    </motion.div>
  );
}
