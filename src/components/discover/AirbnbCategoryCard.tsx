import React, { useMemo, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Heart } from "lucide-react";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { PingPongVideo } from "@/components/shared/PingPongVideo";
import { CATEGORY_VIDEOS, getResponsiveVideoSrc } from "@/config/videoConfig";


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
  hasNewLevels?: boolean;
  /** Controls whether the video should load/play */
  isVideoActive?: boolean;
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

// Preload CategoryPage once (not per hover)
let categoryPagePreloaded = false;
function preloadCategoryPage() {
  if (categoryPagePreloaded) return;
  categoryPagePreloaded = true;
  import("@/pages/CategoryPage");
}

// Prefetch a video URL via <link rel="prefetch"> - browser downloads in idle time
const prefetchedVideos = new Set<string>();
function prefetchVideo(videoUrl: string) {
  if (!videoUrl) return;
  // Prefetch the same responsive URL playback will request
  const responsiveUrl = getResponsiveVideoSrc(videoUrl).webm;
  if (prefetchedVideos.has(responsiveUrl)) return;
  prefetchedVideos.add(responsiveUrl);
  const link = document.createElement("link");
  link.rel = "prefetch";
  link.as = "video";
  link.href = responsiveUrl;
  document.head.appendChild(link);
}

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
  hasNewLevels = false,
  isVideoActive,
  onFavoriteClick,
  onClick,
  variant = "compact",
}: AirbnbCategoryCardProps) {
  const { t } = useLanguage();
  const pastel = useMemo(() => getPastelColors(id), [id]);
  const isCompleted = progress >= totalLevels;
  const isFull = variant === "full";
  const iconSize = 128;
  const [isPressed, setIsPressed] = React.useState(false);

  // Prefetch the HD video + CategoryPage JS bundle on hover/touch
  const handlePointerEnter = useCallback(() => {
    preloadCategoryPage();
    if (videoUrl) {
      prefetchVideo(videoUrl);
    }
  }, [videoUrl]);

  const buttonStyle = useMemo(() => ({
    transform: isPressed ? "translateY(5px)" : "translateY(0px)",
    transition: "transform 0.1s ease-out",
    touchAction: "manipulation" as const,
  }), [isPressed]);

  const depthLayerStyle = useMemo(() => ({
    background: pastel.depth,
    transform: isPressed ? 'translateY(2px)' : 'translateY(8px)',
    transition: 'transform 0.1s ease-out',
  }), [pastel.depth, isPressed]);

  const mainCardStyle = useMemo(() => ({
    background: `linear-gradient(145deg, ${pastel.base} 0%, ${pastel.accent} 100%)`,
    boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.05)',
  }), [pastel.base, pastel.accent]);

  const innerFrameStyle = useMemo(() => ({
    boxShadow: `inset 0 0 0 3px ${pastel.depth}40, inset 0 0 0 4px rgba(255,255,255,0.3)`,
  }), [pastel.depth]);

  const videoGradientStyle = useMemo(() => ({
    height: isFull ? '50%' : '45%',
    background: `linear-gradient(180deg, transparent 0%, ${pastel.base}50 30%, ${pastel.base}90 55%, ${pastel.base}cc 75%, ${pastel.base} 100%)`,
  }), [isFull, pastel.base]);

  const progressGradientStyle = useMemo(() => ({
    bottom: 0,
    height: isFull ? '120px' : '100px',
    background: `linear-gradient(180deg, transparent 0%, ${pastel.base}40 20%, ${pastel.base}aa 45%, ${pastel.base}dd 65%, ${pastel.base} 85%)`,
  }), [isFull, pastel.base]);

  const progressPercent = (progress / totalLevels) * 100;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
      onPointerDown={() => setIsPressed(true)}
      onPointerUp={() => setIsPressed(false)}
      onPointerLeave={() => setIsPressed(false)}
      onPointerEnter={handlePointerEnter}
      className="flex-shrink-0 w-full text-left cursor-pointer"
      style={buttonStyle}
    >
      {/* 3D Chunky Container with depth layer */}
      <div className="relative">
        {/* Bottom depth layer - the 3D effect */}
        <div
          className="absolute inset-0 rounded-[28px]"
          style={depthLayerStyle}
        />

        {/* Main card face */}
        <div
          className="relative w-full rounded-[28px] overflow-hidden border-[3px] border-white/40"
          style={mainCardStyle}
        >
          {/* Video/Icon Area with inner frame */}
          <div className={`relative w-full ${isFull ? 'aspect-[16/9]' : 'aspect-[4/3]'} m-2`} style={{ width: 'calc(100% - 16px)' }}>
            {/* Inner frame border matching container color */}
            <div
              className="absolute inset-0 rounded-[20px] pointer-events-none z-[2]"
              style={innerFrameStyle}
            />

            {/* Video content container */}
            <div className="absolute inset-0 rounded-[20px] overflow-hidden">
            {/* Top shine effect */}
            <div
              className="absolute inset-x-0 top-0 h-1/3 pointer-events-none z-[1]"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, transparent 100%)',
                borderRadius: '25px 25px 0 0',
              }}
            />

            {/* Video (ping-pong seamless loop) or Icon */}
            {videoUrl ? (
              <>
                <PingPongVideo src={videoUrl} active={isVideoActive} />
                {/* Gradient mask overlay on bottom of video */}
                <div
                  className="absolute inset-x-0 bottom-0 pointer-events-none z-[1]"
                  style={videoGradientStyle}
                />
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <DynamicIcon
                  slug={iconSlug || undefined}
                  categoryId={categoryId}
                  size={iconSize}
                  className="drop-shadow-lg filter brightness-110"
                />
              </div>
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

            {/* NEW! Badge for new levels - takes priority */}
            {hasNewLevels && !leaderboardRank && (
              <div
                className="absolute top-3 left-3 px-3 py-2 rounded-full flex items-center justify-center border-2 border-purple-300"
                style={{
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)',
                  boxShadow: '0 4px 0 0 rgba(139,92,246,0.3), inset 0 2px 0 rgba(255,255,255,0.3), 0 0 12px rgba(139,92,246,0.4)',
                }}
              >
                <span className="text-xs font-bold text-white leading-none">
                  {t("extra.newBadge")}
                </span>
              </div>
            )}

            {/* Badge - only show if no leaderboard rank and no new levels badge */}
            {badge && !leaderboardRank && !hasNewLevels && (
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

            {/* Leaderboard Rank Badge - Only show for top 3 with medals */}
            {leaderboardRank && leaderboardRank > 0 && leaderboardRank <= 3 && (
              <div
                className="absolute top-3 left-3 h-10 px-3 rounded-full flex items-center gap-1.5 z-10 bg-white border-2 border-white/80"
                style={{
                  boxShadow: '0 4px 0 0 rgba(0,0,0,0.1), inset 0 2px 0 rgba(255,255,255,0.8)',
                }}
              >
                <span className="text-lg">
                  {leaderboardRank === 1 ? '🥇' : leaderboardRank === 2 ? '🥈' : '🥉'}
                </span>
                <span className="text-sm font-bold text-slate-700 leading-none">
                  #{leaderboardRank}
                </span>
              </div>
            )}

            {/* Progress Bar Area with gradient mask */}
             <div className={`absolute left-0 right-0 bottom-0`}>
              {/* Strong gradient mask for video fade */}
              <div
                 className="absolute inset-x-0 pointer-events-none z-0"
                style={progressGradientStyle}
              />

              {/* Progress bar content */}
               <div className={`relative z-10 px-4 ${isFull ? 'pb-4 pt-12' : 'pb-3 pt-10'}`}>
                {/* Progress bar with integrated count */}
                <div
                  className={`relative isolate z-0 rounded-full ${isFull ? 'h-6' : 'h-5'} border-[2.5px] border-white/70 overflow-visible`}
                  style={{
                    background: 'rgba(255,255,255,0.5)',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.08), 0 3px 0 rgba(0,0,0,0.06)',
                  }}
                >
                  {/* Inner clip layer */}
                  <div className="absolute inset-0 rounded-full overflow-hidden">
                    {/* Progress fill — CSS transition instead of framer-motion */}
                    <div
                      className="h-full rounded-full relative overflow-hidden z-0"
                      style={{
                        width: `${progressPercent}%`,
                        transition: 'width 0.6s ease-out',
                        background: 'linear-gradient(180deg, #FFE066 0%, #FFB800 40%, #FF9500 100%)',
                        boxShadow: progressPercent > 0
                          ? 'inset 0 2px 0 rgba(255,255,255,0.6), 0 0 16px rgba(255,170,0,0.5)'
                          : 'none',
                      }}
                    >
                      {/* Shine on progress */}
                      <div
                        className="absolute inset-x-0 top-0 h-1/2 rounded-t-full z-0"
                        style={{
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.6) 0%, transparent 100%)',
                        }}
                      />
                    </div>
                  </div>

                  {/* Completed end-cap check circle */}
                  {isCompleted && (
                    <div
                      className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-30 w-8 h-8 rounded-full flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(180deg, rgba(52, 211, 153, 1) 0%, rgba(16, 185, 129, 1) 100%)',
                        boxShadow:
                          '0 10px 20px rgba(0,0,0,0.18), inset 0 2px 0 rgba(255,255,255,0.35)',
                      }}
                    >
                      <span className="text-white text-sm font-bold leading-none">✓</span>
                    </div>
                  )}

                  {/* Progress count inside the bar */}
                  <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                    <span
                      className={`font-bold tracking-wide ${isFull ? 'text-sm' : 'text-xs'}`}
                      style={{
                        color: '#5a4a20',
                        textShadow: '0 1px 0 rgba(255,255,255,0.8)',
                      }}
                    >
                      {`${Math.min(progress, totalLevels)}/${totalLevels}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>

          {/* Name Section */}
          <div className="px-5 pb-3" style={{ marginTop: '-1px' }}>
            <h3
              className="font-bold tracking-wider line-clamp-1 text-left"
              style={{
                fontFamily: "'Google Sans', sans-serif",
                fontSize: isFull ? '1rem' : '0.9rem',
                color: '#2a2a3a',
                textShadow: '0 1px 0 rgba(255,255,255,0.7)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              {name}
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
}
