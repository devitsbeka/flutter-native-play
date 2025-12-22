import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Volume2, VolumeX } from "lucide-react";

interface LuckySpinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WHEEL_SEGMENTS = [
  { label: "50 XP", color: "hsl(280 60% 55%)", value: 50, type: "xp" },
  { label: "Free Spin", color: "hsl(45 90% 50%)", value: 1, type: "spin" },
  { label: "100 XP", color: "hsl(140 50% 45%)", value: 100, type: "xp" },
  { label: "Power-Up", color: "hsl(200 70% 50%)", value: 1, type: "powerup" },
  { label: "25 XP", color: "hsl(340 70% 55%)", value: 25, type: "xp" },
  { label: "200 XP", color: "hsl(25 85% 55%)", value: 200, type: "xp" },
  { label: "Bonus!", color: "hsl(280 60% 55%)", value: 500, type: "bonus" },
  { label: "75 XP", color: "hsl(170 60% 45%)", value: 75, type: "xp" },
];

const SEGMENT_ANGLE = 360 / WHEEL_SEGMENTS.length;

export function LuckySpinModal({ isOpen, onClose }: LuckySpinModalProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<typeof WHEEL_SEGMENTS[0] | null>(null);
  const [hasSpun, setHasSpun] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const spinWheel = () => {
    if (isSpinning || hasSpun) return;

    setIsSpinning(true);
    setResult(null);

    // Random number of full rotations (3-5) plus random segment
    const fullRotations = 3 + Math.floor(Math.random() * 3);
    const randomSegment = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
    const segmentRotation = randomSegment * SEGMENT_ANGLE;
    const newRotation = rotation + (fullRotations * 360) + segmentRotation + (SEGMENT_ANGLE / 2);

    setRotation(newRotation);

    // Calculate result after animation
    setTimeout(() => {
      setIsSpinning(false);
      setHasSpun(true);
      // The winning segment is opposite to where the pointer is
      const winningIndex = (WHEEL_SEGMENTS.length - randomSegment) % WHEEL_SEGMENTS.length;
      setResult(WHEEL_SEGMENTS[winningIndex]);
    }, 4000);
  };

  const handleClose = () => {
    setRotation(0);
    setResult(null);
    setHasSpun(false);
    setIsSpinning(false);
    onClose();
  };

  const getRewardEmoji = (type: string) => {
    switch (type) {
      case "xp": return "⭐";
      case "spin": return "🎰";
      case "powerup": return "⚡";
      case "bonus": return "🎁";
      default: return "🎉";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal Content */}
          <motion.div
            className="relative z-10 w-[90%] max-w-md"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-display font-bold text-white">Lucky Spin!</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </button>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Wheel Container */}
            <div className="relative aspect-square">
              {/* Glow effect */}
              <div 
                className="absolute inset-0 rounded-full blur-2xl opacity-50"
                style={{ background: "radial-gradient(circle, hsl(45 90% 60%) 0%, transparent 70%)" }}
              />

              {/* Pointer/Arrow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
                <div 
                  className="w-0 h-0"
                  style={{
                    borderLeft: "15px solid transparent",
                    borderRight: "15px solid transparent",
                    borderTop: "30px solid hsl(45 90% 50%)",
                    filter: "drop-shadow(0 2px 4px hsl(0 0% 0% / 0.3))"
                  }}
                />
              </div>

              {/* Outer ring */}
              <div 
                className="absolute inset-0 rounded-full"
                style={{
                  background: "linear-gradient(180deg, hsl(45 80% 55%) 0%, hsl(40 75% 40%) 100%)",
                  padding: "8px",
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
                    ease: [0.17, 0.67, 0.12, 0.99], // Custom easing for realistic spin
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
                          style={{ 
                            textShadow: "0 1px 2px hsl(0 0% 0% / 0.5)",
                            transform: "rotate(0deg)"
                          }}
                        >
                          {segment.label}
                        </span>
                      </div>
                    );
                  })}

                  {/* Center button */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.button
                      onClick={spinWheel}
                      disabled={isSpinning || hasSpun}
                      className="relative w-20 h-20 rounded-full flex items-center justify-center disabled:opacity-70"
                      style={{
                        background: "linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(0 0% 90%) 100%)",
                        boxShadow: "0 4px 0 hsl(0 0% 70%), 0 6px 20px hsl(0 0% 0% / 0.3)",
                      }}
                      whileHover={{ scale: isSpinning || hasSpun ? 1 : 1.05 }}
                      whileTap={{ scale: isSpinning || hasSpun ? 1 : 0.95 }}
                    >
                      <span className="font-display font-bold text-lg" style={{ color: "hsl(25 85% 50%)" }}>
                        {isSpinning ? "..." : hasSpun ? "✓" : "SPIN"}
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
                    background: i % 2 === 0 ? "hsl(45 90% 60%)" : "hsl(0 0% 100%)",
                    top: `${50 + 48 * Math.sin((i * 30 * Math.PI) / 180)}%`,
                    left: `${50 + 48 * Math.cos((i * 30 * Math.PI) / 180)}%`,
                    transform: "translate(-50%, -50%)",
                    boxShadow: "0 0 10px hsl(45 90% 60% / 0.5)",
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
                  className="mt-6 text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <motion.div
                    className="inline-block px-8 py-4 rounded-2xl"
                    style={{
                      background: "linear-gradient(180deg, hsl(45 90% 55%) 0%, hsl(40 85% 45%) 100%)",
                      boxShadow: "0 4px 0 hsl(35 80% 35%)",
                    }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2 }}
                  >
                    <span className="text-3xl mr-2">{getRewardEmoji(result.type)}</span>
                    <span className="font-display text-white text-xl font-bold">
                      You won {result.label}!
                    </span>
                  </motion.div>

                  <motion.button
                    onClick={handleClose}
                    className="mt-4 px-6 py-3 rounded-xl font-display font-bold text-white"
                    style={{
                      background: "linear-gradient(180deg, hsl(140 50% 45%) 0%, hsl(140 50% 35%) 100%)",
                      boxShadow: "0 3px 0 hsl(140 50% 25%)",
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Collect Reward
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Spins remaining */}
            {!result && (
              <div className="mt-4 text-center">
                <span className="text-white/70 text-sm">
                  {hasSpun ? "Come back tomorrow for more spins!" : "1 free spin available"}
                </span>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
