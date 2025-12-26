import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Sparkles, Gift } from "lucide-react";
import { GameModal, GameModalFooter, GameModalStat } from "@/components/ui/game-modal";
import confetti from "canvas-confetti";
import { getLevelRewards } from "@/utils/levelCalculation";

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  newLevel: number;
  previousLevel: number;
}

export function LevelUpModal({ isOpen, onClose, newLevel, previousLevel }: LevelUpModalProps) {
  const rewards = getLevelRewards(newLevel);

  useEffect(() => {
    if (isOpen) {
      const duration = 3000;
      const end = Date.now() + duration;

      const colors = ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];

      const frame = () => {
        confetti({
          particleCount: 6,
          angle: 60,
          spread: 80,
          origin: { x: 0, y: 0.6 },
          colors,
          zIndex: 9999,
        });
        confetti({
          particleCount: 6,
          angle: 120,
          spread: 80,
          origin: { x: 1, y: 0.6 },
          colors,
          zIndex: 9999,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { x: 0.5, y: 0.4 },
        colors,
        zIndex: 9999,
      });
      
      frame();
    }
  }, [isOpen]);

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      variant="gold"
      title="დონე აიწია! 🎉"
      subtitle="Level Up!"
      showSparkles
      showStars
    >
      {/* Level Badge Animation */}
      <motion.div
        className="relative mx-auto mb-4"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.3, stiffness: 200 }}
      >
        {/* Glow ring */}
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 opacity-40 blur-xl"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        
        {/* Level badge */}
        <div 
          className="relative w-28 h-28 mx-auto flex flex-col items-center justify-center rounded-full bg-gradient-to-b from-white to-amber-50"
          style={{
            boxShadow: "0 8px 0 rgba(251,191,36,0.4), inset 0 2px 8px rgba(255,255,255,0.8)",
            border: "4px solid hsl(45 90% 55%)",
          }}
        >
          <motion.span
            className="text-5xl font-display font-bold text-amber-600"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", delay: 0.5, stiffness: 200 }}
          >
            {newLevel}
          </motion.span>
          <span className="text-xs font-semibold text-amber-700">დონე</span>
        </div>

        {/* Stars around badge */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.6 + i * 0.1, type: "spring" }}
            style={{
              left: `${50 + Math.cos((i * 2 * Math.PI) / 3 - Math.PI / 2) * 55}%`,
              top: `${50 + Math.sin((i * 2 * Math.PI) / 3 - Math.PI / 2) * 55}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <Star className="w-6 h-6 text-yellow-400 fill-yellow-400 drop-shadow-lg" />
          </motion.div>
        ))}
      </motion.div>

      {/* Previous level info */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-center text-muted-foreground text-sm mb-4"
      >
        დონე {previousLevel} → დონე {newLevel}
      </motion.p>

      {/* Rewards section */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="rounded-2xl p-4 mb-4"
        style={{
          background: "linear-gradient(180deg, rgba(251,191,36,0.15) 0%, rgba(251,191,36,0.05) 100%)",
          border: "2px solid rgba(251,191,36,0.3)",
          boxShadow: "0 4px 0 rgba(251,191,36,0.15)",
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-3">
          <Gift className="w-5 h-5 text-amber-600" />
          <span className="font-bold text-foreground">ჯილდოები</span>
        </div>
        <div className="flex justify-center gap-4">
          <div className="text-center">
            <span className="text-2xl">👑</span>
            <p className="font-bold text-foreground">+{rewards.xpBonus}</p>
            <p className="text-xs text-muted-foreground">XP ბონუსი</p>
          </div>
          {rewards.powerUps > 0 && (
            <div className="text-center">
              <span className="text-2xl">⚡</span>
              <p className="font-bold text-foreground">+{rewards.powerUps}</p>
              <p className="text-xs text-muted-foreground">Power-Ups</p>
            </div>
          )}
          {rewards.spinTickets > 0 && (
            <div className="text-center">
              <span className="text-2xl">🎰</span>
              <p className="font-bold text-foreground">+{rewards.spinTickets}</p>
              <p className="text-xs text-muted-foreground">Spin Tickets</p>
            </div>
          )}
        </div>
      </motion.div>

      <GameModalFooter
        primaryLabel="გაგრძელება"
        onPrimary={onClose}
        primaryVariant="primary"
      />
    </GameModal>
  );
}
