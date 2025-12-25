import { motion } from "framer-motion";
import { useState } from "react";
import { calculateLevel } from "@/utils/levelCalculation";
import { LevelInfoModal } from "./LevelInfoModal";

interface LevelBadgeProps {
  totalPoints: number;
}

export function LevelBadge({ totalPoints }: LevelBadgeProps) {
  const [showModal, setShowModal] = useState(false);
  const levelInfo = calculateLevel(totalPoints);
  const progressPercent = levelInfo.progress;

  // Ring calculations
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressPercent / 100);

  return (
    <>
      <motion.button
        onClick={() => setShowModal(true)}
        className="relative flex flex-col items-center group"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        whileTap={{ scale: 0.97 }}
      >
        {/* Ambient glow - subtle and cinematic */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle, hsl(200 60% 50% / 0.15) 0%, transparent 60%)",
            filter: "blur(30px)",
            transform: "scale(1.8)",
          }}
          animate={{
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Main container */}
        <div className="relative w-36 h-36">
          {/* Outer ring - thin and elegant */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 140 140">
            {/* Background ring */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="hsl(200 20% 30% / 0.3)"
              strokeWidth="1"
            />
            {/* Progress ring with gradient */}
            <motion.circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="url(#interstellarGradient)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
            {/* Inner subtle ring */}
            <circle
              cx="70"
              cy="70"
              r="48"
              fill="none"
              stroke="hsl(200 30% 50% / 0.1)"
              strokeWidth="0.5"
            />
            <defs>
              <linearGradient id="interstellarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(200 70% 60%)" />
                <stop offset="50%" stopColor="hsl(180 60% 50%)" />
                <stop offset="100%" stopColor="hsl(200 50% 40%)" />
              </linearGradient>
            </defs>
          </svg>

          {/* Inner content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {/* Level number - large and minimal */}
            <motion.div
              className="flex flex-col items-center"
              key={levelInfo.level}
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <span 
                className="text-5xl font-light tracking-tight"
                style={{ 
                  color: "hsl(200 60% 75%)",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  fontWeight: 200,
                }}
              >
                {levelInfo.level}
              </span>
              <span 
                className="text-[10px] uppercase tracking-[0.3em] mt-1"
                style={{ color: "hsl(200 30% 50%)" }}
              >
                დონე
              </span>
            </motion.div>
          </div>

          {/* Rotating accent dots */}
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          >
            <div 
              className="absolute top-2 left-1/2 w-1 h-1 rounded-full -translate-x-1/2"
              style={{ background: "hsl(200 70% 60%)" }}
            />
          </motion.div>
        </div>

        {/* XP indicator - minimal */}
        <div className="mt-4 flex flex-col items-center">
          <div className="flex items-center gap-2 text-xs" style={{ color: "hsl(200 30% 55%)" }}>
            <span className="font-light">{levelInfo.currentXP}</span>
            <span className="opacity-40">/</span>
            <span className="opacity-60">{levelInfo.xpForNextLevel} XP</span>
          </div>
          
          {/* Minimal progress bar */}
          <div className="mt-2 w-24 h-px bg-white/10 overflow-hidden">
            <motion.div
              className="h-full"
              style={{ background: "hsl(200 60% 55%)" }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Hover hint */}
        <motion.span
          className="mt-3 text-[9px] uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ color: "hsl(200 30% 45%)" }}
        >
          დეტალები
        </motion.span>
      </motion.button>

      <LevelInfoModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        levelInfo={levelInfo}
      />
    </>
  );
}
