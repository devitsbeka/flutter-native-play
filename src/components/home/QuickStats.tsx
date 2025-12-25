import { motion } from "framer-motion";
import { Target, Trophy, Zap } from "lucide-react";

interface QuickStatsProps {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
}

export function QuickStats({ gamesPlayed, gamesWon, currentStreak }: QuickStatsProps) {
  const winRate = gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0;

  const stats = [
    { icon: Target, label: "თამაშები", value: gamesPlayed },
    { icon: Trophy, label: "მოგებული", value: gamesWon },
    { icon: Zap, label: "წარმატება", value: `${winRate}%` },
  ];

  return (
    <motion.div
      className="flex items-center justify-center gap-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.6 }}
    >
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 + index * 0.1 }}
        >
          <stat.icon 
            className="w-4 h-4 mb-1" 
            style={{ color: "hsl(200 40% 50%)" }}
            strokeWidth={1.5}
          />
          <span 
            className="text-lg font-light"
            style={{ color: "hsl(200 50% 70%)" }}
          >
            {stat.value}
          </span>
          <span 
            className="text-[9px] uppercase tracking-wider"
            style={{ color: "hsl(200 20% 40%)" }}
          >
            {stat.label}
          </span>
        </motion.div>
      ))}
    </motion.div>
  );
}
