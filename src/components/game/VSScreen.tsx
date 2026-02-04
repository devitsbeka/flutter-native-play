import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft, HelpCircle, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { calculateLevel } from "@/utils/levelCalculation";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { VSMatchHelpModal } from "./VSMatchHelpModal";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { useCategories } from "@/hooks/useCategories";
import { CATEGORY_VIDEOS } from "@/config/videoConfig";
import confetti from "canvas-confetti";
import { InteractiveBlobVideo } from "./InteractiveBlobVideo";
import { useGameStake } from "@/hooks/useGameStake";
import { REWARDS } from "@/config/rewardConfig";

import coinIcon from "@/assets/icons/icon-coin.png";
import botAvatar1 from "@/assets/avatars/bot-avatar-1.png";
import botAvatar2 from "@/assets/avatars/bot-avatar-2.png";
import botAvatar3 from "@/assets/avatars/bot-avatar-3.png";
import botAvatar4 from "@/assets/avatars/bot-avatar-4.png";
import botAvatar5 from "@/assets/avatars/bot-avatar-5.png";
import botAvatar6 from "@/assets/avatars/bot-avatar-6.png";
import botAvatar7 from "@/assets/avatars/bot-avatar-7.png";
import botAvatar8 from "@/assets/avatars/bot-avatar-8.png";
import botAvatar9 from "@/assets/avatars/bot-avatar-9.png";
import botAvatar10 from "@/assets/avatars/bot-avatar-10.png";
import defaultGuestAvatar from "@/assets/guest-avatar.png";
import defaultGuestAvatarAnimated from "@/assets/guest-avatar-animated.mp4";

// Slot machine avatars for cycling effect
const slotAvatars = [
  botAvatar1, botAvatar2, botAvatar3, botAvatar4, botAvatar5,
  botAvatar6, botAvatar7, botAvatar8, botAvatar9, botAvatar10
];

// Topographic wave pattern SVG
const WavePattern = () => (
  <svg
    className="absolute bottom-0 left-0 w-full"
    viewBox="0 0 400 200"
    preserveAspectRatio="none"
    style={{ height: "40%" }}
  >
    <path
      d="M0 100 Q50 80 100 100 T200 100 T300 100 T400 100 L400 200 L0 200 Z"
      fill="rgba(255,255,255,0.03)"
    />
    <path
      d="M0 120 Q50 100 100 120 T200 120 T300 120 T400 120 L400 200 L0 200 Z"
      fill="rgba(255,255,255,0.05)"
    />
    <path
      d="M0 140 Q50 120 100 140 T200 140 T300 140 T400 140 L400 200 L0 200 Z"
      fill="rgba(255,255,255,0.07)"
    />
    <path
      d="M0 160 Q50 140 100 160 T200 160 T300 160 T400 160 L400 200 L0 200 Z"
      fill="rgba(255,255,255,0.09)"
    />
  </svg>
);

type GameStage = "finding-opponent" | "opponent-found" | "finding-category" | "category-found" | "ready";

