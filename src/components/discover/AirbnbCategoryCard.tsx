import React, { memo, useMemo, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Heart, Lock } from "lucide-react";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { POPULAR_CATEGORY_ICONS, POPULAR_CATEGORY_PALETTES } from "@/config/popularImageCategories";


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
  /** Badge this card as a newly added category. */
  isNewCategory?: boolean;
  /**
   * A premium category, and no subscription. The card still opens — the tap
   * raises the paywall rather than doing nothing, which is the difference
   * between an offer and a dead tile — but it says so before the tap.
   */
  isLocked?: boolean;
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
  // The picture-guess categories ship a designed palette; everything else
  // keeps the stable id-hash pick.
  const pinned = POPULAR_CATEGORY_PALETTES[id as keyof typeof POPULAR_CATEGORY_PALETTES];
  if (pinned) return pinned;
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

/**
 * Memoised, because the carousel re-renders on every keystroke of the search
 * box and almost none of these cards actually change. The props are all
 * primitives apart from the two callbacks, which the carousel keeps stable.
 */
function AirbnbCategoryCardComponent({
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
  isNewCategory = false,
  isLocked = false,
  onFavoriteClick,
  onClick,
  variant = "compact",
}: AirbnbCategoryCardProps) {
  const { t } = useLanguage();
  const pastel = useMemo(() => getPastelColors(id), [id]);
  const isCompleted = !isLocked && progress >= totalLevels;
  const isFull = variant === "full";
  const iconSize = 128;
  const [isPressed, setIsPressed] = React.useState(false);

  // Prefetch the CategoryPage JS bundle on hover/touch. It used to prefetch
  // the category's HD video here too — a card the finger merely passed over
  // pulled down a video, and a scroll through Discover pulled down a dozen.
  const handlePointerEnter = useCallback(() => {
    preloadCategoryPage();
  }, []);

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

  const progressGradientStyle = useMemo(() => ({
    bottom: 0,
    height: isFull ? '120px' : '100px',
    background: `linear-gradient(180deg, transparent 0%, ${pastel.base}40 20%, ${pastel.base}aa 45%, ${pastel.base}dd 65%, ${pastel.base} 85%)`,
  }), [isFull, pastel.base]);

  // A locked category shows an empty track. Whatever progress a player made
  // before it became premium is still theirs and still in the database —
  // drawing a half-full bar under a lock would just invite the question of
  // why they cannot get at it.
  const progressPercent = isLocked ? 0 : (progress / totalLevels) * 100;

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

            {/* Media layer: the video and its own gradients, and nothing
                else. Everything a player can read or press is in the layer
                below this one — see the note there. */}
            <div
              className="absolute inset-0 rounded-[20px] overflow-hidden z-0"
              // Promoted deliberately, so the compositor sorts this layer and
              // the overlay one by z-index rather than deciding for itself
              // where the video's own layer belongs.
              style={{ transform: "translateZ(0)" }}
            >
            {/* Top shine effect */}
            <div
              className="absolute inset-x-0 top-0 h-1/3 pointer-events-none z-[1]"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, transparent 100%)',
                borderRadius: '25px 25px 0 0',
              }}
            />

            {/* The category's icon. This card used to play the category's
                video when there was one, so a scroll through Discover had a
                dozen of them decoding at once; the video now lives only on
                the category's own page, where there is one of it and it is
                the point of the header.

                The picture-guess six carry their own 3D art. Everything else
                is its icon_slug out of the library — which is why the slug
                has to be set: without one DynamicIcon falls back to picking
                an icon by hash, and a category ends up wearing whatever it
                drew. */}
            {/* Desaturated and dimmed when locked, so the card reads as shut
                from across the grid rather than only once the eye reaches
                the lock chip. Art only — the name below stays legible. */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={isLocked ? { filter: "grayscale(0.85)", opacity: 0.55 } : undefined}
            >
              {POPULAR_CATEGORY_ICONS[(categoryId ?? id) as keyof typeof POPULAR_CATEGORY_ICONS] ? (
                <img
                  src={POPULAR_CATEGORY_ICONS[(categoryId ?? id) as keyof typeof POPULAR_CATEGORY_ICONS]}
                  alt=""
                  draggable={false}
                  className="w-[53%] max-h-[63%] object-contain drop-shadow-lg"
                  loading="lazy"
                />
              ) : (
                <DynamicIcon
                  slug={iconSlug || undefined}
                  categoryId={categoryId}
                  size={iconSize}
                  className="drop-shadow-lg filter brightness-110"
                />
              )}
            </div>
            </div>

            {/* Overlay layer: heart, rank, badges, progress.

                These used to sit inside the media container, above the video
                by z-index alone, and on iOS they came and went while the page
                scrolled — visible for a frame mid-scroll, gone once it
                settled. A playing <video> inside a rounded overflow-hidden box
                is promoted to its own compositing layer there, and paint order
                stops deciding what covers what; the overlays were being
                composited under the video and only surfaced during the
                repaints a scroll forces.

                So they are no longer in that box. This is a sibling of the
                media layer with its own rounded clip and no video in it, and
                translateZ(0) promotes it to a layer of its own, above the
                video's. Nothing here depends on out-painting a composited
                sibling any more.

                Chromium and desktop Safari never showed the fault — this is
                the third fix aimed at this symptom, and the first two moved
                z-index around, which is exactly the thing iOS was ignoring. */}
            <div
              className="absolute inset-0 rounded-[20px] overflow-hidden z-10"
              style={{ transform: "translateZ(0)", isolation: "isolate" }}
            >

            {/* Heart/Favorite Button - Chunky style */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onFavoriteClick?.(e);
              }}
              className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white flex items-center justify-center z-20 border-2 border-white/80 active:translate-y-0.5"
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

            {/* Top-left markers.

                These used to hide each other — NEW was suppressed by a rank,
                and the plain badge by either. Every one of them arrives from a
                DIFFERENT async query (ranks, new levels, progress), so as each
                landed the corner swapped what it showed: a badge appeared,
                then vanished when the next query resolved. That is the
                flicker. They sit side by side now and nothing displaces
                anything else. */}
            <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5">
              {/* The lock leads the cluster. A locked category has nothing to
                  rank and no progress to be proud of, so it is the one marker
                  that matters and it must not be pushed off the row by a
                  medal that arrived from a different query. */}
              {isLocked && (
                <div
                  className="h-10 px-3 rounded-full flex items-center gap-1.5 border-2 border-purple-300"
                  style={{
                    background: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)',
                    boxShadow: '0 4px 0 0 rgba(139,92,246,0.3), inset 0 2px 0 rgba(255,255,255,0.3)',
                  }}
                >
                  <Lock className="w-4 h-4 text-white" strokeWidth={3} />
                  <span className="text-xs font-bold text-white leading-none tracking-wide">
                    PRO
                  </span>
                </div>
              )}

              {leaderboardRank && leaderboardRank > 0 && leaderboardRank <= 3 && (
                <div
                  className="h-10 px-3 rounded-full flex items-center gap-1.5 bg-white border-2 border-white/80"
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

              {isNewCategory && (
                <div
                  className="px-3 py-2 rounded-full flex items-center justify-center border-2 border-purple-300"
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

              {badge && !leaderboardRank && !isNewCategory && (
                <div
                  className="px-3 py-2 rounded-full bg-white flex items-center justify-center border-2 border-white/80"
                  style={{
                    boxShadow: '0 4px 0 0 rgba(0,0,0,0.1), inset 0 2px 0 rgba(255,255,255,0.8)',
                  }}
                >
                  <span className="text-xs font-bold text-slate-700 leading-none">
                    {badge}
                  </span>
                </div>
              )}
            </div>

            {/* Progress Bar Area with gradient mask.

                z-20 on purpose. Every overlay on this card has to clear the
                two decorative gradients, which are z-[1]: the shine across
                the top third and the video's bottom fade, which ends FULLY
                opaque. Without it the progress bar and the badges painted
                underneath them — and only on cards that have a video, since
                that bottom gradient renders only in the video branch. That is
                the "sometimes there, sometimes not" — it was per-card, not
                per-moment. */}
             <div className={`absolute left-0 right-0 bottom-0 z-20`}>
              {/* Strong gradient mask for video fade */}
              <div
                 className="absolute inset-x-0 pointer-events-none z-0"
                style={progressGradientStyle}
              />

              {/* Progress bar content */}
               <div className={`relative z-10 px-4 ${isFull ? 'pb-4 pt-12' : 'pb-3 pt-10'}`}>
                {/* Progress bar with integrated count */}
                <div
                  className={`relative isolate z-0 rounded-full ${isFull ? 'h-6' : 'h-5'} border-[2px] border-[#e8e0f5] overflow-visible`}
                  // Track uses the main page pill recipe (lavender border + lip)
                  style={{
                    background: 'rgba(252,247,255,0.8)',
                    boxShadow: '0 3px 0 #d8d0e8, inset 0 1.8px 0 0 #ffffff',
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

                  {/* Progress count inside the bar — or, locked, how many
                      levels are waiting behind the subscription. "0/16" on a
                      category nobody can start reads as a bug; the level
                      count is the interesting number there. */}
                  <div className="absolute inset-0 flex items-center justify-center gap-1 z-20 pointer-events-none">
                    {isLocked && <Lock className="w-3 h-3 text-[#6b5b95]" strokeWidth={3} />}
                    <span
                      className={`font-bold tracking-wide ${isFull ? 'text-sm' : 'text-xs'}`}
                      style={{
                        color: isLocked ? '#6b5b95' : '#5a4a20',
                        textShadow: '0 1px 0 rgba(255,255,255,0.8)',
                      }}
                    >
                      {isLocked
                        ? `${totalLevels}`
                        : `${Math.min(progress, totalLevels)}/${totalLevels}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>

          {/* Name Section */}
          <div className="px-5 pb-3" style={{ marginTop: '-1px' }}>
            {/* Two lines on the compact card, not one.
                A single clamped line is what forced the home rail's cards
                wide enough to fit "მსოფლიო გეოგრაფია" — Georgian category
                names run long, and at one line the only way to show them was
                more width, which cost the rail its third card. Wrapping buys
                the same room vertically. The min-height reserves the second
                line whether or not it is used, so a rail of one- and
                two-line names still has one baseline. */}
            <h3
              className={`font-bold tracking-wider text-left ${
                isFull ? "line-clamp-1" : "line-clamp-2 min-h-[2.2em]"
              }`}
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

export const AirbnbCategoryCard = memo(AirbnbCategoryCardComponent);
