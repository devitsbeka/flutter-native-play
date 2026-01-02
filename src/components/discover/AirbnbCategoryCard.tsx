import { useMemo } from "react";
import { motion } from "framer-motion";
import { Heart, Trophy } from "lucide-react";
import { DynamicIcon } from "@/components/shared/DynamicIcon";

interface AirbnbCategoryCardProps {
  id: string;
  categoryId?: string; // ASCII category_id like 'world_history' for icon lookup
  iconSlug?: string | null; // Direct icon slug from database (highest priority)
  name: string;
  icon: string;
  color: string;
  description?: string;
  categoryType?: string;
  progress?: number;
  totalLevels?: number;
  badge?: string;
  imageUrl?: string;
  isFavorite?: boolean;
  leaderboardRank?: number | null; // User's rank in this category
  onFavoriteClick?: (e: React.MouseEvent) => void;
  onClick?: () => void;
  variant?: "compact" | "full"; // compact = carousel, full = single column grid
}

// Pastel color palette for category cards - light whitish with soft color hints
const PASTEL_PALETTES = [
  { base: "hsl(200 70% 85%)", accent: "hsl(180 50% 75%)" },  // Soft sky blue / teal
  { base: "hsl(280 50% 88%)", accent: "hsl(260 40% 80%)" },  // Lavender / purple
  { base: "hsl(160 50% 85%)", accent: "hsl(140 40% 78%)" },  // Mint / seafoam
  { base: "hsl(340 50% 88%)", accent: "hsl(320 40% 82%)" },  // Soft pink / rose
  { base: "hsl(40 60% 88%)", accent: "hsl(25 50% 82%)" },    // Cream / peach
  { base: "hsl(220 55% 87%)", accent: "hsl(240 45% 82%)" },  // Soft blue / periwinkle
  { base: "hsl(120 40% 86%)", accent: "hsl(100 35% 80%)" },  // Sage / lime
  { base: "hsl(15 60% 88%)", accent: "hsl(0 45% 85%)" },     // Peach / coral
  { base: "hsl(190 55% 85%)", accent: "hsl(170 45% 78%)" },  // Aqua / cyan
  { base: "hsl(300 40% 88%)", accent: "hsl(280 35% 82%)" },  // Light magenta / orchid
];

// Generate consistent pastel colors based on category id
const getPastelColors = (id: string): { base: string; accent: string } => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PASTEL_PALETTES.length;
  return PASTEL_PALETTES[index];
};

export function AirbnbCategoryCard({
  id,
  categoryId,
  iconSlug,
  name,
  icon,
  color,
  categoryType,
  progress = 0,
  totalLevels = 20,
  badge,
  isFavorite = false,
  leaderboardRank,
  onFavoriteClick,
  onClick,
  variant = "compact",
}: AirbnbCategoryCardProps) {
  const pastel = getPastelColors(id);
  const isCompleted = progress >= totalLevels;
  const isFull = variant === "full";
  const iconSize = 128;

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

  const progressPercent = (progress / totalLevels) * 100;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="flex-shrink-0 w-full text-left"
    >
      {/* Animated Gradient + Particle Area */}
      <div className={`relative w-full rounded-xl overflow-hidden ${isFull ? 'aspect-[16/9]' : 'aspect-[4/3]'}`}>
        {/* Pastel Gradient Background */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${pastel.base}, ${pastel.accent})`,
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
            slug={iconSlug || undefined}
            categoryId={categoryId}
            size={iconSize}
            className="drop-shadow-lg filter brightness-110"
          />
        </motion.div>

        {/* Heart/Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onFavoriteClick?.(e);
          }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-colors z-10"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isFavorite ? "fill-red-500 text-red-500" : "text-slate-600"
            }`}
          />
        </button>

        {/* Badge - only show if no leaderboard rank */}
        {badge && !leaderboardRank && (
          <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center">
            <span className="text-[10px] font-semibold text-slate-700 leading-none">
              {badge}
            </span>
          </div>
        )}

        {/* Leaderboard Rank Badge - positioned at top left */}
        {leaderboardRank && leaderboardRank > 0 && (
          <div 
            className="absolute top-2 left-2 px-2 py-1 rounded-lg flex items-center gap-1 z-10 bg-white/90 backdrop-blur-sm"
            style={{
              boxShadow: '0 2px 0 rgba(0,0,0,0.1)',
            }}
          >
            <Trophy className="w-3 h-3 text-amber-500" />
            <span className="text-[11px] font-bold text-slate-700 leading-none">
              #{leaderboardRank}
            </span>
          </div>
        )}

        {/* Completed Checkmark */}
        {isCompleted && (
          <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
            <span className="text-white text-xs">✓</span>
          </div>
        )}

        {/* 3D Chunky Progress Bar at Bottom */}
        <div className={`absolute left-3 right-3 ${isFull ? 'bottom-4' : 'bottom-3'}`}>
          <div className="flex items-center gap-2">
            {/* 3D Progress Bar Container */}
            <div className="flex-1 relative">
              {/* Bottom shadow layer */}
              <div 
                className={`absolute inset-0 rounded-full ${isFull ? 'h-4' : 'h-3'}`}
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  transform: 'translateY(2px)',
                }}
              />
              {/* Track with 3D effect */}
              <div 
                className={`relative rounded-full overflow-hidden ${isFull ? 'h-4' : 'h-3'}`}
                style={{
                  background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(255,255,255,0.15) 100%)',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3), inset 0 -1px 2px rgba(255,255,255,0.2)',
                }}
              >
                {/* Progress Fill with 3D chunky style */}
                <motion.div 
                  className="h-full rounded-full relative"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                  style={{ 
                    background: 'linear-gradient(180deg, #FFCC4D 0%, #FFB230 50%, #E59500 100%)',
                    boxShadow: progressPercent > 0 
                      ? 'inset 0 2px 0 rgba(255,255,255,0.4), inset 0 -2px 0 rgba(0,0,0,0.15), 0 0 8px rgba(255,178,48,0.5)' 
                      : 'none',
                  }}
                >
                  {/* Shine effect */}
                  <div 
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 50%)',
                    }}
                  />
                </motion.div>
              </div>
            </div>
            {/* Progress Text with shadow */}
            <span 
              className={`font-bold text-white whitespace-nowrap ${isFull ? 'text-sm' : 'text-xs'}`}
              style={{
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              }}
            >
              {progress}/{totalLevels}
            </span>
          </div>
        </div>
      </div>

      {/* Title - Larger text */}
      <h3 
        className={`mt-2 font-bold text-slate-800 line-clamp-1 ${isFull ? 'text-xl' : 'text-base'}`}
      >
        {name}
      </h3>
    </motion.button>
  );
}
