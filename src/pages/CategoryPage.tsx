import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Lock, Play, LogIn, Clock, Heart } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { useCategoryProgress } from "@/hooks/useCategoryProgress";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNewCategories } from "@/hooks/useNewCategories";
import { useCategoryPlayLimit } from "@/hooks/useCategoryPlayLimit";
import { useFavorites } from "@/hooks/useFavorites";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { GreenPlayButton } from "@/components/shared/GreenPlayButton";
import { Skeleton } from "@/components/ui/skeleton";
import { LevelUnlockAnimation } from "@/components/game/LevelUnlockAnimation";
import { PageTransition } from "@/components/shared/PageTransition";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { PingPongVideo } from "@/components/shared/PingPongVideo";
import { AuthRequiredModal } from "@/components/shared/AuthRequiredModal";
import { ProRequiredModal } from "@/components/shared/ProRequiredModal";
import { CATEGORY_VIDEOS, CATEGORY_IMAGES, MAP_VIDEOS } from "@/config/videoConfig";
import { videoLoadQueue } from "@/utils/videoLoadQueue";
import { toast } from "sonner";
import { trackCategoryViewed, trackLevelSelected } from "@/lib/analytics";
import { useState, useEffect, useCallback, useMemo } from "react";
import crystalHourglass from "@/assets/crystal-hourglass.png";
import crownIcon from "@/assets/icons/crown-2.png";

// Pastel color palettes for consistent styling with Discover page
const PASTEL_PALETTES = [
  { base: '#E8F5E9', accent: '#C8E6C9', highlight: '#A5D6A7' },
  { base: '#E3F2FD', accent: '#BBDEFB', highlight: '#90CAF9' },
  { base: '#FFF3E0', accent: '#FFE0B2', highlight: '#FFCC80' },
  { base: '#FCE4EC', accent: '#F8BBD9', highlight: '#F48FB1' },
  { base: '#F3E5F5', accent: '#E1BEE7', highlight: '#CE93D8' },
  { base: '#E0F7FA', accent: '#B2EBF2', highlight: '#80DEEA' },
  { base: '#FFF8E1', accent: '#FFECB3', highlight: '#FFD54F' },
  { base: '#EFEBE9', accent: '#D7CCC8', highlight: '#BCAAA4' },
  { base: '#E8EAF6', accent: '#C5CAE9', highlight: '#9FA8DA' },
  { base: '#F1F8E9', accent: '#DCEDC8', highlight: '#C5E1A5' },
];

const getPastelColors = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const index = Math.abs(hash) % PASTEL_PALETTES.length;
  return PASTEL_PALETTES[index];
};

