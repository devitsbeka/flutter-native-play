import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Volume2, VolumeX } from "lucide-react";
import { useRewards } from "@/hooks/useRewards";
import { useSound } from "@/contexts/SoundContext";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { ChunkyButton } from "@/components/ui/chunky-button";
import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";
import { FlyingCurrency } from "@/components/shared/FlyingCurrency";

interface LuckySpinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WHEEL_SEGMENTS = [
  { label: "50 მონეტა", color: "#FFD700", value: 50, type: "coins", icon: coinIcon },
  { label: "1 ლალი", color: "#A855F7", value: 1, type: "gems", icon: gemIcon },
  { label: "100 მონეტა", color: "#22C55E", value: 100, type: "coins", icon: coinIcon },
  { label: "ძალა", color: "#3B82F6", value: 1, type: "powerup", icon: "⚡" },
  { label: "25 მონეტა", color: "#EC4899", value: 25, type: "coins", icon: coinIcon },
  { label: "200 მონეტა", color: "#F97316", value: 200, type: "coins", icon: coinIcon },
  { label: "3 ლალი", color: "#8B5CF6", value: 3, type: "gems", icon: gemIcon },
  { label: "75 მონეტა", color: "#14B8A6", value: 75, type: "coins", icon: coinIcon },
];

const SEGMENT_ANGLE = 360 / WHEEL_SEGMENTS.length;

