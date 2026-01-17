import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MainLayout } from "@/components/layout/MainLayout";
import { Bell, Check, Clock } from "lucide-react";
import SpotlightSearch from "@/components/search/SpotlightSearch";
import giftBottleIcon from "@/assets/icons/icon-coin-purse.png";
import missionCrystalIcon from "@/assets/icons/icon-mission-crystal.png";
import chestBoxIcon from "@/assets/icons/icon-chest-box.png";
import powersIcon from "@/assets/icons/icon-powers.png";
import { ChestRewardModal } from "@/components/home/ChestRewardModal";
import { SideMenuDrawer } from "@/components/home/SideMenuDrawer";
import { DailyRewardsModal } from "@/components/home/DailyRewardsModal";
import { MissionsModal } from "@/components/home/MissionsModal";
import { LevelInfoModal } from "@/components/home/LevelInfoModal";
import { NotEnoughCoinsModal } from "@/components/home/NotEnoughCoinsModal";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { calculateLevel } from "@/utils/levelCalculation";
import { PowerUpBadge } from "@/components/game/PowerUpBadge";
import { PowerUpDetailModal, PowerUpType } from "@/components/game/PowerUpDetailModal";
import { SignupOnboardingModal } from "@/components/onboarding/SignupOnboardingModal";
import { AvatarCreationFlow } from "@/components/onboarding/AvatarCreationFlow";
import { AvatarCircle } from "@/components/home/AvatarCircle";
import { DesktopActionCards } from "@/components/home/DesktopActionCards";
import { DesktopPlayButtonLarge } from "@/components/home/DesktopPlayButtonLarge";

import { SoundSettingsModal } from "@/components/home/SoundSettingsModal";
import { AdFreeModal } from "@/components/home/AdFreeModal";
import { GemShopModal } from "@/components/home/GemShopModal";
import { MyPowersModal } from "@/components/home/MyPowersModal";
import { ActionButtonWithParticles } from "@/components/home/ActionButtonWithParticles";
import { GuestMaxPlaysModal } from "@/components/home/GuestMaxPlaysModal";
import { useGameStake } from "@/hooks/useGameStake";
import { REWARDS } from "@/config/rewardConfig";

import adFreeIcon from "@/assets/icons/icon-ad-free.png";
import gemIcon from "@/assets/icons/icon-gem.png";
import coinIcon from "@/assets/icons/icon-coin.png";
import defaultGuestAvatar from "@/assets/avatars/bot-avatar-1.png";
import { AvatarModal } from "@/components/home/AvatarModal";

