import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Menu, Check, Clock } from "lucide-react";
import giftBottleIcon from "@/assets/icons/icon-gem.png";
import missionCrystalIcon from "@/assets/icons/icon-mission-crystal.png";
import chestBoxIcon from "@/assets/icons/icon-chest-box.png";
import powersIcon from "@/assets/icons/icon-powers.png";
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
import { MyPowersModal } from "@/components/home/MyPowersModal";
import { ActionButtonWithParticles } from "@/components/home/ActionButtonWithParticles";
import { GuestActivationFlow } from "@/components/home/GuestActivationFlow";


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
import { useUserPowerUps } from "@/hooks/useUserPowerUps";
import { useTotalStars } from "@/hooks/useTotalStars";
import { FlagIcon } from "@/components/shared/FlagIcon";
import { useRewardTimers } from "@/hooks/useRewardTimers";
import { useMissions } from "@/hooks/useMissions";
import { useDailyPlays } from "@/hooks/useDailyPlays";
import { WatchAdModal } from "@/components/home/WatchAdModal";
import { useNotifications } from "@/hooks/useNotifications";
import { useRewardTimers as useRewardTimersWithTime } from "@/hooks/useRewardTimers";

// Theme colors (background now comes from global Spline)
const theme = {
  accent: "#9C6ADE",
  accentDark: "#7B4BBF",
};

