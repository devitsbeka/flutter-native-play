import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { calculateLevel } from "@/utils/levelCalculation";
import { LevelInfoModal } from "./LevelInfoModal";
import { usePlayGuard } from "@/contexts/PlayGuardContext";

interface LevelBadgeProps {
  totalPoints: number;
}

export function LevelBadge({ totalPoints }: LevelBadgeProps) {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const { guardPlay } = usePlayGuard();
  const levelInfo = calculateLevel(totalPoints);
  const progressPercent = levelInfo.progress;

  // Ring calculations - clean single ring
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressPercent / 100);

  return (
    <>
      <motion.button
        onClick={() => setShowModal(true)}
        className="relative flex flex-col items-center"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        whileTap={{ scale: 0.97 }}
      >
        {/* Glow effect */}
        <div 
          className="absolute inset-0 rounded-full blur-3xl opacity-40"
          style={{
            background: "radial-gradient(circle, hsl(200 70% 50%) 0%, transparent 70%)",
            transform: "scale(1.5)",
          }}
        />

        {/* Main circle container */}
        <div className="relative w-32 h-32">
          {/* Progress ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
            {/* Background ring */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="4"
            />
            {/* Progress ring */}
            <motion.circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="url(#levelGradient)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
            <defs>
              <linearGradient id="levelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(200 80% 60%)" />
                <stop offset="100%" stopColor="hsl(180 70% 50%)" />
              </linearGradient>
            </defs>
          </svg>

          {/* Inner content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="text-5xl font-bold text-white"
              key={levelInfo.level}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {levelInfo.level}
            </motion.span>
            <span className="text-xs uppercase tracking-widest text-white/50 mt-1">
              დონე
            </span>
          </div>
        </div>

        {/* XP Progress */}
        <div className="mt-4 flex flex-col items-center">
          <span className="text-sm font-medium text-white">
            {levelInfo.currentXP} / {levelInfo.xpForNextLevel} XP
          </span>
          
          {/* Progress bar */}
          <div className="mt-2 w-28 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, hsl(200 80% 60%), hsl(180 70% 50%))" }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>
      </motion.button>

      <LevelInfoModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        levelInfo={levelInfo}
        onContinue={() => {
          setShowModal(false);
          if (!guardPlay(() => navigate("/game"))) return;
          navigate("/game");
        }}
      />
    </>
  );
}
