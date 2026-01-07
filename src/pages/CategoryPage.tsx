import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Lock, Play, LogIn, Trophy, Map, Clock } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { useCategoryProgress } from "@/hooks/useCategoryProgress";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNewLevels } from "@/hooks/useNewLevels";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { Skeleton } from "@/components/ui/skeleton";
import { LevelUnlockAnimation } from "@/components/game/LevelUnlockAnimation";
import { PageTransition } from "@/components/shared/PageTransition";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { CategoryLeaderboard } from "@/components/category/CategoryLeaderboard";
import { PingPongVideo } from "@/components/shared/PingPongVideo";
import { CATEGORY_VIDEOS, MAP_VIDEOS } from "@/config/videoConfig";
import { toast } from "sonner";
import { useState, useEffect, useCallback, useMemo } from "react";
import crystalHourglass from "@/assets/crystal-hourglass.png";

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

type TabType = "leaderboard" | "map";

export default function CategoryPage() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { categories, loading: categoriesLoading } = useCategories();
  const { getCategoryProgress, getLevelStars, isLevelCompleted, loading, refetch } = useCategoryProgress();
  const { clearNewLevelBadge } = useNewLevels();

  const [activeTab, setActiveTab] = useState<TabType>("leaderboard");
  const [showUnlockAnimation, setShowUnlockAnimation] = useState(false);
  const [unlockedLevel, setUnlockedLevel] = useState<number | null>(null);

  // Find category from database
  const category = useMemo(() => 
    categories.find(c => c.id === categoryId),
    [categories, categoryId]
  );
  
  const currentLevel = getCategoryProgress(categoryId || "") || 1;
  const pastelColors = useMemo(() => getPastelColors(categoryId || ""), [categoryId]);

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
      clearNewLevelBadge(category.uuid, category.totalLevels);
    }
  }, [user, category?.uuid, category?.totalLevels, clearNewLevelBadge]);

  const handleUnlockComplete = useCallback(() => {
    setShowUnlockAnimation(false);
    setUnlockedLevel(null);
    // Refetch progress to ensure UI is updated
    refetch();
  }, [refetch]);

  const handlePlayFromLeaderboard = () => {
    if (!user) {
      toast.info(t('category.loginToSaveProgress'), {
        description: t('category.resultsWillSave'),
        action: {
          label: t('auth.signIn'),
          onClick: () => navigate("/auth"),
        },
      });
    }
    navigate(`/play/${categoryId}/${currentLevel}`);
  };

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

  const handleLevelClick = (level: number, isUnlocked: boolean) => {
    if (!isUnlocked) return;
    
    if (!user) {
      toast.info(t('category.loginToSaveProgress'), {
        description: t('category.resultsWillSave'),
        action: {
          label: t('auth.signIn'),
          onClick: () => navigate("/auth"),
        },
      });
    }
    navigate(`/play/${categoryId}/${level}`);
  };

  // Always show 100 levels, with different states based on available questions
  const TOTAL_DISPLAY_LEVELS = 100;
  const availableLevels = category.totalLevels; // From database (based on actual questions)
  const hasCompletedAllAvailable = currentLevel > availableLevels;
  
  const levels = Array.from({ length: TOTAL_DISPLAY_LEVELS }, (_, i) => {
    const level = i + 1;
    const hasEnoughQuestions = level <= availableLevels;
    const completed = hasEnoughQuestions && isLevelCompleted(categoryId || "", level);
    const isUnlocked = hasEnoughQuestions && level <= currentLevel;
    const isCurrent = hasEnoughQuestions && level === currentLevel;
    const isComingSoon = !hasEnoughQuestions; // Not enough questions for this level yet
    const stars = getLevelStars(categoryId || "", level);
    
    return { level, isCompleted: completed, isUnlocked, isCurrent, isComingSoon, stars };
  });

  return (
    <PageTransition>
      {/* Level Unlock Animation */}
      <LevelUnlockAnimation
        isVisible={showUnlockAnimation}
        unlockedLevel={unlockedLevel || 1}
        categoryIcon={category.icon}
        onComplete={handleUnlockComplete}
      />


      <div className="min-h-screen flex flex-col relative bg-background">
        {/* Category Video Header Section - fixed height for clean tab positioning */}
        <div className="relative h-[48vh] min-h-[340px] overflow-hidden">
          <div className="absolute inset-0">
            <PingPongVideo 
              src={CATEGORY_VIDEOS[(category as any).category_id || categoryId || ""] || CATEGORY_VIDEOS.animals} 
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
            {!user && (
              <button
                onClick={() => navigate("/auth")}
                className="flex items-center gap-1.5 text-sm text-white font-medium bg-black/25 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full"
              >
                <LogIn className="h-4 w-4" />
                {t('auth.signIn')}
              </button>
            )}
          </div>

          {/* Title - positioned near bottom of video */}
          <div className="absolute bottom-14 left-5 right-5 z-10">
            <h1 className="text-3xl font-bold text-white drop-shadow-lg tracking-tight">{category.name}</h1>
          </div>
        </div>

        {/* Floating Tabs - positioned to straddle video/content boundary */}
        <div className="relative px-5 -mt-7 z-20">
          <div 
            className="flex gap-1 rounded-2xl p-1.5"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.95) 100%)',
              boxShadow: '0 4px 20px -2px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.8), inset 0 1px 0 0 rgba(255,255,255,1)',
              border: '1px solid rgba(0,0,0,0.06)',
            }}
          >
            <button
              onClick={() => setActiveTab("leaderboard")}
              className="flex-1 relative flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-sm transition-all"
              style={{
                background: activeTab === "leaderboard" 
                  ? 'linear-gradient(180deg, #FFFFFF 0%, #F8F9FA 100%)'
                  : 'transparent',
                boxShadow: activeTab === "leaderboard"
                  ? '0 2px 8px -2px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04), inset 0 1px 0 0 rgba(255,255,255,1)'
                  : 'none',
                color: activeTab === "leaderboard" ? '#1E293B' : '#94A3B8',
              }}
            >
              <Trophy className="h-4 w-4" />
              {t('category.leaderboard')}
            </button>
            <button
              onClick={() => setActiveTab("map")}
              className="flex-1 relative flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-sm transition-all"
              style={{
                background: activeTab === "map" 
                  ? 'linear-gradient(180deg, #FFFFFF 0%, #F8F9FA 100%)'
                  : 'transparent',
                boxShadow: activeTab === "map"
                  ? '0 2px 8px -2px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04), inset 0 1px 0 0 rgba(255,255,255,1)'
                  : 'none',
                color: activeTab === "map" ? '#1E293B' : '#94A3B8',
              }}
            >
              <Map className="h-4 w-4" />
              {t('category.map')}
            </button>
          </div>
        </div>

        {/* Main Content Section - clean white background */}
        <div className="flex-1 px-5 pt-5 pb-8 overflow-auto">
            {activeTab === "leaderboard" ? (
              <CategoryLeaderboard
                categoryId={categoryId || ""}
                categoryName={category.name}
                onPlay={handlePlayFromLeaderboard}
                lightMode
              />
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
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
                        <h3 className="font-bold text-slate-800">{t('category.allCompleted') || 'გილოცავ!'}</h3>
                        <p className="text-sm text-slate-600">
                          {t('category.newLevelsSoon') || 'ყველა დონე გაიარე! მალე ახალი დონეები დაემატება...'}
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
                    {levels.map(({ level, isCompleted, isUnlocked, isCurrent, isComingSoon, stars }) => {
                      const justUnlocked = unlockedLevel === level && !showUnlockAnimation;
                      
                      // Medal colors for top 3 levels, star-based gradients for others
                      const getMedalGradient = (levelNum: number) => {
                        switch (levelNum) {
                          case 1: return "linear-gradient(135deg, #FFD700, #FFA500)"; // Gold
                          case 2: return "linear-gradient(135deg, #C0C0C0, #A8A8A8)"; // Silver
                          case 3: return "linear-gradient(135deg, #CD7F32, #B87333)"; // Bronze
                          default: return null;
                        }
                      };
                      
                      // Star-based gradients for completed levels
                      const getCompletedGradient = (starCount: number) => {
                        switch (starCount) {
                          case 3: return "linear-gradient(135deg, #A855F7, #9333EA)"; // Purple
                          case 2: return "linear-gradient(135deg, #60A5FA, #3B82F6)"; // Blue
                          case 1: return "linear-gradient(135deg, #FCD34D, #F59E0B)"; // Yellow
                          default: return undefined; // No color for 0 stars
                        }
                      };
                      
                      const getLevelBackground = () => {
                        if (isComingSoon) return "linear-gradient(135deg, #F8FAFC, #F1F5F9)"; // Very light gray for coming soon
                        if (!isUnlocked) return "linear-gradient(135deg, #E2E8F0, #CBD5E1)"; // Slate for locked
                        // Apply medal colors for top 3 levels
                        const medalGradient = getMedalGradient(level);
                        if (medalGradient && isUnlocked) return medalGradient;
                        if (isCompleted && stars > 0) return getCompletedGradient(stars);
                        // Neutral white/gray for unlocked levels without stars (current level)
                        return "linear-gradient(135deg, #FFFFFF, #F1F5F9)";
                      };
                      
                      return (
                        <motion.button
                          key={level}
                          onClick={() => !isComingSoon && handleLevelClick(level, isUnlocked)}
                          disabled={!isUnlocked || isComingSoon}
                          whileHover={isUnlocked && !isComingSoon ? { scale: 1.05 } : undefined}
                          whileTap={isUnlocked && !isComingSoon ? { scale: 0.95 } : undefined}
                          initial={justUnlocked ? { scale: 0.8, opacity: 0 } : undefined}
                          animate={justUnlocked ? { scale: 1, opacity: 1 } : undefined}
                          transition={justUnlocked ? { type: "spring", stiffness: 400, damping: 20 } : undefined}
                          className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center ${
                            isCurrent
                              ? "ring-4 ring-primary ring-offset-2 ring-offset-background"
                              : ""
                          } ${
                            isComingSoon
                              ? "opacity-40 cursor-not-allowed border-2 border-dashed border-slate-300"
                              : !isUnlocked
                                ? "opacity-60 cursor-not-allowed"
                                : ""
                          }`}
                          style={{
                            boxShadow: isUnlocked && !isComingSoon
                              ? "0 4px 0 0 hsl(0 0% 0% / 0.15), 0 6px 12px -4px hsl(0 0% 0% / 0.2)"
                              : "0 2px 0 0 hsl(0 0% 0% / 0.05)",
                            background: getLevelBackground(),
                          }}
                        >
                          {isComingSoon ? (
                            // Coming soon state - clock icon with faded level number
                            <div className="flex flex-col items-center gap-0.5">
                              <Clock className="h-4 w-4 text-slate-400" />
                              <span className="text-xs text-slate-400 font-medium">{level}</span>
                            </div>
                          ) : !isUnlocked ? (
                            <Lock className="h-5 w-5 text-slate-400" />
                          ) : (
                            <>
                              <span className={`font-bold text-lg ${
                                isCompleted && stars > 0
                                  ? "text-white drop-shadow-md"
                                  : "text-slate-700"
                              }`}>{level}</span>
                              {isCompleted && stars > 0 && (
                                <div className="flex gap-0.5 mt-1">
                                  {[...Array(3)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-3 w-3 drop-shadow ${
                                        i < stars
                                          ? "fill-white text-white"
                                          : "fill-white/30 text-white/30"
                                      }`}
                                    />
                                  ))}
                                </div>
                              )}
                            </>
                          )}

                          {isCurrent && isUnlocked && !isComingSoon && (
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
            )}
        </div>
      </div>
    </PageTransition>
  );
}
