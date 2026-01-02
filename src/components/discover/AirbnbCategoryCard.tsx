import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Heart, Trophy, Menu } from "lucide-react";
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
  { base: "hsl(200 70% 85%)", accent: "hsl(180 50% 75%)", depth: "hsl(200 60% 70%)" },
  { base: "hsl(280 50% 88%)", accent: "hsl(260 40% 80%)", depth: "hsl(280 45% 72%)" },
  { base: "hsl(160 50% 85%)", accent: "hsl(140 40% 78%)", depth: "hsl(160 45% 68%)" },
  { base: "hsl(340 50% 88%)", accent: "hsl(320 40% 82%)", depth: "hsl(340 45% 72%)" },
  { base: "hsl(40 60% 88%)", accent: "hsl(25 50% 82%)", depth: "hsl(40 50% 70%)" },
  { base: "hsl(220 55% 87%)", accent: "hsl(240 45% 82%)", depth: "hsl(220 50% 72%)" },
  { base: "hsl(120 40% 86%)", accent: "hsl(100 35% 80%)", depth: "hsl(120 35% 68%)" },
  { base: "hsl(15 60% 88%)", accent: "hsl(0 45% 85%)", depth: "hsl(15 50% 72%)" },
  { base: "hsl(190 55% 85%)", accent: "hsl(170 45% 78%)", depth: "hsl(190 50% 68%)" },
  { base: "hsl(300 40% 88%)", accent: "hsl(280 35% 82%)", depth: "hsl(300 35% 72%)" },
];

const getPastelColors = (id: string): { base: string; accent: string; depth: string } => {
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
      whileHover={{ scale: 1.015 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onPointerDown={() => setIsPressed(true)}
      onPointerUp={() => setIsPressed(false)}
      onPointerLeave={() => setIsPressed(false)}
      className="flex-shrink-0 w-full text-left"
      style={{
        transform: isPressed ? "translateY(5px)" : "translateY(0px)",
        touchAction: "manipulation",
      }}
    >
      {/* 3D Chunky Container with depth layer */}
      <div className="relative">
        {/* Bottom depth layer - the 3D effect */}
        <div 
          className="absolute inset-0 rounded-[28px]"
          style={{
            background: pastel.depth,
            transform: isPressed ? 'translateY(2px)' : 'translateY(8px)',
            transition: 'transform 0.1s ease-out',
          }}
        />
        
        {/* Main card face */}
        <div 
          className="relative w-full rounded-[28px] overflow-hidden border-[3px] border-white/40"
          style={{
            background: `linear-gradient(145deg, ${pastel.base} 0%, ${pastel.accent} 100%)`,
            boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.05)',
          }}
        >
          {/* Video/Icon Area */}
          <div className={`relative w-full ${isFull ? 'aspect-[16/9]' : 'aspect-[4/3]'}`}>
            {/* Top shine effect */}
            <div 
              className="absolute inset-x-0 top-0 h-1/3 pointer-events-none z-[1]"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, transparent 100%)',
                borderRadius: '25px 25px 0 0',
              }}
            />

            {/* Floating Particles */}
            <div className="absolute inset-0 overflow-hidden">
              {particles.map((particle) => (
                <motion.div
                  key={particle.id}
                  className="absolute rounded-full bg-white/60"
                  style={{
                    width: particle.size,
                    height: particle.size,
                    left: `${particle.x}%`,
                    top: `${particle.y}%`,
                  }}
                  animate={{
                    y: [0, -25, 0],
                    x: [0, particle.drift, 0],
                    opacity: [0.3, 0.8, 0.3],
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

            {/* Heart/Favorite Button - Chunky style */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onFavoriteClick?.(e);
              }}
              className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white flex items-center justify-center z-10 border-2 border-white/80 active:translate-y-0.5"
              style={{
                boxShadow: '0 4px 0 0 rgba(0,0,0,0.1), inset 0 2px 0 rgba(255,255,255,0.8)',
              }}
            >
              <Heart
                className={`w-5 h-5 transition-colors ${
                  isFavorite ? "fill-red-500 text-red-500" : "text-slate-500"
                }`}
              />
            </button>

            {/* Badge - only show if no leaderboard rank - Chunky style */}
            {badge && !leaderboardRank && (
              <div 
                className="absolute top-3 left-3 px-3 py-2 rounded-full bg-white flex items-center justify-center border-2 border-white/80"
                style={{
                  boxShadow: '0 4px 0 0 rgba(0,0,0,0.1), inset 0 2px 0 rgba(255,255,255,0.8)',
                }}
              >
                <span className="text-xs font-bold text-slate-700 leading-none">
                  {badge}
                </span>
              </div>
            )}

            {/* Leaderboard Rank Badge - Chunky style */}
            {leaderboardRank && leaderboardRank > 0 && (
              <div 
                className="absolute top-3 left-3 h-10 px-3 rounded-full flex items-center gap-1.5 z-10 bg-white border-2 border-white/80"
                style={{
                  boxShadow: '0 4px 0 0 rgba(0,0,0,0.1), inset 0 2px 0 rgba(255,255,255,0.8)',
                }}
              >
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-bold text-slate-700 leading-none">
                  #{leaderboardRank}
                </span>
              </div>
            )}

            {/* Completed Checkmark - Chunky style */}
            {isCompleted && (
              <div 
                className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-emerald-400"
                style={{
                  boxShadow: '0 3px 0 0 rgba(0,0,0,0.15), inset 0 2px 0 rgba(255,255,255,0.3)',
                }}
              >
                <span className="text-white text-sm font-bold">✓</span>
              </div>
            )}

            {/* Progress Bar - Chunky style */}
            <div className={`absolute left-4 right-4 ${isFull ? 'bottom-4' : 'bottom-3'}`}>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  {/* Progress bar container - chunky */}
                  <div 
                    className={`relative rounded-full overflow-hidden ${isFull ? 'h-5' : 'h-4'} border-2 border-white/50`}
                    style={{
                      background: 'rgba(255,255,255,0.4)',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1), 0 2px 0 rgba(255,255,255,0.3)',
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
                          ? 'inset 0 2px 0 rgba(255,255,255,0.5), 0 0 12px rgba(255,170,0,0.4)' 
                          : 'none',
                      }}
                    >
                      {/* Shine on progress */}
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
                {/* Progress count - chunky badge */}
                <div 
                  className="px-2 py-1 rounded-full bg-white/90 border border-white/50"
                  style={{
                    boxShadow: '0 2px 0 rgba(0,0,0,0.08)',
                  }}
                >
                  <span className={`font-bold text-slate-700 whitespace-nowrap ${isFull ? 'text-sm' : 'text-xs'}`}>
                    {progress}/{totalLevels}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Name Section - Chunky pill inside the container */}
          <div className="px-4 py-3">
            <div 
              className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-white/80 border-2 border-white/60"
              style={{
                boxShadow: '0 3px 0 rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
              }}
            >
              <Menu className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <h3 className={`font-bold text-slate-700 line-clamp-1 flex-1 ${isFull ? 'text-base' : 'text-sm'}`}>
                {name}
              </h3>
            </div>
          </div>
        </div>
      </div>
    </motion.button>
  );
}