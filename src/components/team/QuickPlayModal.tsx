import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import { Gamepad2, Clock, Zap } from "lucide-react";
import { Friend } from "@/hooks/useFriends";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { GameModal, GameModalFooter } from "@/components/ui/game-modal";
import { Category } from "@/data/categories";
import { useCategories } from "@/hooks/useCategories";
import { excludePartyCategories } from "@/config/partyCategories";
import { ScrollArea } from "@/components/ui/scroll-area";

interface QuickPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  friend: Friend | null;
  onStartChallenge: (friend: Friend, category: Category) => void;
  isLoading?: boolean;
}

export function QuickPlayModal({ 
  isOpen, 
  onClose, 
  friend, 
  onStartChallenge,
  isLoading 
}: QuickPlayModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryType, setCategoryType] = useState<"classic" | "fun" | "educational">("classic");
  const { t } = useLanguage();
  // The live category list, name already in the viewer's language — the
  // static src/data list carries the Georgian base names only.
  const { categories } = useCategories();

  if (!friend) return null;

  // Friend challenges replay fixed questions solo - a party vote category
  // has no fixed answers to challenge anyone with.
  const filteredCategories = excludePartyCategories(categories).filter(c => c.type === categoryType);

  const handleStartChallenge = () => {
    if (!selectedCategory) return;
    onStartChallenge(friend, selectedCategory);
  };

  // Custom header with friend info
  const headerIcon = (
    <SmartAvatar
      avatarUrl={friend.avatarUrl}
      animatedAvatarUrl={friend.animatedAvatarUrl}
      fallback={friend.nickname}
      size="xl"
      className="ring-2 ring-purple-200"
      showSparkle={true}
      autoPlay={true}
    />
  );

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      icon={headerIcon}
      title={friend.nickname}
      subtitle={friend.isOnline ? t("extra.onlineStatus") : t("extra.offlineStatus")}
      variant="primary"
    >
      {/* Game Mode Indicator */}
      <div className="flex justify-center mb-4">
        <div 
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap"
          style={{
            background: friend.isOnline 
              ? "linear-gradient(180deg, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.05) 100%)"
              : "linear-gradient(180deg, rgba(251,191,36,0.15) 0%, rgba(251,191,36,0.05) 100%)",
            border: friend.isOnline 
              ? "2px solid rgba(34,197,94,0.3)"
              : "2px solid rgba(251,191,36,0.3)",
            boxShadow: friend.isOnline 
              ? "0 2px 0 rgba(34,197,94,0.15)"
              : "0 2px 0 rgba(251,191,36,0.15)",
            color: friend.isOnline ? "#15803D" : "#B45309",
          }}
        >
          {friend.isOnline ? (
            <>
              <Zap className="w-4 h-4" />
              {t("extra.realtimeGame")}
            </>
          ) : (
            <>
              <Clock className="w-4 h-4" />
              {t("extra.asyncChallenge")}
            </>
          )}
        </div>
      </div>

      {/* Category Type Tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { type: "classic" as const, label: t("extra.classicTab"), icon: "📚" },
          { type: "fun" as const, label: t("extra.funTab"), icon: "🎮" },
          { type: "educational" as const, label: t("extra.learningTab"), icon: "🎓" },
        ].map(({ type, label, icon }) => (
          <motion.button
            key={type}
            onClick={() => {
              setCategoryType(type);
              setSelectedCategory(null);
            }}
            className="flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors"
            style={{
              background: categoryType === type
                ? "linear-gradient(180deg, #EDE9FE 0%, #DDD6FE 100%)"
                : "#F9FAFB",
              border: categoryType === type
                ? "2px solid #A78BFA"
                : "2px solid #E5E7EB",
              boxShadow: categoryType === type
                ? "0 3px 0 #C4B5FD"
                : "0 2px 0 #E5E7EB",
              color: categoryType === type ? "#5B21B6" : "#6B7280",
            }}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98, y: 1 }}
          >
            <span className="mr-1">{icon}</span>
            {label}
          </motion.button>
        ))}
      </div>

      {/* Category Grid */}
      <ScrollArea className="max-h-[40vh]">
        <div className="grid grid-cols-2 gap-2 pb-4">
          {filteredCategories.map((category) => (
            <motion.button
              key={category.id}
              onClick={() => setSelectedCategory(category)}
              className="p-3 rounded-xl text-left transition-all"
              style={{
                background: selectedCategory?.id === category.id
                  ? "linear-gradient(180deg, #EDE9FE 0%, #DDD6FE 100%)"
                  : "#F9FAFB",
                border: selectedCategory?.id === category.id
                  ? "2px solid #A78BFA"
                  : "2px solid #E5E7EB",
                boxShadow: selectedCategory?.id === category.id
                  ? "0 3px 0 #C4B5FD"
                  : "0 2px 0 #E5E7EB",
              }}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98, y: 1 }}
            >
              <span className="text-2xl mb-1 block">{category.icon}</span>
              <p className="text-gray-800 text-sm font-medium truncate">{category.name}</p>
            </motion.button>
          ))}
        </div>
      </ScrollArea>

      <GameModalFooter
        primaryLabel={isLoading ? t("common.loading") : friend.isOnline ? t("game.start") : t("extra.sendChallenge")}
        onPrimary={handleStartChallenge}
        primaryIcon={<Gamepad2 className="w-5 h-5" />}
        isLoading={isLoading || !selectedCategory}
      />
    </GameModal>
  );
}
