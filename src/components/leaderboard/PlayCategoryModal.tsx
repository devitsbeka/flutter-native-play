import { ICON_URLS } from "@/lib/toast-icons";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCategories, TransformedCategory } from "@/hooks/useCategories";
import { useLanguage } from "@/contexts/LanguageContext";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GameModal, GameModalFooter } from "@/components/ui/game-modal";
import iconCoin from "@/assets/icons/icon-coin.png";
import iconGem from "@/assets/icons/icon-gem.png";
import iconXp from "@/assets/level/xp-spark.png";

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
  const { t } = useLanguage();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [matchmakingProgress, setMatchmakingProgress] = useState(0);
  const [matchmakingText, setMatchmakingText] = useState("");

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSelectedCategoryId(null);
      setIsMatchmaking(false);
      setMatchmakingProgress(0);
      setMatchmakingText(t("game.searchingPlayer"));
    }
  }, [open, t]);

  // Matchmaking animation
  useEffect(() => {
    if (!isMatchmaking) return;

    const texts = [
      t("game.searchingPlayer"),
      t("game.playerFound"),
      t("game.preparingQuestions"),
      t("game.startingGame")
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
  }, [isMatchmaking, selectedCategoryId, onSelectCategory, onOpenChange, t]);

  const handlePlay = () => {
    setIsMatchmaking(true);
  };

  const selectedCategory = categories.find(c => c.category_id === selectedCategoryId);

  return (
    <GameModal
      isOpen={open}
      onClose={!isMatchmaking ? () => onOpenChange(false) : undefined}
      title={t("game.selectCategory")}
      iconSrc={ICON_URLS.target}
      showStars={true}
      hideCloseButton={isMatchmaking}
      disableBackdropClick={isMatchmaking}
      hideFooter
      className="max-w-md"
    >
      {/* Matchmaking Overlay */}
      <AnimatePresence>
        {isMatchmaking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 rounded-3xl overflow-hidden"
            style={{
              background: "linear-gradient(180deg, #10B981 0%, #059669 100%)",
            }}
          >
            <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
              {/* Animated Circles */}
              <div className="relative w-28 h-28">
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
                  {selectedCategory ? (
                    <DynamicIcon
                      categoryId={selectedCategory.category_id}
                      slug={selectedCategory.icon_slug || undefined}
                      size={48}
                      fallbackEmoji={selectedCategory.icon}
                    />
                  ) : (
                    <Sparkles className="w-12 h-12 text-white" />
                  )}
                </motion.div>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-xs">
                <div className="h-3 bg-white/20 rounded-full overflow-hidden" style={{ boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, #FCD34D, #FBBF24)" }}
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rewards Preview - Yellow box like in other modals */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl p-4 mb-4"
        style={{
          background: "linear-gradient(180deg, #FEF9C3 0%, #FEF08A 100%)",
          border: "2px solid #FDE047",
          boxShadow: "0 4px 0 #FCD34D",
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-lg">🎁</span>
          <span className="font-bold text-amber-800">{t("game.rewards")}</span>
        </div>
        <div className="flex items-center justify-around">
          <div className="flex flex-col items-center gap-1">
            <img src={iconCoin} alt="coins" className="w-8 h-8" />
            <span className="text-sm font-bold text-amber-900">+100</span>
            <span className="text-xs text-amber-700">{t("game.coin")}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <img src={iconGem} alt="gems" className="w-8 h-8" />
            <span className="text-sm font-bold text-amber-900">+2</span>
            <span className="text-xs text-amber-700">{t("game.gem")}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <img src={iconXp} alt="xp" className="w-8 h-8" />
            <span className="text-sm font-bold text-amber-900">+50</span>
            <span className="text-xs text-amber-700">{t("common.xp")}</span>
          </div>
        </div>
      </motion.div>

      {/* Categories Grid */}
      <ScrollArea className="h-[35vh] -mx-1 px-1">
        {categoriesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5">
            {/* Random / All Categories Option */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCategoryId(null)}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all",
                selectedCategoryId === null
                  ? "bg-gradient-to-b from-emerald-400 to-emerald-500 shadow-lg"
                  : "bg-gray-100 hover:bg-gray-150"
              )}
              style={{
                boxShadow: selectedCategoryId === null 
                  ? "0 4px 0 #059669, 0 6px 12px rgba(16, 185, 129, 0.3)" 
                  : "0 3px 0 #E5E7EB"
              }}
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                selectedCategoryId === null ? "bg-white/20" : "bg-gradient-to-br from-primary to-primary/70"
              )}>
                <Sparkles className={cn("w-6 h-6", selectedCategoryId === null ? "text-white" : "text-white")} />
              </div>
              <span className={cn(
                "text-xs font-bold text-center leading-tight",
                selectedCategoryId === null ? "text-white" : "text-gray-700"
              )}>
                {t("game.random")}
              </span>
            </motion.button>

            {/* Category Options */}
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
      <div className="mt-4">
        <ChunkyButton
          variant="success"
          size="lg"
          className="w-full"
          icon={<Play className="w-5 h-5 fill-current" />}
          onClick={handlePlay}
          disabled={isMatchmaking}
        >
          {t("game.letsPlay")}
        </ChunkyButton>
      </div>
    </GameModal>
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
        "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all",
        isSelected
          ? "bg-gradient-to-b from-emerald-400 to-emerald-500"
          : "bg-gray-100 hover:bg-gray-150"
      )}
      style={{
        boxShadow: isSelected 
          ? "0 4px 0 #059669, 0 6px 12px rgba(16, 185, 129, 0.3)" 
          : "0 3px 0 #E5E7EB"
      }}
    >
      <div className="w-12 h-12 flex items-center justify-center">
        <DynamicIcon
          categoryId={category.category_id}
          slug={category.icon_slug || undefined}
          size={40}
          fallbackEmoji={category.icon}
        />
      </div>
      <span className={cn(
        "text-xs font-bold text-center leading-tight line-clamp-2",
        isSelected ? "text-white" : "text-gray-700"
      )}>
        {category.name}
      </span>
    </motion.button>
  );
}
