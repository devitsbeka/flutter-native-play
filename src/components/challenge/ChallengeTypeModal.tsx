import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Swords } from "lucide-react";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import spinTheBottle from "@/assets/spin-the-bottle.png";
import secretBookcase from "@/assets/secret-bookcase.png";
import iconCollections from "@/assets/icon-collections.png";
import triviaBuzzer from "@/assets/trivia-buzzer-3.png";
import danceFloor from "@/assets/dance-floor.png";
import iconGroupOfPeople from "@/assets/group-of-people.png";

interface ChallengeTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChallengeStart?: () => void;
  targetUserId: string;
  targetUserProfile: {
    nickname: string;
    avatar_url: string | null;
    animated_avatar_url: string | null;
  } | null;
}

export function ChallengeTypeModal({
  isOpen,
  onClose,
  onChallengeStart,
  targetUserId,
  targetUserProfile,
}: ChallengeTypeModalProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const topOptions = [
    {
      id: "random",
      imageIcon: spinTheBottle,
      title: t("extra.randomCategoryLabel"),
      subtitle: t("extra.quickStartLabel"),
      glowColor: "rgba(245, 158, 11, 0.4)",
    },
    {
      id: "library",
      imageIcon: secretBookcase,
      title: t("extra.chooseFromLibraryLabel"),
      subtitle: t("extra.chooseCategoriesLabel"),
      glowColor: "rgba(139, 92, 246, 0.4)",
    },
  ];

  const bottomOptions = [
    {
      id: "create-room",
      imageIcon: danceFloor,
      title: t("extra.roomLabel"),
      subtitle: t("extra.createGameRoomLabel"),
      glowColor: "rgba(16, 185, 129, 0.4)",
    },
    {
      id: "trivia",
      imageIcon: triviaBuzzer,
      title: t("extra.triviaLabelShort"),
      subtitle: t("extra.oneRoundLabel"),
      glowColor: "rgba(139, 92, 246, 0.4)",
    },
    {
      id: "collection",
      imageIcon: iconCollections,
      title: t("extra.multipleRoundsLabel"),
      subtitle: t("extra.multipleRoundsLabel"),
      glowColor: "rgba(34, 211, 238, 0.4)",
    },
    {
      id: "my-trivias",
      imageIcon: iconGroupOfPeople,
      title: t("extra.myTriviaPartyLabel"),
      subtitle: t("extra.yourQuestionsLabel"),
      glowColor: "rgba(236, 72, 153, 0.4)",
    },
  ];

  const handleOptionSelect = (optionId: string) => {
    onClose();
    onChallengeStart?.();
    
    setTimeout(() => {
      switch (optionId) {
        case "random":
          navigate(`/team?challenge=${targetUserId}&type=random`);
          break;
        case "library":
          navigate(`/team?challenge=${targetUserId}&type=library`);
          break;
        case "create-room":
          navigate(`/team?challenge=${targetUserId}&type=create-room`);
          break;
        case "trivia":
          navigate(`/team?challenge=${targetUserId}&type=trivia`);
          break;
        case "collection":
          navigate(`/team?challenge=${targetUserId}&type=collection`);
          break;
        case "my-trivias":
          navigate(`/team?challenge=${targetUserId}&type=my-trivias`);
          break;
      }
    }, 100);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex flex-col"
          style={{
            background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 50%, #4C1D95 100%)",
          }}
        >
          {/* Fixed Header */}
          <div className="flex-shrink-0 flex items-center gap-3 px-4 py-4">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-2">
              <Swords className="w-5 h-5 text-white/80" />
              <h2 className="text-xl font-bold text-white">{t("challenge.challenge")}</h2>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-4 py-6">
            {/* Target User Info */}
            {targetUserProfile && (
              <div className="flex items-center gap-3 mb-6 px-2">
                <SmartAvatar
                  avatarUrl={targetUserProfile.avatar_url}
                  animatedAvatarUrl={targetUserProfile.animated_avatar_url}
                  fallback={targetUserProfile.nickname}
                  size="md"
                />
                <div>
                  <p className="font-medium text-white">
                    {targetUserProfile.nickname}
                  </p>
                  <p className="text-sm text-white/60">
                    {t("extra.chooseGameTypeLabel")}
                  </p>
                </div>
              </div>
            )}

            {/* Top section - Full-width horizontal cards */}
            <div className="space-y-3 mb-4">
              {topOptions.map((option, index) => (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleOptionSelect(option.id)}
                  className="relative w-full p-4 rounded-2xl overflow-hidden text-left flex items-center gap-4"
                  style={{
                    background: "rgba(255, 255, 255, 0.12)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div 
                    className="absolute inset-0 opacity-20 pointer-events-none" 
                    style={{
                      background: `radial-gradient(circle at left center, ${option.glowColor}, transparent 50%)`,
                    }} 
                  />
                  
                  <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                    <img src={option.imageIcon} alt="" className="w-10 h-10 object-contain" />
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-white text-base">{option.title}</h3>
                    <p className="text-white/60 text-xs">{option.subtitle}</p>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* 2x2 Grid - Vertical cards */}
            <div className="grid grid-cols-2 gap-3">
              {bottomOptions.map((option, index) => (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (index + topOptions.length) * 0.05 }}
                  onClick={() => handleOptionSelect(option.id)}
                  className="relative p-4 rounded-2xl overflow-hidden text-left min-h-[140px] flex flex-col"
                  style={{
                    background: "rgba(255, 255, 255, 0.12)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div 
                    className="absolute inset-0 opacity-30 pointer-events-none" 
                    style={{
                      background: `radial-gradient(circle at top right, ${option.glowColor}, transparent 60%)`,
                    }} 
                  />
                  
                  <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center mb-auto">
                    <img src={option.imageIcon} alt="" className="w-10 h-10 object-contain" />
                  </div>
                  
                  <div className="mt-3">
                    <h3 className="font-bold text-white text-base mb-0.5">{option.title}</h3>
                    <p className="text-white/60 text-xs">{option.subtitle}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
