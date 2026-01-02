import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Heart, Trophy } from "lucide-react";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { PingPongVideo } from "@/components/shared/PingPongVideo";

interface AirbnbCategoryCardProps {
  id: string;
  categoryId?: string;
  iconSlug?: string | null;
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
  leaderboardRank?: number | null;
  videoUrl?: string;
  onFavoriteClick?: (e: React.MouseEvent) => void;
  onClick?: () => void;
  variant?: "compact" | "full";
}

const PASTEL_PALETTES = [
  { base: "hsl(200 70% 85%)", accent: "hsl(180 50% 75%)" },
  { base: "hsl(280 50% 88%)", accent: "hsl(260 40% 80%)" },
  { base: "hsl(160 50% 85%)", accent: "hsl(140 40% 78%)" },
  { base: "hsl(340 50% 88%)", accent: "hsl(320 40% 82%)" },
  { base: "hsl(40 60% 88%)", accent: "hsl(25 50% 82%)" },
  { base: "hsl(220 55% 87%)", accent: "hsl(240 45% 82%)" },
  { base: "hsl(120 40% 86%)", accent: "hsl(100 35% 80%)" },
  { base: "hsl(15 60% 88%)", accent: "hsl(0 45% 85%)" },
  { base: "hsl(190 55% 85%)", accent: "hsl(170 45% 78%)" },
  { base: "hsl(300 40% 88%)", accent: "hsl(280 35% 82%)" },
];

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
  videoUrl,
  onFavoriteClick,
  onClick,
  variant = "compact",
}: AirbnbCategoryCardProps) {
  const pastel = getPastelColors(id);
  const isCompleted = progress >= totalLevels;
  const isFull = variant === "full";
  const iconSize = 128;
  const [isPressed, setIsPressed] = React.useState(false);

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

  const progressParticles = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        id: i,
        delay: i * 0.4,
        size: 2 + Math.random() * 2,
      })),
    []
  );

  const progressPercent = (progress / totalLevels) * 100;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onPointerDown={() => setIsPressed(true)}
      onPointerUp={() => setIsPressed(false)}
      onPointerLeave={() => setIsPressed(false)}
      className="flex-shrink-0 w-full text-left"
      style={{
        transform: isPressed ? "translateY(4px)" : "translateY(0px)",
        touchAction: "manipulation",
      }}
    >
      {/* 3D Chunky Container */}
      <div 
        className={`relative w-full rounded-3xl overflow-hidden transition-shadow ${
          isPressed 
            ? 'shadow-[0_3px_0_0_rgba(0,0,0,0.15)]' 
            : 'shadow-[0_8px_0_0_rgba(0,0,0,0.15)]'
        }`}
        style={{
          background: `linear-gradient(135deg, ${pastel.base}, ${pastel.accent})`,
        }}
      >
        {/* Video/Icon Area */}
        <div className={`relative w-full ${isFull ? 'aspect-[16/9]' : 'aspect-[4/3]'}`}>
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

          {/* Video (ping-pong seamless loop) or Icon */}
          {videoUrl ? (
            <PingPongVideo src={videoUrl} />
          ) : (
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
          )}

          {/* Heart/Favorite Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onFavoriteClick?.(e);
            }}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 backdrop-blur-sm hover:bg-white transition-colors z-10 flex items-center justify-center shadow-[0_3px_0_0_rgba(0,0,0,0.1)]"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                isFavorite ? "fill-red-500 text-red-500" : "text-slate-600"
              }`}
            />
          </button>

          {/* Badge - only show if no leaderboard rank */}
          {badge && !leaderboardRank && (
            <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-[0_3px_0_0_rgba(0,0,0,0.1)]">
              <span className="text-xs font-semibold text-slate-700 leading-none">
                {badge}
              </span>
            </div>
          )}

          {/* Leaderboard Rank Badge */}
          {leaderboardRank && leaderboardRank > 0 && (
            <div 
              className="absolute top-3 left-3 h-9 px-3 rounded-full flex items-center gap-1.5 z-10 bg-white/95 backdrop-blur-sm shadow-[0_3px_0_0_rgba(0,0,0,0.1)]"
            >
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-bold text-slate-700 leading-none">
                #{leaderboardRank}
              </span>
            </div>
          )}

          {/* Completed Checkmark */}
          {isCompleted && (
            <div className="absolute bottom-3 right-3 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_3px_0_0_rgba(0,0,0,0.15)]">
              <span className="text-white text-sm">✓</span>
            </div>
          )}

          {/* Progress Bar */}
          <div className={`absolute left-4 right-4 ${isFull ? 'bottom-4' : 'bottom-3'}`}>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <div 
                  className={`absolute inset-0 rounded-full ${isFull ? 'h-4' : 'h-3.5'}`}
                  style={{
                    background: 'rgba(0,0,0,0.15)',
                    transform: 'translateY(2px)',
                    filter: 'blur(2px)',
                  }}
                />
                <div 
                  className={`relative rounded-full overflow-hidden ${isFull ? 'h-4' : 'h-3.5'}`}
                  style={{
                    background: 'rgba(255,255,255,0.35)',
                    backdropFilter: 'blur(4px)',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.15), 0 1px 0 rgba(255,255,255,0.3)',
                  }}
                >
                  <motion.div 
                    className="h-full rounded-full relative overflow-hidden"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                    style={{ 
                      background: 'linear-gradient(180deg, #FFD666 0%, #FFAA00 50%, #E69500 100%)',
                      boxShadow: progressPercent > 0 
                        ? 'inset 0 1px 0 rgba(255,255,255,0.5), 0 0 12px rgba(255,170,0,0.4)' 
                        : 'none',
                    }}
                  >
                    <div 
                      className="absolute inset-x-0 top-0 h-1/2 rounded-t-full"
                      style={{
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, transparent 100%)',
                      }}
                    />
                    {progressPercent > 10 && progressParticles.map((p) => (
                      <motion.div
                        key={p.id}
                        className="absolute rounded-full bg-white/70"
                        style={{
                          width: p.size,
                          height: p.size,
                          top: '50%',
                          marginTop: -p.size / 2,
                        }}
                        animate={{
                          left: ['-5%', '105%'],
                          opacity: [0, 1, 1, 0],
                          scale: [0.5, 1, 1, 0.5],
                        }}
                        transition={{
                          duration: 2.5,
                          delay: p.delay,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    ))}
                  </motion.div>
                </div>
              </div>
              <span 
                className={`font-bold text-white whitespace-nowrap ${isFull ? 'text-sm' : 'text-xs'}`}
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}
              >
                {progress}/{totalLevels}
              </span>
            </div>
          </div>
        </div>

        {/* Name Section - Inside the chunky container */}
        <div 
          className="px-4 py-3 flex items-center gap-2"
          style={{
            background: 'rgba(255,255,255,0.25)',
            borderTop: '1px solid rgba(255,255,255,0.3)',
          }}
        >
          <div className="w-6 h-0.5 bg-slate-400/50 rounded-full" />
          <h3 className={`font-bold text-slate-800 line-clamp-1 flex-1 ${isFull ? 'text-lg' : 'text-base'}`}>
            {name}
          </h3>
        </div>
      </div>
    </motion.button>
  );
}