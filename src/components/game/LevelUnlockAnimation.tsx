import { motion, AnimatePresence } from "framer-motion";
import { Lock, Unlock, Star } from "lucide-react";
import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { useLanguage } from "@/contexts/LanguageContext";

interface LevelUnlockAnimationProps {
  isVisible: boolean;
  unlockedLevel: number;
  iconSlug?: string;
  categoryId?: string;
  onComplete: () => void;
}

export function LevelUnlockAnimation({
  isVisible,
  unlockedLevel,
  iconSlug,
  categoryId,
  onComplete,
}: LevelUnlockAnimationProps) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<"lock" | "unlock" | "celebrate">("lock");

  useEffect(() => {
    if (!isVisible) {
      setPhase("lock");
      return;
    }

    // Phase 1: Show locked state
    const timer1 = setTimeout(() => setPhase("unlock"), 500);
    
    // Phase 2: Unlock animation
    const timer2 = setTimeout(() => {
      setPhase("celebrate");
      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.5 },
        colors: ["#FFD700", "#FFA500", "#FF6347", "#32CD32", "#4169E1"],
      });
    }, 1200);

    // Phase 3: Complete
    const timer3 = setTimeout(() => {
      onComplete();
    }, 2800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isVisible, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 safe-screen z-50 flex items-center justify-center bg-background/90 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="text-center px-6"
          >
            {/* Lock/Unlock Icon */}
            <motion.div
              className="relative mx-auto mb-6 h-32 w-32"
              animate={phase === "unlock" ? { rotate: [0, -10, 10, -5, 5, 0] } : undefined}
              transition={{ duration: 0.5 }}
            >
              {/* Background circle */}
              <motion.div
                className={`absolute inset-0 rounded-full ${
                  phase === "celebrate"
                    ? "bg-gradient-to-br from-amber-400 to-orange-500"
                    : "bg-gradient-to-br from-slate-600 to-slate-800"
                }`}
                animate={
                  phase === "celebrate"
                    ? {
                        scale: [1, 1.1, 1],
                        boxShadow: [
                          "0 0 0 0 rgba(251, 191, 36, 0)",
                          "0 0 0 20px rgba(251, 191, 36, 0.3)",
                          "0 0 0 0 rgba(251, 191, 36, 0)",
                        ],
                      }
                    : undefined
                }
                transition={{ duration: 0.8, repeat: phase === "celebrate" ? 2 : 0 }}
              />

              {/* Icon */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={phase === "unlock" ? { y: [0, -10, 0] } : undefined}
                transition={{ duration: 0.3 }}
              >
                {phase === "lock" ? (
                  <Lock className="h-16 w-16 text-white" />
                ) : phase === "unlock" ? (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <Unlock className="h-16 w-16 text-white" />
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    className="flex items-center justify-center"
                  >
                    <DynamicIcon
                      slug={iconSlug}
                      categoryId={categoryId}
                      size={64}
                    />
                  </motion.div>
                )}
              </motion.div>
            </motion.div>

            {/* Level number */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-muted-foreground text-sm mb-2">
                {phase === "celebrate" ? t("extra.newLevelUnlocked") : t("extra.unlocking")}
              </p>
              <motion.h2
                className="text-4xl font-bold text-foreground"
                animate={
                  phase === "celebrate"
                    ? { scale: [1, 1.1, 1] }
                    : undefined
                }
                transition={{ duration: 0.3 }}
              >
                {t("extra.levelNumber", { level: String(unlockedLevel) })}
              </motion.h2>
            </motion.div>

            {/* Stars animation */}
            {phase === "celebrate" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex justify-center gap-2 mt-4"
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.4 + i * 0.1, type: "spring" }}
                  >
                    <Star className="h-8 w-8 fill-amber-400 text-amber-400" />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
