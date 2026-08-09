import { useState, useCallback, useEffect, useRef } from "react";
import { trackSignupCompleted } from "@/lib/analytics";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MainLayout } from "@/components/layout/MainLayout";
import { Bell, Check, Clock, Mail, Menu } from "lucide-react";
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
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { calculateLevel } from "@/utils/levelCalculation";
import { PowerUpBadge } from "@/components/game/PowerUpBadge";
import { PowerUpDetailModal, PowerUpType } from "@/components/game/PowerUpDetailModal";
import { SignupOnboardingModal } from "@/components/onboarding/SignupOnboardingModal";
import { WelcomeOnboardingOverlay } from "@/components/onboarding/WelcomeOnboardingOverlay";
import { AvatarCircle } from "@/components/home/AvatarCircle";
import { SceneHero } from "@/components/home/SceneHero";
import { SceneSidebar } from "@/components/home/SceneSidebar";
import { useUserScene } from "@/hooks/useUserScene";
import { DesktopActionCards } from "@/components/home/DesktopActionCards";
import { LoggedInHomeV2 } from "@/pages/LoggedInHomeV2";
import { DesktopPlayButtonLarge } from "@/components/home/DesktopPlayButtonLarge";

import { SoundSettingsModal } from "@/components/home/SoundSettingsModal";
import { AdFreeModal } from "@/components/home/AdFreeModal";
import { GemShopModal } from "@/components/home/GemShopModal";
import { MyPowersModal } from "@/components/home/MyPowersModal";
import { ActionButtonWithParticles } from "@/components/home/ActionButtonWithParticles";
import { PlayLimitModal } from "@/components/home/PlayLimitModal";
import { useGameStake } from "@/hooks/useGameStake";
import { REWARDS } from "@/config/rewardConfig";

import adFreeIcon from "@/assets/icons/icon-ad-free.png";
import gemIcon from "@/assets/icons/icon-gem.png";
import coinIcon from "@/assets/icons/icon-coin.png";
import defaultGuestAvatar from "@/assets/guest-avatar.png";
import handGestureIcon from "@/assets/icons/hand-gesture.png";
import defaultGuestAvatarAnimated from "@/assets/guest-avatar-animated.mp4";
// Default Trivia King scene loop — everyone who hasn't explicitly generated
// their own scene sees this (guests included), regardless of custom avatars.
const DEFAULT_SCENE_VIDEO = "/videos/trivia-king-scene.mp4";
import guestMascotVideo from "@/assets/guest-welcome-avatar.mp4";
import { useAvatarModal } from "@/contexts/AvatarModalContext";
import { HandDrawnArrow } from "@/components/shared/HandDrawnArrow";
import { FloatingGiftButton } from "@/components/shared/FloatingGiftButton";
import { oauth } from "@/integrations/oauth";

// Header greeting for the main page — rotates every 6 hours so it stays
// fresh without flickering between visits.
const HOME_GREETING_KEYS = [
  "extra.homeGreeting1",
  "extra.homeGreeting2",
  "extra.homeGreeting3",
  "extra.homeGreeting4",
  "extra.homeGreeting5",
  "extra.homeGreeting6",
];

// The scene background only shows on lg+ (desktop + tablet landscape) —
// mounting the <video>/<img> at all sizes made phones download megabytes of
// media that CSS then hid.
function useIsSceneViewport(): boolean {
  const [isXl, setIsXl] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches
  );
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const onChange = (e: MediaQueryListEvent) => setIsXl(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isXl;
}

import { toast } from "@/hooks/use-toast";
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
import { usePlayLimit } from "@/hooks/usePlayLimit";
import { useVipStatus } from "@/hooks/useVipStatus";
import { WatchAdModal } from "@/components/home/WatchAdModal";
import { InviteFriendsModal, useInviteModalVisibility } from "@/components/home/InviteFriendsModal";
import { FriendJoinedModal } from "@/components/home/FriendJoinedModal";
import { FriendsStoriesBar } from "@/components/team/FriendsStoriesBar";
import { PlayOptionsModal } from "@/components/home/PlayOptionsModal";
import { InviteFriendsModal as AddFriendsModal } from "@/components/team/InviteFriendsModal";
import { ChangeNameModal } from "@/components/home/ChangeNameModal";

