import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useState } from "react";

interface AirbnbCategoryCardProps {
  id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
  progress?: number;
  totalLevels?: number;
  badge?: string;
  onClick?: () => void;
}

// Convert Tailwind gradient class to actual colors
const getGradientColors = (colorClass: string): { from: string; to: string } => {
  const colorMap: Record<string, { from: string; to: string }> = {
    "from-amber-400 to-orange-500": { from: "#fbbf24", to: "#f97316" },
    "from-blue-400 to-indigo-500": { from: "#60a5fa", to: "#6366f1" },
    "from-emerald-400 to-teal-500": { from: "#34d399", to: "#14b8a6" },
    "from-purple-400 to-pink-500": { from: "#c084fc", to: "#ec4899" },
    "from-rose-400 to-red-500": { from: "#fb7185", to: "#ef4444" },
    "from-cyan-400 to-blue-500": { from: "#22d3ee", to: "#3b82f6" },
    "from-yellow-400 to-amber-500": { from: "#facc15", to: "#f59e0b" },
    "from-green-400 to-emerald-500": { from: "#4ade80", to: "#10b981" },
    "from-pink-400 to-rose-500": { from: "#f472b6", to: "#f43f5e" },
    "from-indigo-400 to-purple-500": { from: "#818cf8", to: "#a855f7" },
    "from-teal-400 to-cyan-500": { from: "#2dd4bf", to: "#06b6d4" },
    "from-orange-400 to-red-500": { from: "#fb923c", to: "#ef4444" },
  };
  return colorMap[colorClass] || { from: "#60a5fa", to: "#6366f1" };
};

export function AirbnbCategoryCard({
  id,
  name,
  icon,
  color,
  description,
  progress = 0,
  totalLevels = 20,
  badge,
  onClick,
}: AirbnbCategoryCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const colors = getGradientColors(color);
  const isCompleted = progress >= totalLevels;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="flex-shrink-0 w-40 text-left"
    >
      {/* Image Area */}
      <div 
        className="relative w-full aspect-[4/3] rounded-xl overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
        }}
      >
        {/* Large Emoji Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-5xl drop-shadow-lg">{icon}</span>
        </div>

        {/* Heart/Favorite Button */}
        <button
          onClick={handleFavoriteClick}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
        >
          <Heart 
            className={`w-4 h-4 transition-colors ${
              isFavorite 
                ? "fill-red-500 text-red-500" 
                : "text-foreground/70"
            }`} 
          />
        </button>

        {/* Badge */}
        {badge && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-background/90 backdrop-blur-sm">
            <span className="text-[10px] font-medium text-foreground">{badge}</span>
          </div>
        )}

        {/* Completed Checkmark */}
        {isCompleted && (
          <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
            <span className="text-white text-xs">✓</span>
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="mt-2 font-medium text-foreground text-sm line-clamp-1">
        {name}
      </h3>

      {/* Subtitle - Progress */}
      <p className="text-xs text-muted-foreground">
        {progress}/{totalLevels} დონე
      </p>
    </motion.button>
  );
}
