import { motion } from "framer-motion";
import { Flower2, Sun, Leaf, Snowflake, Check } from "lucide-react";
import { Season } from "./SeasonalAdventureMap";
import { cn } from "@/lib/utils";

interface SeasonSelectorProps {
  currentSeason: Season;
  onSeasonSelect: (season: Season) => void;
  completedLevels: number;
}

const LEVELS_PER_SEASON = 10;

const seasons = [
  { id: "spring" as Season, icon: Flower2, label: "Spring", color: "from-pink-400 to-green-400" },
  { id: "summer" as Season, icon: Sun, label: "Summer", color: "from-amber-400 to-cyan-400" },
  { id: "autumn" as Season, icon: Leaf, label: "Autumn", color: "from-orange-400 to-amber-600" },
  { id: "winter" as Season, icon: Snowflake, label: "Winter", color: "from-cyan-300 to-blue-400" },
];

export function SeasonSelector({ currentSeason, onSeasonSelect, completedLevels }: SeasonSelectorProps) {
  const getSeasonProgress = (seasonIndex: number) => {
    const seasonStart = seasonIndex * LEVELS_PER_SEASON;
    const completed = Math.max(0, Math.min(LEVELS_PER_SEASON, completedLevels - seasonStart));
    return completed;
  };

  return (
    <div className="flex gap-2 px-3 py-2 rounded-full bg-background/80 backdrop-blur-xl border border-border/20 shadow-lg">
      {seasons.map((season, index) => {
        const isActive = currentSeason === season.id;
        const progress = getSeasonProgress(index);
        const isComplete = progress === LEVELS_PER_SEASON;
        const Icon = season.icon;

        return (
          <motion.button
            key={season.id}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSeasonSelect(season.id)}
            className={cn(
              "relative w-10 h-10 rounded-full flex items-center justify-center transition-all",
              isActive 
                ? `bg-gradient-to-br ${season.color} shadow-lg` 
                : "bg-muted/50 hover:bg-muted"
            )}
          >
            <Icon className={cn(
              "w-5 h-5 transition-colors",
              isActive ? "text-white" : "text-muted-foreground"
            )} />
            
            {/* Progress indicator */}
            {progress > 0 && !isComplete && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-bold text-foreground bg-background rounded-full px-1 shadow">
                {progress}/{LEVELS_PER_SEASON}
              </div>
            )}
            
            {/* Complete checkmark - SVG icon instead of emoji */}
            {isComplete && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center shadow-md"
              >
                <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}