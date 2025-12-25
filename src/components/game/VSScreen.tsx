import { motion } from "framer-motion";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { getCountryFlag } from "@/data/opponents";
import { PowerUpBadge } from "@/components/game/PowerUpBadge";
import { ChevronLeft, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function VSScreen() {
  const { opponent, startMatch, playerPowerUps, opponentPowerUps } = useGame();
  const { profile } = useAuth();
  const navigate = useNavigate();

  if (!opponent) return null;

  const playerName = profile?.nickname || "Player 1";
  const playerAvatar = profile?.avatar_url || "😊";
  const playerPoints = profile?.total_points || 0;

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-gradient-to-b from-[#7C6AE5] to-[#9B89F5]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 relative z-10">
        <button 
          onClick={() => navigate("/")}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        
        <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
          <Crown className="w-4 h-4 text-quiz-yellow fill-quiz-yellow" />
          <span className="text-white font-bold text-sm">20</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-6">
        
        {/* Player 1 Section */}
        <div className="relative mb-8">
          {/* Power-ups around avatar */}
          <div className="absolute -left-16 top-1/2 -translate-y-1/2 flex flex-col gap-2">
            <PowerUpBadge type="fifty-fifty" size="sm" index={0} count={playerPowerUps.find(p => p.type === "fifty-fifty")?.available} />
            <PowerUpBadge type="freeze" size="sm" index={1} count={playerPowerUps.find(p => p.type === "freeze")?.available} />
          </div>
          <div className="absolute -right-16 top-1/2 -translate-y-1/2 flex flex-col gap-2">
            <PowerUpBadge type="replace" size="sm" index={2} count={playerPowerUps.find(p => p.type === "replace")?.available} />
            <PowerUpBadge type="time-drain" size="sm" index={3} count={playerPowerUps.find(p => p.type === "time-drain")?.available} />
          </div>

          {/* Avatar with gradient ring */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
            className="relative"
          >
            <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-br from-red-500 via-orange-500 via-blue-500 to-purple-500">
              <div className="w-full h-full rounded-full bg-[#5B4BC4] flex items-center justify-center">
                <span className="text-5xl">{playerAvatar}</span>
              </div>
            </div>
          </motion.div>

          {/* Name badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap"
          >
            <div className="bg-[#2A2550]/80 px-6 py-1.5 rounded-full flex items-center gap-2">
              <span className="text-white font-bold text-sm">{playerName}</span>
              <span className="text-lg">{getCountryFlag(profile?.country_code || "US")}</span>
            </div>
          </motion.div>

          {/* Points badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-1"
          >
            <Crown className="w-4 h-4 text-quiz-yellow fill-quiz-yellow" />
            <span className="text-white font-bold text-sm">{playerPoints}</span>
          </motion.div>
        </div>

        {/* VS Text */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
          className="my-6"
        >
          <span className="font-display text-4xl font-bold text-quiz-yellow drop-shadow-lg">
            VS
          </span>
        </motion.div>

        {/* Player 2 (Opponent) Section */}
        <div className="relative mt-4">
          {/* Power-ups around avatar */}
          <div className="absolute -left-16 top-1/2 -translate-y-1/2 flex flex-col gap-2">
            <PowerUpBadge type="fifty-fifty" size="sm" index={4} count={opponentPowerUps.find(p => p.type === "fifty-fifty")?.available} disabled />
            <PowerUpBadge type="freeze" size="sm" index={5} count={opponentPowerUps.find(p => p.type === "freeze")?.available} disabled />
          </div>
          <div className="absolute -right-16 top-1/2 -translate-y-1/2 flex flex-col gap-2">
            <PowerUpBadge type="replace" size="sm" index={6} count={opponentPowerUps.find(p => p.type === "replace")?.available} disabled />
            <PowerUpBadge type="time-drain" size="sm" index={7} count={opponentPowerUps.find(p => p.type === "time-drain")?.available} disabled />
          </div>

          {/* Avatar with gradient ring */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.5 }}
            className="relative"
          >
            <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-br from-red-500 via-orange-500 via-blue-500 to-purple-500">
              <div className="w-full h-full rounded-full bg-[#5B4BC4] flex items-center justify-center">
                <span className="text-5xl">{opponent.avatarEmoji}</span>
              </div>
            </div>
          </motion.div>

          {/* Name badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap"
          >
            <div className="bg-[#2A2550]/80 px-6 py-1.5 rounded-full flex items-center gap-2">
              <span className="text-white font-bold text-sm">{opponent.name}</span>
              <span className="text-lg">{getCountryFlag(opponent.countryCode)}</span>
            </div>
          </motion.div>

          {/* Points badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-1"
          >
            <Crown className="w-4 h-4 text-quiz-yellow fill-quiz-yellow" />
            <span className="text-white font-bold text-sm">{opponent.points}</span>
          </motion.div>
        </div>

        {/* Add Power Button */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, delay: 0.8 }}
          className="mt-16"
        >
          <PowerUpBadge type="add-power" size="lg" index={8} />
        </motion.div>

        {/* Start Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, type: "spring" }}
          className="mt-6 w-full max-w-xs"
        >
          <button
            onClick={startMatch}
            className="w-full py-4 rounded-full border-2 border-[#7DD3FC] text-[#7DD3FC] font-bold text-lg bg-transparent hover:bg-[#7DD3FC]/10 transition-colors"
          >
            NEXT
          </button>
        </motion.div>
      </div>
    </div>
  );
}