export default function CategoryPage() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { categories, loading: categoriesLoading } = useCategories();
  const { getCategoryProgress, getLevelStars, isLevelCompleted, loading, refetch } = useCategoryProgress();
  const { markCategorySeen } = useNewCategories();
  const { canPlayLevel, isCategoryBlocked, getLevelsPlayedInCategory, maxFreeLevelsPerCategory, isVip } = useCategoryPlayLimit();
  const { toggleFavorite, isFavorite } = useFavorites();

  const [showUnlockAnimation, setShowUnlockAnimation] = useState(false);
  const [unlockedLevel, setUnlockedLevel] = useState<number | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  
  // Check if user is a guest
  const isGuest = !user;

  // Find category from database
  const category = useMemo(() => 
    categories.find(c => c.id === categoryId),
    [categories, categoryId]
  );
  
  // The discover cards favourite by UUID and so must this, or the same
  // category would be favourited twice under two different ids.
  const favoriteId = category?.uuid || category?.id || "";
  const favorited = isFavorite(favoriteId);

  const currentLevel = getCategoryProgress(categoryId || "") || 1;
  const pastelColors = useMemo(() => getPastelColors(categoryId || ""), [categoryId]);

  // Reset video load queue on mount so header video gets immediate priority
  useEffect(() => {
    videoLoadQueue.reset();
  }, []);

  // Check for unlock animation on mount
  useEffect(() => {
    if (!categoryId) return;
    
    const unlockData = sessionStorage.getItem(`level_unlocked_${categoryId}`);
    if (unlockData) {
      try {
        const parsed = JSON.parse(unlockData);
        // Only show if recent (within last 30 seconds)
        if (Date.now() - parsed.timestamp < 30000) {
          setUnlockedLevel(parsed.unlockedLevel);
          setShowUnlockAnimation(true);
        }
        // Clear the stored data
        sessionStorage.removeItem(`level_unlocked_${categoryId}`);
      } catch {
        sessionStorage.removeItem(`level_unlocked_${categoryId}`);
      }
    }
  }, [categoryId]);

  // Clear the "NEW!" badge when user views the category
  useEffect(() => {
    if (user && category?.uuid && category?.totalLevels) {
      markCategorySeen(category.uuid, category.totalLevels);
    }
  }, [user, category?.uuid, category?.totalLevels, markCategorySeen]);

  // Track category viewed
  useEffect(() => {
    if (categoryId) {
      trackCategoryViewed(categoryId, "direct");
    }
  }, [categoryId]);

  const handleUnlockComplete = useCallback(() => {
    setShowUnlockAnimation(false);
    setUnlockedLevel(null);
    // Refetch progress to ensure UI is updated
    refetch();
  }, [refetch]);

  const handlePlayFromLeaderboard = () => {
    // Require authentication to play
    if (isGuest) {
      setShowAuthModal(true);
      return;
    }
    // Check category limits
    if (!canPlayLevel(categoryId || "", currentLevel)) {
      setShowProModal(true);
      return;
    }
    navigate(`/play/${categoryId}/${currentLevel}`);
  };

  // IMPORTANT: Hooks must run in the same order on every render.
  // We compute these before any early returns so we don't conditionally skip hooks
  // (which can cause React minified error #310: "Rendered more hooks than during the previous render.")
  const TOTAL_DISPLAY_LEVELS = 100;
  const availableLevels = category?.totalLevels ?? 0;
  const hasCompletedAllAvailable = currentLevel > availableLevels;

  // Always show 100 levels, with different states based on available questions
  const levels = useMemo(
    () =>
      Array.from({ length: TOTAL_DISPLAY_LEVELS }, (_, i) => {
        const level = i + 1;
        const hasEnoughQuestions = level <= availableLevels;
        const completed = hasEnoughQuestions && isLevelCompleted(categoryId || "", level);
        const isUnlocked = hasEnoughQuestions && level <= currentLevel;
        const isCurrent = hasEnoughQuestions && level === currentLevel;
        const isComingSoon = !hasEnoughQuestions; // Not enough questions for this level yet
        const stars = getLevelStars(categoryId || "", level);
        // PRO-locked: level is beyond the free limit and user is not VIP
        const isProLocked = !isVip && !isComingSoon && hasEnoughQuestions && level > maxFreeLevelsPerCategory && !completed;

        return { level, isCompleted: completed, isUnlocked, isCurrent, isComingSoon, stars, isProLocked };
      }),
    [TOTAL_DISPLAY_LEVELS, availableLevels, categoryId, currentLevel, isLevelCompleted, getLevelStars, isVip, maxFreeLevelsPerCategory]
  );

  if (categoriesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-12 w-48" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">{t('category.notFound')}</p>
          <ChunkyButton onClick={() => navigate("/")} className="mt-4">
            {t('nav.home')}
          </ChunkyButton>
        </div>
      </div>
    );
  }

  const handleLevelClick = (level: number, isUnlocked: boolean, isProLocked: boolean) => {
    if (!isUnlocked && !isProLocked) return;
    
    // PRO-locked level
    if (isProLocked) {
      setShowProModal(true);
      return;
    }
    
    // Require authentication to play
    if (isGuest) {
      setShowAuthModal(true);
      return;
    }

    // Check category play limits (DB-based, no holes)
    if (!canPlayLevel(categoryId || "", level)) {
      setShowProModal(true);
      return;
    }

    trackLevelSelected(categoryId || "", level);
    navigate(`/play/${categoryId}/${level}`);
  };

  return (
    <PageTransition>
      {/* Auth Required Modal */}
      <AuthRequiredModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        returnToPath={`/category/${categoryId}`}
        message={t("extra.signInForGame")}
      />
      {/* PRO Required Modal */}
      <ProRequiredModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        feature="general"
      />
      {/* Level Unlock Animation */}
      <LevelUnlockAnimation
        isVisible={showUnlockAnimation}
        unlockedLevel={unlockedLevel || 1}
        iconSlug={category.icon_slug}
        categoryId={category.id}
        onComplete={handleUnlockComplete}
      />


      <div className="min-h-screen flex flex-col relative bg-background">
        {/* Category Video Header Section - fixed height for clean tab positioning */}
        <div className="relative h-[48vh] min-h-[340px] overflow-hidden">
          <div className="absolute inset-0">
            <PingPongVideo 
              src={CATEGORY_VIDEOS[(category as any).category_id || categoryId || ""] || CATEGORY_VIDEOS.animals}
              posterUrl={CATEGORY_IMAGES[(category as any).category_id || categoryId || ""] || undefined}
              
            />
          </div>
          {/* Refined gradient overlay */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.45) 100%)',
            }}
          />
          
          {/* Navigation buttons */}
          <div className="absolute top-12 left-5 right-5 flex items-center justify-between z-10">
            <button
              onClick={() => navigate("/discover")}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-black/25 backdrop-blur-md border border-white/20"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            <div className="flex items-center gap-2">
              {!user && (
                <button
                  onClick={() => navigate("/auth")}
                  className="flex items-center gap-1.5 text-sm text-white font-medium bg-black/25 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full"
                >
                  <LogIn className="h-4 w-4" />
                  {t('auth.signIn')}
                </button>
              )}
              {/* Favourite. Keyed on the category's UUID, the same id the
                  discover cards use — user_favorites.category_id is a foreign
                  key to categories, so the route slug would not match. Guests
                  get it too: useFavorites keeps theirs in localStorage. */}
              <button
                onClick={() => favoriteId && toggleFavorite(favoriteId)}
                disabled={!favoriteId}
                aria-label={t('discover.favorites')}
                aria-pressed={favorited}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-black/25 backdrop-blur-md border border-white/20 active:scale-95 transition-transform"
              >
                <Heart
                  className={`h-5 w-5 transition-colors ${
                    favorited ? "fill-red-500 text-red-500" : "text-white"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Title - positioned near bottom of video - Mobile only */}
          <div className="absolute bottom-14 left-5 right-5 z-10 md:hidden">
            <div className="max-w-3xl mx-auto">
              <h1 className="text-3xl font-bold text-white drop-shadow-lg tracking-tight">{category.name}</h1>
            </div>
          </div>
        </div>

        {/* White overlay container - positioned to straddle video/content boundary - Desktop/Tablet only */}
        <div className="relative px-5 -mt-10 z-20 hidden md:block md:px-20 lg:px-28">
          <div className="max-w-3xl mx-auto">
            <div
              className="flex items-center justify-between px-6 py-6 rounded-[24px]"
              // Main page card recipe — lavender-white, #e8e0f5 border, chunky lip
              style={{
                background: 'rgba(252,247,255,0.92)',
                boxShadow: '0 3.6px 0 0 #d8d0e8, 0 5.4px 14.5px 0 rgba(0,0,0,0.1), inset 0 1.8px 0 0 #ffffff',
                border: '1.5px solid #e8e0f5',
              }}
            >
              <h1 className="text-2xl font-bold text-slate-800">{category.name}</h1>
              <GreenPlayButton
                onClick={handlePlayFromLeaderboard}
                icon={<Play className="h-4 w-4 fill-current" />}
                className="h-11 px-6 text-sm"
              >
                {t("extra.playButton")}
              </GreenPlayButton>
            </div>
          </div>
        </div>

        {/* Floating Tabs - positioned to straddle video/content boundary - Mobile only */}
        <div className="relative px-5 -mt-7 z-20 md:hidden">
          <div className="max-w-3xl mx-auto">
            <div
              className="flex gap-1 rounded-[24px] p-3"
              style={{
                background: 'rgba(252,247,255,0.92)',
                boxShadow: '0 3.6px 0 0 #d8d0e8, 0 5.4px 14.5px 0 rgba(0,0,0,0.1), inset 0 1.8px 0 0 #ffffff',
                border: '1.5px solid #e8e0f5',
              }}
            >
              <GreenPlayButton
                onClick={handlePlayFromLeaderboard}
                icon={<Play className="h-4 w-4 fill-current" />}
                className="flex-1 h-12 text-sm"
              >
                {t("extra.playButton")}
              </GreenPlayButton>
            </div>
          </div>
        </div>

        {/* Main Content Section - clean white background */}
        <div className="flex-1 px-5 md:px-24 lg:px-32 pt-5 pb-8 overflow-auto">
          <div className="max-w-3xl mx-auto">
            {/* Mobile: Tab-based content */}
            <div className="md:hidden">
              <MapGridContent />
            </div>
            
            {/* Desktop/Tablet: Show map directly */}
            <div className="hidden md:block">
              <MapGridContent />
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );

  function MapGridContent() {
    return (
      <>
        <div className="flex items-center justify-between mb-4 md:hidden">
          <h2 className="text-lg font-bold text-slate-800">
            {t('category.chooseLevel')}
          </h2>
        </div>

        {/* All levels completed message */}
        {hasCompletedAllAvailable && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-4 mb-6 border border-primary/20"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(280 60% 50% / 0.1))',
            }}
          >
            <div className="flex items-center gap-3">
              <img src={crystalHourglass} alt="Coming soon" className="w-12 h-12 object-contain" />
              <div>
                <h3 className="font-bold text-slate-800">{t('category.allCompleted')}</h3>
                <p className="text-sm text-slate-600">
                  {t('category.newLevelsSoon')}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {loading ? (
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {levels.map(({ level, isCompleted, isUnlocked, isCurrent, isComingSoon, stars, isProLocked }) => {
              const justUnlocked = unlockedLevel === level && !showUnlockAnimation;
              
              const getCompletedGradient = (starCount: number) => {
                switch (starCount) {
                  case 3: return "linear-gradient(135deg, #A855F7, #9333EA)";
                  case 2: return "linear-gradient(135deg, #60A5FA, #3B82F6)";
                  case 1: return "linear-gradient(135deg, #FCD34D, #F59E0B)";
                  default: return undefined;
                }
              };
              
              const getLevelBackground = () => {
                if (isComingSoon) return "linear-gradient(135deg, #F8FAFC, #F1F5F9)";
                if (isProLocked) return "linear-gradient(135deg, #F3E8FF, #E9D5FF)";
                if (!isUnlocked) return "linear-gradient(135deg, #E2E8F0, #CBD5E1)";
                if (isCompleted && stars > 0) return getCompletedGradient(stars);
                return "rgba(252,247,255,0.92)";
              };

              const isNeutralTile =
                !isComingSoon && !isProLocked && isUnlocked && !(isCompleted && stars > 0);
              
              return (
                <motion.button
                  key={level}
                  onClick={() => !isComingSoon && handleLevelClick(level, isUnlocked || isProLocked, isProLocked)}
                  disabled={isComingSoon || (!isUnlocked && !isProLocked)}
                  whileHover={(isUnlocked || isProLocked) && !isComingSoon ? { scale: 1.05 } : undefined}
                  whileTap={(isUnlocked || isProLocked) && !isComingSoon ? { scale: 0.95 } : undefined}
                  initial={justUnlocked ? { scale: 0.8, opacity: 0 } : undefined}
                  animate={justUnlocked ? { scale: 1, opacity: 1 } : undefined}
                  transition={justUnlocked ? { type: "spring", stiffness: 400, damping: 20 } : undefined}
                  className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center ${
                    isCurrent && !isProLocked ? "ring-4 ring-primary ring-offset-2 ring-offset-background" : ""
                  } ${
                    isComingSoon
                      ? "opacity-40 cursor-not-allowed border-2 border-dashed border-slate-300"
                      : isProLocked
                        ? "opacity-80 cursor-pointer border border-purple-300/50"
                        : !isUnlocked
                          ? "opacity-60 cursor-not-allowed"
                          : ""
                  }`}
                  style={{
                    boxShadow: isNeutralTile
                      ? "0 3.6px 0 0 #d8d0e8, 0 5.4px 14.5px 0 rgba(0,0,0,0.1), inset 0 1.8px 0 0 #ffffff"
                      : isUnlocked && !isComingSoon && !isProLocked
                        ? "0 4px 0 0 hsl(0 0% 0% / 0.15), 0 6px 12px -4px hsl(0 0% 0% / 0.2), inset 0 1.8px 0 0 rgba(255,255,255,0.35)"
                        : "0 2px 0 0 hsl(0 0% 0% / 0.05)",
                    border: isNeutralTile ? "1.5px solid #e8e0f5" : undefined,
                    background: getLevelBackground(),
                  }}
                >
                  {isComingSoon ? (
                    <div className="flex flex-col items-center gap-0.5">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <span className="text-xs text-slate-400 font-medium">{level}</span>
                    </div>
                  ) : isProLocked ? (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="font-bold text-lg text-purple-400/70">{level}</span>
                      <img src={crownIcon} alt="PRO" className="h-4 w-4 object-contain opacity-60" />
                    </div>
                  ) : !isUnlocked ? (
                    <Lock className="h-5 w-5 text-slate-400" />
                  ) : (
                    <>
                      <span className={`font-bold text-lg md:text-xl ${
                        isCompleted && stars > 0 ? "text-white drop-shadow-md" : "text-slate-700"
                      }`}>{level}</span>
                      {isCompleted && stars > 0 && (
                        <div className="flex gap-0.5 mt-1">
                          {[...Array(3)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 md:h-[14px] md:w-[14px] drop-shadow ${
                                i < stars ? "fill-white text-white" : "fill-white/30 text-white/30"
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {isCurrent && isUnlocked && !isComingSoon && !isProLocked && (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary shadow-md"
                    >
                      <Play className="h-3 w-3 text-primary-foreground fill-primary-foreground" />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </>
    );
  }
}
