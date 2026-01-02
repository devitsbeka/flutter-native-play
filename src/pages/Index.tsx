import { useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { Bell, Menu, HelpCircle } from "lucide-react";
import giftBottleIcon from "@/assets/icons/icon-gift-bottle.png";
import missionCrystalIcon from "@/assets/icons/icon-mission-crystal.png";
import chestBoxIcon from "@/assets/icons/icon-chest-box.png";
import { ChestRewardModal } from "@/components/home/ChestRewardModal";
import { SideMenuDrawer } from "@/components/home/SideMenuDrawer";
import { DailyRewardsModal } from "@/components/home/DailyRewardsModal";
import { MissionsModal } from "@/components/home/MissionsModal";
import { LevelInfoModal } from "@/components/home/LevelInfoModal";
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
import { AdFreeModal } from "@/components/home/AdFreeModal";
import { GemShopModal } from "@/components/home/GemShopModal";

import { AdventureHelpModal } from "@/components/map/AdventureHelpModal";
import adFreeIcon from "@/assets/icons/icon-ad-free.png";
import gemIcon from "@/assets/icons/icon-gem.png";
import coinIcon from "@/assets/icons/icon-coin.png";
import xpIcon from "@/assets/icons/icon-xp.png";
import { AvatarModal } from "@/components/home/AvatarModal";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/lib/i18n";
import { UniversalBottomNav } from "@/components/layout/UniversalBottomNav";
import { useCurrency } from "@/hooks/useCurrency";

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
  const { coins, gems } = useCurrency();
  
  const [isChestModalOpen, setIsChestModalOpen] = useState(false);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [isSoundModalOpen, setIsSoundModalOpen] = useState(false);
  const [isDailyRewardsOpen, setIsDailyRewardsOpen] = useState(false);
  const [selectedPowerUp, setSelectedPowerUp] = useState<PowerUpType | null>(null);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isAdFreeModalOpen, setIsAdFreeModalOpen] = useState(false);
  const [isGemShopOpen, setIsGemShopOpen] = useState(false);
  const [showMissionsModal, setShowMissionsModal] = useState(false);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  
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
        onAddClick={() => navigate("/power-ups")}
      />
      <AvatarModal 
        isOpen={isAvatarModalOpen} 
        onClose={() => setIsAvatarModalOpen(false)} 
      />
      <AdFreeModal
        isOpen={isAdFreeModalOpen}
        onClose={() => setIsAdFreeModalOpen(false)}
      />
      <GemShopModal
        isOpen={isGemShopOpen}
        onClose={() => setIsGemShopOpen(false)}
      />
      <MissionsModal
        isOpen={showMissionsModal}
        onClose={() => setShowMissionsModal(false)}
      />
      <LevelInfoModal
        isOpen={showLevelModal}
        onClose={() => setShowLevelModal(false)}
        levelInfo={levelInfo}
        onContinue={() => {
          setShowLevelModal(false);
          navigate("/game");
        }}
      />
      <AdventureHelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
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
              <Menu className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-bold text-gray-700" style={{ fontFamily: "'Google Sans', sans-serif" }}>ᲛᲔᲜᲘᲣ</span>
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
              {/* Ad-Free button */}
              <motion.button
                className="relative p-1"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsAdFreeModalOpen(true)}
              >
                <img src={adFreeIcon} alt="Ad-Free" className="w-6 h-6 object-contain" />
              </motion.button>
              
              {/* Bell icon */}
              <motion.button
                className="relative p-1"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Bell className="w-5 h-5 text-gray-600" />
              </motion.button>
            </motion.div>
            
          </div>
        </header>

        {/* ===== CURRENCY ROW - Below Header ===== */}
        <div className="relative z-20 flex items-center justify-center gap-3 mt-4 px-4">
          {/* Coins - Green */}
          <motion.div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer"
            style={{
              background: "linear-gradient(180deg, #4ADE80 0%, #22C55E 50%, #16A34A 100%)",
              boxShadow: "inset 0 2px 4px rgba(255,255,255,0.3), 0 3px 0 #15803D, 0 4px 8px rgba(22,163,74,0.3)",
              border: "2px solid rgba(255,255,255,0.4)",
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsGemShopOpen(true)}
          >
            <img src={coinIcon} alt="Coins" className="w-5 h-5" />
            <span className="text-sm font-bold text-white drop-shadow-sm whitespace-nowrap">{coins.toLocaleString()}</span>
          </motion.div>

          {/* Gems - Purple */}
          <motion.div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer"
            style={{
              background: "linear-gradient(180deg, #C084FC 0%, #A855F7 50%, #9333EA 100%)",
              boxShadow: "inset 0 2px 4px rgba(255,255,255,0.3), 0 3px 0 #7E22CE, 0 4px 8px rgba(168,85,247,0.3)",
              border: "2px solid rgba(255,255,255,0.4)",
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsGemShopOpen(true)}
          >
            <img src={gemIcon} alt="Gems" className="w-5 h-5" />
            <span className="text-sm font-bold text-white drop-shadow-sm whitespace-nowrap">{gems.toLocaleString()}</span>
          </motion.div>

          {/* XP - Green with star */}
          <motion.div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              background: "linear-gradient(180deg, #4ADE80 0%, #22C55E 50%, #16A34A 100%)",
              boxShadow: "inset 0 2px 4px rgba(255,255,255,0.3), 0 3px 0 #15803D, 0 4px 8px rgba(22,163,74,0.3)",
              border: "2px solid rgba(255,255,255,0.4)",
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <img src={xpIcon} alt="XP" className="w-5 h-5" />
            <span className="text-sm font-bold text-white drop-shadow-sm whitespace-nowrap">{(profile?.total_points || 0).toLocaleString()}</span>
          </motion.div>
        </div>


        {/* ===== CENTER: AVATAR WITH ORBITING BUTTONS ===== */}
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none" style={{ marginTop: -80 }}>
          <motion.div 
            className="flex flex-col items-center w-full max-w-[360px] px-4"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            style={{ 
              transform: pullDistance > 0 ? `translateY(${pullDistance * 0.3}px)` : undefined 
            }}
          >
            {/* Avatar section with orbiting buttons */}
            <div className="relative">
              <motion.div 
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
                {/* Avatar */}
                <div 
                  data-walkthrough="avatar" 
                  className="pointer-events-auto cursor-pointer"
                  onClick={() => user && setIsAvatarModalOpen(true)}
                >
                  <AvatarCircle avatarUrl={profile?.avatar_url} size={200} level={levelInfo.level} />
                </div>
              </motion.div>

            </div>

            {/* User info section - below avatar */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="flex flex-col items-center mt-6 pointer-events-auto"
            >
              {isRefreshing ? (
                <Skeleton className="w-64 h-20 rounded-2xl bg-white/40" />
              ) : (
                <>
                  {/* Name and Flag row - level badge is now on avatar */}
                  <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                    <span className="font-display font-bold text-white drop-shadow-md" style={{ fontSize: 28 }}>
                      {profile?.nickname || t("game.guest")}
                    </span>
                    {profile?.country_code && (
                      <span className="text-xl">
                        {getFlagEmoji(profile.country_code)}
                      </span>
                    )}
                  </div>
                  
                  {/* 3D Chunky Progress bar */}
                  <div 
                    className="relative h-9 rounded-full overflow-hidden w-[280px] mt-4"
                    style={{
                      background: "linear-gradient(180deg, #F8F6FC 0%, #EDE8F5 50%, #E5DEF0 100%)",
                      boxShadow: "inset 0 4px 8px rgba(140,120,180,0.2), inset 0 -2px 4px rgba(255,255,255,0.8), 0 4px 0 #D8D0E8, 0 6px 12px rgba(0,0,0,0.1)",
                      border: "3px solid rgba(255,255,255,0.9)",
                    }}
                  >
                        {/* Dot indicators on the left */}
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex gap-1.5 z-10">
                          <div className="w-2 h-2 rounded-full bg-purple-400" />
                          <div className="w-2 h-2 rounded-full bg-purple-400" />
                          <div className="w-2 h-2 rounded-full bg-purple-400" />
                        </div>
                        
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
                        
                        {/* XP text - single layer with drop shadow for visibility */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                          <span className="text-sm font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                            {levelInfo.xpInCurrentLevel} / {levelInfo.xpNeededForNextLevel} XP
                          </span>
                        </div>
                      </div>
                      
                      {/* Action buttons row - Gift, Mission, Chest, Help */}
                      <div 
                        className="flex items-center justify-center gap-4 mt-6 pointer-events-auto" 
                        data-walkthrough="powerups"
                      >
                        {/* Gift Button */}
                        <motion.button
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                          onClick={() => setIsDailyRewardsOpen(true)}
                          className="relative w-14 h-14 rounded-full flex items-center justify-center"
                          style={{
                            background: "linear-gradient(180deg, #FFF7ED 0%, #FED7AA 100%)",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1), 0 3px 0 #FDBA74",
                            border: "3px solid rgba(255,255,255,0.9)",
                          }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <img src={giftBottleIcon} alt="Gift" className="w-8 h-8 object-contain" />
                          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center shadow-md">1</span>
                        </motion.button>

                        {/* Mission Button */}
                        <motion.button
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.48, type: "spring", stiffness: 200 }}
                          onClick={() => setShowMissionsModal(true)}
                          className="relative w-14 h-14 rounded-full flex items-center justify-center"
                          style={{
                            background: "linear-gradient(180deg, #E0F2FE 0%, #BAE6FD 100%)",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1), 0 3px 0 #7DD3FC",
                            border: "3px solid rgba(255,255,255,0.9)",
                          }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <img src={missionCrystalIcon} alt="Mission" className="w-8 h-8 object-contain" />
                          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-sky-500 text-white text-xs font-bold flex items-center justify-center shadow-md">2</span>
                        </motion.button>

                        {/* Chest Button */}
                        <motion.button
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.56, type: "spring", stiffness: 200 }}
                          onClick={() => setIsChestModalOpen(true)}
                          className="relative w-14 h-14 rounded-full flex items-center justify-center"
                          style={{
                            background: "linear-gradient(180deg, #FEF3C7 0%, #FDE68A 100%)",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1), 0 3px 0 #FCD34D",
                            border: "3px solid rgba(255,255,255,0.9)",
                          }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <img src={chestBoxIcon} alt="Chest" className="w-8 h-8 object-contain" />
                          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center shadow-md">1</span>
                        </motion.button>

                        {/* Help Button */}
                        <motion.button
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.64, type: "spring", stiffness: 200 }}
                          onClick={() => setShowHelpModal(true)}
                          className="w-14 h-14 rounded-full flex items-center justify-center"
                          style={{
                            background: "linear-gradient(180deg, #FFFFFF 0%, #F3F4F6 100%)",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1), 0 3px 0 #D1D5DB",
                            border: "3px solid rgba(255,255,255,0.9)",
                          }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <span className="text-2xl font-bold" style={{ color: "#7C3AED" }}>?</span>
                        </motion.button>
                      </div>
                    </>
                  )}
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
