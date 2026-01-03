import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCategories, TransformedCategory } from "@/hooks/useCategories";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PlayCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCategory: (categoryId: string | null) => void;
}

export function PlayCategoryModal({ 
  open, 
  onOpenChange, 
  onSelectCategory 
}: PlayCategoryModalProps) {
  const { categories, loading: categoriesLoading } = useCategories();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [matchmakingProgress, setMatchmakingProgress] = useState(0);
  const [matchmakingText, setMatchmakingText] = useState("მოთამაშის ძებნა...");

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSelectedCategoryId(null);
      setIsMatchmaking(false);
      setMatchmakingProgress(0);
    }
  }, [open]);

  // Matchmaking animation
  useEffect(() => {
    if (!isMatchmaking) return;

    const texts = [
      "მოთამაშის ძებნა...",
      "მოთამაშე ნაპოვნია!",
      "კითხვების მომზადება...",
      "თამაშის დაწყება!"
    ];

    let progress = 0;
    const interval = setInterval(() => {
      progress += 8;
      setMatchmakingProgress(Math.min(progress, 100));
      
      if (progress < 30) {
        setMatchmakingText(texts[0]);
      } else if (progress < 50) {
        setMatchmakingText(texts[1]);
      } else if (progress < 80) {
        setMatchmakingText(texts[2]);
      } else {
        setMatchmakingText(texts[3]);
      }

      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          onSelectCategory(selectedCategoryId);
          onOpenChange(false);
        }, 300);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isMatchmaking, selectedCategoryId, onSelectCategory, onOpenChange]);

  const handlePlay = () => {
    setIsMatchmaking(true);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => !isMatchmaking && onOpenChange(false)}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative z-10 w-full max-w-lg bg-gradient-to-b from-white to-slate-50 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] overflow-hidden"
        >
          {/* Matchmaking Overlay */}
          <AnimatePresence>
            {isMatchmaking && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 bg-gradient-to-b from-primary/95 to-primary flex flex-col items-center justify-center gap-6 p-8"
              >
                {/* Animated Circles */}
                <div className="relative w-32 h-32">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="absolute inset-0 rounded-full border-4 border-white/30"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ 
                        scale: [0.8, 1.5, 2],
                        opacity: [0.8, 0.4, 0] 
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.4,
                        ease: "easeOut"
                      }}
                    />
                  ))}
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="w-16 h-16 text-white" />
                  </motion.div>
                </div>

                {/* Progress Bar */}
                <div className="w-full max-w-xs">
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-white rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${matchmakingProgress}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                </div>

                {/* Status Text */}
                <motion.p
                  key={matchmakingText}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-lg font-bold text-white text-center"
                >
                  {matchmakingText}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h2 className="text-xl font-display font-bold text-slate-800">
              აირჩიე კატეგორია
            </h2>
            <button
              onClick={() => onOpenChange(false)}
              disabled={isMatchmaking}
              className="p-2 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Categories Grid */}
          <ScrollArea className="h-[50vh] p-4">
            {categoriesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {/* Random / All Categories Option */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedCategoryId(null)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all",
                    selectedCategoryId === null
                      ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  )}
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 text-center leading-tight">
                    შემთხვევითი
                  </span>
                </motion.button>

                {/* Category Options - use category_id (slug) for game filtering */}
                {categories.map((category) => (
                  <CategoryOption
                    key={category.uuid}
                    category={category}
                    isSelected={selectedCategoryId === category.category_id}
                    onSelect={() => setSelectedCategoryId(category.category_id)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Play Button */}
          <div className="p-4 border-t border-slate-200 bg-white">
            <ChunkyButton
              variant="mint"
              size="lg"
              className="w-full"
              icon={<Play className="w-5 h-5 fill-current" />}
              onClick={handlePlay}
              disabled={isMatchmaking}
            >
              ითამაშე
            </ChunkyButton>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function CategoryOption({
  category,
  isSelected,
  onSelect,
}: {
  category: TransformedCategory;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onSelect}
      className={cn(
        "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all",
        isSelected
          ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
          : "border-slate-200 bg-white hover:border-slate-300"
      )}
    >
      <div className="w-14 h-14 flex items-center justify-center">
        <DynamicIcon
          categoryId={category.category_id}
          slug={category.icon_slug || undefined}
          size={48}
          fallbackEmoji={category.icon}
        />
      </div>
      <span className="text-xs font-bold text-slate-700 text-center leading-tight line-clamp-2">
        {category.name}
      </span>
    </motion.button>
  );
}
