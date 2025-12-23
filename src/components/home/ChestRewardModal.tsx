import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";
import confetti from "canvas-confetti";
import { useRewards } from "@/hooks/useRewards";
import { toast } from "sonner";

interface ChestRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClaim: (newPoints?: number) => void;
}

const rewards = [
  { icon: "⭐", label: "50 XP", type: "xp", value: 50, color: "from-amber-400 to-yellow-500" },
  { icon: "🎯", label: "2x ქულა", type: "multiplier", value: 2, color: "from-blue-400 to-cyan-500" },
  { icon: "💎", label: "VIP დღე", type: "vip", value: 1, color: "from-purple-400 to-pink-500" },
];

export function ChestRewardModal({ isOpen, onClose, onClaim }: ChestRewardModalProps) {
  const { recordChestReward } = useRewards();
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Celebration confetti
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }, 300);
    }
  }, [isOpen]);

  const handleClaim = async () => {
    if (isClaiming) return;
    setIsClaiming(true);

    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.5 },
    });

    // Persist rewards to database
    const result = await recordChestReward(
      rewards.map(r => ({ type: r.type, value: r.value, label: r.label }))
    );

    if (result.success) {
      toast.success("ჯილდოები მიღებულია! 🎉");
    }

    setIsClaiming(false);
    onClaim(result.newPoints);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            {/* Modal */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-background rounded-3xl p-6 w-full max-w-sm relative overflow-hidden"
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-muted flex items-center justify-center z-10"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Glow effect */}
              <div 
                className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full opacity-30 blur-3xl"
                style={{ background: "hsl(45 90% 50%)" }}
              />

              {/* Content */}
              <div className="relative text-center">
                {/* Chest Icon */}
                <motion.div
                  animate={{ 
                    y: [0, -8, 0],
                    rotate: [-2, 2, -2]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-7xl mb-4"
                >
                  🎁
                </motion.div>

                <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                  სკივრი გახსნილია!
                </h2>
                <p className="text-muted-foreground mb-6">
                  გილოცავ! მიიღე შენი ჯილდოები
                </p>

                {/* Rewards */}
                <div className="space-y-2 mb-6">
                  {rewards.map((reward, index) => (
                    <motion.div
                      key={reward.label}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + index * 0.1 }}
                      className={`flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r ${reward.color} text-white`}
                    >
                      <span className="text-2xl">{reward.icon}</span>
                      <span className="font-semibold">{reward.label}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Claim Button */}
                <ChunkyButton onClick={handleClaim} disabled={isClaiming} className="w-full">
                  <Gift className="h-5 w-5 mr-2" />
                  {isClaiming ? "იტვირთება..." : "მიღება"}
                </ChunkyButton>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
