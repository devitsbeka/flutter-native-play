import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft, HelpCircle, RefreshCw, WifiOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTrivia, TriviaQuestion } from "@/hooks/useTrivia";
import { calculateLevel } from "@/utils/levelCalculation";
import { supabase } from "@/integrations/supabase/client";
import { shuffleArray } from "@/utils/shuffle";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { VSMatchHelpModal } from "./VSMatchHelpModal";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { useCategories } from "@/hooks/useCategories";
import { excludePartyCategories } from "@/config/partyCategories";
import confetti from "canvas-confetti";
import { REWARDS } from "@/config/rewardConfig";

import coinIcon from "@/assets/icons/icon-coin.png";
import defaultGuestAvatar from "@/assets/guest-avatar.png";

import mysteryBoxIcon from "@/assets/mystery-box.png";
import mascotAvatar1 from "@/assets/avatars/mascot-avatar-1.png";
import mascotAvatar2 from "@/assets/avatars/mascot-avatar-2.png";
import mascotAvatar3 from "@/assets/avatars/mascot-avatar-3.png";
import mascotAvatar4 from "@/assets/avatars/mascot-avatar-4.png";
import mascotAvatar5 from "@/assets/avatars/mascot-avatar-5.png";
import mascotAvatar6 from "@/assets/avatars/mascot-avatar-6.png";
import mascotAvatar7 from "@/assets/avatars/mascot-avatar-7.png";
import mascotAvatar8 from "@/assets/avatars/mascot-avatar-8.png";

// Base mascot avatars for cycling effect
const baseMascotAvatars = [
  mascotAvatar1, mascotAvatar2, mascotAvatar3, mascotAvatar4,
  mascotAvatar5, mascotAvatar6, mascotAvatar7, mascotAvatar8
];

/** The frame colour of the VS screen (Figma 1147:8822). Shared with the Guess card's versus screen. */
export const VS_PURPLE = "#5651CE";

/** The icon-library bucket the category icons are served from. */
const ICON_STORAGE_URL =
  "https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library";

interface CategoryPlateProps {
  name: string;
  iconSlug?: string;
  iconUrl?: string;
  isLocked: boolean;
  stake: number;
  canSpin: boolean;
  spinLabel: string;
  onSpin: () => void;
}

/**
 * The category plate — Figma 1147:9013.
 *
 * A chunky lozenge with the category's icon hanging off its left edge, the
 * coin stake tucked under the name, and the re-roll button sunk into its
 * right end. While the wheel is still spinning the plate itself is the slot:
 * the name and icon cycle inside it, so nothing moves on the lock-in but the
 * content.
 */
