import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Lock, Check, Play } from "lucide-react";
import { getCountryByCode, type Category } from "@/data/worldData";
import { useWorldProgress } from "@/hooks/useWorldProgress";
import { cn } from "@/lib/utils";
import { ChunkyButton } from "@/components/ui/chunky-button";

export default function CountryPage() {
  const { countryCode } = useParams<{ countryCode: string }>();
  const navigate = useNavigate();
  const { 
    getCategoryProgress, 
    isCategoryCompleted, 
    isCategoryUnlocked,
    loading 
  } = useWorldProgress();

  const countryData = getCountryByCode(countryCode || "");

  if (!countryData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Country not found</p>
      </div>
    );
  }

  const { country, continent } = countryData;
  const categoryProgress = getCategoryProgress(countryCode || "");

  const getCategoryCompletionPercent = (categoryId: string): number => {
    const progress = categoryProgress.find(p => p.category_id === categoryId);
    if (!progress) return 0;
    if (progress.completed) return 100;
    return Math.round((progress.questions_correct / 5) * 100); // 5 questions per category
  };

  const handleCategoryClick = (category: Category) => {
    if (isCategoryUnlocked(countryCode || "", category.id)) {
      navigate(`/play/${countryCode}/${category.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-purple px-6 pt-12 pb-8">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate(`/continent/${continent.id}`)}
            className="p-2 rounded-full bg-primary-foreground/10"
          >
            <ArrowLeft className="w-5 h-5 text-primary-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-primary-foreground flex items-center gap-2">
              {country.emoji} {country.name}
            </h1>
            <p className="text-primary-foreground/70 text-sm">
              {continent.name} • {country.categories.length} categories
            </p>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="px-6 py-6">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading categories...
          </div>
        ) : (
          <div className="space-y-4">
            {country.categories.map((category, index) => {
              const unlocked = isCategoryUnlocked(countryCode || "", category.id);
              const completed = isCategoryCompleted(countryCode || "", category.id);
              const completionPercent = getCategoryCompletionPercent(category.id);

              return (
                <motion.button
                  key={category.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleCategoryClick(category)}
                  disabled={!unlocked}
                  className={cn(
                    "w-full p-4 rounded-2xl border-2 text-left transition-all",
                    unlocked
                      ? completed
                        ? "bg-success/10 border-success"
                        : "bg-card border-border hover:border-primary hover:shadow-lg"
                      : "bg-muted/50 border-border/50 opacity-60 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center gap-4">
                    {/* Emoji */}
                    <div className={cn(
                      "w-14 h-14 rounded-xl flex items-center justify-center text-2xl",
                      completed ? "bg-success/20" : "bg-secondary"
                    )}>
                      {category.emoji}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-foreground">
                          {category.name}
                        </h3>
                        {completed && (
                          <Check className="w-4 h-4 text-success" />
                        )}
                      </div>

                      {unlocked ? (
                        <>
                          <p className="text-sm text-muted-foreground">
                            {category.questionsRequired} questions
                          </p>
                          {/* Progress bar */}
                          {!completed && completionPercent > 0 && (
                            <>
                              <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${completionPercent}%` }}
                                  transition={{ delay: index * 0.05 + 0.3, duration: 0.5 }}
                                  className="h-full bg-primary rounded-full"
                                />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {completionPercent}% complete
                              </p>
                            </>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Complete previous category to unlock
                        </p>
                      )}
                    </div>

                    {/* Action */}
                    <div>
                      {unlocked ? (
                        completed ? (
                          <span className="text-success text-sm font-medium">✓ Done</span>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                            <Play className="w-5 h-5 text-primary-foreground fill-primary-foreground" />
                          </div>
                        )
                      ) : (
                        <Lock className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
