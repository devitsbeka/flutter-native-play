import { motion } from "framer-motion";
import { calculateLevel } from "@/utils/levelCalculation";

interface HeaderLevelBadgeProps {
  totalPoints: number;
  onClick?: () => void;
}

export function HeaderLevelBadge({ totalPoints, onClick }: HeaderLevelBadgeProps) {
  const levelInfo = calculateLevel(totalPoints);

  return (
    <motion.button
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="w-10 h-10 rounded-full flex items-center justify-center"
      style={{
        background: "rgba(255, 255, 255, 0.9)",
        backdropFilter: "blur(10px)",
        boxShadow: "0 2px 8px rgba(124, 58, 237, 0.25)",
      }}
    >
      <span 
        className="font-bold text-base"
        style={{ color: "#7C3AED" }}
      >
        {levelInfo.level}
      </span>
    </motion.button>
  );
}
