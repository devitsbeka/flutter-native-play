import { motion } from "framer-motion";
import { Crown } from "lucide-react";

interface PlayerInfoBadgeProps {
  name: string;
  flag: string;
  points: number;
  delay?: number;
  direction?: "up" | "down";
  isPlayer?: boolean;
}

export function PlayerInfoBadge({ 
  name, 
  flag, 
  points, 
  delay = 0,
  direction = "up",
  isPlayer = false
}: PlayerInfoBadgeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: direction === "up" ? 10 : -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 200 }}
      className="relative"
    >
      {/* "You" label for player */}
      {isPlayer && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#22C55E] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider z-10 shadow-md">
          You
        </div>
      )}
      
      {/* Main badge container with gradient border */}
      <div className={`relative p-[2px] rounded-2xl shadow-lg ${
        isPlayer 
          ? "bg-gradient-to-r from-[#22C55E] via-[#4ADE80] to-[#22C55E]" 
          : "bg-gradient-to-r from-[#4A3F8C] via-[#5B4BC4] to-[#4A3F8C]"
      }`}>
        <div className={`rounded-2xl px-4 py-2.5 flex items-center gap-3 ${
          isPlayer ? "bg-[#1A4D2E]" : "bg-[#2A2060]"
        }`}>
          {/* Flag */}
          <span className="text-2xl">{flag}</span>
          
          {/* Name & Points */}
          <div className="flex flex-col items-start min-w-0">
            <span className="text-white font-bold text-base uppercase tracking-wide truncate">
              {name}
            </span>
            <div className="flex items-center gap-1">
              <Crown className="w-3.5 h-3.5 text-[#FFD700] fill-[#FFD700]" />
              <span className="text-[#FFD700] font-semibold text-sm">
                {points.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative glow */}
      <div className={`absolute inset-0 rounded-2xl blur-md -z-10 ${
        isPlayer ? "bg-[#22C55E]/20" : "bg-[#5B4BC4]/20"
      }`} />
    </motion.div>
  );
}
