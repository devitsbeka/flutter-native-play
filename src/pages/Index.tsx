import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MainLayout } from "@/components/layout/MainLayout";
import { Bell, Check, Clock, Menu, MessageCircle } from "lucide-react";
import { useUnreadRoomMessages } from "@/hooks/useUnreadRoomMessages";
import { RoomChatsPanel } from "@/components/team/RoomChatsPanel";
import SpotlightSearch from "@/components/search/SpotlightSearch";
import { MyTriviaLiveLogo } from "@/components/shared/MyTriviaLiveLogo";
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
import defaultGuestAvatar from "@/assets/guest-avatar.png";
import defaultGuestAvatarAnimated from "@/assets/guest-avatar-animated.mp4";
import { useAvatarModal } from "@/contexts/AvatarModalContext";
import { HandDrawnArrow } from "@/components/shared/HandDrawnArrow";
import { GuestWelcomePanel } from "@/components/home/GuestWelcomePanel";
import { DesktopGuestSplitLayout } from "@/components/home/DesktopGuestSplitLayout";
import { lovable } from "@/integrations/lovable";

import { t } from "@/lib/i18n";
import { formatCompactNumber } from "@/lib/utils";
import { UniversalBottomNav } from "@/components/layout/UniversalBottomNav";
import { DesktopRightSidebarWidgets } from "@/components/home/DesktopSidebars";
import { useCurrency } from "@/hooks/useCurrency";
import { useUserPowerUps } from "@/hooks/useUserPowerUps";
import { useTotalStars } from "@/hooks/useTotalStars";
import { getCountryFlag } from "@/data/opponents";
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
  const { profile, user, fetchProfile, signUp, signUpWithUsername, signIn, signInWithUsername, signInWithGoogle, signInWithApple } = useAuth();
  const { step, startOnboarding, setStep, hasCompletedOnboarding } = useOnboarding();
  const { openAvatarModal } = useAvatarModal();
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
  const [isAdFreeModalOpen, setIsAdFreeModalOpen] = useState(false);
  const [isGemShopOpen, setIsGemShopOpen] = useState(false);
  const [showMissionsModal, setShowMissionsModal] = useState(false);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [showMyPowersModal, setShowMyPowersModal] = useState(false);
  const [showWatchAdModal, setShowWatchAdModal] = useState(false);
  const [showGuestMaxPlaysModal, setShowGuestMaxPlaysModal] = useState(false);
  const [showNotEnoughCoinsModal, setShowNotEnoughCoinsModal] = useState(false);
  const [showRoomChatsPanel, setShowRoomChatsPanel] = useState(false);
  const { totalUnread: unreadMessagesCount } = useUnreadRoomMessages();
  
  // Guest play tracking
  const guestPlaysRemaining = !user ? getGuestPlaysRemaining() : 0;
  
  // Auth loading state for GuestWelcomePanel
  const [isAuthLoading, setIsAuthLoading] = useState(false);


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
      // Logged in but no avatar - open polished avatar modal
      openAvatarModal();
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
  }, [user, profile, navigate, openAvatarModal, hasCompletedOnboarding, setStep, recordPlay, isVip, canPlay, hasEnoughCoins]);

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

  // Guest welcome panel handlers
  const handleGuestCreateAccount = useCallback(async (username: string, password: string) => {
    setIsAuthLoading(true);
    try {
      const { error } = await signUpWithUsername(username, password);
      if (error) throw error;
    } finally {
      setIsAuthLoading(false);
    }
  }, [signUpWithUsername]);

  const handleGuestSignIn = useCallback(async (usernameOrEmail: string, password: string) => {
    setIsAuthLoading(true);
    try {
      // Detect if input is an email (contains @) or username
      const isEmail = usernameOrEmail.includes('@');
      
      let error;
      if (isEmail) {
        // Real email - use standard signIn
        const result = await signIn(usernameOrEmail, password);
        error = result.error;
        if (!error) {
          // Store email for "returning user" detection
          localStorage.setItem('lastLoginEmail', usernameOrEmail);
        }
      } else {
        // Username - use pseudo-email signIn
        const result = await signInWithUsername(usernameOrEmail, password);
        error = result.error;
      }
      
      if (error) throw error;
    } finally {
      setIsAuthLoading(false);
    }
  }, [signIn, signInWithUsername]);

  const handleGuestGoogleSignIn = useCallback(async () => {
    setIsAuthLoading(true);
    try {
      await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  const handleGuestAppleSignIn = useCallback(async () => {
    setIsAuthLoading(true);
    try {
      await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: window.location.origin,
      });
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  const gamesWon = profile?.games_won || 0;
  const currentStreak = profile?.current_streak || 0;
  const levelInfo = calculateLevel(profile?.total_points || 0);

  return (
    <>
      {/* Onboarding modals */}
      <SignupOnboardingModal />
      
      
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
        isGuest={!user}
        showPlayButton={true}
        showBottomNav={!isSideMenuOpen}
        disableScroll
      >
        <div className="h-full flex flex-col w-full relative overflow-hidden md:overflow-visible">
        <header className="relative z-20 px-4 py-3 safe-top border-b border-purple-900/10">
          <div className="flex items-center justify-between gap-3">
            {/* Left side: Burger menu (mobile only) - Hidden for guests */}
            <div className="flex items-center gap-2">
              {/* Burger Menu - Mobile Only, Hidden for Guests */}
              {user && (
                <motion.button
                  className="md:hidden p-2 rounded-full hover:bg-white/30 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsSideMenuOpen(true)}
                >
                  <Menu className="w-6 h-6 text-gray-600" />
                </motion.button>
              )}
            </div>
            
            {/* Center: Logo + Spotlight */}
            <div className="flex-1 flex justify-center md:justify-start items-center gap-4">
              {/* Logo - responsive sizing: sm on mobile/tablet, md on desktop */}
              <MyTriviaLiveLogo responsive />
            </div>
            
            {/* Right side: Search button + Notification - Hidden for guests */}
            {/* Notification icons - Hidden for guests */}
            {user && (
              <div className="flex items-center gap-1">
                {/* Search button - visible on all screens */}
                <SpotlightSearch variant="button" />
                
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
                
                {/* Messages icon with unread badge - TEMPORARILY HIDDEN */}
                {/* <motion.button
                  className="relative p-2 rounded-full hover:bg-white/30 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowRoomChatsPanel(true)}
                >
                  <MessageCircle className="w-5 h-5 text-gray-600" />
                  {unreadMessagesCount > 0 && (
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
                        {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
                      </span>
                    </motion.div>
                  )}
                </motion.button> */}
              </div>
            )}
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 flex relative">
          {/* Action Cards - Fixed Right Side Panel (Desktop only) */}
          {user && (
            <motion.div 
              className="hidden lg:flex fixed right-4 lg:right-6 xl:right-8 top-20 z-20 pointer-events-auto"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <DesktopActionCards
                onDailyRewardsClick={() => setIsDailyRewardsOpen(true)}
                onMissionsClick={() => setShowMissionsModal(true)}
                onChestClick={() => setIsChestModalOpen(true)}
                onPowersClick={() => setShowMyPowersModal(true)}
                onAdFreeClick={() => navigate("/power-ups")}
                vertical
              />
            </motion.div>
          )}

          {/* Main content area */}
          <div className="flex-1 relative overflow-hidden">
            {/* ===== CENTER: AVATAR WITH ORBITING BUTTONS ===== */}
           <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            
            {/* GUEST: Show split layout on desktop, unified panel on mobile */}
            {!user && (
              <>
                {/* Desktop: Split layout with auth on left, guest info on right */}
                <motion.div
                  className="hidden md:flex w-full h-full items-center justify-center pointer-events-auto overflow-y-auto"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, type: "spring" }}
                >
                <DesktopGuestSplitLayout
                    onCreateAccount={handleGuestCreateAccount}
                    onSignIn={handleGuestSignIn}
                    onGoogleSignIn={handleGuestGoogleSignIn}
                    onAppleSignIn={handleGuestAppleSignIn}
                    onPlayAsGuest={handlePlayClick}
                    isLoading={isAuthLoading}
                    guestPlaysRemaining={guestPlaysRemaining}
                    maxGuestPlays={MAX_GUEST_PLAYS_COUNT}
                  />
                </motion.div>
                
                {/* Mobile: Original unified panel */}
                <motion.div
                  className="md:hidden w-full h-full flex items-center justify-center pointer-events-auto overflow-y-auto"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, type: "spring" }}
                >
                  <GuestWelcomePanel
                    onCreateAccount={handleGuestCreateAccount}
                    onSignIn={handleGuestSignIn}
                    onGoogleSignIn={handleGuestGoogleSignIn}
                    onAppleSignIn={handleGuestAppleSignIn}
                    onPlayAsGuest={handlePlayClick}
                    isLoading={isAuthLoading}
                  />
                </motion.div>
              </>
            )}
            
            {/* xl+ layout: Cards moved to fixed right side */}

            {/* md to xl layout: Avatar centered (cards now fixed on right side) - LOGGED IN USERS ONLY */}
            {user && <div className="hidden md:flex xl:hidden items-center justify-center w-full h-full px-4 lg:-ml-[170px]">
              {/* Avatar + Info */}
              <motion.div 
                className="flex flex-col items-center"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, type: "spring" }}
              >

                <div className="relative">
                  {/* Tablet portrait: use the same curved circular action buttons as mobile */}
                  {user && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 flex items-end justify-center gap-2 pointer-events-auto z-20 lg:hidden"
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
                  >
                  <div 
                      data-walkthrough="avatar" 
                      className="pointer-events-auto cursor-pointer"
                      onClick={() => user ? openAvatarModal() : navigate("/auth")}
                    >
                      <AvatarCircle 
                        avatarUrl={user ? profile?.avatar_url : defaultGuestAvatar} 
                        animatedAvatarUrl={user ? profile?.animated_avatar_url : defaultGuestAvatarAnimated}
                        size={260} 
                        coins={user ? coins : 0}
                        gems={user ? gems : 0}
                        level={user ? levelInfo.level : 1}
                        xpProgress={user ? levelInfo.progress : 0}
                        xpCurrent={user ? levelInfo.xpInCurrentLevel : 0}
                        xpTotal={user ? levelInfo.xpNeededForNextLevel : 100}
                        hideStats={!user}
                        showAvatarPrompt={false}
                        showMascotReminder={!!user && !profile?.avatar_url}
                        userId={user?.id}
                      />
                    </div>
                  </motion.div>
                </div>
                {/* User info below avatar */}
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="flex flex-col items-center mt-6 pointer-events-auto"
                >
                  <div className="flex items-center justify-center gap-2.5">
                    <span className="font-sans text-gray-800 capitalize font-black" style={{ fontSize: 28 }}>
                      {profile?.nickname || t("game.guest")}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 mt-1">
                    <motion.button
                      className="flex items-center gap-2 cursor-pointer"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => navigate("/power-ups?section=coins")}
                    >
                      <div className="w-9 h-9 rounded-full flex items-center justify-center bg-white/90" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                        <img src={coinIcon} alt="Coins" className="w-9 h-9" />
                      </div>
                      <span className="font-bold text-gray-700 text-base">{formatCompactNumber(coins)}</span>
                    </motion.button>
                    <motion.button
                      className="flex items-center gap-2 cursor-pointer"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => navigate("/power-ups?section=gems-lari")}
                    >
                      <div className="w-9 h-9 rounded-full flex items-center justify-center bg-white/90" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                        <img src={gemIcon} alt="Gems" className="w-9 h-9" />
                      </div>
                      <span className="font-bold text-gray-700 text-base">{formatCompactNumber(gems)}</span>
                    </motion.button>
                  </div>
                  <div className="mt-14">
                    <DesktopPlayButtonLarge
                      onClick={handlePlayClick}
                      playsRemaining={user ? playsRemaining : guestPlaysRemaining}
                      maxPlays={user ? maxPlays : MAX_GUEST_PLAYS_COUNT}
                      canPlay={user ? canPlay : guestPlaysRemaining > 0}
                      isVip={isVip}
                      isGuest={!user}
                    />
                  </div>
                </motion.div>
              </motion.div>

            </div>}

            {/* xl+ layout: Avatar centered - LOGGED IN USERS ONLY */}
            {user && <motion.div 
              className="hidden xl:flex flex-col items-center justify-center w-full h-full px-4 -ml-[170px]"
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
                    onClick={() => openAvatarModal()}
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
                      showAvatarPrompt={false}
                      showMascotReminder={!!user && !profile?.avatar_url}
                      userId={user?.id}
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
                  <span className="font-sans text-gray-800 capitalize font-black" style={{ fontSize: 32 }}>
                    {profile?.nickname || t("game.guest")}
                  </span>
                </div>
                <div className="flex items-center gap-6 mt-1">
                  <motion.button
                    className="flex items-center gap-2 cursor-pointer"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate("/power-ups?section=coins")}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/90" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                      <img src={coinIcon} alt="Coins" className="w-10 h-10" />
                    </div>
                    <span className="font-bold text-gray-700 text-lg">
                      {coins >= 1000000 ? `${(coins / 1000000).toFixed(1)}M` : coins >= 1000 ? `${Math.floor(coins / 1000)}K` : coins}
                    </span>
                  </motion.button>
                  <motion.button
                    className="flex items-center gap-2 cursor-pointer"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate("/power-ups?section=gems-lari")}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/90" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                      <img src={gemIcon} alt="Gems" className="w-10 h-10" />
                    </div>
                    <span className="font-bold text-gray-700 text-lg">
                      {gems >= 1000000 ? `${(gems / 1000000).toFixed(1)}M` : gems >= 1000 ? `${Math.floor(gems / 1000)}K` : gems}
                    </span>
                  </motion.button>
                </div>

                <div className="mt-20">
                  <DesktopPlayButtonLarge
                    onClick={handlePlayClick}
                    playsRemaining={user ? playsRemaining : guestPlaysRemaining}
                    maxPlays={user ? maxPlays : MAX_GUEST_PLAYS_COUNT}
                    canPlay={user ? canPlay : guestPlaysRemaining > 0}
                    isVip={isVip}
                    isGuest={!user}
                  />
                </div>
              </motion.div>
            </motion.div>}

            {/* Mobile only: circular action buttons + avatar + info - LOGGED IN USERS ONLY */}
            {user && <motion.div 
              className="md:hidden flex flex-col items-center w-full max-w-[360px] px-4"
              style={{ marginTop: -5 }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, type: "spring" }}
            >
              {/* Guest: Title and desc ABOVE avatar for mobile */}
              {!user && (
                <motion.div
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="flex flex-col items-center mb-10 pointer-events-auto"
                >
                  <span className="font-slackey text-gray-800 font-black" style={{ fontSize: 32, fontWeight: 900 }}>
                    გამარჯობა!
                  </span>
                  <motion.button
                    onClick={() => navigate("/auth")}
                    className="mt-1 text-center cursor-pointer"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <p className="text-base text-gray-600 font-medium text-center leading-relaxed">
                      შექმენი შენი პროფილი და<br />ითამაშე უფასოდ!
                    </p>
                  </motion.button>
                </motion.div>
              )}

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
                      style={{ marginBottom: 48 }}
                    >
                      <ActionButtonWithParticles
                        iconSrc={chestBoxIcon}
                        alt="Chest"
                        onClick={() => setIsChestModalOpen(true)}
                        background="linear-gradient(180deg, #FCE7F3 0%, #F9A8D4 100%)"
                        shadowColor="#F472B6"
                        delay={0.56}
                        particleColor="rgba(244, 114, 182, 0.9)"
                        glowColor="rgba(244, 114, 182, 0.5)"
                        idleOffset={1.4}
                        size={62}
                        badge={
                          canClaimChest ? (
                            <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md z-20">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : undefined
                        }
                      />
                    </motion.div>

                    {!isVip && (
                      <motion.div 
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.45, type: "spring" }}
                        style={{ marginBottom: 32 }}
                      >
                        <ActionButtonWithParticles
                          iconSrc={adFreeIcon}
                          alt="Shop"
                          onClick={() => navigate("/power-ups")}
                          background="linear-gradient(180deg, #FEF9C3 0%, #FDE047 100%)"
                          shadowColor="#FACC15"
                          delay={0.64}
                          particleColor="rgba(250, 204, 21, 0.9)"
                          glowColor="rgba(250, 204, 21, 0.5)"
                          idleOffset={2.1}
                          size={62}
                        />
                      </motion.div>
                    )}

                    <motion.div 
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.5, type: "spring" }}
                      style={{ marginBottom: 0 }}
                    >
                      <ActionButtonWithParticles
                        iconSrc={powersIcon}
                        alt="Shop"
                        onClick={() => navigate("/power-ups")}
                        background="linear-gradient(180deg, #E9D5FF 0%, #C084FC 100%)"
                        shadowColor="#A855F7"
                        delay={0.72}
                        particleColor="rgba(168, 85, 247, 0.9)"
                        glowColor="rgba(168, 85, 247, 0.5)"
                        idleOffset={2.8}
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
                  style={{ marginTop: user ? 15 : 0 }}
                >
                  <div 
                    data-walkthrough="avatar" 
                    className="pointer-events-auto cursor-pointer"
                    onClick={() => user ? openAvatarModal() : navigate("/auth")}
                  >
                    <AvatarCircle 
                      avatarUrl={user ? profile?.avatar_url : defaultGuestAvatar} 
                      animatedAvatarUrl={user ? profile?.animated_avatar_url : defaultGuestAvatarAnimated}
                      size={280} 
                      coins={user ? coins : 0}
                      gems={user ? gems : 0}
                      level={user ? levelInfo.level : 1}
                      xpProgress={user ? levelInfo.progress : 0}
                      xpCurrent={user ? levelInfo.xpInCurrentLevel : 0}
                      xpTotal={user ? levelInfo.xpNeededForNextLevel : 100}
                      hideStats={!user}
                      showAvatarPrompt={false}
                      showMascotReminder={!!user && !profile?.avatar_url}
                      userId={user?.id}
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
                {user && (
                  <>
                    <div className="flex items-center justify-center gap-2.5">
                      {profile?.country_code && (
                        <span className="text-3xl">{getCountryFlag(profile.country_code)}</span>
                      )}
                      <span className="font-slackey text-gray-800 capitalize font-black" style={{ fontSize: 32 }}>
                        {profile?.nickname || t("game.guest")}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 mt-1">
                      <motion.button
                        className="flex items-center gap-2 cursor-pointer"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate("/power-ups?section=coins")}
                      >
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/90" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                          <img src={coinIcon} alt="Coins" className="w-10 h-10" />
                        </div>
                        <span className="font-bold text-gray-700 text-lg">
                          {coins >= 1000000 ? `${(coins / 1000000).toFixed(1)}M` : coins >= 1000 ? `${Math.floor(coins / 1000)}K` : coins}
                        </span>
                      </motion.button>
                      <motion.button
                        className="flex items-center gap-2 cursor-pointer"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate("/power-ups?section=gems-lari")}
                      >
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/90" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                          <img src={gemIcon} alt="Gems" className="w-10 h-10" />
                        </div>
                        <span className="font-bold text-gray-700 text-lg">
                          {gems >= 1000000 ? `${(gems / 1000000).toFixed(1)}M` : gems >= 1000 ? `${Math.floor(gems / 1000)}K` : gems}
                        </span>
                      </motion.button>
                    </div>
                  </>
                )}
                {!user && (
                  <div className="flex flex-col items-center">
                    <p className="text-base text-gray-600 font-medium text-center">
                      ან ითამაშე როგორც სტუმარმა
                    </p>
                    <HandDrawnArrow size={44} color="#9CA3AF" />
                  </div>
                )}
              </motion.div>
            </motion.div>}
        </div>
          </div>

          {/* Right Sidebar removed - action cards now occupy this space */}
        </div>
        </div>
      </MainLayout>
      
      {/* Room Chats Panel - TEMPORARILY HIDDEN */}
      {/* <RoomChatsPanel
        isOpen={showRoomChatsPanel}
        onClose={() => setShowRoomChatsPanel(false)}
      /> */}
    </>
  );
}
