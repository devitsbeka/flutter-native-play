import { useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { Play, Flame, Star } from "lucide-react";
import { ChestRewardModal } from "@/components/home/ChestRewardModal";
import { SideMenuDrawer } from "@/components/home/SideMenuDrawer";
import { useAuth } from "@/hooks/useAuth";
import { calculateLevel } from "@/utils/levelCalculation";
import { PowerUpBadge } from "@/components/game/PowerUpBadge";
import { Skeleton } from "@/components/ui/skeleton";
import iconCompass from "@/assets/icons/icon-compass.png";
import iconMap3d from "@/assets/icons/icon-map-3d.png";
import iconTrophy3d from "@/assets/icons/icon-trophy-3d.png";
import iconCoin from "@/assets/icons/icon-coin.png";
import iconGem from "@/assets/icons/icon-gem.png";

// Theme colors (background now comes from global Spline)
const theme = {
  accent: "#9C6ADE",
  accentDark: "#7B4BBF",
};

// Compact currency pill with image icon
const CurrencyPill = ({ iconSrc, value }: { iconSrc: string; value: number }) => (
  <motion.div 
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
    style={{
      background: "rgba(255,255,255,0.95)",
      boxShadow: "0 2px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
    }}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
  >
    <img src={iconSrc} alt="" className="w-7 h-7 object-contain" />
    <span className="text-base font-bold text-gray-800">{value.toLocaleString()}</span>
  </motion.div>
);

// Side icon button with image (no label)
const SideIconButton = ({ 
  iconSrc, 
  onClick, 
  badge,
}: { 
  iconSrc: string; 
  onClick?: () => void;
  badge?: number;
}) => (
  <motion.button
    onClick={onClick}
    className="relative"
    whileHover={{ scale: 1.1, rotate: 5 }}
    whileTap={{ scale: 0.9 }}
    transition={{ type: "spring", stiffness: 400, damping: 15 }}
  >
    <img src={iconSrc} alt="" className="w-14 h-14 object-contain drop-shadow-lg" />
    {badge && badge > 0 && (
      <motion.div 
        className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
        style={{ 
          background: "linear-gradient(180deg, #FF6B6B 0%, #EF4444 100%)",
          boxShadow: "0 2px 4px rgba(239,68,68,0.4)"
        }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <span className="text-white text-[10px] font-bold">{badge}</span>
      </motion.div>
    )}
  </motion.button>
);

// Sparkle particle for play button
const SparkleParticle = ({ index, total }: { index: number; total: number }) => {
  const angle = (360 / total) * index;
  const radius = 52;
  const duration = 3 + Math.random() * 2;
  const size = 3 + Math.random() * 3;
  
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        left: "50%",
        top: "50%",
        marginLeft: -size / 2,
        marginTop: -size / 2,
        background: "radial-gradient(circle, #FFFFFF 0%, rgba(183,148,246,0.8) 50%, transparent 100%)",
        boxShadow: "0 0 6px rgba(255,255,255,0.8), 0 0 12px rgba(183,148,246,0.6)",
      }}
      animate={{
        x: [
          Math.cos((angle * Math.PI) / 180) * radius,
          Math.cos(((angle + 120) * Math.PI) / 180) * (radius + 8),
          Math.cos(((angle + 240) * Math.PI) / 180) * radius,
          Math.cos(((angle + 360) * Math.PI) / 180) * radius,
        ],
        y: [
          Math.sin((angle * Math.PI) / 180) * radius,
          Math.sin(((angle + 120) * Math.PI) / 180) * (radius + 8),
          Math.sin(((angle + 240) * Math.PI) / 180) * radius,
          Math.sin(((angle + 360) * Math.PI) / 180) * radius,
        ],
        opacity: [0.4, 1, 0.6, 0.4],
        scale: [0.8, 1.2, 0.9, 0.8],
      }}
      transition={{
        duration,
        delay: index * 0.15,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
};
// 3D Play Button Component
const PlayButton3D = ({ onClick }: { onClick: () => void }) => {
  const sparkles = useMemo(() => Array.from({ length: 8 }, (_, i) => i), []);
  
  return (
    <motion.button
      onClick={onClick}
      className="relative"
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95, y: 4 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      {/* Sparkle particles */}
      {sparkles.map((i) => (
        <SparkleParticle key={i} index={i} total={sparkles.length} />
      ))}
      
      {/* Outer glow pulse */}
      <motion.div 
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(183,148,246,0.5) 0%, transparent 70%)",
          transform: "scale(2)",
          filter: "blur(10px)",
        }}
        animate={{ 
          opacity: [0.3, 0.6, 0.3],
          scale: [1.8, 2.2, 1.8],
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* Base shadow (3D depth) */}
      <div 
        className="absolute inset-0 rounded-full"
        style={{
          background: "#7B4BBF",
          transform: "translateY(6px)",
          boxShadow: "0 8px 20px rgba(123,75,191,0.4)",
        }}
      />
      
      {/* Outer white ring with gradient */}
      <div 
        className="relative w-20 h-20 rounded-full p-[3px]"
        style={{
          background: "linear-gradient(180deg, #FFFFFF 0%, #E8E0F0 100%)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08), inset 0 1px 2px rgba(255,255,255,1)",
        }}
      >
        {/* Purple main button */}
        <div 
          className="w-full h-full rounded-full relative overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #C4A7F7 0%, #9C6ADE 40%, #8B5CD6 100%)",
            boxShadow: "inset 0 -4px 8px rgba(0,0,0,0.15), inset 0 4px 8px rgba(255,255,255,0.25)",
          }}
        >
          
          {/* Play icon container */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Play 
                className="w-10 h-10 drop-shadow-sm" 
                style={{ color: "white" }}
                fill="rgba(255,255,255,0.95)"
                strokeWidth={0}
              />
            </motion.div>
          </div>
          
          {/* Subtle shine overlay */}
          <motion.div 
            className="absolute inset-0 rounded-full opacity-0"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%)",
            }}
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        </div>
      </div>
    </motion.button>
  );
};

