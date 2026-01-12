import { motion } from "framer-motion";
import { ReactNode } from "react";
import leaderboardBg from "@/assets/img-leaderboard.png";

interface LeaderboardHeroBackgroundProps {
  tier: number;
  children: ReactNode;
}

export function LeaderboardHeroBackground({ tier, children }: LeaderboardHeroBackgroundProps) {
  return (
    <motion.div
      className="relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <img 
          src={leaderboardBg} 
          alt="" 
          className="w-full h-full object-cover"
        />
        {/* Subtle gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30" />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}
