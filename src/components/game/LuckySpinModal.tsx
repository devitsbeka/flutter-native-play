import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, ChevronLeft, Tv } from "lucide-react";
import { useRewards } from "@/hooks/useRewards";
import { useSound } from "@/contexts/SoundContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { ChunkyButton } from "@/components/ui/chunky-button";
import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";
import { FlyingCurrency } from "@/components/shared/FlyingCurrency";
import { WatchAdForSpinsModal } from "@/components/home/WatchAdForSpinsModal";
import { REWARDS } from "@/config/rewardConfig";

interface LuckySpinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface WheelSegment {
  labelKey: string;
  amount: number;
  color: string;
  type: "coins" | "gems" | "powerup";
  icon: string;
}

const WHEEL_SEGMENTS: WheelSegment[] = [
  { labelKey: "coins50", amount: 50, color: "#FFD700", type: "coins", icon: coinIcon },
  { labelKey: "gems1", amount: 1, color: "#A855F7", type: "gems", icon: gemIcon },
  { labelKey: "coins100", amount: 100, color: "#22C55E", type: "coins", icon: coinIcon },
  { labelKey: "power", amount: 1, color: "#3B82F6", type: "powerup", icon: "⚡" },
  { labelKey: "coins25", amount: 25, color: "#EC4899", type: "coins", icon: coinIcon },
  { labelKey: "coins200", amount: 200, color: "#F97316", type: "coins", icon: coinIcon },
  { labelKey: "gems3", amount: 3, color: "#8B5CF6", type: "gems", icon: gemIcon },
  { labelKey: "coins75", amount: 75, color: "#14B8A6", type: "coins", icon: coinIcon },
];

const SEGMENT_ANGLE = 360 / WHEEL_SEGMENTS.length;

