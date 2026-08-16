import { forwardRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import triviaBuzzer from "@/assets/trivia-buzzer.png";
import iconCollections from "@/assets/icon-collections.png";
import iconGroupOfPeople from "@/assets/group-of-people.png";
import secretBookcase from "@/assets/secret-bookcase.png";
import spinTheBottle from "@/assets/spin-the-bottle.png";
import danceFloor from "@/assets/dance-floor.png";

interface TeamMenuScreenProps {
  onClose: () => void;
  onSelectCreateRoom: () => void;
  onSelectTrivia: () => void;
  onSelectCollection: (draftId?: string) => void;
  onSelectPersonalTrivia: () => void;
  onSelectRandom: () => void;
  onSelectLibrary: () => void;
}

interface MenuOption {
  id: string;
  icon: React.ReactNode;
  imageIcon?: string;
  title: string;
  subtitle: string;
  gradient: string;
  glowColor: string;
  fullWidth?: boolean;
  onClick: () => void;
}

export const TeamMenuScreen = forwardRef<HTMLDivElement, TeamMenuScreenProps>(
  function TeamMenuScreen(
    {
      onClose,
      onSelectCreateRoom,
      onSelectTrivia,
      onSelectCollection,
      onSelectPersonalTrivia,
      onSelectRandom,
      onSelectLibrary,
    },
    ref
  ) {
    const { t } = useLanguage();

    const topOptions: MenuOption[] = [
      {
        id: "random",
        imageIcon: spinTheBottle,
        icon: null,
        title: t("extra.randomCategoryLabel"),
        subtitle: t("extra.quickStart"),
        gradient: "from-amber-500 to-orange-500",
        glowColor: "rgba(245, 158, 11, 0.4)",
        fullWidth: true,
        onClick: onSelectRandom,
      },
      {
        id: "library",
        imageIcon: secretBookcase,
        icon: null,
        title: t("extra.chooseFromLibrary"),
        subtitle: t("extra.chooseCategories"),
        gradient: "from-violet-500 to-purple-600",
        glowColor: "rgba(139, 92, 246, 0.4)",
        fullWidth: true,
        onClick: onSelectLibrary,
      },
    ];

    const menuOptions: MenuOption[] = [
      {
        id: "create-room",
        imageIcon: danceFloor,
        icon: null,
        title: t("extra.roomLabel"),
        subtitle: t("extra.createGameRoom"),
        gradient: "from-emerald-500 to-green-600",
        glowColor: "rgba(16, 185, 129, 0.4)",
        onClick: onSelectCreateRoom,
      },
      {
        id: "trivia",
        imageIcon: triviaBuzzer,
        icon: null,
        title: t("extra.triviaLabel2"),
        subtitle: t("extra.oneRound"),
        gradient: "from-purple-500 to-indigo-600",
        glowColor: "rgba(139, 92, 246, 0.4)",
        onClick: onSelectTrivia,
      },
      {
        id: "collection",
        imageIcon: iconCollections,
        icon: null,
        title: t("extra.collectionLabel"),
        subtitle: t("extra.multipleRounds"),
        gradient: "from-cyan-400 to-blue-500",
        glowColor: "rgba(34, 211, 238, 0.4)",
        onClick: () => onSelectCollection(),
      },
      {
        id: "party",
        imageIcon: iconGroupOfPeople,
        icon: null,
        title: "MyTrivia Party",
        subtitle: t("extra.yourQuestions"),
        gradient: "from-pink-500 to-rose-500",
        glowColor: "rgba(236, 72, 153, 0.4)",
        onClick: onSelectPersonalTrivia,
      },
    ];

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 safe-screen z-[60] flex flex-col overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 50%, #4C1D95 100%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 flex items-center gap-3 px-4 py-4"
      >
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center hover:bg-white/25 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-white/80" />
          <h2 className="text-xl font-bold text-white">{t("extra.navCreate")}</h2>
        </div>
      </motion.div>

      <div className="flex-1 overflow-y-auto px-4 pb-[calc(2rem_+_var(--safe-bottom))] max-w-2xl lg:mx-auto">
        <div className="space-y-3 mb-4">
          {topOptions.map((option, index) => (
            <motion.button
              key={option.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={option.onClick}
              className="relative w-full md:max-w-lg md:mx-auto p-4 rounded-2xl overflow-hidden text-left flex items-center gap-4"
              style={{
                background: "rgba(255, 255, 255, 0.12)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  background: `radial-gradient(circle at left center, ${option.glowColor}, transparent 50%)`,
                }}
              />
              <div className="relative shrink-0">
                <img src={option.imageIcon} alt="" className="w-14 h-14 object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-base">{option.title}</h3>
                <p className="text-white/60 text-xs">{option.subtitle}</p>
              </div>
            </motion.button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {menuOptions.map((option, index) => (
            <motion.button
              key={option.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={option.onClick}
              className="relative p-4 rounded-2xl overflow-hidden text-left"
              style={{
                background: "rgba(255, 255, 255, 0.12)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  background: `radial-gradient(circle at top right, ${option.glowColor}, transparent 60%)`,
                }}
              />
              <div className="relative mb-3">
                <img src={option.imageIcon} alt="" className="w-14 h-14 object-contain" />
              </div>
              <h3 className="font-bold text-white text-base mb-0.5">{option.title}</h3>
              <p className="text-white/60 text-xs">{option.subtitle}</p>
            </motion.button>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-xs text-center text-white/50 mt-6"
        >
          💡 {t("extra.quickStartDesc")}
        </motion.p>
      </div>
    </motion.div>
    );
  }
);
