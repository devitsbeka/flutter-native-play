import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { X, RotateCcw, Home } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";
import coinIcon from "@/assets/icons/icon-coin.png";

interface GameLoseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayAgain: () => void;
  userScore: number;
  opponentScore: number;
  opponentName: string;
  opponentAvatarUrl?: string | null;
  coinsEarned: number;
}

export function GameLoseModal({
  isOpen,
  onClose,
  onPlayAgain,
  userScore,
  opponentScore,
  opponentName,
  opponentAvatarUrl,
  coinsEarned,
}: GameLoseModalProps) {
  const navigate = useNavigate();

  const handleBackToHome = () => {
    onClose();
    navigate("/");
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto"
          >
            <div 
              className="rounded-3xl p-6 relative overflow-hidden"
              style={{
                background: "linear-gradient(180deg, #6366F1 0%, #4F46E5 100%)",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
              }}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              {/* Sad face icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                className="flex justify-center mb-4"
              >
                <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
                  <span className="text-5xl">😔</span>
                </div>
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold text-white text-center mb-2"
                style={{ fontFamily: "'TASolivare', sans-serif" }}
              >
                წაგება
              </motion.h2>

              {/* Score display */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-center gap-4 mb-4"
              >
                <div className="text-center">
                  <p className="text-white/70 text-sm">შენ</p>
                  <p className="text-3xl font-bold text-white">{userScore}</p>
                </div>
                <div className="text-white/50 text-2xl font-bold">vs</div>
                <div className="text-center">
                  <p className="text-white/70 text-sm">{opponentName}</p>
                  <p className="text-3xl font-bold text-white">{opponentScore}</p>
                </div>
              </motion.div>

              {/* Encouragement message */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-white/80 text-center text-sm mb-4"
              >
                არ დანებდე! შემდეგ ჯერზე აუცილებლად მოიგებ 💪
              </motion.p>

              {/* Consolation coins */}
              {coinsEarned > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white/10 mx-auto w-fit mb-6"
                >
                  <img src={coinIcon} alt="" className="w-5 h-5" />
                  <span className="text-white font-medium">+{coinsEarned} ნუგეშის მონეტები</span>
                </motion.div>
              )}

              {/* Action buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="space-y-3"
              >
                <ChunkyButton
                  variant="mint"
                  size="lg"
                  onClick={onPlayAgain}
                  className="w-full"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  თავიდან სცადე
                </ChunkyButton>

                <ChunkyButton
                  variant="secondary"
                  size="lg"
                  onClick={handleBackToHome}
                  className="w-full bg-white/10 hover:bg-white/20 text-white border-0"
                >
                  <Home className="w-5 h-5 mr-2" />
                  მთავარ გვერდზე
                </ChunkyButton>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
