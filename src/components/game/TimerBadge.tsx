import { motion } from "framer-motion";

interface TimerBadgeProps {
  seconds: number;
  maxSeconds?: number;
}

export function TimerBadge({ seconds, maxSeconds = 20 }: TimerBadgeProps) {
  const isLow = seconds <= 5;
  const progress = seconds / maxSeconds;
  
  return (
    <motion.div
      className="relative w-16 h-16"
      animate={isLow ? { scale: [1, 1.1, 1] } : {}}
      transition={{ duration: 0.5, repeat: isLow ? Infinity : 0 }}
    >
      {/* Outer ring with progress */}
      <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
        {/* Background circle */}
        <circle
          cx="32"
          cy="32"
          r="28"
          fill="none"
          stroke="hsl(200 80% 85%)"
          strokeWidth="5"
        />
        {/* Progress circle */}
        <circle
          cx="32"
          cy="32"
          r="28"
          fill="none"
          stroke={isLow ? "hsl(0 70% 55%)" : "hsl(200 70% 50%)"}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${progress * 176} 176`}
          className="transition-all duration-300"
        />
      </svg>
      
      {/* Center with timer */}
      <div 
        className="absolute inset-2 rounded-full flex items-center justify-center"
        style={{
          background: isLow 
            ? "linear-gradient(180deg, hsl(0 70% 55%) 0%, hsl(0 65% 45%) 100%)"
            : "linear-gradient(180deg, hsl(200 70% 55%) 0%, hsl(200 65% 45%) 100%)",
          boxShadow: "inset 0 2px 0 hsl(0 0% 100% / 0.3), inset 0 -2px 0 hsl(0 0% 0% / 0.2)"
        }}
      >
        <span className="font-display text-xl text-white font-bold">
          {seconds}
        </span>
      </div>
      
      {/* Stopwatch top handle */}
      <div 
        className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-3 rounded-t-sm"
        style={{
          background: isLow 
            ? "linear-gradient(180deg, hsl(0 60% 45%) 0%, hsl(0 55% 35%) 100%)"
            : "linear-gradient(180deg, hsl(200 60% 45%) 0%, hsl(200 55% 35%) 100%)"
        }}
      />
    </motion.div>
  );
}
