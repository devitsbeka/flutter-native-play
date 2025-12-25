import { motion } from "framer-motion";
import { Gamepad2, Trophy, TrendingUp } from "lucide-react";

interface QuickStatsProps {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
}

export function QuickStats({ gamesPlayed, gamesWon, currentStreak }: QuickStatsProps) {
  const winRate = gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0;

  const stats = [
    { icon: Gamepad2, label: "თამაშები", value: gamesPlayed },
    { icon: Trophy, label: "მოგებული", value: gamesWon },
    { icon: TrendingUp, label: "წარმატება", value: `${winRate}%` },
  ];

  return (
    <motion.div
      className="flex items-center justify-center gap-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5 }}
    >
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          className="flex flex-col items-center px-4 py-3 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 + index * 0.1 }}
        >
          <stat.icon 
            className="w-5 h-5 mb-2 text-white/60"
            strokeWidth={2}
          />
          <span className="text-xl font-bold text-white">
            {stat.value}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-white/50 mt-0.5">
            {stat.label}
          </span>
        </motion.div>
      ))}
    </motion.div>
  );
}