export function LuckySpinModal({ isOpen, onClose }: LuckySpinModalProps) {
  const { dailySpinInfo, loading, recordSpinReward, refreshSpinInfo } = useRewards();
  const { playSound, vibrate } = useSound();
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<typeof WHEEL_SEGMENTS[0] | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showFlyingCurrency, setShowFlyingCurrency] = useState(false);

  // Refresh spin info when modal opens
  useEffect(() => {
    if (isOpen) {
      refreshSpinInfo();
    }
  }, [isOpen, refreshSpinInfo]);

  const canSpin = dailySpinInfo.canSpin && !isSpinning && !result;

  const spinWheel = async () => {
    if (!canSpin) return;

    setIsSpinning(true);
    setResult(null);

    // Random number of full rotations (3-5) plus random segment
    const fullRotations = 3 + Math.floor(Math.random() * 3);
    const randomSegment = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
    const segmentRotation = randomSegment * SEGMENT_ANGLE;
    const newRotation = rotation + (fullRotations * 360) + segmentRotation + (SEGMENT_ANGLE / 2);

    setRotation(newRotation);

    // Calculate result after animation
    setTimeout(async () => {
      setIsSpinning(false);
      // The winning segment is opposite to where the pointer is
      const winningIndex = (WHEEL_SEGMENTS.length - randomSegment) % WHEEL_SEGMENTS.length;
      const wonSegment = WHEEL_SEGMENTS[winningIndex];
      setResult(wonSegment);

      // Play success sound and vibrate
      if (soundEnabled) {
        playSound("reward");
      }
      vibrate([100, 50, 100]);

      // Confetti celebration
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.5 },
        colors: ["#FFD700", "#A855F7", "#22C55E", "#F97316"],
        zIndex: 9999,
      });

      // Trigger flying currency animation
      if (wonSegment.type === "coins" || wonSegment.type === "gems") {
        setShowFlyingCurrency(true);
        setTimeout(() => setShowFlyingCurrency(false), 1500);
      }

      // Record the reward to database
      const success = await recordSpinReward({
        label: wonSegment.label,
        value: wonSegment.value,
        type: wonSegment.type,
      });

      if (success) {
        toast.success(`მიღებულია ${wonSegment.label}! 🎉`);
      }
    }, 4000);
  };

  const handleClose = () => {
    setRotation(0);
    setResult(null);
    setIsSpinning(false);
    onClose();
  };

  const getRewardDisplay = (segment: typeof WHEEL_SEGMENTS[0]) => {
    if (typeof segment.icon === "string" && !segment.icon.includes("/")) {
      return <span className="text-2xl">{segment.icon}</span>;
    }
    return <img src={segment.icon as string} alt="" className="w-6 h-6" />;
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
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 z-[100]"
          />

          {/* Modal - New whitish 3D chunky style */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:max-w-sm z-[100]"
          >
            <div 
              className="rounded-3xl p-6 relative"
              style={{
                background: "linear-gradient(180deg, #FFFFFF 0%, #F8F6FB 100%)",
                boxShadow: "0 8px 0 #E8E4EC, 0 12px 32px rgba(0, 0, 0, 0.18)",
                border: "3px solid rgba(255, 255, 255, 0.95)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-display font-bold text-gray-900">🎰 Lucky Spin!</h2>
                <div className="flex items-center gap-2">
                  <motion.button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="p-2 rounded-full transition-colors"
                    style={{
                      background: "#F3F4F6",
                      boxShadow: "0 2px 0 #D1D5DB",
                    }}
                    whileTap={{ scale: 0.95, y: 2 }}
                  >
                    {soundEnabled ? <Volume2 className="w-5 h-5 text-gray-600" /> : <VolumeX className="w-5 h-5 text-gray-400" />}
                  </motion.button>
                  <motion.button
                    onClick={handleClose}
                    className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                    style={{ boxShadow: "0 3px 0 #D1D5DB" }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95, y: 2 }}
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </motion.button>
                </div>
              </div>

              {/* Wheel Container */}
              <div className="relative aspect-square mb-4">
                {/* Glow effect */}
                <div 
                  className="absolute inset-0 rounded-full blur-2xl opacity-40"
                  style={{ background: "radial-gradient(circle, #F59E0B 0%, transparent 70%)" }}
                />

                {/* Pointer/Arrow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
                  <div 
                    className="w-0 h-0"
                    style={{
                      borderLeft: "15px solid transparent",
                      borderRight: "15px solid transparent",
                      borderTop: "30px solid #F59E0B",
                      filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
                    }}
                  />
                </div>

                {/* Outer ring - 3D chunky */}
                <div 
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: "linear-gradient(180deg, #FBBF24 0%, #D97706 100%)",
                    padding: "8px",
                    boxShadow: "0 6px 0 #92400E",
                  }}
                >
                  {/* Inner wheel */}
                  <motion.div
                    className="relative w-full h-full rounded-full overflow-hidden"
                    style={{
                      background: "conic-gradient(" +
                        WHEEL_SEGMENTS.map((seg, i) => 
                          `${seg.color} ${i * SEGMENT_ANGLE}deg ${(i + 1) * SEGMENT_ANGLE}deg`
                        ).join(", ") +
                      ")",
                    }}
                    animate={{ rotate: rotation }}
                    transition={{
                      duration: 4,
                      ease: [0.17, 0.67, 0.12, 0.99],
                    }}
                  >
                    {/* Segment labels */}
                    {WHEEL_SEGMENTS.map((segment, index) => {
                      const angle = index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
                      return (
                        <div
                          key={index}
                          className="absolute left-1/2 top-1/2 origin-left"
                          style={{
                            transform: `rotate(${angle}deg) translateX(20%)`,
                            width: "50%",
                          }}
                        >
                          <span 
                            className="text-white font-bold text-xs whitespace-nowrap"
                            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
                          >
                            {segment.label}
                          </span>
                        </div>
                      );
                    })}

                    {/* Center button - 3D chunky */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.button
                        onClick={spinWheel}
                        disabled={!canSpin}
                        className="relative w-20 h-20 rounded-full flex items-center justify-center disabled:opacity-70"
                        style={{
                          background: "linear-gradient(180deg, #FFFFFF 0%, #F3F4F6 100%)",
                          boxShadow: "0 4px 0 #D1D5DB, 0 6px 20px rgba(0,0,0,0.2)",
                        }}
                        whileHover={{ scale: canSpin ? 1.05 : 1 }}
                        whileTap={{ scale: canSpin ? 0.95 : 1, y: canSpin ? 2 : 0 }}
                      >
                        <span className="font-display font-bold text-lg text-amber-600">
                          {isSpinning ? "..." : result ? "✓" : "SPIN"}
                        </span>
                      </motion.button>
                    </div>
                  </motion.div>
                </div>

                {/* Decorative lights around wheel */}
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-3 h-3 rounded-full"
                    style={{
                      background: i % 2 === 0 ? "#F59E0B" : "#FFFFFF",
                      top: `${50 + 48 * Math.sin((i * 30 * Math.PI) / 180)}%`,
                      left: `${50 + 48 * Math.cos((i * 30 * Math.PI) / 180)}%`,
                      transform: "translate(-50%, -50%)",
                      boxShadow: "0 0 10px rgba(245,158,11,0.5)",
                    }}
                    animate={{
                      opacity: [0.5, 1, 0.5],
                      scale: [0.8, 1, 0.8],
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      delay: i * 0.1,
                    }}
                  />
                ))}
              </div>

              {/* Result Display */}
              <AnimatePresence>
                {result && (
                  <motion.div
                    className="text-center mb-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <motion.div
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl"
                      style={{ 
                        background: "linear-gradient(180deg, #FEF3C7 0%, #FDE68A 100%)",
                        boxShadow: "0 4px 0 #F59E0B" 
                      }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.2 }}
                    >
                      {getRewardDisplay(result)}
                      <span className="font-display text-amber-800 text-lg font-bold">
                        მოიგე {result.label}!
                      </span>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Footer */}
              {/* Flying Currency Animation */}
              {result && (result.type === "coins" || result.type === "gems") && (
                <FlyingCurrency 
                  type={result.type as "coins" | "gems"} 
                  amount={result.value} 
                  isActive={showFlyingCurrency} 
                />
              )}

              {result ? (
                <ChunkyButton
                  variant="success"
                  size="lg"
                  className="w-full"
                  onClick={handleClose}
                >
                  აიღე ჯილდო
                </ChunkyButton>
              ) : (
                <div 
                  className="text-center py-2 px-4 rounded-xl"
                  style={{
                    background: "#F3F4F6",
                  }}
                >
                  <span className="text-gray-600 text-sm">
                    {loading ? "იტვირთება..." :
                      dailySpinInfo.canSpin 
                        ? `${dailySpinInfo.maxSpins - dailySpinInfo.spinsUsed} უფასო სპინი დარჩა`
                        : "ხვალ დაბრუნდი მეტი სპინებისთვის!"
                    }
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
