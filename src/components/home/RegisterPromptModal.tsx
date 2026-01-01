import { motion } from "framer-motion";
import { Trophy, Star, Shield, Sparkles } from "lucide-react";
import { GameModal, GameModalFooter, GameModalStat } from "@/components/ui/game-modal";
import { getGuestProgress } from "@/hooks/useGuestProgress";

interface RegisterPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: () => void;
}

export function RegisterPromptModal({
  isOpen,
  onClose,
  onRegister,
}: RegisterPromptModalProps) {
  const guestProgress = getGuestProgress();
  
  // Calculate stats
  let totalLevels = 0;
  let totalStars = 0;
  
  Object.values(guestProgress).forEach((cat) => {
    totalLevels += cat.completedLevels.length;
    totalStars += cat.completedLevels.reduce((sum, l) => sum + l.stars_earned, 0);
  });

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      variant="gold"
      iconEmoji="✨"
      title="შესანიშნავი პროგრესი! 🎉"
      subtitle="არ დაკარგო შენი მიღწევები - დარეგისტრირდი უფასოდ!"
      showSparkles
      showStars
    >
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <GameModalStat
          icon={<Trophy className="h-6 w-6 text-primary" />}
          value={totalLevels}
          label="გავლილი დონე"
        />
        <GameModalStat
          icon={<Star className="h-6 w-6 text-amber-500 fill-amber-500" />}
          value={totalStars}
          label="მოგროვილი ვარსკვლავი"
          highlight
        />
      </div>

      {/* Benefits */}
      <div className="space-y-2 mb-4">
        <motion.div 
          className="flex items-center gap-3 rounded-xl p-3"
          style={{
            background: "linear-gradient(180deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.05) 100%)",
            border: "2px solid rgba(34,197,94,0.3)",
            boxShadow: "0 3px 0 rgba(34,197,94,0.15)",
          }}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Shield className="h-5 w-5 text-green-600 shrink-0" />
          <p className="text-sm font-medium text-gray-800">პროგრესი შენახული იქნება სამუდამოდ</p>
        </motion.div>
        <motion.div 
          className="flex items-center gap-3 rounded-xl p-3"
          style={{
            background: "linear-gradient(180deg, rgba(147,51,234,0.1) 0%, rgba(147,51,234,0.05) 100%)",
            border: "2px solid rgba(147,51,234,0.3)",
            boxShadow: "0 3px 0 rgba(147,51,234,0.15)",
          }}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Trophy className="h-5 w-5 text-primary shrink-0" />
          <p className="text-sm font-medium text-gray-800">მონაწილეობა ლიდერბორდში</p>
        </motion.div>
      </div>

      <GameModalFooter
        primaryLabel="დარეგისტრირდი უფასოდ"
        onPrimary={onRegister}
        secondaryLabel="მოგვიანებით"
        onSecondary={onClose}
        primaryIcon={<Sparkles className="w-5 h-5" />}
      />
    </GameModal>
  );
}
