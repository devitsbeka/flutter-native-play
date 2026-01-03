import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Lock, Play, LogIn, Trophy, Map } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { useCategoryProgress } from "@/hooks/useCategoryProgress";
import { useAuth } from "@/hooks/useAuth";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { Skeleton } from "@/components/ui/skeleton";
import { LevelUnlockAnimation } from "@/components/game/LevelUnlockAnimation";
import { PageTransition } from "@/components/shared/PageTransition";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { CategoryLeaderboard } from "@/components/category/CategoryLeaderboard";
import { PingPongVideo } from "@/components/shared/PingPongVideo";
import { CATEGORY_VIDEOS } from "@/config/videoConfig";
import { toast } from "sonner";
import { useState, useEffect, useCallback, useMemo } from "react";

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
  const { categories, loading: categoriesLoading } = useCategories();
  const { getCategoryProgress, getLevelStars, isLevelCompleted, loading, refetch } = useCategoryProgress();

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

  const handleUnlockComplete = useCallback(() => {
    setShowUnlockAnimation(false);
    setUnlockedLevel(null);
    // Refetch progress to ensure UI is updated
    refetch();
  }, [refetch]);

  const handlePlayFromLeaderboard = () => {
    if (!user) {
      toast.info("შედით სისტემაში პროგრესის შესანახად!", {
        description: "თქვენი შედეგები შეინახება სისტემაში შესვლის შემდეგ.",
        action: {
          label: "შესვლა",
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
          <p className="text-muted-foreground">კატეგორია ვერ მოიძებნა</p>
          <ChunkyButton onClick={() => navigate("/")} className="mt-4">
            მთავარი
          </ChunkyButton>
        </div>
      </div>
    );
  }

  const handleLevelClick = (level: number, isUnlocked: boolean) => {
    if (!isUnlocked) return;
    
    if (!user) {
      toast.info("შედით სისტემაში პროგრესის შესანახად!", {
        description: "თქვენი შედეგები შეინახება სისტემაში შესვლის შემდეგ.",
        action: {
          label: "შესვლა",
          onClick: () => navigate("/auth"),
        },
      });
    }
    navigate(`/play/${categoryId}/${level}`);
  };

  const levels = Array.from({ length: category.totalLevels }, (_, i) => {
    const level = i + 1;
    const completed = isLevelCompleted(categoryId || "", level);
    const isUnlocked = level <= currentLevel;
    const isCurrent = level === currentLevel;
    const stars = getLevelStars(categoryId || "", level);
    
    return { level, isCompleted: completed, isUnlocked, isCurrent, stars };
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


      <div className="min-h-screen flex flex-col">
        {/* Video Header */}
        <div className="relative h-[280px] overflow-hidden">
          {/* Video layer - no blur */}
          <div className="absolute inset-0">
            <PingPongVideo 
              src={CATEGORY_VIDEOS[(category as any).category_id || categoryId || ""] || CATEGORY_VIDEOS.animals} 
            />
          </div>
          
          {/* Dark gradient overlay for text readability */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 30%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0.85) 100%)',
            }}
          />

          {/* Navigation buttons */}
          <div className="absolute top-12 left-5 right-5 z-10 flex items-center justify-between">
            <button
              onClick={() => navigate("/discover")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            {!user && (
              <button
                onClick={() => navigate("/auth")}
                className="flex items-center gap-1.5 text-sm text-white font-medium bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full"
              >
                <LogIn className="h-4 w-4" />
                შესვლა
              </button>
            )}
          </div>

          {/* Left-aligned title and description at bottom of video */}
          <div className="absolute bottom-4 left-5 right-5 z-10">
            <h1 className="text-2xl font-bold text-white drop-shadow-lg">{category.name}</h1>
            <p className="text-white/80 text-sm mt-1 drop-shadow-md">{category.description}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="relative px-5 mb-4 z-10">
          <div className="flex gap-2 bg-white/80 backdrop-blur-sm rounded-full p-1 shadow-sm">
            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-full font-semibold text-sm transition-all ${
                activeTab === "leaderboard"
                  ? "bg-white text-slate-800 shadow-md"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <Trophy className="h-4 w-4" />
              ლიდერბორდი
            </button>
            <button
              onClick={() => setActiveTab("map")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-full font-semibold text-sm transition-all ${
                activeTab === "map"
                  ? "bg-white text-slate-800 shadow-md"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <Map className="h-4 w-4" />
              რუკა
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative rounded-t-3xl bg-[#1a1a2e] px-5 pt-6 pb-8 overflow-hidden">
          {activeTab === "leaderboard" ? (
            <CategoryLeaderboard
              categoryId={categoryId || ""}
              categoryName={category.name}
              onPlay={handlePlayFromLeaderboard}
            />
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">
                  აირჩიე დონე
                </h2>
              </div>

              {loading ? (
                <div className="grid grid-cols-4 gap-3">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-square rounded-2xl" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {levels.map(({ level, isCompleted, isUnlocked, isCurrent, stars }) => {
                    const justUnlocked = unlockedLevel === level && !showUnlockAnimation;
                    
                    return (
                      <motion.button
                        key={level}
                        onClick={() => handleLevelClick(level, isUnlocked)}
                        disabled={!isUnlocked}
                        whileHover={isUnlocked ? { scale: 1.05 } : undefined}
                        whileTap={isUnlocked ? { scale: 0.95 } : undefined}
                        initial={justUnlocked ? { scale: 0.8, opacity: 0 } : undefined}
                        animate={justUnlocked ? { scale: 1, opacity: 1 } : undefined}
                        transition={justUnlocked ? { type: "spring", stiffness: 400, damping: 20 } : undefined}
                        className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center ${
                          isCurrent
                            ? "ring-4 ring-primary ring-offset-2 ring-offset-background"
                            : ""
                        } ${
                          !isUnlocked
                            ? "bg-muted opacity-50 cursor-not-allowed"
                            : isCompleted
                            ? "bg-success"
                            : ""
                        }`}
                        style={{
                          boxShadow: isUnlocked 
                            ? "0 4px 0 0 hsl(0 0% 0% / 0.15)"
                            : "0 2px 0 0 hsl(var(--border))",
                          ...(!isUnlocked || isCompleted ? {} : { background: `linear-gradient(135deg, ${pastelColors.accent}, ${pastelColors.highlight})` }),
                        }}
                      >
                        {!isUnlocked ? (
                          <Lock className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <>
                            <span className="font-bold text-white text-lg">{level}</span>
                            {isCompleted && (
                              <div className="flex gap-0.5 mt-1">
                                {[...Array(3)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-3 w-3 ${
                                      i < stars
                                        ? "fill-amber-300 text-amber-300"
                                        : "fill-white/30 text-white/30"
                                    }`}
                                  />
                                ))}
                              </div>
                            )}
                          </>
                        )}

                        {isCurrent && isUnlocked && (
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary"
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