export function LuckySpinModal({ isOpen, onClose }: LuckySpinModalProps) {
  const { dailySpinInfo, loading, recordSpinReward, refreshSpinInfo, addExtraSpins } = useRewards();
  const { playSound, vibrate } = useSound();
  const { t } = useLanguage();
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<WheelSegment | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showFlyingCurrency, setShowFlyingCurrency] = useState(false);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);

  // Helper to get translated label for a segment
  const getSegmentLabel = (segment: WheelSegment): string => {
    if (segment.type === "coins") {
      return t('spin.coins').replace('{amount}', String(segment.amount));
    }
    if (segment.type === "gems") {
      return t('spin.gems').replace('{amount}', String(segment.amount));
    }
    return t('spin.power');
  };

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
      const segmentLabel = getSegmentLabel(wonSegment);
      const success = await recordSpinReward({
        label: segmentLabel,
        value: wonSegment.amount,
        type: wonSegment.type,
      });

      if (success) {
        toast.success(t('spin.received').replace('{item}', segmentLabel));
      }
    }, 4000);
  };

  const handleClose = () => {
    setRotation(0);
    setResult(null);
    setIsSpinning(false);
    onClose();
  };

  const getRewardDisplay = (segment: WheelSegment) => {
    if (typeof segment.icon === "string" && !segment.icon.includes("/")) {
      return <span className="text-2xl">{segment.icon}</span>;
    }
    return <img src={segment.icon as string} alt="" className="w-6 h-6" />;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex flex-col"
          style={{
            background: "linear-gradient(180deg, #FDFAFF 0%, #F6E8FF 100%)",
          }}
        >
          {/* Fixed Header */}
          <motion.div 
            className="sticky top-0 z-10 flex items-center h-14 px-2 border-b border-gray-200/60"
            style={{
              background: "linear-gradient(180deg, #FFFFFF 0%, #FAFAFA 100%)",
            }}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {/* Back button */}
            <motion.button
              onClick={handleClose}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronLeft className="w-6 h-6 text-gray-700" />
            </motion.button>
            
            {/* Centered title */}
            <div className="flex-1 text-center px-2">
              <h1 className="font-display text-lg font-bold text-gray-900 truncate">
                🎰 {t('spin.title')}
              </h1>
            </div>
            
            {/* Sound toggle */}
            <motion.button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: "#F3F4F6",
              }}
              whileTap={{ scale: 0.95 }}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5 text-gray-600" /> : <VolumeX className="w-5 h-5 text-gray-400" />}
            </motion.button>
          </motion.div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col items-center justify-center">
            {/* Wheel Container */}
            <div className="relative aspect-square w-full max-w-[280px] mb-6">
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
                          {getSegmentLabel(segment)}
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
                        {isSpinning ? "..." : result ? "✓" : t('spin.spinButton')}
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
                      {t('spin.youWon').replace('{item}', getSegmentLabel(result))}
                    </span>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Flying Currency Animation */}
            {result && (result.type === "coins" || result.type === "gems") && (
              <FlyingCurrency 
                type={result.type as "coins" | "gems"} 
                amount={result.amount} 
                isActive={showFlyingCurrency} 
              />
            )}

            {!result && (
              <div 
                className="text-center py-2 px-4 rounded-xl"
                style={{
                  background: "#F3F4F6",
                }}
              >
                {loading ? (
                  <span className="text-gray-600 text-sm">{t('spin.loading')}</span>
                ) : dailySpinInfo.canSpin ? (
                  <span className="text-gray-600 text-sm">
                    {t('spin.freeSpinsLeft').replace('{count}', String(dailySpinInfo.maxSpins - dailySpinInfo.spinsUsed))}
                  </span>
                ) : (
                  <div className="space-y-3">
                    <span className="text-gray-600 text-sm block">
                      {t('spin.noSpinsLeft')}
                    </span>
                    <ChunkyButton
                      variant="success"
                      size="md"
                      onClick={() => setIsAdModalOpen(true)}
                      className="mx-auto"
                    >
                      <Tv className="w-5 h-5 mr-2" />
                      {t('spin.watchAdForSpins')}
                    </ChunkyButton>
                  </div>
                )}
              </div>
            )}
            
            {/* Probability Disclosure - Apple Required */}
            <details className="mt-4 w-full max-w-xs">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 text-center">
                📊 {t('spin.winChances')}
              </summary>
              <div className="mt-2 p-3 bg-gray-50 rounded-xl text-xs text-gray-600 space-y-1">
                <p className="font-medium text-gray-700 mb-2">{t('spin.eachSegmentChance')}</p>
                {WHEEL_SEGMENTS.map((segment, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span>{getSegmentLabel(segment)}</span>
                    <span className="font-mono text-gray-500">12.5%</span>
                  </div>
                ))}
                <p className="text-gray-400 mt-2 pt-2 border-t border-gray-200">
                  {t('spin.allSegmentsEqual')}
                </p>
              </div>
            </details>
          </div>

          {/* Footer Button */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="sticky bottom-0 px-5 py-4 border-t border-gray-200/60"
              style={{
                background: "linear-gradient(180deg, #FAFAFA 0%, #FFFFFF 100%)",
              }}
            >
              <div className="mx-auto w-full max-w-xl">
              <ChunkyButton
                variant="success"
                size="lg"
                className="w-full"
                onClick={handleClose}
              >
                {t('spin.claimReward')}
              </ChunkyButton>
              </div>
            </motion.div>
          )}

          {/* Watch Ad for Spins Modal */}
          <WatchAdForSpinsModal
            isOpen={isAdModalOpen}
            onClose={() => setIsAdModalOpen(false)}
            onWatchAd={async () => {
              const extraSpins = REWARDS.AD_WATCH_EXTRA_SPINS || 5;
              const success = await addExtraSpins(extraSpins);
              if (success) {
                await refreshSpinInfo();
                toast.success(t('spin.extraSpinsReceived'));
              }
              return success;
            }}
            spinsRemaining={dailySpinInfo.maxSpins - dailySpinInfo.spinsUsed}
            maxSpins={dailySpinInfo.maxSpins}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