// Chest button countdown badge component
const ChestButtonBadge = ({ canClaimChest }: { canClaimChest: boolean }) => {
  const { chestTimeLeft } = useRewardTimersWithTime();
  
  if (canClaimChest) {
    return (
      <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md z-20">
        <Check className="w-3.5 h-3.5" />
      </span>
    );
  }
  
  return (
    <motion.div
      className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-lg z-20"
      style={{
        background: "linear-gradient(180deg, #FEF3C7 0%, #FCD34D 100%)",
        boxShadow: "0 2px 8px rgba(252, 211, 77, 0.5)",
        border: "2px solid white",
      }}
      animate={{ scale: [1, 1.1, 1] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <Clock className="w-3.5 h-3.5 text-amber-700" />
    </motion.div>
  );
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
  const { powerUps } = useUserPowerUps();
  const { totalStars } = useTotalStars();
  const { canClaimDaily, canClaimChest } = useRewardTimers();
  const { missions, completedCount, totalCount } = useMissions();
  const { playsRemaining, maxPlays, canPlay, isVip, recordPlay, watchAdForPlays } = useDailyPlays();
  const { unreadCount } = useNotifications();
  const totalPowerUps = Object.values(powerUps).reduce((sum, count) => sum + count, 0);
  
  // Calculate incomplete missions count
  const incompleteMissions = totalCount - completedCount;
  
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
  const [showMyPowersModal, setShowMyPowersModal] = useState(false);
  const [showWatchAdModal, setShowWatchAdModal] = useState(false);
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

  // Handle play button click - check auth status and plays remaining
  const handlePlayClick = useCallback(async () => {
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
      // Check if user can play
      const canPlayGame = await recordPlay();
      if (canPlayGame) {
        navigate("/game");
      }
    }
  }, [user, profile, navigate, startOnboarding, skipToAvatarCreation, needsWalkthrough, hasCompletedOnboarding, setStep, recordPlay]);

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
      <MyPowersModal
        isOpen={showMyPowersModal}
        onClose={() => setShowMyPowersModal(false)}
      />
      <WatchAdModal
        isOpen={showWatchAdModal}
        onClose={() => setShowWatchAdModal(false)}
        onWatchAd={watchAdForPlays}
        playsRemaining={playsRemaining}
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
                background: "linear-gradient(180deg, #FFFFFF 0%, #FEFEFE 100%)",
                boxShadow: "0 4px 0 #D8D0E8, 0 6px 16px rgba(0,0,0,0.12), inset 0 2px 0 rgba(255,255,255,1)",
                border: "2px solid #E8E0F5",
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
                background: "linear-gradient(180deg, #FFFFFF 0%, #FEFEFE 100%)",
                boxShadow: "0 4px 0 #D8D0E8, 0 6px 16px rgba(0,0,0,0.12), inset 0 2px 0 rgba(255,255,255,1)",
                border: "2px solid #E8E0F5",
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
              
              {/* Bell icon with unread badge */}
              <motion.button
                className="relative p-1"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate('/notifications')}
              >
                <Bell className="w-5 h-5 text-gray-600" />
                {unreadCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center"
                    style={{
                      background: "linear-gradient(180deg, #A855F7 0%, #9333EA 100%)",
                      boxShadow: "0 2px 4px rgba(168, 85, 247, 0.5)",
                    }}
                  >
                    <span className="text-[9px] font-bold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  </motion.div>
                )}
              </motion.button>
            </motion.div>
            
          </div>
        </header>



        {/* ===== CENTER: AVATAR WITH ORBITING BUTTONS ===== */}
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none" style={{ marginTop: 10 }}>
          <motion.div 
            className="flex flex-col items-center w-full max-w-[360px] px-4"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            style={{ 
              transform: pullDistance > 0 ? `translateY(${pullDistance * 0.3}px)` : undefined 
            }}
          >
            {/* Avatar section with curved action buttons above (only for logged-in users) */}
            <div className="relative">
              {/* Curved action buttons above avatar - ONLY show for logged-in users */}
              {user && (
                <div 
                  className="absolute left-1/2 -translate-x-1/2 flex items-end justify-center gap-2 pointer-events-auto z-20"
                  style={{ 
                    top: -75,
                    width: 340,
                  }}
                  data-walkthrough="powerups"
                >
                  {/* Gift Button - leftmost, lower */}
                  <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3, type: "spring" }}
                    style={{ marginBottom: 0 }}
                  >
                    <ActionButtonWithParticles
                      iconSrc={giftBottleIcon}
                      alt="Gift"
                      onClick={() => setIsDailyRewardsOpen(true)}
                      background="linear-gradient(180deg, #FFF7ED 0%, #FED7AA 100%)"
                      shadowColor="#FDBA74"
                      delay={0.4}
                      particleColor="rgba(253, 186, 116, 0.9)"
                      glowColor="rgba(253, 186, 116, 0.5)"
                      idleOffset={0}
                      size={62}
                      badge={
                        canClaimDaily ? (
                          <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md z-20">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-gray-600 text-white text-[9px] font-bold flex items-center gap-0.5 shadow-md z-20">
                            <Clock className="w-2.5 h-2.5" />
                          </span>
                        )
                      }
                    />
                  </motion.div>

                  {/* Mission Button - left-center, much higher for curve */}
                  <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.35, type: "spring" }}
                    style={{ marginBottom: 32 }}
                  >
                    <ActionButtonWithParticles
                      iconSrc={missionCrystalIcon}
                      alt="Mission"
                      onClick={() => setShowMissionsModal(true)}
                      background="linear-gradient(180deg, #E0F2FE 0%, #BAE6FD 100%)"
                      shadowColor="#7DD3FC"
                      delay={0.48}
                      particleColor="rgba(125, 211, 252, 0.9)"
                      glowColor="rgba(125, 211, 252, 0.5)"
                      idleOffset={0.7}
                      size={62}
                      badge={
                        incompleteMissions > 0 ? (
                          <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-sky-500 text-white text-xs font-bold flex items-center justify-center shadow-md z-20">
                            {incompleteMissions}
                          </span>
                        ) : (
                          <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md z-20">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )
                      }
                    />
                  </motion.div>

                  {/* Chest Button - right-center, much higher for curve */}
                  <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.4, type: "spring" }}
                    style={{ marginBottom: 32 }}
                  >
                    <ActionButtonWithParticles
                      iconSrc={chestBoxIcon}
                      alt="Chest"
                      onClick={() => setIsChestModalOpen(true)}
                      background="linear-gradient(180deg, #E8FFE6 0%, #D9FFD7 100%)"
                      shadowColor="#A7D9A5"
                      delay={0.56}
                      particleColor="rgba(169, 217, 167, 0.9)"
                      glowColor="rgba(169, 217, 167, 0.5)"
                      idleOffset={1.4}
                      size={62}
                      badge={<ChestButtonBadge canClaimChest={canClaimChest} />}
                    />
                  </motion.div>

                  {/* Powers Button - rightmost, lower */}
                  <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.45, type: "spring" }}
                    style={{ marginBottom: 0 }}
                  >
                    <ActionButtonWithParticles
                      iconSrc={powersIcon}
                      alt="Powers"
                      onClick={() => setShowMyPowersModal(true)}
                      background="linear-gradient(180deg, #EDE9FE 0%, #DDD6FE 100%)"
                      shadowColor="#C4B5FD"
                      delay={0.64}
                      particleColor="rgba(196, 181, 253, 0.9)"
                      glowColor="rgba(196, 181, 253, 0.5)"
                      idleOffset={2.1}
                      size={62}
                      badge={
                        totalPowerUps > 0 ? (
                          <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-purple-500 text-white text-xs font-bold flex items-center justify-center shadow-md z-20">
                            {totalPowerUps}
                          </span>
                        ) : undefined
                      }
                    />
                  </motion.div>
                </div>
              )}
              
              {/* Guest activation flow - show ABOVE avatar for logged-out users */}
              {!user && (
                <div 
                  className="absolute left-1/2 -translate-x-1/2 pointer-events-auto z-20"
                  style={{ top: -100, width: 340 }}
                >
                  <GuestActivationFlow />
                </div>
              )}

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
                  marginTop: 15,
                }}
              >
                {/* Avatar */}
                <div 
                  data-walkthrough="avatar" 
                  className="pointer-events-auto cursor-pointer"
                  onClick={() => user && setIsAvatarModalOpen(true)}
                >
                  <AvatarCircle 
                    avatarUrl={profile?.avatar_url} 
                    animatedAvatarUrl={profile?.animated_avatar_url}
                    size={280} 
                    coins={coins}
                    gems={gems}
                    level={levelInfo.level}
                    xpProgress={levelInfo.progress}
                    xpCurrent={levelInfo.xpInCurrentLevel}
                    xpTotal={levelInfo.xpNeededForNextLevel}
                  />
                </div>
              </motion.div>

            </div>

            {/* User info section - below avatar */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="flex flex-col items-center mt-11 pointer-events-auto"
            >
              {isRefreshing ? (
                <Skeleton className="w-64 h-20 rounded-2xl bg-white/40" />
              ) : (
                <>
                  {/* Flag and Name */}
                  <div className="flex items-center justify-center gap-2.5">
                    {profile?.country_code && (
                      <FlagIcon countryCode={profile.country_code} size="md" />
                    )}
                    <span className="font-slackey text-gray-800 capitalize" style={{ fontSize: 32 }}>
                      {profile?.nickname || t("game.guest")}
                    </span>
                  </div>
                  
                  {/* Coins & Gems */}
                  <div className="flex items-center gap-6 mt-1">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-white/90"
                        style={{
                          boxShadow: "0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
                        }}
                      >
                        <img src={coinIcon} alt="Coins" className="w-10 h-10" />
                      </div>
                      <span className="font-bold text-gray-700 text-lg">
                        {coins >= 1000000 ? `${(coins / 1000000).toFixed(1)}M` : coins >= 1000 ? `${Math.floor(coins / 1000)}K` : coins}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-white/90"
                        style={{
                          boxShadow: "0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
                        }}
                      >
                        <img src={gemIcon} alt="Gems" className="w-10 h-10" />
                      </div>
                      <span className="font-bold text-gray-700 text-lg">
                        {gems >= 1000000 ? `${(gems / 1000000).toFixed(1)}M` : gems >= 1000 ? `${Math.floor(gems / 1000)}K` : gems}
                      </span>
                    </div>
                  </div>
                </>
              )}
                </motion.div>
          </motion.div>
        </div>

        {/* Universal Bottom Navigation */}
        <UniversalBottomNav 
          onPlayClick={handlePlayClick}
          playsRemaining={playsRemaining}
          maxPlays={maxPlays}
          canPlay={canPlay}
          isVip={isVip}
          onWatchAdClick={() => setShowWatchAdModal(true)}
        />
      </div>
    </>
  );
}
