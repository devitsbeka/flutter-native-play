import { motion } from "framer-motion";
import { useState } from "react";
import { calculateLevel, getLevelRewards } from "@/utils/levelCalculation";
import { LevelInfoModal } from "./LevelInfoModal";

interface LevelBadgeProps {
  totalPoints: number;
}

export function LevelBadge({ totalPoints }: LevelBadgeProps) {
  const [showModal, setShowModal] = useState(false);
  const levelInfo = calculateLevel(totalPoints);

  // Calculate progress ring
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (levelInfo.progress / 100) * circumference;

  return (
    <>
      <motion.button
        onClick={() => setShowModal(true)}
        className="relative"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.8 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Progress ring SVG */}
        <svg
          className="absolute inset-0 -rotate-90"
          width="112"
          height="112"
          viewBox="0 0 112 112"
        >
          {/* Background circle */}
          <circle
            cx="56"
            cy="56"
            r={radius}
            fill="none"
            stroke="hsl(195 70% 90%)"
            strokeWidth="6"
          />
          {/* Progress circle */}
          <motion.circle
            cx="56"
            cy="56"
            r={radius}
            fill="none"
            stroke="hsl(195 80% 50%)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>

        {/* Level badge */}
        <div
          className="relative w-28 h-28 flex flex-col items-center justify-center rounded-full"
          style={{
            background: "radial-gradient(circle, hsl(195 80% 85%) 0%, hsl(195 70% 70%) 100%)",
            boxShadow: "0 8px 24px hsl(195 70% 40% / 0.25)",
          }}
        >
          <span className="text-xs font-semibold text-slate-600">დონე</span>
          <motion.span
            className="text-4xl font-display font-bold text-slate-800"
            key={levelInfo.level}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {levelInfo.level}
          </motion.span>
        </div>

        {/* Tap indicator */}
        <motion.div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-medium"
          style={{
            background: "hsl(195 70% 50%)",
            color: "white",
          }}
          animate={{ opacity: [0.7, 1, 0.7] }}
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
