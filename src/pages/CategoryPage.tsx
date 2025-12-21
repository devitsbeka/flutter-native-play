import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Lock, Play } from "lucide-react";
import { getCategoryById } from "@/data/categories";
import { useCategoryProgress } from "@/hooks/useCategoryProgress";
import { ChunkyButton } from "@/components/ui/chunky-button";

export default function CategoryPage() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { getCategoryProgress } = useCategoryProgress();

  const category = getCategoryById(categoryId || "");
  const currentLevel = getCategoryProgress(categoryId || "");

  if (!category) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Category not found</p>
          <ChunkyButton onClick={() => navigate("/")} className="mt-4">
            Go Home
          </ChunkyButton>
        </div>
      </div>
    );
  }

  const levels = Array.from({ length: category.totalLevels }, (_, i) => {
    const level = i + 1;
    const isCompleted = level < currentLevel;
    const isUnlocked = level <= currentLevel || level === 1;
    const isCurrent = level === currentLevel || (currentLevel === 0 && level === 1);
    const stars = isCompleted ? Math.floor(Math.random() * 3) + 1 : 0;
    
    return { level, isCompleted, isUnlocked, isCurrent, stars };
  });

  return (
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
        <h2 className="text-lg font-bold text-foreground mb-4">
          Choose a Level
        </h2>

        <div className="grid grid-cols-4 gap-3">
          {levels.map(({ level, isCompleted, isUnlocked, isCurrent, stars }) => (
            <motion.button
              key={level}
              onClick={() => isUnlocked && navigate(`/play/${categoryId}/${level}`)}
              disabled={!isUnlocked}
              whileHover={isUnlocked ? { scale: 1.05 } : undefined}
              whileTap={isUnlocked ? { scale: 0.95 } : undefined}
              className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center ${
                isCurrent 
                  ? "ring-4 ring-primary ring-offset-2 ring-offset-background"
                  : ""
              } ${
                !isUnlocked
                  ? "bg-muted opacity-50 cursor-not-allowed"
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
          ))}
        </div>
      </div>
    </div>
  );
}
