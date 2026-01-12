import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { useNavigate } from "react-router-dom";
import storyDice from "@/assets/story-dice.png";
import secretBookcase from "@/assets/secret-bookcase.png";
import iconCollections from "@/assets/icon-collections.png";
import triviaBuzzer from "@/assets/trivia-buzzer-3.png";

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

const challengeOptions = [
  {
    id: "random",
    icon: storyDice,
    title: "შემთხვევითი",
    description: "რანდომ კატეგორია",
    gradient: "from-purple-500 to-indigo-600",
  },
  {
    id: "library",
    icon: secretBookcase,
    title: "ბიბლიოთეკა",
    description: "აირჩიე კატეგორია",
    gradient: "from-blue-500 to-cyan-600",
  },
  {
    id: "my-trivias",
    icon: iconCollections,
    title: "ჩემი ტრივია",
    description: "ტრივია/კოლექცია",
    gradient: "from-amber-500 to-orange-600",
  },
  {
    id: "create",
    icon: triviaBuzzer,
    title: "შექმნა",
    description: "ახალი ტრივია",
    gradient: "from-pink-500 to-rose-600",
  },
];

export function ChallengeTypeModal({
  isOpen,
  onClose,
  onChallengeStart,
  targetUserId,
  targetUserProfile,
}: ChallengeTypeModalProps) {
  const navigate = useNavigate();

  const handleOptionSelect = (optionId: string) => {
    // Close modal first
    onClose();
    
    // Notify parent to close as well (e.g., PlayerProfileModal)
    onChallengeStart?.();
    
    // Navigate to team page with challenge context
    switch (optionId) {
      case "random":
        navigate(`/team?challenge=${targetUserId}&type=random`);
        break;
      case "library":
        navigate(`/team?challenge=${targetUserId}&type=library`);
        break;
      case "my-trivias":
        navigate(`/team?challenge=${targetUserId}&type=my-trivias`);
        break;
      case "create":
        navigate(`/team?challenge=${targetUserId}&type=create`);
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background flex flex-col"
        >
          {/* Fixed Header */}
          <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-background/95 backdrop-blur-sm">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <h2 className="text-lg font-bold text-foreground">⚔️ გამოწვევა</h2>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-4 py-6">
            {/* Target User Info */}
            {targetUserProfile && (
              <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-muted/50">
                <SmartAvatar
                  avatarUrl={targetUserProfile.avatar_url}
                  animatedAvatarUrl={targetUserProfile.animated_avatar_url}
                  fallback={targetUserProfile.nickname}
                  size="md"
                />
                <div>
                  <p className="font-medium text-foreground">
                    {targetUserProfile.nickname}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    აირჩიე რას ითამაშებთ
                  </p>
                </div>
              </div>
            )}

            {/* Options Grid */}
            <div className="grid grid-cols-2 gap-3">
              {challengeOptions.map((option, index) => (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleOptionSelect(option.id)}
                  className={`relative p-4 rounded-2xl bg-gradient-to-br ${option.gradient} text-white text-left overflow-hidden min-h-[140px] flex flex-col`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Decorative circles */}
                  <div className="absolute top-1/2 -right-4 w-16 h-16 rounded-full bg-white/10" />
                  <div className="absolute -bottom-2 right-4 w-10 h-10 rounded-full bg-white/10" />
                  
                  {/* Icon top-left */}
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-auto">
                    <img src={option.icon} alt="" className="w-7 h-7 object-contain" />
                  </div>
                  
                  {/* Text bottom-left */}
                  <div className="mt-3">
                    <p className="font-bold text-lg leading-tight">{option.title}</p>
                    <p className="text-sm text-white/80 mt-0.5">{option.description}</p>
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