export function CategoryPlate({
  name,
  iconSlug,
  iconUrl,
  isLocked,
  stake,
  canSpin,
  spinLabel,
  onSpin,
}: CategoryPlateProps) {
  const resolvedIcon = iconUrl || (iconSlug ? `${ICON_STORAGE_URL}/${iconSlug}.png` : undefined);

  return (
    <div className="relative w-full max-w-[371px] mx-auto">
      {/* The plate. It IS the slot machine: while the wheel turns, the name
          and the icon roll through it; when it stops, the plate itself pops
          once so the reveal has a beat of its own. */}
      <motion.div
        className="relative h-[97px] flex flex-col justify-center gap-[6px] pl-[52px] pr-[72px] backdrop-blur-[24px] overflow-hidden"
        animate={isLocked ? { scale: [1, 1.06, 0.99, 1] } : { scale: 1 }}
        transition={isLocked ? { duration: 0.45, times: [0, 0.35, 0.7, 1], ease: "easeOut" } : { duration: 0.2 }}
        style={{
          backgroundImage: "linear-gradient(13.44deg, #A9D9EB 27.03%, #CCC8FF 100%)",
          border: "2px solid rgba(255,255,255,0.55)",
          borderRadius: "20px 60px 60px 40px",
          boxShadow: "0 6px 0 #759DBD",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.p
            key={name}
            className={`font-slackey ${name.length > 18 ? "text-[17px] leading-[20px]" : "text-[22px] leading-[24px]"} text-[#454376] tracking-[-0.14px] truncate`}
            style={{ textShadow: "0 2px 0 #E0EAFF" }}
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -26 }}
            transition={{ duration: isLocked ? 0.22 : 0.1, ease: "easeOut" }}
          >
            {name}
          </motion.p>
        </AnimatePresence>

        {/* Coin stake — Figma 1147:8890 */}
        <motion.div
          className="inline-flex items-center gap-[5px] h-[32px] w-fit pl-[6px] pr-[12px]"
          style={{
            backgroundImage: "linear-gradient(17.24deg, #F3FCCB 27.03%, #F0C8FF 100%)",
            border: "2px solid rgba(255,255,255,0.7)",
            borderRadius: "25.95px",
            boxShadow: "0 3.89px 0 #99A077",
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: isLocked ? 1 : 0.6, scale: 1 }}
          transition={{ duration: 0.25 }}
        >
          <img src={coinIcon} alt="" className="w-[19.9px] h-[19px] shrink-0" />
          <span
            className="font-slackey text-[15.57px] leading-[20.76px] text-[#454376] tracking-[-0.12px]"
            style={{ textShadow: "0 1.73px 0 #E0EAFF" }}
          >
            {stake.toLocaleString()}
          </span>
        </motion.div>
      </motion.div>

      {/* Category icon, overhanging the plate's left edge — Figma 1149:9049 */}
      <AnimatePresence mode="wait">
        {resolvedIcon && (
          <motion.img
            key={resolvedIcon}
            src={resolvedIcon}
            alt=""
            className="absolute -left-[26px] top-[5px] w-[79px] h-[84px] object-contain pointer-events-none"
            style={{ filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.2))" }}
            initial={{ opacity: 0, y: 22, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: isLocked ? [0.85, 1.12, 1] : 1 }}
            exit={{ opacity: 0, y: -22, scale: 0.85 }}
            transition={{ duration: isLocked ? 0.34 : 0.1, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>

      {/* Re-roll — Figma 1147:8862. Three free spins, then it is gone.
          Centred by a plain wrapper rather than `-translate-y-1/2`: the
          button animates `scale`, and motion writes its own `transform`
          inline, which wins over the utility class and drops the button
          half its height down the plate. */}
      <div className="absolute right-[20px] top-0 bottom-0 flex items-center pointer-events-none">
      <AnimatePresence>
        {canSpin && (
          <motion.button
            type="button"
            onClick={onSpin}
            aria-label={spinLabel}
            title={spinLabel}
            className="pointer-events-auto w-[45px] h-[45px] rounded-full flex items-center justify-center"
            style={{
              backgroundImage: "linear-gradient(42.44deg, #E9EFFF 27.03%, #F0C8FF 100%)",
              border: "2px solid rgba(255,255,255,0.7)",
              boxShadow: "0 4.5px 0 #9494CE",
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ delay: 0.2 }}
            whileTap={{ scale: 0.92, y: 3 }}
          >
            <RefreshCw className="w-[19.5px] h-[19.5px] text-[#583763]" strokeWidth={2} />
            {/* The design carries no counter on the button; how many free
                re-rolls are left is in the label it announces. */}
            <span className="sr-only">{spinLabel}</span>
          </motion.button>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}

type GameStage = "finding-opponent" | "opponent-found" | "finding-category" | "category-found" | "ready";

export function VSScreen() {
  const { opponent, beginPlaying, phase, selectedCategoryId } = useGame();
  const { profile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  // VS-bot has a fixed correct answer per question; a party vote category
  // cannot be played against a bot.
  const { categories: allCategories } = useCategories();
  const categories = useMemo(() => excludePartyCategories(allCategories), [allCategories]);
  const { startMatchmaking } = useGame();
  
  // Game stage state
  const [stage, setStage] = useState<GameStage>("finding-opponent");
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  
  // Slot avatars: mascots + AI-generated, fetched at mount
  const [slotAvatars, setSlotAvatars] = useState<string[]>(baseMascotAvatars);
  
  // Opponent slot state
  const [currentAvatar, setCurrentAvatar] = useState<string>(baseMascotAvatars[0]);
  const opponentIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Mixed category constant
  const MIXED_CATEGORY = {
    id: "__mixed__",
    name: t("extra.mixedCategory"),
    image_url: null,
    icon_slug: "mystery-box",
  };

  // Category slot state
  const [categoryPool, setCategoryPool] = useState<typeof categories>([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<{id: string; name: string} | null>(null);
  const categoryIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const categoryPoolSetForStageRef = useRef(false);

  // Player data
  const playerCoins = profile?.coins || 0;
  const playerLevelInfo = calculateLevel(profile?.total_points || 0);
  const opponentPoints = opponent?.points || 0;
  const opponentLevelInfo = calculateLevel(opponentPoints);

  const currentCategory = categoryPool[currentCategoryIndex];

  // Fetch AI-generated avatar URLs and merge with mascot avatars
  useEffect(() => {
    const fetchAiAvatars = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .ilike('avatar_url', '%avatar_ai%')
        .limit(10);
      
      if (data && data.length > 0) {
        const aiUrls = data
          .map(p => p.avatar_url)
          .filter((url): url is string => !!url);
        if (aiUrls.length > 0) {
          setSlotAvatars(shuffleArray([...baseMascotAvatars, ...aiUrls]));
        }
      }
    };
    fetchAiAvatars();
  }, []);

  // Initialize category pool when categories load
  useEffect(() => {
    if (categories.length > 0 && !categoryPoolSetForStageRef.current) {
      const shuffled = [...categories].sort(() => Math.random() - 0.5);
      const poolWithMixed = [MIXED_CATEGORY as typeof categories[0], ...shuffled.slice(0, Math.min(7, shuffled.length))];
      setCategoryPool(poolWithMixed);
      categoryPoolSetForStageRef.current = true;
    }
  }, [categories]);

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

  /**
   * The category the player ALREADY chose, when they chose one.
   *
   * `startMatchmaking` has always taken a category — `/game?category=` — and
   * nothing here read it, so the slot machine spun to a random winner and
   * the choice was thrown away. That was invisible while the only caller
   * passed nothing; it matters now that picking a picture game comes
   * straight here (a solo Guess used to create a whole room to play one
   * round in, and left the room behind afterwards).
   */
  const chosenCategory = useMemo(
    () => (selectedCategoryId ? categories.find((c) => c.uuid === selectedCategoryId || c.id === selectedCategoryId) : undefined),
    [selectedCategoryId, categories],
  );

  // Stage 3: the category is either the one the player picked — no spin,
  // there is nothing to decide — or the slot machine picks one.
  useEffect(() => {
    if (stage !== "finding-category") return;
    if (chosenCategory) {
      setSelectedCategory({ id: chosenCategory.id, name: chosenCategory.name });
      setStage("category-found");
      return;
    }
    if (categoryPool.length === 0) return;

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
        setSelectedCategory({ id: winner.id, name: winner.name });
        setStage("category-found");
      }
    };

    categoryIntervalRef.current = setTimeout(cycleCategory, 200);

    return () => {
      if (categoryIntervalRef.current) clearTimeout(categoryIntervalRef.current);
    };
  }, [stage, categoryPool, chosenCategory]);

  // Pre-fetch questions ref
  const prefetchedQuestionsRef = useRef<TriviaQuestion[] | null>(null);
  
  const { fetchQuestions: prefetchQuestions } = useTrivia();

  // Stage 4: Confetti, pre-fetch questions, and transition to ready
  useEffect(() => {
    if (stage !== "category-found") return;

    // Fire confetti
    confetti({
      particleCount: 70,
      spread: 55,
      origin: { y: 0.5 },
      colors: ["#FFD700", "#FFA500", "#FFFFFF"],
    });

    // Pre-fetch questions in background
    if (selectedCategory) {
      prefetchedQuestionsRef.current = null;
      prefetchQuestions(6, selectedCategory.id, 1, [], false)
        .then(questions => {
          if (questions && questions.length > 0) {
            prefetchedQuestionsRef.current = questions;
          }
        })
        .catch(err => {
          console.warn("Pre-fetch failed, will fetch on play:", err);
        });
    }

    const timer = setTimeout(() => {
      setStage("ready");
    }, 400);

    return () => clearTimeout(timer);
  }, [stage, selectedCategory, prefetchQuestions]);

  // Timeout: if stuck on "finding-category" for 10s, show connection error
  useEffect(() => {
    if (stage !== "finding-category") return;

    const timeout = setTimeout(() => {
      setConnectionError(true);
    }, 10_000);

    return () => clearTimeout(timeout);
  }, [stage]);


  // Handle start button - pass pre-fetched questions if available
  const [isStarting, setIsStarting] = useState(false);
  const handleStart = async () => {
    if (selectedCategory && !isStarting) {
      setIsStarting(true);
      try {
        await beginPlaying(selectedCategory.id, prefetchedQuestionsRef.current || undefined);
      } finally {
        setIsStarting(false);
      }
    }
  };

  // Free category re-spins: the rolled category can be re-rolled up to three
  // times before the match starts. Only the category wheel re-spins — the
  // opponent stays — and a spin invalidates any questions prefetched for the
  // discarded category.
  const [categorySpinsLeft, setCategorySpinsLeft] = useState(3);
  const handleCategorySpin = useCallback(() => {
    if (categorySpinsLeft <= 0) return;
    setCategorySpinsLeft((n) => n - 1);
    setSelectedCategory(null);
    setCurrentCategoryIndex(0);
    prefetchedQuestionsRef.current = null;
    setIsStarting(false);
    if (categories.length > 0) {
      const shuffled = [...categories].sort(() => Math.random() - 0.5);
      const poolWithMixed = [MIXED_CATEGORY as typeof categories[0], ...shuffled.slice(0, Math.min(7, shuffled.length))];
      setCategoryPool(poolWithMixed);
    }
    setStage("finding-category");
  }, [categorySpinsLeft, categories]);

  // Handle refresh - re-spin for new opponent and category
  const handleRefresh = useCallback(() => {
    // Reset local state
    setStage("finding-opponent");
    setSelectedCategory(null);
    setCurrentCategoryIndex(0);
    setConnectionError(false);
    categoryPoolSetForStageRef.current = false;
    prefetchedQuestionsRef.current = null;
    setCategorySpinsLeft(3); // a full restart is a fresh match — fresh spins too
    setIsStarting(false);
    
    // Shuffle category pool for new selection - includes Mixed Category
    if (categories.length > 0) {
      const shuffled = [...categories].sort(() => Math.random() - 0.5);
      const poolWithMixed = [MIXED_CATEGORY as typeof categories[0], ...shuffled.slice(0, Math.min(7, shuffled.length))];
      setCategoryPool(poolWithMixed);
      categoryPoolSetForStageRef.current = true;
    }
    
    // Re-trigger matchmaking
    startMatchmaking();
  }, [categories, startMatchmaking]);

  /** What the plate shows: the locked category once there is one, otherwise
      whichever category the wheel is passing through. */
  const plateCategory = useMemo(() => {
    if (selectedCategory) {
      if (selectedCategory.id === "__mixed__") {
        return { name: t("extra.mixedCategory"), iconSlug: undefined, iconUrl: mysteryBoxIcon };
      }
      const match =
        categoryPool.find((c) => c.id === selectedCategory.id) ??
        categories.find((c) => c.id === selectedCategory.id);
      return { name: selectedCategory.name, iconSlug: match?.icon_slug ?? undefined, iconUrl: undefined };
    }
    if (currentCategory) {
      if (currentCategory.id === "__mixed__") {
        return { name: t("extra.mixedCategory"), iconSlug: undefined, iconUrl: mysteryBoxIcon };
      }
      return { name: currentCategory.name, iconSlug: currentCategory.icon_slug ?? undefined, iconUrl: undefined };
    }
    return { name: t("extra.searchingCategory"), iconSlug: undefined, iconUrl: mysteryBoxIcon };
  }, [selectedCategory, currentCategory, categoryPool, categories, t]);

  const displayCategoryName = plateCategory.name;
  const displayCategoryIconSlug = plateCategory.iconSlug;
  const displayCategoryIconUrl = plateCategory.iconUrl;

  const isOpponentLocked = stage !== "finding-opponent";
  const isCategoryLocked = stage === "category-found" || stage === "ready";
  const showStartButton = stage === "ready";
  const startButtonDisabled = !showStartButton || isStarting;
  const showCategorySlot = stage === "finding-category" || stage === "category-found" || stage === "ready";

  return (
    <div
      className="h-[100dvh] w-full relative overflow-hidden safe-bleed"
      style={{ background: VS_PURPLE }}
    >
      {/* Content wrapper with max-width for desktop/tablet, centered */}
      <div className="w-full h-full flex flex-col max-w-[700px] mx-auto relative overflow-hidden">

      {/* VS watermark — Figma 1147:8834: Slackey at 296px, barely-there white,
          bled off the left edge rather than centred. */}
      <motion.div
        className="absolute inset-0 flex items-center pointer-events-none overflow-hidden"
        style={{ zIndex: 1 }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: isOpponentLocked ? 1 : 0, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <span className="font-slackey text-[180px] leading-[180px] tracking-[-9px] text-white/[0.06] select-none -translate-x-[42px] translate-y-[20px]">
          VS
        </span>
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
          aria-label={t("common.back")}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-6 h-6 text-white" strokeWidth={2.5} />
        </motion.button>

        <motion.button
          className="p-2"
          aria-label={t("menu.help")}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowHelpModal(true)}
        >
          <HelpCircle className="w-6 h-6 text-white/80" strokeWidth={2} />
        </motion.button>
      </motion.div>

      {/* Main content. The three blocks sit at the fractions of the frame the
          design puts them at (Figma 1147:8835 is 792pt tall: opponent at 199,
          the category plate at 361, the player at 541), so the diagonal holds
          on any screen height instead of collapsing into even thirds. */}
      <div className="flex-1 min-h-0 relative z-10 px-5">

        {/* Opponent — upper left */}
        <motion.div
          className="absolute left-5 right-5 top-[25.1%] flex justify-start"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="flex items-center gap-3 pl-[7%]">
            {/* Avatar container - fixed size to prevent layout shift. The
                slot machine still spins in here; it just lands with a pop
                now, so the moment the opponent stops changing is visible. */}
            <motion.div
              className="w-[88px] h-[88px] rounded-full bg-white/20 flex items-center justify-center shrink-0"
              animate={isOpponentLocked ? { scale: [1, 1.12, 0.97, 1] } : { scale: 1 }}
              transition={
                isOpponentLocked
                  ? { duration: 0.45, times: [0, 0.35, 0.7, 1], ease: "easeOut" }
                  : { duration: 0.2 }
              }
            >
              <SmartAvatar
                avatarUrl={currentAvatar}
                fallback={opponent?.name || "?"}
                size="2xl"
                autoPlay={false}
                showSparkle={false}
              />
            </motion.div>
            {/* Text Info */}
            <div className="flex flex-col min-w-0">
              <h3 className="font-slackey text-[28px] leading-[28px] text-white tracking-[-0.16px] truncate">
                {isOpponentLocked ? (opponent?.name || t("game.opponent")) : t("game.searching")}
              </h3>
              <p className="text-white/70 text-sm leading-5 tracking-[-0.16px]">
                {isOpponentLocked ? `${t("common.level")} ${opponentLevelInfo.level}` : t("game.levelQuestion")}
              </p>
              <p className="text-[#FCD34D] text-sm leading-5 font-medium tracking-[-0.16px]">
                {isOpponentLocked ? opponentPoints.toLocaleString() : "---"}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Category plate — centre */}
        <motion.div
          className="absolute left-5 right-5 top-[45.6%]"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: showCategorySlot ? 1 : 0, scale: showCategorySlot ? 1 : 0.85 }}
          transition={{ duration: 0.4 }}
        >
          <CategoryPlate
            name={displayCategoryName}
            iconSlug={displayCategoryIconSlug}
            iconUrl={displayCategoryIconUrl}
            isLocked={isCategoryLocked}
            stake={REWARDS.GAME_WIN_REWARD}
            canSpin={isCategoryLocked && !chosenCategory && categorySpinsLeft > 0}
            onSpin={handleCategorySpin}
            spinLabel={t("extra.spinCategoryBtn", { count: categorySpinsLeft })}
          />
        </motion.div>

        {/* Player — lower right */}
        <motion.div
          className="absolute left-5 right-5 top-[68.3%] flex justify-end"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: isOpponentLocked ? 1 : 0, x: isOpponentLocked ? 0 : 50 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
        >
          <div className="flex items-center gap-3">
            {/* Text Info - on left */}
            <div className="flex flex-col items-end text-right min-w-0">
              <h3 className="font-slackey text-[28px] leading-[28px] text-white tracking-[-0.16px] truncate">
                {profile?.nickname || t("game.you")}
              </h3>
              <p className="text-white/70 text-sm leading-5 tracking-[-0.16px]">
                {t("common.level")} {playerLevelInfo.level}
              </p>
              <p className="text-[#FCD34D] text-sm leading-5 font-medium tracking-[-0.16px]">
                {playerCoins.toLocaleString()}
              </p>
            </div>
            {/* Avatar container */}
            <div className="w-[88px] h-[88px] rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <SmartAvatar
                avatarUrl={profile?.avatar_url || defaultGuestAvatar}
                animatedAvatarUrl={profile?.animated_avatar_url}
                fallback={profile?.nickname?.charAt(0) || "?"}
                size="2xl"
                autoPlay={false}
                showSparkle={false}
              />
            </div>
          </div>
        </motion.div>

      </div>

      {/* Start button — Figma 1149:9025 sits 33pt off the bottom edge */}
      <div className="w-full px-5 pb-[33px] pt-2 relative z-20 shrink-0">
        <motion.div
          className="w-full max-w-[395px] mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: showStartButton ? 1 : 0,
            y: showStartButton ? 0 : 20,
          }}
          transition={{ duration: 0.3 }}
        >
          <ChunkyButton
            variant="mintBright"
            size="xl"
            onClick={handleStart}
            disabled={startButtonDisabled}
            className="w-full h-[63px] py-0 rounded-[18.39px] font-display text-[18px]"
          >
            {isStarting ? t("common.loading") : t("game.start")}
          </ChunkyButton>
        </motion.div>
      </div>

      {/* Help Modal */}
      <VSMatchHelpModal 
        isOpen={showHelpModal} 
        onClose={() => setShowHelpModal(false)} 
      />

      {/* Connection Error Mini-Modal */}
      <AnimatePresence>
        {connectionError && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
              className="relative rounded-3xl p-6 flex flex-col items-center gap-4 w-full max-w-xs text-center"
              style={{
                background: "linear-gradient(135deg, rgba(126,122,219,0.95) 0%, rgba(100,96,200,0.95) 100%)",
                border: "2px solid rgba(255,255,255,0.2)",
                boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
              }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.2 }}
            >
              <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center">
                <WifiOff className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg mb-1">{t("extra.connectionErrorTitle")}</h3>
                <p className="text-white/70 text-sm">{t("extra.connectionErrorMessage")}</p>
              </div>
              <div className="flex flex-col gap-2 w-full">
                <motion.button
                  className="w-full py-3 rounded-2xl font-bold text-sm"
                  style={{
                    background: "linear-gradient(135deg, rgba(255,215,0,0.3) 0%, rgba(255,165,0,0.25) 100%)",
                    border: "2px solid rgba(255,215,0,0.5)",
                    color: "white",
                  }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRefresh}
                >
                  {t("common.retry")}
                </motion.button>
                <motion.button
                  className="w-full py-2.5 rounded-2xl font-medium text-sm text-white/70"
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate("/")}
                >
                  {t("common.back")}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
