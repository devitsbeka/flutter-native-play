import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { Star, Sparkles, Gift } from "lucide-react";
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
      // Trigger celebration confetti
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
        });
        confetti({
          particleCount: 6,
          angle: 120,
          spread: 80,
          origin: { x: 1, y: 0.6 },
          colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      
      // Burst in the center
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { x: 0.5, y: 0.4 },
        colors,
      });
      
      frame();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md border-0 bg-transparent shadow-none p-0">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative overflow-hidden rounded-3xl"
              style={{
                background: "linear-gradient(180deg, hsl(45 100% 60%) 0%, hsl(35 100% 50%) 100%)",
              }}
            >
              {/* Sparkle decorations */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ 
                      opacity: [0, 1, 0],
                      scale: [0, 1, 0],
                    }}
                    transition={{
                      duration: 2,
                      delay: i * 0.15,
                      repeat: Infinity,
                    }}
                    style={{
                      left: `${10 + (i % 6) * 15}%`,
                      top: `${10 + Math.floor(i / 6) * 60}%`,
                    }}
                  >
                    <Sparkles className="w-4 h-4 text-white/60" />
                  </motion.div>
                ))}
              </div>

              <div className="relative p-6 text-center">
                {/* Level Up Text */}
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mb-4"
                >
                  <h2 className="text-2xl font-bold text-white uppercase tracking-wider mb-1">
                    დონე აიწია! 🎉
                  </h2>
                  <p className="text-white/80 text-sm">Level Up!</p>
                </motion.div>

                {/* Level Badge Animation */}
                <motion.div
                  className="relative mx-auto mb-6"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.3, stiffness: 200 }}
                >
                  {/* Glow ring */}
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: "radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)",
                    }}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  
                  {/* Level badge */}
                  <div 
                    className="relative w-32 h-32 mx-auto flex flex-col items-center justify-center rounded-full"
                    style={{
                      background: "radial-gradient(circle, hsl(0 0% 100%) 0%, hsl(45 50% 95%) 100%)",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.2), inset 0 2px 8px rgba(255,255,255,0.8)",
                    }}
                  >
                    <motion.span
                      className="text-5xl font-display font-bold"
                      style={{ color: "hsl(35 80% 40%)" }}
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", delay: 0.5, stiffness: 200 }}
                    >
                      {newLevel}
                    </motion.span>
                    <span className="text-xs font-semibold text-slate-500">დონე</span>
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
                      <Star className="w-6 h-6 text-white fill-white drop-shadow-lg" />
                    </motion.div>
                  ))}
                </motion.div>

                {/* Previous level info */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="text-white/70 text-sm mb-4"
                >
                  დონე {previousLevel} → დონე {newLevel}
                </motion.p>

                {/* Rewards */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-4"
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Gift className="w-5 h-5 text-white" />
                    <span className="text-white font-semibold">ჯილდოები</span>
                  </div>
                  <div className="flex justify-center gap-4">
                    <div className="text-center">
                      <span className="text-2xl">👑</span>
                      <p className="text-white font-bold">+{rewards.xpBonus}</p>
                      <p className="text-white/70 text-xs">XP ბონუსი</p>
                    </div>
                    {rewards.powerUps > 0 && (
                      <div className="text-center">
                        <span className="text-2xl">⚡</span>
                        <p className="text-white font-bold">+{rewards.powerUps}</p>
                        <p className="text-white/70 text-xs">Power-Ups</p>
                      </div>
                    )}
                    {rewards.spinTickets > 0 && (
                      <div className="text-center">
                        <span className="text-2xl">🎰</span>
                        <p className="text-white font-bold">+{rewards.spinTickets}</p>
                        <p className="text-white/70 text-xs">Spin Tickets</p>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Continue Button */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 1 }}
                >
                  <ChunkyButton
                    variant="secondary"
                    size="lg"
                    className="w-full bg-white text-amber-700 hover:bg-white/90"
                    onClick={onClose}
                  >
                    გაგრძელება
                  </ChunkyButton>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