import { useNotifications } from "@/hooks/useNotifications";
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
  const location = useLocation();
  // /dev/v2 serves the experimental 3D world-map homepage; "/" keeps the
  // stable pre-game-map version.
  const isDevV2 = location.pathname === "/dev/v2";
  const { profile, user, fetchProfile, signUp, signUpWithUsername, signIn, signInWithUsername, signInWithGoogle, signInWithApple } = useAuth();
  const { t } = useLanguage();
  const { step, startOnboarding, setStep, hasCompletedOnboarding } = useOnboarding();
  const { openAvatarModal } = useAvatarModal();
  const { coins, gems, addCoins, exchangeGemsForCoins } = useCurrency();
  const { powerUps } = useUserPowerUps();
  const { totalStars } = useTotalStars();
  const { canClaimDaily, canClaimChest } = useRewardTimers();
  const { missions, completedCount, totalCount } = useMissions();
  const { playsRemaining, maxPlays, canPlay, isVip, loading: vipLoading, regenPlayAvailable, timeUntilNextPlay, useRegenPlay, freeGamesExhausted } = usePlayLimit();
  const { subscription } = useVipStatus();
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
  const [isAnimatingFromHome, setIsAnimatingFromHome] = useState(false);
  const [showWelcomeOnboarding, setShowWelcomeOnboarding] = useState(false);
  const [showChangeNameModal, setShowChangeNameModal] = useState(false);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [showPlayOptions, setShowPlayOptions] = useState(false);

  // Show welcome onboarding for newly signed-up users (works for all signup paths)
  useEffect(() => {
    if (
      user &&
      profile?.created_at &&
      !localStorage.getItem("mytrivia_welcome_onboarding_seen")
    ) {
      const isNewSignup = localStorage.getItem("mytrivia_is_new_signup") === "true";
      const createdAt = new Date(profile.created_at).getTime();
      const thirtyMinAgo = Date.now() - 30 * 60 * 1000;

      if (isNewSignup || createdAt > thirtyMinAgo) {
        localStorage.removeItem("mytrivia_is_new_signup");
        const timer = setTimeout(() => {
          // Mark seen at SHOW time - marking only on dismiss made the tour
          // re-fire on every app open until the user completed it
          localStorage.setItem("mytrivia_welcome_onboarding_seen", "true");
          setShowWelcomeOnboarding(true);
        }, 800);
        return () => clearTimeout(timer);
      }
      // For old accounts without the flag, do nothing — don't permanently mark as seen
    }
  }, [user, profile]);

  // Invite Friends Modal state
  const { visible: inviteModalVisible, dismiss: dismissInvite, setVisible: setInviteModalVisible } = useInviteModalVisibility(isVip, vipLoading, showWelcomeOnboarding, freeGamesExhausted);
  const [friendJoinedModalOpen, setFriendJoinedModalOpen] = useState(false);

  const [friendModalVariant, setFriendModalVariant] = useState<"inviter" | "invited">("inviter");
  const [friendModalInviterName, setFriendModalInviterName] = useState<string | undefined>();

  // Check for invited user referral welcome flag (set in Auth.tsx after signup via referral).
  // One popup at a time: while the welcome tour is pending or visible, keep the
  // flag and show this only after the tour is dismissed (they used to stack).
  useEffect(() => {
    const referralWelcome = sessionStorage.getItem("referral_welcome");
    if (!referralWelcome) return;
    if (!user || !profile) return; // wait for profile so the tour check is accurate
    if (showWelcomeOnboarding) return;

    const welcomeSeen = !!localStorage.getItem("mytrivia_welcome_onboarding_seen");
    const createdAt = profile.created_at ? new Date(profile.created_at).getTime() : 0;
    const isFreshAccount = createdAt > Date.now() - 30 * 60 * 1000;
    if (isFreshAccount && !welcomeSeen) return; // tour is about to open - defer

    sessionStorage.removeItem("referral_welcome");
    setFriendModalVariant("invited");
    setFriendModalInviterName(referralWelcome !== "true" ? referralWelcome : undefined);
    setFriendJoinedModalOpen(true);
  }, [user, profile, showWelcomeOnboarding]);

  // Realtime subscription for inviter: detect when a friend accepts the invite
  useEffect(() => {
    if (!user) return;

    // Initial check for any accepted invites not yet seen
    const checkInitial = async () => {
      const { data } = await supabase
        .from('friend_invites')
        .select('id, accepted_at')
        .eq('inviter_id', user.id)
        .eq('status', 'accepted')
        .order('accepted_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const latestAccepted = data[0].accepted_at;
        const lastSeen = sessionStorage.getItem(`friend_joined_seen_${user.id}`);
        if (latestAccepted && latestAccepted !== lastSeen) {
          sessionStorage.setItem(`friend_joined_seen_${user.id}`, latestAccepted);
          // Don't show on first load (lastSeen === null)
        }
      }
    };
    checkInitial();

    // Subscribe to realtime updates on friend_invites for this inviter
    const channel = supabase
      .channel(`friend-invites-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'friend_invites',
          filter: `inviter_id=eq.${user.id}`,
        },
        (payload) => {
          const newRow = payload.new as any;
          if (newRow.status === 'accepted') {
            sessionStorage.setItem(`friend_joined_seen_${user.id}`, newRow.accepted_at || new Date().toISOString());
            setFriendModalVariant("inviter");
            setFriendModalInviterName(undefined);
            setFriendJoinedModalOpen(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  
  // Guest play tracking
  const guestPlaysRemaining = !user ? getGuestPlaysRemaining() : 0;

  // Auto-detect face for existing avatars that haven't been checked yet
  const faceDetectRanRef = useRef(false);
  useEffect(() => {
    if (
      faceDetectRanRef.current ||
      !user ||
      !profile?.avatar_url ||
      !profile.avatar_url.includes('supabase.co/storage') ||
      profile.has_face_photo === true ||
      profile.animated_avatar_url
    ) return;

    faceDetectRanRef.current = true;
    supabase.functions.invoke("detect-face", {
      body: { imageUrl: profile.avatar_url, userId: user.id },
    }).then(() => {
      fetchProfile(user.id);
    }).catch(err => console.warn("Auto face detection failed:", err));
  }, [user?.id, profile?.avatar_url, profile?.has_face_photo, profile?.animated_avatar_url, fetchProfile]);
  
  // Auth loading state for GuestWelcomePanel
  const [isAuthLoading, setIsAuthLoading] = useState(false);


  // Handle play with regenerated play
  const handlePlayWithRegen = useCallback(async () => {
    const success = await useRegenPlay();
    if (success) {
      setShowGuestMaxPlaysModal(false);
      navigate("/game");
    }
  }, [useRegenPlay, navigate]);

  // Start a quick match: the /game flow matches against a random opponent
  // and the VS screen rolls a random category automatically.
  const startQuickGame = useCallback(async () => {
    setShowPlayOptions(false);
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
      openAvatarModal(() => navigate("/game"));
    } else {
      // Check if user can play (lifetime limit for non-PRO, or regen play)
      if (!canPlay && !isVip) {
        // Show invite modal first, then PRO upgrade on dismiss
        setInviteModalVisible(true);
        return;
      }

      // Check if user has enough coins for stake
      if (!hasEnoughCoins) {
        setShowNotEnoughCoinsModal(true);
        return;
      }

      // Regen consumption is now handled centrally by PlayGuardContext/Game.tsx
      navigate("/game");
    }
  }, [user, profile, navigate, openAvatarModal, isVip, canPlay, hasEnoughCoins, regenPlayAvailable, playsRemaining, useRegenPlay]);

  // The main play button first offers a choice: quick match or play with
  // friends. Guests skip the chooser — rooms need an account anyway.
  const handlePlayClick = useCallback(() => {
    if (user) {
      setShowPlayOptions(true);
    } else {
      void startQuickGame();
    }
  }, [user, startQuickGame]);

  const handlePlayWithFriends = useCallback(() => {
    setShowPlayOptions(false);
    navigate("/team", { state: { openCreateRoom: true } });
  }, [navigate]);

  // Handle exchange gems for coins — single atomic RPC (a separate
  // spend-then-add pair could take the gems and never deliver the coins),
  // guarded against double-taps while the request is in flight.
  const isExchangingGemsRef = useRef(false);
  const handleExchangeGems = useCallback(async () => {
    if (isExchangingGemsRef.current) return;
    const gemsNeeded = Math.ceil((stakeAmount - coins) / REWARDS.GEM_TO_COINS_RATE);
    if (gemsNeeded <= 0 || gems < gemsNeeded) return;

    isExchangingGemsRef.current = true;
    try {
      const coinsToAdd = gemsNeeded * REWARDS.GEM_TO_COINS_RATE;
      const success = await exchangeGemsForCoins(gemsNeeded, coinsToAdd);
      if (success) {
        setShowNotEnoughCoinsModal(false);
      } else {
        toast({ title: t("shop.purchaseFailed"), variant: "destructive" });
      }
    } finally {
      isExchangingGemsRef.current = false;
    }
  }, [stakeAmount, coins, gems, exchangeGemsForCoins]);

  // Guest welcome panel handlers
  const handleGuestCreateAccount = useCallback(async (username: string, password: string) => {
    setIsAuthLoading(true);
    try {
      const { error } = await signUpWithUsername(username, password);
      if (error) throw error;
      trackSignupCompleted('username', false);
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
      await oauth.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  const handleGuestAppleSignIn = useCallback(async () => {
    setIsAuthLoading(true);
    try {
      await oauth.auth.signInWithOAuth("apple", {
        redirect_uri: window.location.origin,
      });
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  // Handle direct animation from home button
  const handleAnimateFromHome = useCallback(async () => {
    if (!user || !profile) return;
    
    if (!profile.has_face_photo) {
      toast({ title: t("extra.photoFaceRequiredTitle"), description: t("extra.photoFaceRequiredDesc") });
      return;
    }
    
    setIsAnimatingFromHome(true);
    toast({ title: t("extra.animationStartingTitle"), description: t("extra.animationStartingDesc") });
    
    try {
      // Check if current avatar has an AI-generated version
      const { data: existingGen } = await supabase
        .from('avatar_generations')
        .select('id, avatar_url')
        .eq('user_id', user.id)
        .eq('is_current', true)
        .single();

      let imageUrl = existingGen?.avatar_url;

      // If no AI-generated avatar exists, generate one first
      if (!imageUrl) {
        toast({ title: t("extra.aiAvatarGenerating"), description: t("extra.pleaseWaitDesc") });

        const { data: genData, error: genError } = await supabase.functions.invoke("generate-avatar", {
          body: { imageUrl: profile.avatar_url },
        });

        if (genError) throw new Error(genError.message);
        if (!genData?.success || !genData?.avatarUrl) throw new Error(genData?.error || "AI avatar generation failed");

        // Upload the generated avatar to storage
        const response = await fetch(genData.avatarUrl);
        const blob = await response.blob();
        const fileName = `${user.id}/avatar_${Date.now()}.png`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, blob, { upsert: true, contentType: 'image/png' });

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
        const aiAvatarUrl = urlData.publicUrl;

        // Save to avatar_generations and update profile
        await supabase.from('avatar_generations').update({ is_current: false }).eq('user_id', user.id);
        await supabase.from('avatar_generations').insert({
          user_id: user.id,
          avatar_url: aiAvatarUrl,
          source_image_url: profile.avatar_url,
          is_current: true,
        });
        await supabase.from('profiles').update({ avatar_url: aiAvatarUrl }).eq('user_id', user.id);

        imageUrl = aiAvatarUrl;
        toast({ title: t("extra.aiAvatarAnimating") });
      }

      // Now animate the AI-generated avatar (never the raw photo)
      const { data, error } = await supabase.functions.invoke("animate-avatar", {
        body: { imageUrl, userId: user.id },
      });
      
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Animation failed");
      }
      
      const { statusUrl, responseUrl } = data;
      
      // Poll for completion
      const pollInterval = setInterval(async () => {
        try {
          const { data: pollData, error: pollError } = await supabase.functions.invoke("animate-avatar", {
            body: { userId: user.id, statusUrl, responseUrl },
          });
          
          if (pollError) {
            console.error("Poll error:", pollError);
            return;
          }
          
          if (pollData?.success && pollData?.videoUrl) {
            clearInterval(pollInterval);
            await fetchProfile(user.id);
            toast({ title: t("extra.animationReadyToast") });
            // Trigger confetti
            try {
              const confetti = (await import("canvas-confetti")).default;
              confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            } catch {}
          } else if (pollData?.error) {
            clearInterval(pollInterval);
            setIsAnimatingFromHome(false);
            toast({ title: t("extra.animationFailedToast"), description: pollData.error, variant: "destructive" });
          }
        } catch (e) {
          console.error("Polling error:", e);
        }
      }, 5000);
      
      // Timeout after 3 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        setIsAnimatingFromHome(false);
      }, 180000);
      
    } catch (err: any) {
      console.error("Animation error:", err);
      setIsAnimatingFromHome(false);
      toast({ title: t("extra.animationFailedToast"), description: err.message, variant: "destructive" });
    }
  }, [user, profile, fetchProfile]);

  const gamesWon = profile?.games_won || 0;
  const currentStreak = profile?.current_streak || 0;
  const levelInfo = calculateLevel(profile?.total_points || 0);

  // Personalized 16:9 homepage scene (generated from the user's photo) —
  // when present it replaces the classic centered avatar hero on xl+.
  // Anyone without their own generated scene — guests and logged-in users
  // alike, even with custom avatars — gets the default Trivia King loop.
  const { data: userScene, isLoading: sceneLoading } = useUserScene(user?.id);
  const isSceneViewport = useIsSceneViewport();
  const sceneUrl = userScene?.imageUrl || null;
  const sceneVideoUrl = userScene?.videoUrl || null;
  const showDefaultScene = !sceneUrl && !(user && sceneLoading);
  const showAnimatePrompt = !isAnimatingFromHome && !!profile?.avatar_url && profile.avatar_url.includes('supabase.co/storage') && profile.has_face_photo === true && !profile?.animated_avatar_url;

  // /dev/v2 previews the 3D world-map homepage for logged-in users; the
  // regular responsive homepage below serves the main route.
  if (user && isDevV2) {
    return (
      <>
        <LoggedInHomeV2
          nickname={profile?.nickname || t("game.guest")}
          avatarUrl={profile?.avatar_url}
          coins={coins}
          gems={gems}
          level={levelInfo.level}
          xpCurrent={levelInfo.xpInCurrentLevel}
          xpTotal={levelInfo.xpNeededForNextLevel}
          playsRemaining={playsRemaining}
          unreadCount={unreadCount}
          onPlay={handlePlayClick}
          onMissions={() => setShowMissionsModal(true)}
          onPowers={() => setShowMyPowersModal(true)}
          onLevel={() => setShowLevelModal(true)}
          onShop={() => setIsGemShopOpen(true)}
          onAvatar={() => openAvatarModal()}
          onAddFriend={() => setInviteModalVisible(true)}
          onMenu={() => setIsSideMenuOpen(true)}
        />
        {/* Modals reachable from the homepage */}
        <SignupOnboardingModal />
        <SideMenuDrawer isOpen={isSideMenuOpen} onClose={() => setIsSideMenuOpen(false)} />
        <MissionsModal isOpen={showMissionsModal} onClose={() => setShowMissionsModal(false)} />
        <MyPowersModal isOpen={showMyPowersModal} onClose={() => setShowMyPowersModal(false)} />
        <GemShopModal isOpen={isGemShopOpen} onClose={() => setIsGemShopOpen(false)} />
        <LevelInfoModal
          isOpen={showLevelModal}
          onClose={() => setShowLevelModal(false)}
          levelInfo={levelInfo}
          onContinue={() => {
            setShowLevelModal(false);
            if (user && !canPlay && !isVip) {
              setInviteModalVisible(true);
              return;
            }
            navigate("/game");
          }}
        />
        <InviteFriendsModal
          open={inviteModalVisible}
          onOpenChange={setInviteModalVisible}
          onDismiss={() => dismissInvite()}
        />
        <NotEnoughCoinsModal
          isOpen={showNotEnoughCoinsModal}
          onClose={() => setShowNotEnoughCoinsModal(false)}
          currentCoins={coins}
          requiredCoins={stakeAmount}
          userGems={gems}
          onExchangeGems={handleExchangeGems}
          onOpenDailyRewards={() => {
            setShowNotEnoughCoinsModal(false);
            setIsDailyRewardsOpen(true);
          }}
        />
        <DailyRewardsModal
          isOpen={isDailyRewardsOpen}
          onClose={() => setIsDailyRewardsOpen(false)}
          currentStreak={currentStreak || 1}
          onClaim={() => setIsDailyRewardsOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      {/* Onboarding modals */}
      <SignupOnboardingModal />
      <WelcomeOnboardingOverlay
        isOpen={showWelcomeOnboarding}
        onClose={() => setShowWelcomeOnboarding(false)}
      />
      
      {/* Other modals */}
      <ChestRewardModal isOpen={isChestModalOpen} onClose={() => setIsChestModalOpen(false)} onClaim={() => setIsChestModalOpen(false)} />
      <SideMenuDrawer isOpen={isSideMenuOpen} onClose={() => setIsSideMenuOpen(false)} />
      <SoundSettingsModal isOpen={isSoundModalOpen} onClose={() => setIsSoundModalOpen(false)} />
      <DailyRewardsModal 
        isOpen={isDailyRewardsOpen} 
        onClose={() => setIsDailyRewardsOpen(false)} 
        currentStreak={currentStreak || 1}
        onClaim={() => setIsDailyRewardsOpen(false)}
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
          // Check play limit before navigating (was previously bypassed)
          if (user && !canPlay && !isVip) {
            setInviteModalVisible(true);
            return;
          }
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
        onWatchAd={async () => Promise.resolve(true)}
        playsRemaining={playsRemaining}
      />
      <PlayLimitModal
        isOpen={showGuestMaxPlaysModal}
        onClose={() => setShowGuestMaxPlaysModal(false)}
        onRegister={() => {
          setShowGuestMaxPlaysModal(false);
          startOnboarding();
        }}
        isGuest={!user}
        regenPlayAvailable={regenPlayAvailable}
        timeUntilNextPlay={timeUntilNextPlay}
        onPlayWithRegen={handlePlayWithRegen}
      />
      <NotEnoughCoinsModal
        isOpen={showNotEnoughCoinsModal}
        onClose={() => setShowNotEnoughCoinsModal(false)}
        currentCoins={coins}
        requiredCoins={stakeAmount}
        userGems={gems}
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
        vipExpiresAt={subscription?.expires_at}
        showPlayButton={true}
        showBottomNav={!isSideMenuOpen}
        disableScroll
      >
        <div className="h-full flex flex-col w-full relative overflow-hidden md:overflow-visible">
        {/* Personalized scene (or the default Trivia King loop) as the
            full-bleed page background (xl+); the header, friends strip and
            cards float over it. Clicks are caught by SceneHero's catcher
            layer, not here — background layers never receive them.
            Mounted only when the viewport is actually xl, so smaller
            screens never download the media. */}
        {!isSceneViewport ? null : sceneUrl && sceneVideoUrl ? (
          /* Seamless idle-loop video generated from the scene — poster keeps
             the still visible until the video is ready to play */
          <motion.video
            src={sceneVideoUrl}
            poster={sceneUrl}
            autoPlay
            loop
            muted
            playsInline
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="hidden md:block absolute inset-0 w-full h-full object-cover object-center z-0 select-none"
          />
        ) : sceneUrl ? (
          <motion.img
            src={sceneUrl}
            alt=""
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="hidden md:block absolute inset-0 w-full h-full object-cover object-center z-0 select-none"
            draggable={false}
          />
        ) : showDefaultScene ? (
          <motion.video
            src={DEFAULT_SCENE_VIDEO}
            autoPlay
            loop
            muted
            playsInline
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="hidden md:block absolute inset-0 w-full h-full object-cover object-center z-0 select-none"
          />
        ) : null}
        <header className="relative z-20 px-4 py-3 md:pt-4 safe-top border-b border-border/30 lg:border-b-0">
          <div className="flex items-center justify-between gap-3 md:min-h-12">
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
            <div className="flex-1 flex justify-center md:justify-start items-center gap-4 min-w-0">
              {/* Logo - responsive sizing: sm on mobile/tablet, md on desktop */}
              {/* lg+ shows the logo in the left sidebar instead */}
              <div className="lg:hidden">
                <MyTriviaLiveLogo responsive />
              </div>
              {/* lg+: a rotating greeting takes the logo's place — it changes
                  every 6 hours (same slot for everyone) */}
              <h1 className="hidden lg:block font-display text-xl font-bold text-[#402666] truncate">
                {t(HOME_GREETING_KEYS[Math.floor(Date.now() / 21_600_000) % HOME_GREETING_KEYS.length])}
              </h1>
            </div>
            
            {/* Right side: Search/Notification for users, Sign In for guests */}
            {user ? (
              <div className="flex items-center gap-1">
                {/* Search button - visible on all screens */}
                <SpotlightSearch variant="button" />
                
                {/* Bell icon with unread badge */}
                <motion.button
                  className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/30 transition-colors"
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
                        background: "linear-gradient(180deg, #EF4444 0%, #DC2626 100%)",
                        boxShadow: "0 2px 4px rgba(239, 68, 68, 0.5)",
                      }}
                    >
                      <span className="text-[9px] font-bold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    </motion.div>
                  )}
                </motion.button>
              </div>
            ) : null}
          </div>
        </header>

        {/* Friends strip - logged-in users, horizontally scrollable (mobile + desktop).
            Right padding on lg+ keeps it clear of the fixed action cards panel.
            On lg+ the logo lives in the sidebar, leaving the header row empty, so the
            strip is pulled up into it; pointer-events pass through the padded right
            zone so the header's search/bell buttons stay clickable. The -mt is tuned
            so the avatars land 16px below the page top — the same offset the reel
            has inside the rooms page header, keeping the two pages in sync. */}
        {user && (
          <div className="relative z-20 px-4">
            <div className="lg:pointer-events-auto">
              <FriendsStoriesBar
                onAddFriendClick={() => setShowAddFriendModal(true)}
              />
            </div>
          </div>
        )}

        {/* Add Friend Modal for the friends strip */}
        <AddFriendsModal
          isOpen={showAddFriendModal}
          onClose={() => setShowAddFriendModal(false)}
        />

        {/* Play options: quick match vs play with friends */}
        <PlayOptionsModal
          isOpen={showPlayOptions}
          onClose={() => setShowPlayOptions(false)}
          onQuickGame={() => void startQuickGame()}
          onPlayWithFriends={handlePlayWithFriends}
        />

        {/* Floating Gift Button - the non-blocking entry to the invite offer
            (the modal no longer auto-opens; it interrupted every app open) */}
        <AnimatePresence>
          {user && !isVip && !vipLoading && freeGamesExhausted && !inviteModalVisible && !showWelcomeOnboarding ? (
            <FloatingGiftButton onClick={() => setInviteModalVisible(true)} />
          ) : null}
        </AnimatePresence>

        {/* Invite Friends Modal */}
        <InviteFriendsModal
          open={inviteModalVisible}
          onOpenChange={setInviteModalVisible}
          onDismiss={() => {
            // Just close. Chaining the play-limit modal here meant two forced
            // popups back to back; the limit modal now appears only when the
            // user actually tries to play (guardPlay / Game entry).
            dismissInvite();
          }}
        />

        {/* Friend Joined Modal */}
        <FriendJoinedModal
          open={friendJoinedModalOpen}
          onOpenChange={setFriendJoinedModalOpen}
          variant={friendModalVariant}
          inviterName={friendModalInviterName}
        />

        <ChangeNameModal
          isOpen={showChangeNameModal}
          onClose={() => setShowChangeNameModal(false)}
        />

        {/* Content area */}
        <div className="flex-1 flex relative">
          {/* Action Cards - Fixed Right Side Panel (Desktop only) */}
          {user && (
            <motion.div 
              className="hidden fixed right-4 top-20 z-20 pointer-events-auto"
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
            
            {/* GUEST: Show avatar + play button (no auth wall) */}
            {!user && (
              <>
                {/* Desktop below xl: Guest sees centered avatar with play
                    button. On xl+ the guest gets the same scene layout as
                    logged-in users (guest-adapted), so this hero hides. */}
                <motion.div
                  className="hidden"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, type: "spring" }}
                >
                  <div className="relative">
                    <motion.div 
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <div className="pointer-events-auto cursor-pointer" onClick={() => navigate("/auth")}>
                        <AvatarCircle 
                          animatedAvatarUrl={guestMascotVideo}
                          size={280} 
                          coins={0} gems={0} level={1}
                          xpProgress={0} xpCurrent={0} xpTotal={100}
                          hideStats showAvatarPrompt={false} showMascotReminder={false}
                          autoPlayInterval={5000}
                        />
                      </div>
                    </motion.div>
                  </div>
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, type: "spring" }}
                    className="flex flex-col items-center mt-6 pointer-events-auto"
                  >
                    <span className="font-sans text-gray-800 font-black flex items-center gap-2" style={{ fontSize: 28 }}>
                       <motion.img src={handGestureIcon} alt="" className="w-8 h-8" animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }} style={{ transformOrigin: "70% 80%" }} /> {t("common.hello")}
                     </span>
                    {/* Auth buttons */}
                    <div className="flex items-center gap-3 mt-4">
                      <motion.button onClick={() => navigate("/auth")} className="px-5 py-2.5 rounded-full bg-white border border-border shadow-md text-sm font-semibold text-foreground" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        {t("common.signIn")}
                      </motion.button>
                      <motion.button onClick={() => navigate("/auth?mode=signup")} className="px-5 py-2.5 rounded-full bg-primary shadow-md text-sm font-semibold text-primary-foreground" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        {t("extra.joinFreeBtn")}
                      </motion.button>
                    </div>
                    <div className="mt-14">
                      <DesktopPlayButtonLarge
                        onClick={handlePlayClick}
                        playsRemaining={guestPlaysRemaining}
                        maxPlays={MAX_GUEST_PLAYS_COUNT}
                        canPlay={guestPlaysRemaining > 0}
                        isVip={false}
                        isGuest={true}
                        onboardingId="play"
                      />
                    </div>
                  </motion.div>
                </motion.div>

                {/* Mobile: Guest sees avatar with play button (play in bottom nav) */}
                <motion.div
                  className="md:hidden flex flex-col items-center w-full max-w-[360px] px-4"
                  style={{ marginTop: -90 }}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, type: "spring" }}
                >
                  {/* PRO Gift Banner for guests */}


                  <div className="relative">
                    <motion.div 
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <div className="pointer-events-auto cursor-pointer" onClick={() => navigate("/auth")}>
                        <AvatarCircle 
                          animatedAvatarUrl={guestMascotVideo}
                          size={220} 
                          coins={0} gems={0} level={1}
                          xpProgress={0} xpCurrent={0} xpTotal={100}
                          hideStats showAvatarPrompt={false} showMascotReminder={false}
                          autoPlayInterval={5000}
                        />
                      </div>
                    </motion.div>
                  </div>
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, type: "spring" }}
                    className="flex flex-col items-center mt-3 pointer-events-auto"
                  >
                    <span className="font-slackey text-gray-800 font-black flex items-center gap-2" style={{ fontSize: 26 }}>
                      <motion.img src={handGestureIcon} alt="" className="w-7 h-7" animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }} style={{ transformOrigin: "70% 80%" }} /> {t("common.hello")}
                    </span>
                    {/* Auth buttons */}
                    <div className="flex items-center gap-3 mt-3">
                      <motion.button onClick={() => navigate("/auth")} className="px-5 py-2.5 rounded-full bg-white border border-border shadow-md text-sm font-semibold text-foreground" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        {t("common.signIn")}
                      </motion.button>
                      <motion.button onClick={() => navigate("/auth?mode=signup")} className="px-5 py-2.5 rounded-full bg-primary shadow-md text-sm font-semibold text-primary-foreground" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        {t("extra.joinFreeBtn")}
                      </motion.button>
                    </div>
                  </motion.div>
                </motion.div>
              </>
            )}
            
            {/* xl+ layout: Cards moved to fixed right side */}

            {/* md to xl layout: Avatar centered (cards now fixed on right side) - LOGGED IN USERS ONLY */}
            {user && <div className="hidden">
              {/* Avatar + Info. Below lg the action bubbles hang 75px above the
                  avatar (top: -75); pad the centered block so they stay inside
                  this overflow-hidden area instead of clipping under the
                  friends strip. */}
              <motion.div
                className="flex flex-col items-center pt-20 lg:pt-0"
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
                        showAnimatePrompt={showAnimatePrompt}
                        onAnimateClick={() => handleAnimateFromHome()}
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
                    <motion.button
                      onClick={() => setShowChangeNameModal(true)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="font-sans text-gray-800 capitalize font-black cursor-pointer"
                      style={{ fontSize: 28 }}
                    >
                      {profile?.nickname || t("game.guest")}
                    </motion.button>
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
                      onboardingId="play"
                    />
                  </div>
                </motion.div>
              </motion.div>

            </div>}

            {/* xl+ layout: floating stats over the full-bleed scene. Guests
                get the same layout in a guest-adapted state — every locked
                interaction routes to auth. */}
            {(sceneUrl || showDefaultScene) && (
              <motion.div
                className="hidden md:block w-full h-full pr-[280px] xl:pr-[300px] pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <SceneHero
                  nickname={user ? profile?.nickname || t("game.guest") : t("game.guest")}
                  level={user ? levelInfo.level : 1}
                  xpCurrent={user ? levelInfo.xpInCurrentLevel : 0}
                  xpTotal={user ? levelInfo.xpNeededForNextLevel : 100}
                  coins={user ? coins : 0}
                  gems={user ? gems : 0}
                  onNameClick={user ? () => setShowChangeNameModal(true) : () => navigate("/auth")}
                  onLevelClick={user ? () => setShowLevelModal(true) : () => navigate("/auth")}
                  onMissionsClick={user ? () => setShowMissionsModal(true) : () => navigate("/auth")}
                  onCoinsClick={user ? () => navigate("/power-ups?section=coins") : () => navigate("/auth")}
                  onGemsClick={user ? () => navigate("/power-ups?section=gems-lari") : () => navigate("/auth")}
                  onGiftClick={user ? () => setIsDailyRewardsOpen(true) : () => navigate("/auth")}
                  onChestClick={user ? () => setIsChestModalOpen(true) : () => navigate("/auth")}
                  onSceneClick={user ? () => openAvatarModal() : () => navigate("/auth?mode=signup")}
                />
              </motion.div>
            )}

            {/* xl+ scene: functional right sidebar (Figma 601:1104) — live
                invitation, continue-playing categories, quick play */}
            {user && (sceneUrl || showDefaultScene) && (
              <motion.div
                className="hidden md:block absolute right-3 xl:right-[28px] top-[53px] z-20 pointer-events-auto"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, type: "spring" }}
              >
                <SceneSidebar onQuickPlay={handlePlayClick} />
              </motion.div>
            )}

            {/* xl+ scene: guest auth CTAs floating above the play button */}
            {!user && showDefaultScene && (
              <div className="hidden md:flex absolute bottom-[17%] left-1/2 -translate-x-1/2 z-20 items-center gap-3 pointer-events-auto">
                <motion.button
                  onClick={() => navigate("/auth")}
                  className="px-5 py-2.5 rounded-full bg-white border border-border shadow-md text-sm font-semibold text-foreground"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {t("common.signIn")}
                </motion.button>
                <motion.button
                  onClick={() => navigate("/auth?mode=signup")}
                  className="px-5 py-2.5 rounded-full bg-primary shadow-md text-sm font-semibold text-primary-foreground"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {t("extra.joinFreeBtn")}
                </motion.button>
              </div>
            )}

            {/* xl+ scene: guests keep the big centered play CTA; logged-in
                users play via the sidebar's quick-play button (Figma
                601:1104 has no centered button) */}
            {!user && (sceneUrl || showDefaultScene) && (
              <div className="hidden md:block absolute bottom-[6%] left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
                <DesktopPlayButtonLarge
                  onClick={handlePlayClick}
                  playsRemaining={user ? playsRemaining : guestPlaysRemaining}
                  maxPlays={user ? maxPlays : MAX_GUEST_PLAYS_COUNT}
                  canPlay={user ? canPlay : guestPlaysRemaining > 0}
                  isVip={isVip}
                  isGuest={!user}
                  onboardingId="play"
                />
              </div>
            )}

            {/* xl+ layout: Avatar centered - only while the scene query is
                still loading (any resolved state shows a scene now) */}
            {user && !sceneUrl && !showDefaultScene && <motion.div
              className="hidden md:flex flex-col items-center justify-center w-full h-full px-4 -ml-[170px]"
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
                      showAnimatePrompt={showAnimatePrompt}
                      onAnimateClick={() => handleAnimateFromHome()}
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
                  <motion.button
                    onClick={() => setShowChangeNameModal(true)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="font-sans text-gray-800 capitalize font-black cursor-pointer"
                    style={{ fontSize: 32 }}
                  >
                    {profile?.nickname || t("game.guest")}
                  </motion.button>
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
                    onboardingId="play"
                  />
                </div>
              </motion.div>
            </motion.div>}

            {/* Mobile only: circular action buttons + avatar + info - LOGGED IN USERS ONLY */}
            {user && <div className="md:hidden w-full flex justify-center [@media(max-height:780px)]:[zoom:0.88] [@media(max-height:780px)]:-mt-8 [@media(max-height:700px)]:[zoom:0.8] [@media(max-height:700px)]:-mt-14 [@media(max-height:620px)]:[zoom:0.72] [@media(max-height:620px)]:-mt-20">
            <motion.div
              className="flex flex-col items-center w-full max-w-[360px] px-4"
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
                    {t("common.hello")}
                  </span>
                  <motion.button
                    onClick={() => navigate("/auth")}
                    className="mt-1 text-center cursor-pointer"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <p className="text-base text-gray-600 font-medium text-center leading-relaxed">
                      {t("extra.createProfilePlayFree")}
                    </p>
                  </motion.button>
                </motion.div>
              )}




              <div className="relative">
                {/* Mobile: Show curved action buttons above avatar */}
                {user && (
                  <div 
                    className="absolute left-1/2 -translate-x-1/2 flex items-end justify-center pointer-events-auto z-20"
                    style={{ top: -75, width: 340, gap: isVip ? 8 : 4 }}
                    data-walkthrough="powerups"
                  >
                    {/* Gift - edge position */}
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

                    {/* Mission - arc position: 28px (5 buttons) or 20px (6 buttons) */}
                    <motion.div 
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.35, type: "spring" }}
                      style={{ marginBottom: isVip ? 32 : 24 }}
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

                    {/* Chest - peak position: 48px (5 buttons) or 36px (6 buttons) */}
                    <motion.div 
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.4, type: "spring" }}
                      style={{ marginBottom: isVip ? 32 : 40 }}
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

                    {/* No-ads - only for non-VIP, arc position: 36px */}
                    {!isVip && (
                      <motion.div 
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.45, type: "spring" }}
                        style={{ marginBottom: 24 }}
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

                    {/* Powers - edge position */}
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
                      size={238}
                      coins={user ? coins : 0}
                      gems={user ? gems : 0}
                      level={user ? levelInfo.level : 1}
                      xpProgress={user ? levelInfo.progress : 0}
                      xpCurrent={user ? levelInfo.xpInCurrentLevel : 0}
                      xpTotal={user ? levelInfo.xpNeededForNextLevel : 100}
                      hideStats={!user}
                      showAvatarPrompt={false}
                      showAnimatePrompt={showAnimatePrompt}
                      onAnimateClick={() => handleAnimateFromHome()}
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
                      <motion.button
                        onClick={() => setShowChangeNameModal(true)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="font-slackey text-gray-800 capitalize font-black cursor-pointer"
                        style={{ fontSize: 32 }}
                      >
                        {profile?.nickname || t("game.guest")}
                      </motion.button>
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
                    <p
                      className="text-base text-gray-600 font-semibold text-center cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => navigate("/auth?mode=signup")}
                    >
                      {t("extra.registration")}
                    </p>
                    <div className="flex flex-col items-center" style={{ marginTop: 25 }}>
                      <p className="text-base text-gray-600 font-medium text-center">
                        {t("extra.playAsGuest")}
                      </p>
                      <HandDrawnArrow size={44} color="#9CA3AF" />
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
            </div>}
        </div>
          </div>

          {/* Right Sidebar removed - action cards now occupy this space */}
        </div>
        </div>
      </MainLayout>
      
    </>
  );
}
