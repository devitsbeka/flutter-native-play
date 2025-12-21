import { motion } from "framer-motion";
import { Avatar } from "./Avatar";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PodiumPlayer {
  id: string;
  nickname: string;
  countryCode?: string;
  points: number;
  rank: number;
  emoji?: string;
}

interface PodiumDisplayProps {
  players: PodiumPlayer[];
  className?: string;
}

export function PodiumDisplay({ players, className }: PodiumDisplayProps) {
  // Ensure we have exactly 3 players, fill with placeholders if needed
  const topThree = [...players.slice(0, 3)];
  while (topThree.length < 3) {
    topThree.push({
      id: `placeholder-${topThree.length}`,
      nickname: "---",
      points: 0,
      rank: topThree.length + 1,
    });
  }

  // Reorder for podium display: [2nd, 1st, 3rd]
  const podiumOrder = [topThree[1], topThree[0], topThree[2]];

  const podiumHeights = ["h-24", "h-32", "h-20"];
  const podiumColors = ["podium-silver", "podium-gold", "podium-bronze"];
  const delays = [0.2, 0, 0.3];

  return (
    <div className={cn("flex items-end justify-center gap-3", className)}>
      {podiumOrder.map((player, index) => {
        const actualRank = index === 0 ? 2 : index === 1 ? 1 : 3;
        const isFirst = actualRank === 1;

        return (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delays[index], type: "spring", stiffness: 200 }}
            className="flex flex-col items-center"
          >
            {/* Crown for 1st place */}
            {isFirst && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="mb-1"
              >
                <Crown className="w-8 h-8 text-quiz-orange fill-quiz-yellow" />
              </motion.div>
            )}

            {/* Avatar */}
            <div className={cn("mb-2", isFirst && "animate-bounce-subtle")}>
              <Avatar
                emoji={player.emoji || "👤"}
                countryCode={player.countryCode}
                size={isFirst ? "lg" : "md"}
                showRing
                ringColor={isFirst ? "ring-quiz-yellow" : "ring-primary/30"}
              />
            </div>

            {/* Name */}
            <p className="text-sm font-bold text-foreground truncate max-w-20 text-center">
              {player.nickname}
            </p>

            {/* Points */}
            <p className="text-xs text-muted-foreground mb-2">
              {player.points.toLocaleString()} pts
            </p>

            {/* Podium */}
            <div
              className={cn(
                "w-20 rounded-t-xl flex items-start justify-center pt-3",
                podiumHeights[index],
                podiumColors[index]
              )}
            >
              <span className="text-2xl font-bold text-primary-foreground">
                {actualRank}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
