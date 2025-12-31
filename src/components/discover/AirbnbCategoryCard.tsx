import { useMemo } from "react";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { getCategoryFallbackEmoji } from "@/data/categoryIconMap";

interface AirbnbCategoryCardProps {
  id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
  progress?: number;
  totalLevels?: number;
  badge?: string;
  imageUrl?: string;
  isFavorite?: boolean;
  onFavoriteClick?: (e: React.MouseEvent) => void;
  onClick?: () => void;
}

// Convert Tailwind gradient class to actual colors
const getGradientColors = (colorClass: string): { from: string; to: string } => {
  const colorMap: Record<string, { from: string; to: string }> = {
    "from-amber-400 to-orange-500": { from: "hsl(270 60% 70%)", to: "hsl(180 60% 50%)" },
    "from-blue-400 to-indigo-500": { from: "hsl(260 70% 65%)", to: "hsl(190 70% 45%)" },
    "from-emerald-400 to-teal-500": { from: "hsl(165 60% 50%)", to: "hsl(270 50% 60%)" },
    "from-purple-400 to-pink-500": { from: "hsl(270 70% 65%)", to: "hsl(200 60% 50%)" },
    "from-rose-400 to-red-500": { from: "hsl(280 60% 60%)", to: "hsl(175 60% 45%)" },
    "from-cyan-400 to-blue-500": { from: "hsl(185 70% 50%)", to: "hsl(265 60% 60%)" },
    "from-yellow-400 to-amber-500": { from: "hsl(275 55% 65%)", to: "hsl(180 55% 50%)" },
    "from-green-400 to-emerald-500": { from: "hsl(170 60% 45%)", to: "hsl(260 55% 55%)" },
    "from-pink-400 to-rose-500": { from: "hsl(280 65% 65%)", to: "hsl(190 60% 50%)" },
    "from-indigo-400 to-purple-500": { from: "hsl(255 65% 60%)", to: "hsl(175 55% 45%)" },
    "from-teal-400 to-cyan-500": { from: "hsl(180 65% 50%)", to: "hsl(270 55% 60%)" },
    "from-orange-400 to-red-500": { from: "hsl(265 60% 65%)", to: "hsl(185 60% 45%)" },
  };
  return colorMap[colorClass] || { from: "hsl(270 60% 60%)", to: "hsl(175 55% 50%)" };
};

export function AirbnbCategoryCard({
  id,
  name,
  icon,
  color,
  progress = 0,
  totalLevels = 20,
  badge,
  isFavorite = false,
  onFavoriteClick,
  onClick,
}: AirbnbCategoryCardProps) {
  const colors = getGradientColors(color);
  const isCompleted = progress >= totalLevels;
  const fallbackEmoji = getCategoryFallbackEmoji(id) || icon;

  // Generate floating particles
  const particles = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        size: 3 + Math.random() * 5,
        x: 5 + Math.random() * 90,
        y: 5 + Math.random() * 90,
        delay: Math.random() * 3,
        duration: 4 + Math.random() * 3,
        drift: -15 + Math.random() * 30,
      })),
    []
  );

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="flex-shrink-0 w-40 text-left"
    >
      {/* Animated Gradient + Particle Area */}
      <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden">
        {/* Gradient Background */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
          }}
        />

        {/* Subtle inner glow */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/20" />

        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden">
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute rounded-full bg-white/50"
              style={{
                width: particle.size,
                height: particle.size,
                left: `${particle.x}%`,
                top: `${particle.y}%`,
              }}
              animate={{
                y: [0, -25, 0],
                x: [0, particle.drift, 0],
                opacity: [0.3, 0.7, 0.3],
                scale: [1, 1.3, 1],
              }}
              transition={{
                duration: particle.duration,
                delay: particle.delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        {/* Large Centered Icon with Float Animation */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <DynamicIcon
            category={id}
            fallbackEmoji={fallbackEmoji}
            size={64}
            className="drop-shadow-lg filter brightness-110"
          />
        </motion.div>

        {/* Heart/Favorite Button */}
        <button
          onClick={onFavoriteClick}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isFavorite ? "fill-red-500 text-red-500" : "text-foreground/70"
            }`}
          />
        </button>

        {/* Badge */}
        {badge && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm">
            <span className="text-[10px] font-medium text-foreground">
              {badge}
            </span>
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