export function VSScreen() {
  const { opponent, beginPlaying, phase } = useGame();
  const { profile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { categories } = useCategories();
  const { stakeAmount, deductStake, canPlay } = useGameStake();
  const { startMatchmaking } = useGame();
  
  // Game stage state
  const [stage, setStage] = useState<GameStage>("finding-opponent");
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [stakeDeducted, setStakeDeducted] = useState(false);
  
  // Opponent slot state
  const [currentAvatar, setCurrentAvatar] = useState<string>(slotAvatars[0]);
  const opponentIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Mixed category constant
  const MIXED_CATEGORY = {
    id: "__mixed__",
    name: "სხვადასხვა კატეგორიები",
    image_url: null,
    icon_slug: "mystery-box",
  };

  // Category slot state
  const [categoryPool, setCategoryPool] = useState<typeof categories>([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<{id: string; name: string; videoUrl: string} | null>(null);
  const categoryIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Player data
  const playerPoints = profile?.total_points || 0;
  const playerLevelInfo = calculateLevel(playerPoints);
  const opponentPoints = opponent?.points || 0;
  const opponentLevelInfo = calculateLevel(opponentPoints);

  // Current category video URL
  const currentCategory = categoryPool[currentCategoryIndex];
  const currentVideoUrl = currentCategory ? (CATEGORY_VIDEOS[currentCategory.id] || "") : "";

  // Initialize category pool when categories load - includes Mixed Category
  useEffect(() => {
    if (categories.length > 0 && categoryPool.length === 0) {
      const shuffled = [...categories].sort(() => Math.random() - 0.5);
      // Include Mixed Category in the pool
      const poolWithMixed = [MIXED_CATEGORY as typeof categories[0], ...shuffled.slice(0, Math.min(7, shuffled.length))];
      setCategoryPool(poolWithMixed);
    }
  }, [categories, categoryPool.length]);

  // Stage 1: Opponent slot machine animation
  useEffect(() => {
    if (stage !== "finding-opponent") return;

    let cycleCount = 0;
    const maxCycles = 12;
    
    const getDelay = (count: number): number => {
      if (count < 6) return 60;
      if (count < 9) return 120;
      if (count < 11) return 200;
      return 350;
    };

    const cycleSlot = () => {
      cycleCount++;
      const randomAvatar = slotAvatars[Math.floor(Math.random() * slotAvatars.length)];
      setCurrentAvatar(randomAvatar);

      if (cycleCount < maxCycles) {
        opponentIntervalRef.current = setTimeout(cycleSlot, getDelay(cycleCount));
      } else {
        // Lock in opponent
        if (opponent) {
          setCurrentAvatar(opponent.avatarUrl);
        }
        setStage("opponent-found");
      }
    };

    opponentIntervalRef.current = setTimeout(cycleSlot, 200);

    return () => {
      if (opponentIntervalRef.current) clearTimeout(opponentIntervalRef.current);
    };
  }, [stage, opponent]);

  // Stage 2: Brief pause after opponent found, then start category slot
  useEffect(() => {
    if (stage !== "opponent-found") return;

    const timer = setTimeout(() => {
      setStage("finding-category");
    }, 500);

    return () => clearTimeout(timer);
  }, [stage]);

  // Stage 3: Category slot machine animation
  useEffect(() => {
    if (stage !== "finding-category" || categoryPool.length === 0) return;

    let cycleCount = 0;
    const maxCycles = 14;
    
    const getDelay = (count: number): number => {
      if (count < 7) return 80;
      if (count < 10) return 150;
      if (count < 12) return 250;
      return 400;
    };

    const cycleCategory = () => {
      cycleCount++;
      setCurrentCategoryIndex(prev => (prev + 1) % categoryPool.length);

      if (cycleCount < maxCycles) {
        categoryIntervalRef.current = setTimeout(cycleCategory, getDelay(cycleCount));
      } else {
        // Lock in category
        const winnerIndex = Math.floor(Math.random() * categoryPool.length);
        setCurrentCategoryIndex(winnerIndex);
        const winner = categoryPool[winnerIndex];
        const videoUrl = CATEGORY_VIDEOS[winner.id] || "";
        setSelectedCategory({ id: winner.id, name: winner.name, videoUrl });
        setStage("category-found");
      }
    };

    categoryIntervalRef.current = setTimeout(cycleCategory, 200);

    return () => {
      if (categoryIntervalRef.current) clearTimeout(categoryIntervalRef.current);
    };
  }, [stage, categoryPool]);

  // Stage 4: Confetti and transition to ready
  useEffect(() => {
    if (stage !== "category-found") return;

    // Fire confetti
    confetti({
      particleCount: 70,
      spread: 55,
      origin: { y: 0.5 },
      colors: ["#FFD700", "#FFA500", "#FFFFFF"],
    });

    const timer = setTimeout(() => {
      setStage("ready");
    }, 400);

    return () => clearTimeout(timer);
  }, [stage]);

  // Deduct stake when opponent is found (commit to game)
  useEffect(() => {
    if (stage === "opponent-found" && !stakeDeducted) {
      deductStake().then(success => {
        if (success) {
          setStakeDeducted(true);
        }
      });
    }
  }, [stage, stakeDeducted, deductStake]);

  // Handle start button
  const handleStart = () => {
    if (selectedCategory) {
      beginPlaying(selectedCategory.id);
    }
  };

  // Handle refresh - re-spin for new opponent and category
  const handleRefresh = () => {
    // Reset local state
    setStage("finding-opponent");
    setSelectedCategory(null);
    setCurrentCategoryIndex(0);
    setStakeDeducted(false);
    
    // Shuffle category pool for new selection - includes Mixed Category
    if (categories.length > 0) {
      const shuffled = [...categories].sort(() => Math.random() - 0.5);
      const poolWithMixed = [MIXED_CATEGORY as typeof categories[0], ...shuffled.slice(0, Math.min(7, shuffled.length))];
      setCategoryPool(poolWithMixed);
    }
    
    // Re-trigger matchmaking
    startMatchmaking();
  };

  const isOpponentLocked = stage !== "finding-opponent";
  const isCategoryLocked = stage === "category-found" || stage === "ready";
  const showStartButton = stage === "ready";
  const showCategorySlot = stage === "finding-category" || stage === "category-found" || stage === "ready";

  return (
    <div 
      className="h-[100dvh] w-full relative overflow-hidden"
      style={{ background: "#7E7ADB" }}
    >
      {/* Content wrapper with max-width for desktop/tablet, centered */}
      <div className="w-full h-full flex flex-col max-w-[700px] mx-auto">
      {/* Wave Pattern Background */}
      <WavePattern />

      {/* Full-screen Diagonal VS Divider */}
      <motion.div 
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ zIndex: 5 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Diagonal golden line */}
        <motion.div 
          className="absolute"
          initial={{ 
            clipPath: "polygon(0% 0%, 0% 0%, 0% 0%)",
            opacity: 0 
          }}
          animate={{ 
            clipPath: isOpponentLocked ? "polygon(0% 0%, 100% 100%, 100% 100%, 0% 100%, 0% 0%)" : "polygon(0% 0%, 0% 0%, 0% 0%)",
            opacity: isOpponentLocked ? 1 : 0
          }}
          transition={{ 
            duration: 0.8, 
            ease: "easeOut",
          }}
          style={{
            top: "-50%",
            left: "-50%",
            width: "200%",
            height: "200%",
            background: "linear-gradient(135deg, transparent 47%, rgba(255,215,0,0.5) 49%, rgba(255,215,0,0.6) 50%, rgba(255,215,0,0.5) 51%, transparent 53%)",
            filter: "blur(2px)",
          }}
        />
        
        {/* Pulsing glow overlay */}
        <motion.div 
          className="absolute"
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: isOpponentLocked ? [0.3, 0.7, 0.3] : 0,
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            top: "-50%",
            left: "-50%",
            width: "200%",
            height: "200%",
            background: "linear-gradient(135deg, transparent 48%, rgba(255,215,0,0.4) 49.5%, rgba(255,215,0,0.5) 50%, rgba(255,215,0,0.4) 50.5%, transparent 52%)",
            filter: "blur(8px)",
          }}
        />
        
        {/* VS watermark */}
        <motion.div 
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: isOpponentLocked ? 1 : 0, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <span 
            className="text-[180px] font-black text-white/[0.06]"
            style={{ 
              fontFamily: "'TASolivare', sans-serif",
              letterSpacing: "-0.05em"
            }}
          >
            VS
          </span>
        </motion.div>
      </motion.div>

      {/* Header */}
      <motion.div 
        className="flex items-center justify-between px-4 pt-4 pb-2 relative z-30 shrink-0"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <motion.button 
          onClick={() => navigate("/")}
          className="p-2"
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-6 h-6 text-white" strokeWidth={2.5} />
        </motion.button>

        {/* Coins Reward - center of header */}
        <AnimatePresence>
          {isOpponentLocked && (
            <motion.div 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{
                background: "linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(255,165,0,0.15) 100%)",
                border: "1.5px solid rgba(255,215,0,0.3)",
              }}
            >
              <img src={coinIcon} alt="" className="w-4 h-4" />
              <span className="text-white font-bold text-sm">{REWARDS.GAME_WIN_REWARD.toLocaleString()}</span>
              <span className="text-white/60 text-xs">მოგება</span>
            </motion.div>
          )}
        </AnimatePresence>
        
        <motion.button 
          className="p-2" 
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowHelpModal(true)}
        >
          <HelpCircle className="w-6 h-6 text-white/80" strokeWidth={2} />
        </motion.button>
      </motion.div>

      {/* Main Content - Diagonal Layout */}
      <div className="flex-1 min-h-0 flex flex-col relative z-10 px-5">
        <div className="flex-1 flex flex-col justify-between py-4 relative">
          
          {/* Opponent - Top Left */}
          <motion.div 
            className="flex justify-start relative z-10"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="flex items-center gap-3">
              {/* Avatar container - fixed size to prevent layout shift */}
              <div className="w-[88px] h-[88px] rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <SmartAvatar
                  avatarUrl={currentAvatar}
                  fallback={opponent?.name || "?"}
                  size="2xl"
                  autoPlay={false}
                  showSparkle={false}
                />
              </div>
              {/* Text Info */}
              <div className="flex flex-col">
                <h3
                  className="text-2xl font-black text-white"
                  style={{
                    fontFamily: "'TASolivare', sans-serif",
                    textShadow: "0 2px 10px rgba(0,0,0,0.4)",
                  }}
                >
                  {isOpponentLocked ? (opponent?.name || t("game.opponent")) : t("game.searching")}
                </h3>
                <p className="text-white/70 text-sm">
                  {isOpponentLocked ? `${t("common.level")} ${opponentLevelInfo.level}` : t("game.levelQuestion")}
                </p>
                <p className="text-amber-300 text-sm font-medium">
                  {isOpponentLocked ? opponentPoints.toLocaleString() : "---"}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Category - Center with Interactive Morphing Blobs */}
          <motion.div 
            className="flex flex-col items-center justify-center gap-2 relative z-10"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: showCategorySlot ? 1 : 0.3, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            {/* Category name - ABOVE blob */}
            <AnimatePresence>
              {isCategoryLocked && (
                <motion.span
                  className="text-white font-bold text-lg"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: 0.2 }}
                  style={{ textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
                >
                  {selectedCategory?.name || currentCategory?.name || t("game.category")}
                </motion.span>
              )}
            </AnimatePresence>

            {/* Interactive Blob - Icons during spin, Video on reveal */}
            <InteractiveBlobVideo
              iconUrl={currentCategory?.image_url || undefined}
              videoSrc={selectedCategory?.videoUrl}
              isLocked={isCategoryLocked}
              shouldAnimate={showCategorySlot && !isCategoryLocked}
            />

            {/* Refresh button - BELOW blob */}
            <AnimatePresence>
              {isCategoryLocked && (
                <motion.button
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-full backdrop-blur-md"
                  style={{
                    background: "linear-gradient(135deg, rgba(255,215,0,0.25) 0%, rgba(255,165,0,0.2) 100%)",
                    border: "2px solid rgba(255,215,0,0.4)",
                  }}
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ delay: 0.3 }}
                  onClick={handleRefresh}
                  whileTap={{ scale: 0.95 }}
                >
                  <RefreshCw className="w-4 h-4 text-white" />
                  <span className="text-white font-bold text-sm">ახლიდან</span>
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Player - Bottom Right */}
          <motion.div 
            className="flex justify-end relative z-10"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="flex items-center gap-3">
              {/* Text Info - Left of avatar */}
              <div className="flex flex-col items-end">
                <h3
                  className="text-2xl font-black text-white"
                  style={{
                    fontFamily: "'TASolivare', sans-serif",
                    textShadow: "0 2px 10px rgba(0,0,0,0.4)",
                  }}
                >
                  {profile?.nickname || t("game.you")}
                </h3>
                <p className="text-white/70 text-sm">
                  {t("common.level")} {playerLevelInfo.level}
                </p>
                <p className="text-amber-300 text-sm font-medium">
                  {playerPoints.toLocaleString()}
                </p>
              </div>
              {/* Avatar container - fixed size */}
              <div className="w-[88px] h-[88px] rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <SmartAvatar
                  avatarUrl={profile?.avatar_url || defaultGuestAvatar}
                  animatedAvatarUrl={profile?.animated_avatar_url || defaultGuestAvatarAnimated}
                  fallback={profile?.nickname || "P"}
                  size="2xl"
                  autoPlay={true}
                  showSparkle={false}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Button Section - Fixed at bottom */}
      <div className="w-full max-w-sm mx-auto pb-4 sm:pb-8 pt-4 px-6 relative z-10">
        <motion.div
          className="w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ 
            opacity: showStartButton ? 1 : 0,
            y: showStartButton ? 0 : 20,
          }}
          transition={{ duration: 0.3 }}
        >
          <ChunkyButton
            variant="mint"
            size="xl"
            onClick={handleStart}
            disabled={!showStartButton}
            className="w-full"
          >
            {t("game.start")}
          </ChunkyButton>
        </motion.div>
      </div>

      {/* Help Modal */}
      <VSMatchHelpModal 
        isOpen={showHelpModal} 
        onClose={() => setShowHelpModal(false)} 
      />
      </div>
    </div>
  );
}
