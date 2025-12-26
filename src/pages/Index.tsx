import { useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { Flame, Star, Gift } from "lucide-react";
import { ChestRewardModal } from "@/components/home/ChestRewardModal";
import { SideMenuDrawer } from "@/components/home/SideMenuDrawer";
import { DailyRewardsModal } from "@/components/home/DailyRewardsModal";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { calculateLevel } from "@/utils/levelCalculation";
import { PowerUpBadge } from "@/components/game/PowerUpBadge";
import { PowerUpDetailModal, PowerUpType } from "@/components/game/PowerUpDetailModal";
import { SignupOnboardingModal } from "@/components/onboarding/SignupOnboardingModal";
import { AvatarCreationFlow } from "@/components/onboarding/AvatarCreationFlow";
import { AvatarCircle } from "@/components/home/AvatarCircle";
import { OnboardingWalkthrough } from "@/components/onboarding/OnboardingWalkthrough";
import { SoundSettingsModal } from "@/components/home/SoundSettingsModal";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/lib/i18n";
import { UniversalBottomNav } from "@/components/layout/UniversalBottomNav";
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

export default function Index() {
  const navigate = useNavigate();
  const { profile, user, fetchProfile } = useAuth();
  const { step, startOnboarding, skipToAvatarCreation, needsWalkthrough, setStep, hasCompletedOnboarding } = useOnboarding();
  
  const [isChestModalOpen, setIsChestModalOpen] = useState(false);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [isSoundModalOpen, setIsSoundModalOpen] = useState(false);
  const [isDailyRewardsOpen, setIsDailyRewardsOpen] = useState(false);
  const [selectedPowerUp, setSelectedPowerUp] = useState<PowerUpType | null>(null);
  
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

  // Handle play button click - check auth status
  const handlePlayClick = useCallback(() => {
    if (!user) {
      // Not logged in - start signup onboarding
      startOnboarding();
    } else if (!profile?.avatar_url) {
      // Logged in but no avatar - go to avatar creation
      skipToAvatarCreation();
    } else if (needsWalkthrough && !hasCompletedOnboarding) {
      // First time with avatar - show walkthrough
      setStep("walkthrough");
    } else {
      // All good - navigate to game
      navigate("/game");
    }
  }, [user, profile, navigate, startOnboarding, skipToAvatarCreation, needsWalkthrough, hasCompletedOnboarding, setStep]);

  const gamesWon = profile?.games_won || 0;
  const currentStreak = profile?.current_streak || 0;
  const levelInfo = calculateLevel(profile?.total_points || 0);

  return (
    <>
      {/* Onboarding modals */}
      <SignupOnboardingModal />
      <AvatarCreationFlow />
      <OnboardingWalkthrough />
      
      {/* Other modals */}
      <ChestRewardModal isOpen={isChestModalOpen} onClose={() => setIsChestModalOpen(false)} onClaim={() => setIsChestModalOpen(false)} />
      <SideMenuDrawer isOpen={isSideMenuOpen} onClose={() => setIsSideMenuOpen(false)} />
      <SoundSettingsModal isOpen={isSoundModalOpen} onClose={() => setIsSoundModalOpen(false)} />
      <DailyRewardsModal 
        isOpen={isDailyRewardsOpen} 
        onClose={() => setIsDailyRewardsOpen(false)} 
        currentStreak={currentStreak || 1}
        onClaim={() => console.log("Claimed daily reward")}
      />
      <PowerUpDetailModal 
        isOpen={selectedPowerUp !== null} 
        onClose={() => setSelectedPowerUp(null)} 
        type={selectedPowerUp || "fifty-fifty"} 
      />
      
      
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
            {/* Burger menu chip - same style as currency */}
            <motion.button
              className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{
                background: "rgba(255,255,255,0.95)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsSideMenuOpen(true)}
            >
              <span className="text-xl">🍔</span>
              <span className="text-sm font-bold text-gray-800">{t("nav.menu")}</span>
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
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none" style={{ marginTop: -80 }}>
          <motion.div 
            className="flex flex-col items-center w-full max-w-[360px]"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            style={{ 
              transform: pullDistance > 0 ? `translateY(${pullDistance * 0.3}px)` : undefined 
            }}
          >
            {/* Avatar container with floating animation */}
            <motion.div 
              className="relative"
              animate={isRefreshing ? {
                rotateY: [0, 360],
                y: [0, -10, 0],
              } : { 
                y: [0, -8, 0],
                rotateY: 0,
              }}
              transition={isRefreshing ? {
                rotateY: { duration: 0.8, ease: "easeInOut" },
                y: { duration: 0.4, ease: "easeOut" },
              } : { 
                duration: 4, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              style={{ 
                perspective: 1000,
                transformStyle: "preserve-3d",
              }}
            >
              {/* Avatar Circle Component */}
              <div data-walkthrough="avatar">
                <AvatarCircle avatarUrl={profile?.avatar_url} size={352} />
              </div>
                
              {/* Power badges in curved arc at top of avatar */}
              <div 
                className="absolute top-0 left-1/2 -translate-x-1/2 z-30 pointer-events-auto" 
                style={{ marginTop: -30 }}
                data-walkthrough="powerups"
              >
                {(["fifty-fifty", "freeze", "replace", "time-drain", "add-power"] as const).map((type, index) => {
                  // True curved arc using calculated positions
                  const totalBadges = 5;
                  const arcSpan = 140; // slightly wider curve
                  const startAngle = -70; // start position
                  const angle = startAngle + (arcSpan / (totalBadges - 1)) * index;
                  const radius = 160; // wider radius to match bigger circle
                  const radians = (angle * Math.PI) / 180;
                  const badgeWidth = 48; // approximate badge width
                  const x = Math.sin(radians) * radius - badgeWidth / 2 - 6;
                  const y = -Math.cos(radians) * radius + radius;
                  
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
                      }}
                    >
                      <PowerUpBadge 
                        type={type} 
                        size="sm" 
                        index={index} 
                        count={type === "add-power" ? undefined : 3}
                        onClick={() => setSelectedPowerUp(type)}
                      />
                    </motion.div>
                  );
                })}
              </div>
            
              {/* Level & XP bar - positioned below avatar bottom, touching */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[calc(100%-8px)] z-20 pointer-events-auto">
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
                      {/* Grey subtle foil background for unfilled area */}
                      <div 
                        className="absolute inset-y-1 left-1 right-1 rounded-xl"
                        style={{
                          background: "linear-gradient(135deg, rgba(180,175,190,0.35) 0%, rgba(160,155,175,0.25) 50%, rgba(180,175,190,0.35) 100%)",
                          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.08), inset 0 -1px 2px rgba(255,255,255,0.5)",
                        }}
                      />
                      
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
                            ? t("game.playToEarn")
                            : t("game.levelProgress", { level: levelInfo.level, current: levelInfo.xpInCurrentLevel, next: levelInfo.xpNeededForNextLevel })
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
                            {t("game.levelProgress", { level: levelInfo.level, current: levelInfo.xpInCurrentLevel, next: levelInfo.xpNeededForNextLevel })}
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

        {/* Universal Bottom Navigation */}
        <UniversalBottomNav 
          onPlayClick={handlePlayClick} 
          onTeamClick={() => setIsSoundModalOpen(true)} 
        />
      </div>
    </>
  );
}