export default function Index() {
  const navigate = useNavigate();
  const { profile, user, fetchProfile } = useAuth();
  const [isChestModalOpen, setIsChestModalOpen] = useState(false);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  
  // Pull-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);
  
  const PULL_THRESHOLD = 80;
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current) return;
    
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY.current);
    
    if (distance > 0) {
      // Apply resistance
      setPullDistance(Math.min(distance * 0.5, 120));
    }
  }, []);
  
  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;
    
    if (pullDistance > PULL_THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(60);
      
      // Refresh profile data
      if (user) {
        await fetchProfile(user.id);
      }
      // Small delay for animation to complete
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setIsRefreshing(false);
    }
    
    setPullDistance(0);
  }, [pullDistance, user, fetchProfile]);

  const gamesWon = profile?.games_won || 0;
  const currentStreak = profile?.current_streak || 0;
  const levelInfo = calculateLevel(profile?.total_points || 0);

  return (
    <>
      <ChestRewardModal isOpen={isChestModalOpen} onClose={() => setIsChestModalOpen(false)} onClaim={() => setIsChestModalOpen(false)} />
      <SideMenuDrawer isOpen={isSideMenuOpen} onClose={() => setIsSideMenuOpen(false)} />
      
      <div 
        ref={containerRef}
        className="relative h-screen w-full overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Background and vignette come from GlobalSplineBackground - no local overlay needed */}

        {/* ===== TOP BAR ===== */}
        <header className="relative z-20 px-4 pt-4 safe-top">
          <div className="flex items-center justify-between">
            {/* Burger menu button */}
            <motion.button
              className="text-3xl"
              whileHover={{ scale: 1.1, rotate: 10 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsSideMenuOpen(true)}
            >
              🍔
            </motion.button>
            
            {/* Combined currency chip */}
            <motion.div 
              className="flex items-center gap-3 px-3 py-1.5 rounded-full"
              style={{
                background: "rgba(255,255,255,0.95)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isRefreshing ? (
                <>
                  <Skeleton className="w-14 h-5 rounded-full bg-gray-200" />
                  <div className="w-px h-4 bg-gray-200" />
                  <Skeleton className="w-10 h-5 rounded-full bg-gray-200" />
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1">
                    <img src={iconCoin} alt="" className="w-6 h-6 object-contain" />
                    <span className="text-sm font-bold text-gray-800">{(gamesWon * 10).toLocaleString()}</span>
                  </div>
                  <div className="w-px h-4 bg-gray-200" />
                  <div className="flex items-center gap-1">
                    <img src={iconGem} alt="" className="w-6 h-6 object-contain" />
                    <span className="text-sm font-bold text-gray-800">{currentStreak}</span>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        </header>

        {/* ===== CENTER: AVATAR WITH ARC BADGES ===== */}
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <motion.div 
            className="flex flex-col items-center w-full max-w-[280px]"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            style={{ 
              transform: pullDistance > 0 ? `translateY(${pullDistance * 0.3}px)` : undefined 
            }}
          >
            {/* Avatar container - simple transparent PNG display */}
            <motion.div 
              className="relative"
              animate={isRefreshing ? {
                rotateY: [0, 360],
                y: [0, -10, 0],
              } : { 
                y: [0, -5, 0],
                rotateY: 0,
              }}
              transition={isRefreshing ? {
                rotateY: { duration: 0.8, ease: "easeInOut" },
                y: { duration: 0.4, ease: "easeOut" },
              } : { 
                duration: 3, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              style={{ 
                perspective: 1000,
                transformStyle: "preserve-3d",
              }}
            >
              {/* Avatar image - clean display without ring */}
              <div className="w-64 relative flex items-end justify-center">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="Avatar" 
                    className="w-full h-auto max-h-72 object-contain object-bottom"
                    style={{
                      backfaceVisibility: "hidden",
                    }}
                  />
                ) : (
                  <div className="w-full h-64 flex items-center justify-center">
                    <span className="text-7xl">🎮</span>
                  </div>
                )}
              </div>
                
              {/* Power badges in curved arc at top of avatar */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 pointer-events-auto" style={{ marginTop: -80 }}>
                {(["fifty-fifty", "freeze", "replace", "time-drain", "add-power"] as const).map((type, index) => {
                  // True curved arc using calculated positions
                  const totalBadges = 5;
                  const arcSpan = 130; // flatter curve
                  const startAngle = -65; // start position
                  const angle = startAngle + (arcSpan / (totalBadges - 1)) * index;
                  const radius = 140; // wider horizontal spread
                  const radians = (angle * Math.PI) / 180;
                  const x = Math.sin(radians) * radius;
                  const y = -Math.cos(radians) * radius + radius; // offset so top of arc is at 0
                  
                  return (
                    <motion.div
                      key={type}
                      initial={{ scale: 0, opacity: 0, x, y }}
                      animate={{ scale: 1, opacity: 1, x, y }}
                      transition={{ delay: 0.2 + index * 0.08, type: "spring", stiffness: 200 }}
                      className="absolute"
                      style={{ 
                        left: "50%",
                        top: 0,
                        marginLeft: -24, // half badge size
                      }}
                    >
                      <PowerUpBadge type={type} size="sm" index={index} count={type === "add-power" ? undefined : 3} />
                    </motion.div>
                  );
                })}
              </div>
            
              {/* Level & XP bar - positioned directly below avatar, no gap */}
              <div className="-mt-8 z-20 pointer-events-auto">
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                >
                  {isRefreshing ? (
                    <Skeleton className="w-64 h-12 rounded-2xl bg-white/40" />
                  ) : (
                    <motion.div 
                      className="relative h-14 rounded-2xl overflow-hidden min-w-[280px]"
                      style={{ 
                        background: "linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(245,240,250,0.9) 50%, rgba(255,255,255,0.85) 100%)",
                        boxShadow: "0 6px 0 rgba(200,180,220,0.5), 0 8px 24px rgba(0,0,0,0.12), inset 0 1px 2px rgba(255,255,255,0.9), inset 0 -1px 2px rgba(200,180,220,0.3)",
                        border: "2px solid rgba(255,255,255,0.7)",
                      }}
                      animate={{
                        scale: [1, 1.02, 1],
                      }}
                      transition={{
                        duration: 0.3,
                        ease: "easeInOut",
                      }}
                      key={levelInfo.xpInCurrentLevel} // triggers animation on XP change
                    >
                      {/* Empty state placeholder - dotted outline */}
                      {levelInfo.progress === 0 && (
                        <div 
                          className="absolute inset-y-1 left-1 right-1 rounded-xl"
                          style={{
                            border: "2px dashed rgba(180,160,200,0.5)",
                            background: "rgba(200,180,220,0.1)",
                          }}
                        />
                      )}
                      
                      {/* Progress fill - chunky colored bar with 3D effect */}
                      {levelInfo.progress > 0 && (
                        <motion.div 
                          className="absolute inset-y-1 left-1 rounded-xl"
                          style={{
                            background: `linear-gradient(180deg, #A855F7 0%, #8B5CF6 40%, #7C3AED 100%)`,
                            boxShadow: "inset 0 3px 6px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.2), 0 2px 8px rgba(139,92,246,0.5)",
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `calc(${levelInfo.progress}% - 4px)` }}
                          transition={{ duration: 1, delay: 0.5 }}
                        />
                      )}
                      
                      {/* Text overlay */}
                      <div className="absolute inset-0 flex items-center justify-center gap-2 pointer-events-none">
                        <Star className="w-5 h-5 text-amber-400 fill-amber-400 drop-shadow-md" />
                        <span className="text-sm font-bold text-gray-700">
                          {levelInfo.progress === 0 
                            ? "Play to earn XP! ✨" 
                            : `Level ${levelInfo.level} (${levelInfo.xpInCurrentLevel} XP) / ${levelInfo.xpNeededForNextLevel} XP`
                          }
                        </span>
                      </div>
                      
                      {/* White text layer - clipped to progress fill (only when has progress) */}
                      {levelInfo.progress > 0 && (
                        <div 
                          className="absolute inset-0 flex items-center justify-center gap-2 pointer-events-none"
                          style={{
                            clipPath: `inset(0 ${100 - levelInfo.progress}% 0 0)`,
                          }}
                        >
                          <Star className="w-5 h-5 text-amber-400 fill-amber-400 drop-shadow-md" />
                          <span className="text-sm font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                            Level {levelInfo.level} ({levelInfo.xpInCurrentLevel} XP) / {levelInfo.xpNeededForNextLevel} XP
                          </span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* ===== BOTTOM NAVIGATION - 5 items ===== */}
        <div className="absolute bottom-0 left-0 right-0 z-20 safe-bottom">
          {/* Smooth gradient fade layer - extends upward with soft transition */}
          <div 
            className="absolute left-0 right-0 bottom-0 pointer-events-none"
            style={{
              height: "220px",
              background: "linear-gradient(to top, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.6) 25%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.1) 70%, transparent 100%)",
            }}
          />
          {/* Frosted glass backing for nav area */}
          <div 
            className="absolute left-0 right-0 bottom-0 pointer-events-none"
            style={{
              height: "120px",
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              background: "linear-gradient(to top, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 60%, transparent 100%)",
            }}
          />
          <motion.div 
            className="relative px-4 pb-6"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 120 }}
          >
            <div className="flex items-end justify-between">
              {/* Explore */}
              <motion.button
                onClick={() => navigate("/discover")}
                className="flex flex-col items-center gap-1"
                whileHover={{ scale: 1.1, y: -3 }}
                whileTap={{ scale: 0.9 }}
              >
                <div className="flex items-center justify-center">
                  <img src={iconCompass} alt="Explore" className="w-[52px] h-[52px] object-contain" />
                </div>
                <span className="text-[10px] uppercase tracking-wider text-foreground/80 font-semibold drop-shadow-sm">Explore</span>
              </motion.button>

              {/* Map */}
              <motion.button
                onClick={() => navigate("/adventure-map")}
                className="flex flex-col items-center gap-1"
                whileHover={{ scale: 1.1, y: -3 }}
                whileTap={{ scale: 0.9 }}
              >
                <div className="flex items-center justify-center">
                  <img src={iconMap3d} alt="Map" className="w-[52px] h-[52px] object-contain" />
                </div>
                <span className="text-[10px] uppercase tracking-wider text-foreground/80 font-semibold drop-shadow-sm">Map</span>
              </motion.button>

              {/* Center Play Button - elevated */}
              <div className="mb-4">
                <PlayButton3D onClick={() => navigate("/game")} />
              </div>

              {/* Rank */}
              <motion.button
                onClick={() => navigate("/leaderboards")}
                className="flex flex-col items-center gap-1"
                whileHover={{ scale: 1.1, y: -3 }}
                whileTap={{ scale: 0.9 }}
              >
                <div className="flex items-center justify-center">
                  <img src={iconTrophy3d} alt="Rank" className="w-[52px] h-[52px] object-contain" />
                </div>
                <span className="text-[10px] uppercase tracking-wider text-foreground/80 font-semibold drop-shadow-sm">Rank</span>
              </motion.button>

              {/* Headphones/Audio */}
              <motion.button
                className="flex flex-col items-center gap-1"
                whileHover={{ scale: 1.1, y: -3 }}
                whileTap={{ scale: 0.9 }}
              >
                <div className="flex items-center justify-center">
                  <span className="text-4xl">🎧</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-foreground/80 font-semibold drop-shadow-sm">Sound</span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
