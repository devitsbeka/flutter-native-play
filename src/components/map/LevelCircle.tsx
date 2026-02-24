import { motion } from "framer-motion";
import { calculateLevel } from "@/utils/levelCalculation";
import { useLanguage } from "@/contexts/LanguageContext";

interface LevelCircleProps {
  totalPoints: number;
  onClick?: () => void;
}

export function LevelCircle({ totalPoints, onClick }: LevelCircleProps) {
  const levelInfo = calculateLevel(totalPoints);
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", duration: 0.6 }}
      className="flex flex-col items-center"
    >
      {/* Main Circle Container - Clickable */}
      <motion.div 
        className="relative w-44 h-44 cursor-pointer"
        onClick={onClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Outer ring with gradient */}
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            background: "linear-gradient(135deg, rgba(168, 85, 247, 0.4), rgba(139, 92, 246, 0.2))",
            padding: "4px",
          }}
        >
          <div 
            className="w-full h-full rounded-full flex flex-col items-center justify-center"
            style={{
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Level number */}
            <span 
              className="font-display text-6xl leading-none"
              style={{ color: "#7C3AED" }}
            >
              {levelInfo.level}
            </span>
            
            {/* Label */}
            <span 
              className="text-sm font-medium mt-1"
              style={{ color: "#7C3AED" }}
            >
              {t("extra.levelLabel2")}
            </span>
            
            {/* XP Progress Bar */}
            <div className="w-24 mt-3">
              <div 
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: "rgba(168, 85, 247, 0.15)" }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${levelInfo.progress}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className="h-full rounded-full"
                  style={{
                    background: "linear-gradient(90deg, #A855F7, #7C3AED)",
                  }}
                />
              </div>
            </div>
            
            {/* XP Value */}
            <span 
              className="text-xs font-medium mt-1.5"
              style={{ color: "#9CA3AF" }}
            >
              {levelInfo.currentXP.toLocaleString()} XP
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
