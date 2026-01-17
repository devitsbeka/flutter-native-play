import { motion } from "framer-motion";
import { User, Plus, X } from "lucide-react";
import { GameModal } from "@/components/ui/game-modal";
import { Avatar } from "@/components/shared/Avatar";

interface AccountSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewProfile: () => void;
  profile?: {
    nickname?: string;
    avatar_url?: string | null;
  } | null;
}

export function AccountSwitcherModal({
  isOpen,
  onClose,
  onViewProfile,
  profile,
}: AccountSwitcherModalProps) {
  const handleViewProfile = () => {
    onViewProfile();
    onClose();
  };

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      variant="primary"
      title="ექაუნთი"
    >
      <div className="flex flex-col items-center gap-6 py-4">
        {/* Profile Info */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar
              imageUrl={profile?.avatar_url || undefined}
              emoji={profile?.nickname?.charAt(0) || "👤"}
              size="xl"
            />
            <motion.div
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <User className="w-4 h-4 text-primary-foreground" />
            </motion.div>
          </div>
          <p className="text-lg font-bold text-foreground">
            {profile?.nickname || "მომხმარებელი"}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 w-full max-w-[280px]">
          {/* View Profile Button */}
          <motion.button
            onClick={handleViewProfile}
            className="relative w-full py-4 px-6 rounded-2xl font-bold text-white transition-all"
            style={{
              background: "linear-gradient(180deg, #8B5CF6 0%, #7C3AED 100%)",
              boxShadow: "0 6px 0 #5B21B6, 0 8px 16px rgba(124, 58, 237, 0.4)",
            }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98, y: 0 }}
          >
            <div className="flex items-center justify-center gap-3">
              <User className="w-5 h-5" />
              <span className="text-base">პროფილის ნახვა</span>
            </div>
          </motion.button>

          {/* Add Account Button - Disabled */}
          <motion.button
            disabled
            className="relative w-full py-4 px-6 rounded-2xl font-bold transition-all opacity-50 cursor-not-allowed"
            style={{
              background: "linear-gradient(180deg, #E5E7EB 0%, #D1D5DB 100%)",
              boxShadow: "0 4px 0 #9CA3AF",
              color: "#6B7280",
            }}
          >
            <div className="flex items-center justify-center gap-3">
              <Plus className="w-5 h-5" />
              <span className="text-base">ექაუნთის დამატება</span>
            </div>
          </motion.button>
        </div>
      </div>
    </GameModal>
  );
}
