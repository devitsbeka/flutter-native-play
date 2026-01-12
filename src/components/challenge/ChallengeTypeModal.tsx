import { motion } from "framer-motion";
import { X, Dice5, Library, Gamepad2, Sparkles, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { useNavigate } from "react-router-dom";

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
    icon: Dice5,
    title: "შემთხვევითი",
    description: "რანდომ კატეგორია",
    gradient: "from-purple-500 to-indigo-600",
  },
  {
    id: "library",
    icon: Library,
    title: "ბიბლიოთეკა",
    description: "აირჩიე კატეგორია",
    gradient: "from-blue-500 to-cyan-600",
  },
  {
    id: "my-trivias",
    icon: Gamepad2,
    title: "ჩემი ტრივია",
    description: "ტრივია/კოლექცია",
    gradient: "from-amber-500 to-orange-600",
  },
  {
    id: "create",
    icon: Sparkles,
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

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent 
        className="max-w-sm p-0 gap-0 border-0 bg-card rounded-3xl overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-foreground">⚔️ გამოწვევა</h2>
          </div>
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
            whileTap={{ scale: 0.95 }}
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Content */}
        <div className="p-4 relative">
          {/* Target User Info */}
          {targetUserProfile && (
            <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-muted/50">
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
                  გამოწვევის ტიპი აირჩიე
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
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleOptionSelect(option.id);
                }}
                className={`relative p-4 rounded-2xl bg-gradient-to-br ${option.gradient} text-white text-left overflow-hidden min-h-[120px] flex flex-col`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Decorative circles */}
                <div className="absolute top-1/2 -right-4 w-16 h-16 rounded-full bg-white/10" />
                <div className="absolute -bottom-2 right-4 w-10 h-10 rounded-full bg-white/10" />
                
                {/* Icon top-left */}
                <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center mb-auto">
                  <option.icon className="w-5 h-5" />
                </div>
                
                {/* Text bottom-left */}
                <div className="mt-3">
                  <p className="font-bold text-base leading-tight">{option.title}</p>
                  <p className="text-xs text-white/80 mt-0.5">{option.description}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
