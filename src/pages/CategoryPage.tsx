import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Lock, Play, LogIn, Clock } from "lucide-react";
import { getCategoryById } from "@/data/categories";
import { useCategoryProgress } from "@/hooks/useCategoryProgress";
import { useAuth } from "@/hooks/useAuth";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { Skeleton } from "@/components/ui/skeleton";
import { LevelUnlockAnimation } from "@/components/game/LevelUnlockAnimation";
import { ComingSoonModal } from "@/components/game/ComingSoonModal";
import { useQuestionAvailability } from "@/hooks/useQuestionAvailability";
import { toast } from "sonner";
import { useState, useEffect, useCallback } from "react";

export default function CategoryPage() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getCategoryProgress, getLevelStars, isLevelCompleted, loading, refetch } = useCategoryProgress();
  const { hasEnoughQuestions, loading: availabilityLoading } = useQuestionAvailability();

  const [showUnlockAnimation, setShowUnlockAnimation] = useState(false);
  const [unlockedLevel, setUnlockedLevel] = useState<number | null>(null);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

  const category = getCategoryById(categoryId || "");
  const currentLevel = getCategoryProgress(categoryId || "") || 1;

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
    
    // Check if level has enough questions
    const hasQuestions = hasEnoughQuestions(categoryId || "", level);
    if (!hasQuestions) {
      setSelectedLevel(level);
      setShowComingSoon(true);
      return;
    }
    
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
    const hasQuestions = !availabilityLoading && hasEnoughQuestions(categoryId || "", level);
    
    return { level, isCompleted: completed, isUnlocked, isCurrent, stars, hasQuestions };
  });

  return (
    <>
      {/* Level Unlock Animation */}
      <LevelUnlockAnimation
        isVisible={showUnlockAnimation}
        unlockedLevel={unlockedLevel || 1}
        categoryIcon={category.icon}
        onComplete={handleUnlockComplete}
      />

      {/* Coming Soon Modal */}
      <ComingSoonModal
        isOpen={showComingSoon}
        onClose={() => setShowComingSoon(false)}
        categoryName={category.name}
        levelNumber={selectedLevel || undefined}
      />

      <div className="min-h-screen bg-background">
        {/* Header */}
        <div 
          className={`bg-gradient-to-br ${category.color} px-5 pb-10 pt-12`}
        >
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate("/")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
          </div>

          <div className="text-center">
            <div 
              className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/20 text-5xl backdrop-blur-sm"
              style={{ boxShadow: "inset 0 -4px 0 0 hsl(0 0% 0% / 0.15)" }}
            >
              {category.icon}
            </div>
            <h1 className="text-2xl font-bold text-white">{category.name}</h1>
            <p className="text-white/80">{category.description}</p>
          </div>
        </div>

        {/* Content */}
        <div className="relative -mt-4 rounded-t-3xl bg-background px-5 pt-6 pb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">
              აირჩიე დონე
            </h2>
            {!user && (
              <button
                onClick={() => navigate("/auth")}
                className="flex items-center gap-1.5 text-sm text-primary font-medium"
              >
                <LogIn className="h-4 w-4" />
                შესვლა
              </button>
            )}
          </div>

          {loading || availabilityLoading ? (
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {levels.map(({ level, isCompleted, isUnlocked, isCurrent, stars, hasQuestions }) => {
                // Check if this level was just unlocked
                const justUnlocked = unlockedLevel === level && !showUnlockAnimation;
                const isComingSoon = isUnlocked && !hasQuestions && !isCompleted;
                
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
                      isCurrent && !isComingSoon
                        ? "ring-4 ring-primary ring-offset-2 ring-offset-background"
                        : ""
                    } ${
                      !isUnlocked
                        ? "bg-muted opacity-50 cursor-not-allowed"
                        : isComingSoon
                        ? "bg-gradient-to-br from-amber-400 to-orange-500"
                        : isCompleted
                        ? "bg-success"
                        : `bg-gradient-to-br ${category.color}`
                    }`}
                    style={{
                      boxShadow: isUnlocked 
                        ? "0 4px 0 0 hsl(0 0% 0% / 0.15)"
                        : "0 2px 0 0 hsl(var(--border))",
                    }}
                  >
                    {!isUnlocked ? (
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    ) : isComingSoon ? (
                      <>
                        <Clock className="h-5 w-5 text-white mb-0.5" />
                        <span className="text-[10px] font-bold text-white/90">მალე</span>
                      </>
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

                    {isCurrent && isUnlocked && !isComingSoon && (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary"
                      >
                        <Play className="h-3 w-3 text-primary-foreground fill-primary-foreground" />
                      </motion.div>
                    )}

                    {/* Coming soon indicator badge */}
                    {isComingSoon && (
                      <motion.div
                        animate={{ rotate: [-5, 5, -5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px]"
                      >
                        🏗️
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
