import { motion } from "framer-motion";
import { useState } from "react";
import { Star, Zap } from "lucide-react";
import { calculateLevel } from "@/utils/levelCalculation";
import { LevelInfoModal } from "./LevelInfoModal";

interface LevelBadgeProps {
  totalPoints: number;
}

export function LevelBadge({ totalPoints }: LevelBadgeProps) {
  const [showModal, setShowModal] = useState(false);
  const levelInfo = calculateLevel(totalPoints);

  // Calculate progress percentage
  const progressPercent = levelInfo.progress;

  return (
    <>
      <motion.button
        onClick={() => setShowModal(true)}
        className="relative flex flex-col items-center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.8 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Outer glow ring */}
        <motion.div
          className="absolute inset-0 rounded-full blur-xl"
          style={{
            background: "radial-gradient(circle, hsl(45 100% 60% / 0.4) 0%, transparent 70%)",
          }}
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.6, 0.9, 0.6],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Main badge container */}
        <div className="relative">
          {/* Hexagonal outer frame */}
          <div
            className="relative w-32 h-32 flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, hsl(45 90% 55%) 0%, hsl(35 85% 45%) 100%)",
              clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
              boxShadow: "0 8px 32px hsl(35 80% 30% / 0.5)",
            }}
          >
            {/* Inner dark circle */}
            <div
              className="w-24 h-24 rounded-full flex flex-col items-center justify-center relative"
              style={{
                background: "linear-gradient(180deg, hsl(220 30% 15%) 0%, hsl(220 25% 10%) 100%)",
                boxShadow: "inset 0 2px 8px hsl(0 0% 0% / 0.5)",
              }}
            >
              {/* Progress arc background */}
              <svg
                className="absolute inset-0 w-full h-full -rotate-90"
                viewBox="0 0 100 100"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="hsl(220 20% 25%)"
                  strokeWidth="4"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="url(#progressGradient)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 42}
                  initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - progressPercent / 100) }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(45 100% 60%)" />
                    <stop offset="100%" stopColor="hsl(25 90% 55%)" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Level content */}
              <div className="relative z-10 flex flex-col items-center">
                <span className="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wider">დონე</span>
                <motion.span
                  className="text-4xl font-display font-bold text-white"
                  key={levelInfo.level}
                  initial={{ scale: 1.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  style={{ textShadow: "0 2px 8px hsl(45 100% 50% / 0.5)" }}
                >
                  {levelInfo.level}
                </motion.span>
              </div>
            </div>
          </div>

          {/* Decorative stars */}
          <motion.div
            className="absolute -top-1 -right-1"
            animate={{ rotate: [0, 15, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
          </motion.div>
          <motion.div
            className="absolute -top-2 left-2"
            animate={{ rotate: [0, -10, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          >
            <Star className="w-3 h-3 text-amber-300 fill-amber-300" />
          </motion.div>
        </div>

        {/* XP Progress bar below */}
        <div className="mt-3 w-36">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-white/60 font-medium flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              {levelInfo.currentXP} XP
            </span>
            <span className="text-[10px] text-white/40">{levelInfo.xpForNextLevel} XP</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, hsl(45 100% 60%) 0%, hsl(25 90% 55%) 100%)",
              }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Tap indicator */}
        <motion.div
          className="mt-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
          style={{
            background: "linear-gradient(180deg, hsl(45 90% 55%) 0%, hsl(35 85% 45%) 100%)",
            color: "hsl(35 80% 15%)",
          }}
          animate={{ opacity: [0.8, 1, 0.8], y: [0, -2, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          შეეხე
        </motion.div>
      </motion.button>

      <LevelInfoModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        levelInfo={levelInfo}
      />
    </>
  );
}