import { t } from "@/lib/i18n";
import { UniversalBottomNav } from "@/components/layout/UniversalBottomNav";
import { DesktopRightSidebarWidgets } from "@/components/home/DesktopSidebars";
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
import { 
  getGuestPlaysRemaining, 
  recordGuestPlay, 
  hasReachedGuestPlayLimit,
  MAX_GUEST_PLAYS_COUNT 
} from "@/hooks/useGuestPlays";

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
  const { step, startOnboarding, skipToAvatarCreation, setStep, hasCompletedOnboarding } = useOnboarding();
  const { coins, gems, addCoins, spendGems } = useCurrency();
  const { powerUps } = useUserPowerUps();
  const { totalStars } = useTotalStars();
  const { canClaimDaily, canClaimChest } = useRewardTimers();
  const { missions, completedCount, totalCount } = useMissions();
  const { playsRemaining, maxPlays, canPlay, isVip, vipLoading, recordPlay, watchAdForPlays } = useDailyPlays();
  const { unreadCount } = useNotifications();
  const { hasEnoughCoins, stakeAmount } = useGameStake();
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
  const [showGuestMaxPlaysModal, setShowGuestMaxPlaysModal] = useState(false);
  const [showNotEnoughCoinsModal, setShowNotEnoughCoinsModal] = useState(false);
  
  // Guest play tracking
  const guestPlaysRemaining = !user ? getGuestPlaysRemaining() : 0;
  

  // Handle play button click - check auth status and plays remaining
  const handlePlayClick = useCallback(async () => {
    if (!user) {
      // Guest user - check if they have plays remaining
      if (hasReachedGuestPlayLimit()) {
        // Show modal to register
        setShowGuestMaxPlaysModal(true);
      } else {
        // Record guest play and navigate to game
        const canPlayGuest = recordGuestPlay();
        if (canPlayGuest) {
          navigate("/game");
        } else {
          setShowGuestMaxPlaysModal(true);
        }
      }
    } else if (!profile?.avatar_url) {
      // Logged in but no avatar - go to avatar creation
      skipToAvatarCreation();
    } else {
      // Check if user has enough coins for stake
      if (!hasEnoughCoins) {
        setShowNotEnoughCoinsModal(true);
        return;
      }
      
      // Check if user can play (daily limit)
      const canPlayGame = await recordPlay();
      if (canPlayGame) {
        navigate("/game");
      }
    }
  }, [user, profile, navigate, skipToAvatarCreation, hasCompletedOnboarding, setStep, recordPlay, isVip, canPlay, hasEnoughCoins]);

  // Handle exchange gems for coins
  const handleExchangeGems = useCallback(async () => {
    const gemsNeeded = Math.ceil((stakeAmount - coins) / REWARDS.GEM_TO_COINS_RATE);
    if (gems >= gemsNeeded) {
      const coinsToAdd = gemsNeeded * REWARDS.GEM_TO_COINS_RATE;
      const success = await spendGems(gemsNeeded);
      if (success) {
        await addCoins(coinsToAdd);
        setShowNotEnoughCoinsModal(false);
      }
    }
  }, [stakeAmount, coins, gems, spendGems, addCoins]);

  // Handle watch ad for coins
  const handleWatchAdForCoins = useCallback(async () => {
    // In a real implementation, this would show an ad and then add coins
    await addCoins(REWARDS.AD_WATCH_COINS);
    setShowNotEnoughCoinsModal(false);
  }, [addCoins]);

  const gamesWon = profile?.games_won || 0;
  const currentStreak = profile?.current_streak || 0;
  const levelInfo = calculateLevel(profile?.total_points || 0);

  return (
    <>
      {/* Onboarding modals */}
      <SignupOnboardingModal />
      <AvatarCreationFlow />
      
      
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
      <GuestMaxPlaysModal
        isOpen={showGuestMaxPlaysModal}
        onClose={() => setShowGuestMaxPlaysModal(false)}
        onRegister={() => {
          setShowGuestMaxPlaysModal(false);
          startOnboarding();
        }}
      />
      <NotEnoughCoinsModal
        isOpen={showNotEnoughCoinsModal}
        onClose={() => setShowNotEnoughCoinsModal(false)}
        currentCoins={coins}
        requiredCoins={stakeAmount}
        userGems={gems}
        onWatchAd={handleWatchAdForCoins}
        onExchangeGems={handleExchangeGems}
        onOpenDailyRewards={() => {
          setShowNotEnoughCoinsModal(false);
          setIsDailyRewardsOpen(true);
        }}
      />
      {/* Main layout with desktop navigation */}
      <MainLayout
        onPlayClick={handlePlayClick}
        playsRemaining={user ? playsRemaining : guestPlaysRemaining}
        maxPlays={user ? maxPlays : MAX_GUEST_PLAYS_COUNT}
        canPlay={user ? canPlay : guestPlaysRemaining > 0}
        isVip={isVip}
        showPlayButton={true}
        showBottomNav={!isSideMenuOpen}
      >
        <div className="min-h-screen flex flex-col w-full relative">
        <header className="relative z-20 px-4 py-3 safe-top border-b border-purple-900/10">
          <div className="flex items-center justify-between">
            {/* Spotlight Search Bar */}
            <SpotlightSearch />
            
            {/* Notification icons */}
            <div className="flex items-center gap-1">
              {/* Ad-Free button */}
              <motion.button
                className="relative p-2 rounded-full hover:bg-white/30 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsAdFreeModalOpen(true)}
              >
                <img src={adFreeIcon} alt="Ad-Free" className="w-6 h-6 object-contain" />
              </motion.button>
              
              {/* Bell icon with unread badge */}
              <motion.button
                className="relative p-2 rounded-full hover:bg-white/30 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate('/notifications')}
              >
                <Bell className="w-5 h-5 text-gray-600" />
                {unreadCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center"
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
            </div>
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 flex relative">
          {/* Action Cards - Fixed Right Side Panel (Desktop only) */}
          {user && (
            <motion.div 
              className="hidden md:flex fixed right-4 lg:right-6 xl:right-8 top-20 z-20 pointer-events-auto"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <DesktopActionCards
                onDailyRewardsClick={() => setIsDailyRewardsOpen(true)}
                onMissionsClick={() => setShowMissionsModal(true)}
                onChestClick={() => setIsChestModalOpen(true)}
                onPowersClick={() => setShowMyPowersModal(true)}
                vertical
              />
            </motion.div>
          )}

          {/* Main content area */}
          <div className="flex-1 relative h-[calc(100vh-60px)] lg:h-screen overflow-hidden">
            {/* ===== CENTER: AVATAR WITH ORBITING BUTTONS ===== */}
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none md:pr-[280px]">
            
            {/* xl+ layout: Cards moved to fixed right side */}

            {/* md to xl layout: Avatar centered (cards now fixed on right side) */}
            <div className="hidden md:flex xl:hidden items-center justify-center w-full px-4">
              {/* Avatar + Info */}
              <motion.div 
                className="flex flex-col items-center"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, type: "spring" }}
              >
                <div className="relative">
                  <motion.div 
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <div 
                      data-walkthrough="avatar" 
                      className="pointer-events-auto cursor-pointer"
                      onClick={() => user && setIsAvatarModalOpen(true)}
                    >
                      <AvatarCircle 
                        avatarUrl={user ? profile?.avatar_url : defaultGuestAvatar} 
                        animatedAvatarUrl={user ? profile?.animated_avatar_url : undefined}
                        size={260} 
                        coins={user ? coins : 0}
                        gems={user ? gems : 0}
                        level={user ? levelInfo.level : 1}
                        xpProgress={user ? levelInfo.progress : 0}
                        xpCurrent={user ? levelInfo.xpInCurrentLevel : 0}
                        xpTotal={user ? levelInfo.xpNeededForNextLevel : 100}
                      />
                    </div>
                  </motion.div>
                </div>
                {/* User info below avatar */}
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="flex flex-col items-center mt-8 pointer-events-auto"
                >
                  <div className="flex items-center justify-center gap-2.5">
                    {user && profile?.country_code && (
                      <FlagIcon countryCode={profile.country_code} size="md" />
                    )}
                    <span className="font-slackey text-gray-800 capitalize" style={{ fontSize: 28 }}>
                      {user ? (profile?.nickname || t("game.guest")) : "Trivia Guru"}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 mt-1">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center bg-white/90" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                        <img src={coinIcon} alt="Coins" className="w-9 h-9" />
                      </div>
                      <span className="font-bold text-gray-700 text-base">
                        {user ? (coins >= 1000 ? `${Math.floor(coins / 1000)}K` : coins) : 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center bg-white/90" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                        <img src={gemIcon} alt="Gems" className="w-9 h-9" />
                      </div>
                      <span className="font-bold text-gray-700 text-base">
                        {user ? (gems >= 1000 ? `${Math.floor(gems / 1000)}K` : gems) : 0}
                      </span>
                    </div>
                  </div>
                  <div className="mt-5">
                    <DesktopPlayButtonLarge
                      onClick={handlePlayClick}
                      playsRemaining={user ? playsRemaining : guestPlaysRemaining}
                      maxPlays={user ? maxPlays : MAX_GUEST_PLAYS_COUNT}
                      canPlay={user ? canPlay : guestPlaysRemaining > 0}
                      isVip={isVip}
                    />
                  </div>
                </motion.div>
              </motion.div>

            </div>

            {/* xl+ layout: Avatar centered */}
            <motion.div 
              className="hidden xl:flex flex-col items-center w-full px-4"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, type: "spring" }}
            >
              <div className="relative">
                <motion.div 
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div 
                    data-walkthrough="avatar" 
                    className="pointer-events-auto cursor-pointer"
                    onClick={() => user && setIsAvatarModalOpen(true)}
                  >
                    <AvatarCircle 
                      avatarUrl={user ? profile?.avatar_url : defaultGuestAvatar} 
                      animatedAvatarUrl={user ? profile?.animated_avatar_url : undefined}
                      size={280} 
                      coins={user ? coins : 0}
                      gems={user ? gems : 0}
                      level={user ? levelInfo.level : 1}
                      xpProgress={user ? levelInfo.progress : 0}
                      xpCurrent={user ? levelInfo.xpInCurrentLevel : 0}
                      xpTotal={user ? levelInfo.xpNeededForNextLevel : 100}
                    />
                  </div>
                </motion.div>
              </div>

              {/* User info section */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="flex flex-col items-center mt-11 pointer-events-auto"
              >
                <div className="flex items-center justify-center gap-2.5">
                  {user && profile?.country_code && (
                    <FlagIcon countryCode={profile.country_code} size="md" />
                  )}
                  <span className="font-slackey text-gray-800 capitalize" style={{ fontSize: 32 }}>
                    {user ? (profile?.nickname || t("game.guest")) : "Trivia Guru"}
                  </span>
                </div>
                
                <div className="flex items-center gap-6 mt-1">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/90" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                      <img src={coinIcon} alt="Coins" className="w-10 h-10" />
                    </div>
                    <span className="font-bold text-gray-700 text-lg">
                      {user ? (coins >= 1000000 ? `${(coins / 1000000).toFixed(1)}M` : coins >= 1000 ? `${Math.floor(coins / 1000)}K` : coins) : 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/90" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                      <img src={gemIcon} alt="Gems" className="w-10 h-10" />
                    </div>
                    <span className="font-bold text-gray-700 text-lg">
                      {user ? (gems >= 1000000 ? `${(gems / 1000000).toFixed(1)}M` : gems >= 1000 ? `${Math.floor(gems / 1000)}K` : gems) : 0}
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  <DesktopPlayButtonLarge
                    onClick={handlePlayClick}
                    playsRemaining={user ? playsRemaining : guestPlaysRemaining}
                    maxPlays={user ? maxPlays : MAX_GUEST_PLAYS_COUNT}
                    canPlay={user ? canPlay : guestPlaysRemaining > 0}
                    isVip={isVip}
                  />
                </div>
              </motion.div>
            </motion.div>

            {/* Mobile only: circular action buttons + avatar + info */}
            <motion.div 
              className="md:hidden flex flex-col items-center w-full max-w-[360px] px-4"
              style={{ marginTop: -80 }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, type: "spring" }}
            >
              <div className="relative">
                {/* Mobile: Show curved action buttons above avatar */}
                {user && (
                  <div 
                    className="absolute left-1/2 -translate-x-1/2 flex items-end justify-center gap-2 pointer-events-auto z-20"
                    style={{ top: -75, width: 340 }}
                    data-walkthrough="powerups"
                  >
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
                          )
                        }
                      />
                    </motion.div>

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

                <motion.div 
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  style={{ marginTop: 15 }}
                >
                  <div 
                    data-walkthrough="avatar" 
                    className="pointer-events-auto cursor-pointer"
                    onClick={() => user && setIsAvatarModalOpen(true)}
                  >
                    <AvatarCircle 
                      avatarUrl={user ? profile?.avatar_url : defaultGuestAvatar} 
                      animatedAvatarUrl={user ? profile?.animated_avatar_url : undefined}
                      size={280} 
                      coins={user ? coins : 0}
                      gems={user ? gems : 0}
                      level={user ? levelInfo.level : 1}
                      xpProgress={user ? levelInfo.progress : 0}
                      xpCurrent={user ? levelInfo.xpInCurrentLevel : 0}
                      xpTotal={user ? levelInfo.xpNeededForNextLevel : 100}
                    />
                  </div>
                </motion.div>
              </div>

              {/* User info section */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="flex flex-col items-center mt-8 pointer-events-auto"
              >
                <div className="flex items-center justify-center gap-2.5">
                  {user && profile?.country_code && (
                    <FlagIcon countryCode={profile.country_code} size="md" />
                  )}
                  <span className="font-slackey text-gray-800 capitalize" style={{ fontSize: 32 }}>
                    {user ? (profile?.nickname || t("game.guest")) : "Trivia Guru"}
                  </span>
                </div>
                
                <div className="flex items-center gap-6 mt-1">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/90" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                      <img src={coinIcon} alt="Coins" className="w-10 h-10" />
                    </div>
                    <span className="font-bold text-gray-700 text-lg">
                      {user ? (coins >= 1000000 ? `${(coins / 1000000).toFixed(1)}M` : coins >= 1000 ? `${Math.floor(coins / 1000)}K` : coins) : 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/90" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                      <img src={gemIcon} alt="Gems" className="w-10 h-10" />
                    </div>
                    <span className="font-bold text-gray-700 text-lg">
                      {user ? (gems >= 1000000 ? `${(gems / 1000000).toFixed(1)}M` : gems >= 1000 ? `${Math.floor(gems / 1000)}K` : gems) : 0}
                    </span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
        </div>
          </div>

          {/* Right Sidebar - desktop only (xl+) */}
          <aside className="hidden xl:flex flex-col w-[320px] min-w-[320px] h-[calc(100vh-60px)] lg:h-screen sticky top-0 p-4 overflow-y-auto scrollbar-hide">
            <DesktopRightSidebarWidgets />
          </aside>
        </div>
        </div>
      </MainLayout>
    </>
  );
}
