import { useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { Bell, Gift } from "lucide-react";
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
import { AvatarModal } from "@/components/home/AvatarModal";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/lib/i18n";
import { UniversalBottomNav } from "@/components/layout/UniversalBottomNav";

// Theme colors (background now comes from global Spline)
const theme = {
  accent: "#9C6ADE",
  accentDark: "#7B4BBF",
};

// Convert country code to flag emoji
const getFlagEmoji = (countryCode: string): string => {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
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
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  
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
      <AvatarModal 
        isOpen={isAvatarModalOpen} 
        onClose={() => setIsAvatarModalOpen(false)} 
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
              className="flex items-center gap-2 px-4 py-2 rounded-full h-[42px]"
              style={{
                background: "linear-gradient(180deg, #F8F6FC 0%, #EDE8F5 50%, #E5DEF0 100%)",
                boxShadow: "inset 0 4px 8px rgba(140,120,180,0.15), inset 0 -2px 4px rgba(255,255,255,0.8), 0 4px 0 #D8D0E8, 0 6px 12px rgba(0,0,0,0.1)",
                border: "3px solid rgba(255,255,255,0.9)",
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsSideMenuOpen(true)}
            >
              <span className="w-5 h-5 flex items-center justify-center text-base">🍔</span>
              <span className="text-sm font-bold text-gray-700 uppercase" style={{ fontFamily: "'Google Sans', sans-serif" }}>ᲛᲔᲜᲘᲣ</span>
            </motion.button>
            
            {/* Notification icons chip */}
            <motion.div 
              className="flex items-center gap-2 px-3 py-2 rounded-full h-[42px]"
              style={{
                background: "linear-gradient(180deg, #F8F6FC 0%, #EDE8F5 50%, #E5DEF0 100%)",
                boxShadow: "inset 0 4px 8px rgba(140,120,180,0.15), inset 0 -2px 4px rgba(255,255,255,0.8), 0 4px 0 #D8D0E8, 0 6px 12px rgba(0,0,0,0.1)",
                border: "3px solid rgba(255,255,255,0.9)",
              }}
            >
              {/* Bell icon */}
              <motion.button
                className="relative p-1"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Bell className="w-5 h-5 text-gray-600" />
              </motion.button>
              
              {/* Divider */}
              <div className="w-px h-4 bg-gray-300/60" />
              
              {/* Gift icon with red dot */}
              <motion.button
                className="relative p-1"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsDailyRewardsOpen(true)}
              >
                <Gift className="w-5 h-5 text-gray-600" />
                {/* Red notification dot */}
                <motion.div 
                  className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
                  style={{ 
                    background: "linear-gradient(180deg, #FF6B6B 0%, #EF4444 100%)",
                    boxShadow: "0 1px 3px rgba(239,68,68,0.5)"
                  }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.button>
            </motion.div>
            
          </div>
        </header>

        {/* ===== CENTER: AVATAR WITH ARC BADGES ===== */}
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none" style={{ marginTop: -230 }}>
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
              {/* Avatar Circle Component - clickable to open modal */}
              <div 
                data-walkthrough="avatar" 
                className="pointer-events-auto cursor-pointer"
                onClick={() => user && setIsAvatarModalOpen(true)}
              >
                <AvatarCircle avatarUrl={profile?.avatar_url} size={292} />
              </div>
                
            
              {/* User info & XP bar - positioned below avatar */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[calc(100%+16px)] z-20 pointer-events-auto">
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="flex flex-col items-center gap-3"
                >
                  {isRefreshing ? (
                    <Skeleton className="w-64 h-20 rounded-2xl bg-white/40" />
                  ) : (
                    <>
                      {/* Name, Flag, Level row */}
                      <div className="flex items-center justify-center gap-3">
                        <span className="font-display font-bold text-white drop-shadow-md" style={{ fontSize: 32 }}>
                          {profile?.nickname || t("game.guest")}
                        </span>
                        {profile?.country_code && (
                          <span className="text-2xl">
                            {getFlagEmoji(profile.country_code)}
                          </span>
                        )}
                        <div 
                          className="px-3 py-1 rounded-full text-sm font-bold text-white"
                          style={{
                            background: "linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)",
                            boxShadow: "0 2px 8px rgba(139,92,246,0.4)",
                          }}
                        >
                          Lv. {levelInfo.level}
                        </div>
                      </div>
                      
                      {/* 3D Chunky Progress bar */}
                      <div 
                        className="relative h-10 rounded-full overflow-hidden min-w-[300px]"
                        style={{
                          background: "linear-gradient(180deg, #F8F6FC 0%, #EDE8F5 50%, #E5DEF0 100%)",
                          boxShadow: "inset 0 4px 8px rgba(140,120,180,0.2), inset 0 -2px 4px rgba(255,255,255,0.8), 0 4px 0 #D8D0E8, 0 6px 12px rgba(0,0,0,0.1)",
                          border: "3px solid rgba(255,255,255,0.9)",
                        }}
                      >
                        {/* Progress fill with 3D depth */}
                        {levelInfo.progress > 0 && (
                          <motion.div 
                            className="absolute inset-1 rounded-full overflow-hidden"
                            style={{
                              width: `calc(${levelInfo.progress}% - 8px)`,
                              background: "linear-gradient(180deg, #C084FC 0%, #A855F7 40%, #9333EA 100%)",
                              boxShadow: "inset 0 3px 6px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(100,50,180,0.3), 0 0 20px rgba(168,85,247,0.4)",
                            }}
                            initial={{ width: 0 }}
                            animate={{ width: `calc(${levelInfo.progress}% - 8px)` }}
                            transition={{ duration: 1, delay: 0.5 }}
                          >
                            {/* Sparkle particles inside filled area */}
                            {[...Array(6)].map((_, i) => (
                              <motion.div
                                key={i}
                                className="absolute rounded-full"
                                style={{
                                  width: i % 2 === 0 ? 5 : 4,
                                  height: i % 2 === 0 ? 5 : 4,
                                  background: "rgba(255,255,255,0.95)",
                                  boxShadow: "0 0 8px rgba(255,255,255,0.9)",
                                  left: `${12 + (i * 14)}%`,
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                }}
                                animate={{
                                  y: [-3, 3, -3],
                                  opacity: [0.5, 1, 0.5],
                                  scale: [0.9, 1.1, 0.9],
                                }}
                                transition={{
                                  duration: 1.5 + (i * 0.2),
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                  delay: i * 0.15,
                                }}
                              />
                            ))}
                            
                            {/* Shine effect */}
                            <motion.div
                              className="absolute inset-0 rounded-full"
                              style={{
                                background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
                              }}
                              animate={{
                                x: ["-100%", "200%"],
                              }}
                              transition={{
                                duration: 2.5,
                                repeat: Infinity,
                                ease: "easeInOut",
                                repeatDelay: 1.5,
                              }}
                            />
                          </motion.div>
                        )}
                        
                        {/* XP text - dual layer for contrast */}
                        {/* Dark text layer (visible on grey background) */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="text-sm font-bold text-gray-700 drop-shadow-sm">
                            {levelInfo.xpInCurrentLevel} / {levelInfo.xpNeededForNextLevel} XP
                          </span>
                        </div>
                        
                        {/* White text layer - clipped to purple fill width */}
                        <motion.div 
                          className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
                          style={{ 
                            width: `${levelInfo.progress}%`,
                            minWidth: 0
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${levelInfo.progress}%` }}
                          transition={{ duration: 1, delay: 0.5 }}
                        >
                          <span 
                            className="text-sm font-bold text-white drop-shadow-md whitespace-nowrap"
                            style={{ 
                              width: '100%',
                              position: 'absolute',
                              left: 0,
                              right: 0,
                              textAlign: 'center',
                              minWidth: 300
                            }}
                          >
                            {levelInfo.xpInCurrentLevel} / {levelInfo.xpNeededForNextLevel} XP
                          </span>
                        </motion.div>
                      </div>
                      
                      {/* Power badges in a row below progress bar */}
                      <div 
                        className="flex items-center justify-center gap-2 mt-4 pointer-events-auto" 
                        data-walkthrough="powerups"
                      >
                        {(["fifty-fifty", "freeze", "replace", "time-drain", "add-power"] as const).map((type, index) => (
                          <motion.div
                            key={type}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.4 + index * 0.08, type: "spring", stiffness: 200 }}
                          >
                            <PowerUpBadge 
                              type={type} 
                              size="sm" 
                              index={index} 
                              count={type === "add-power" ? undefined : 3}
                              onClick={() => setSelectedPowerUp(type)}
                            />
                          </motion.div>
                        ))}
                      </div>
                    </>
                  )}
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Universal Bottom Navigation */}
        <UniversalBottomNav 
          onPlayClick={handlePlayClick} 
        />
      </div>
    </>
  );
}
