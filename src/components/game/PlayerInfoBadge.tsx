import { motion } from "framer-motion";
import { Crown } from "lucide-react";

interface PlayerInfoBadgeProps {
  name: string;
  flag: string;
  points: number;
  delay?: number;
  direction?: "up" | "down";
}

export function PlayerInfoBadge({ 
  name, 
  flag, 
  points, 
  delay = 0,
  direction = "up" 
}: PlayerInfoBadgeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: direction === "up" ? 10 : -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 200 }}
      className="relative"
    >
      {/* Main badge container with gradient border */}
      <div className="relative bg-gradient-to-r from-[#4A3F8C] via-[#5B4BC4] to-[#4A3F8C] p-[2px] rounded-2xl shadow-lg">
        <div className="bg-[#2A2060] rounded-2xl px-4 py-2.5 flex items-center gap-3">
          {/* Flag */}
          <span className="text-2xl">{flag}</span>
          
          {/* Name & Points */}
          <div className="flex flex-col items-start min-w-0">
            <span className="text-white font-bold text-base uppercase tracking-wide truncate">
              {name}
            </span>
            <div className="flex items-center gap-1">
              <Crown className="w-3.5 h-3.5 text-quiz-yellow fill-quiz-yellow" />
              <span className="text-quiz-yellow font-semibold text-sm">
                {points.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative glow */}
      <div className="absolute inset-0 bg-[#5B4BC4]/20 rounded-2xl blur-md -z-10" />
    </motion.div>
  );
}
