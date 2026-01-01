import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { RotateCcw, Home } from "lucide-react";
import { GameModal } from "@/components/ui/game-modal";
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
  coinsEarned,
}: GameLoseModalProps) {
  const navigate = useNavigate();

  const handleBackToHome = () => {
    onClose();
    navigate("/");
  };

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      title="წაგება"
      iconEmoji="😔"
      showSparkles={false}
    >
      {/* Score display */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center justify-center gap-6 mb-4 p-4 rounded-2xl"
        style={{
          background: "#F3F4F6",
          boxShadow: "0 3px 0 #E5E7EB, inset 0 1px 2px rgba(255,255,255,0.8)",
        }}
      >
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-1">შენ</p>
          <p className="text-3xl font-bold text-gray-900">{userScore}</p>
        </div>
        <div 
          className="text-gray-400 text-xl font-bold px-3 py-1 rounded-lg"
          style={{
            background: "#E5E7EB",
          }}
        >
          vs
        </div>
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-1">{opponentName}</p>
          <p className="text-3xl font-bold text-gray-900">{opponentScore}</p>
        </div>
      </motion.div>

      {/* Encouragement message */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-gray-600 text-center text-sm mb-4"
      >
        არ დანებდე! შემდეგ ჯერზე აუცილებლად მოიგებ 💪
      </motion.p>

      {/* Consolation coins */}
      {coinsEarned > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full mx-auto w-fit mb-5"
          style={{
            background: "linear-gradient(180deg, #FEF3C7 0%, #FDE68A 100%)",
            boxShadow: "0 3px 0 #F59E0B, inset 0 1px 2px rgba(255,255,255,0.8)",
          }}
        >
          <img src={coinIcon} alt="" className="w-5 h-5" />
          <span className="text-amber-800 font-semibold">+{coinsEarned} ნუგეშის მონეტები</span>
        </motion.div>
      )}

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-3"
      >
        <ChunkyButton
          variant="success"
          size="lg"
          onClick={onPlayAgain}
          className="w-full"
          icon={<RotateCcw className="w-5 h-5" />}
        >
          თავიდან სცადე
        </ChunkyButton>

        <ChunkyButton
          variant="secondary"
          size="lg"
          onClick={handleBackToHome}
          className="w-full"
          icon={<Home className="w-5 h-5" />}
        >
          მთავარ გვერდზე
        </ChunkyButton>
      </motion.div>
    </GameModal>
  );
}
