import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Star, Shield, Sparkles } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";
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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-6"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-sm rounded-3xl bg-card p-6 shadow-xl"
            style={{ boxShadow: "0 8px 0 0 hsl(var(--border))" }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-muted"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 mb-4"
              >
                <Sparkles className="h-10 w-10 text-white" />
              </motion.div>
              
              <h2 className="text-xl font-bold text-foreground mb-2">
                შესანიშნავი პროგრესი! 🎉
              </h2>
              <p className="text-muted-foreground text-sm">
                არ დაკარგო შენი მიღწევები - დარეგისტრირდი უფასოდ!
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-2xl bg-muted p-4 text-center">
                <Trophy className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{totalLevels}</p>
                <p className="text-xs text-muted-foreground">გავლილი დონე</p>
              </div>
              <div className="rounded-2xl bg-muted p-4 text-center">
                <Star className="h-6 w-6 text-amber-500 fill-amber-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{totalStars}</p>
                <p className="text-xs text-muted-foreground">მოგროვილი ვარსკვლავი</p>
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-3 rounded-xl bg-success/10 p-3">
                <Shield className="h-5 w-5 text-success shrink-0" />
                <p className="text-sm text-foreground">პროგრესი შენახული იქნება სამუდამოდ</p>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-primary/10 p-3">
                <Trophy className="h-5 w-5 text-primary shrink-0" />
                <p className="text-sm text-foreground">მონაწილეობა ლიდერბორდში</p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <ChunkyButton
                size="lg"
                className="w-full"
                onClick={onRegister}
              >
                დარეგისტრირდი უფასოდ
              </ChunkyButton>
              <button
                onClick={onClose}
                className="w-full text-center text-sm text-muted-foreground py-2"
              >
                მოგვიანებით
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
