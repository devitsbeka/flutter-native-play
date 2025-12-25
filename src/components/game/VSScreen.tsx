import { motion } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { getCountryFlag } from "@/data/opponents";
import { PowerUpBadge } from "@/components/game/PowerUpBadge";
import { ChevronLeft } from "lucide-react";
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
    <div className="h-full w-full flex flex-col relative overflow-hidden bg-gradient-to-b from-[#8B7FD4] to-[#9B8FE4]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 relative z-10">
        <button 
          onClick={() => navigate("/")}
          className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        
        <div className="flex items-center gap-1">
          <span className="text-xl">👑</span>
          <span className="text-white font-bold text-lg">20</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-start px-6 pt-2 pb-6 overflow-auto">
        
        {/* Player 1 Section - Badges at TOP in semi-circle */}
        <div className="relative flex flex-col items-center">
          {/* Power-ups in semi-circle at TOP of avatar */}
          <div className="flex items-end justify-center gap-2 mb-2">
            <div className="transform -translate-y-1">
              <PowerUpBadge 
                type="fifty-fifty" 
                size="sm" 
                index={0} 
                count={playerPowerUps.find(p => p.type === "fifty-fifty")?.available} 
              />
            </div>
            <div className="transform -translate-y-3">
              <PowerUpBadge 
                type="freeze" 
                size="sm" 
                index={1} 
                count={playerPowerUps.find(p => p.type === "freeze")?.available} 
              />
            </div>
            <div className="transform -translate-y-3">
              <PowerUpBadge 
                type="replace" 
                size="sm" 
                index={2} 
                count={playerPowerUps.find(p => p.type === "replace")?.available} 
              />
            </div>
            <div className="transform -translate-y-1">
              <PowerUpBadge 
                type="time-drain" 
                size="sm" 
                index={3} 
                count={playerPowerUps.find(p => p.type === "time-drain")?.available} 
              />
            </div>
          </div>

          {/* Avatar with gradient ring */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
            className="relative"
          >
            <div className="w-32 h-32 rounded-full p-1.5 bg-gradient-to-br from-red-500 via-purple-500 to-blue-500">
              <div className="w-full h-full rounded-full bg-[#6B5BC4] flex items-center justify-center">
                <span className="text-6xl">{playerAvatar}</span>
              </div>
            </div>

            {/* Name badge centered at bottom of avatar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap z-10"
            >
              <div className="bg-[#3D3670] px-5 py-2 rounded-full flex items-center gap-2 shadow-lg">
                <span className="text-white font-bold text-sm uppercase">{playerName}</span>
                <span className="text-lg">{getCountryFlag(profile?.country_code || "US")}</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Points badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-1 mt-8"
          >
            <span className="text-lg">👑</span>
            <span className="text-white font-bold text-lg">{playerPoints}</span>
          </motion.div>
        </div>

        {/* VS Text */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
          className="my-4"
        >
          <span className="font-display text-4xl font-bold text-[#C4A84B] drop-shadow-lg tracking-wide">
            VS
          </span>
        </motion.div>

        {/* Player 2 (Opponent) Section - Badges at BOTTOM in semi-circle */}
        <div className="relative flex flex-col items-center">
          {/* Avatar with gradient ring */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.5 }}
            className="relative"
          >
            {/* Name badge centered at top of avatar */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap z-10"
            >
              <div className="bg-[#3D3670] px-5 py-2 rounded-full flex items-center gap-2 shadow-lg">
                <span className="text-white font-bold text-sm uppercase">{opponent.name}</span>
                <span className="text-lg">{getCountryFlag(opponent.countryCode)}</span>
              </div>
            </motion.div>

            <div className="w-32 h-32 rounded-full p-1.5 bg-gradient-to-br from-red-500 via-purple-500 to-blue-500">
              <div className="w-full h-full rounded-full bg-[#6B5BC4] flex items-center justify-center">
                <span className="text-6xl">{opponent.avatarEmoji}</span>
              </div>
            </div>
          </motion.div>

          {/* Power-ups in semi-circle at BOTTOM of avatar - greyed for opponent */}
          <div className="flex items-start justify-center gap-2 mt-2 opacity-50">
            <div className="transform translate-y-1">
              <PowerUpBadge 
                type="fifty-fifty" 
                size="sm" 
                index={4} 
                count={opponentPowerUps.find(p => p.type === "fifty-fifty")?.available} 
                disabled 
              />
            </div>
            <div className="transform translate-y-3">
              <PowerUpBadge 
                type="freeze" 
                size="sm" 
                index={5} 
                count={opponentPowerUps.find(p => p.type === "freeze")?.available} 
                disabled 
              />
            </div>
            <div className="transform translate-y-3">
              <PowerUpBadge 
                type="replace" 
                size="sm" 
                index={6} 
                count={opponentPowerUps.find(p => p.type === "replace")?.available} 
                disabled 
              />
            </div>
            <div className="transform translate-y-1">
              <PowerUpBadge 
                type="time-drain" 
                size="sm" 
                index={7} 
                count={opponentPowerUps.find(p => p.type === "time-drain")?.available} 
                disabled 
              />
            </div>
          </div>

          {/* Opponent Points badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex items-center gap-1 mt-4"
          >
            <span className="text-lg">👑</span>
            <span className="text-white font-bold text-lg">{opponent.points.toLocaleString()}</span>
          </motion.div>
        </div>

        {/* Spacer */}
        <div className="flex-1 min-h-4" />

        {/* Add Power Button - 30% smaller */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, delay: 0.8 }}
          className="mb-4"
        >
          <PowerUpBadge type="add-power" size="md" index={8} className="w-16 h-16" />
        </motion.div>

        {/* Start Button - Light blue outline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, type: "spring" }}
          className="w-full max-w-xs"
        >
          <button
            onClick={startMatch}
            className="w-full py-4 rounded-full border-2 border-[#7DD3FC] text-[#7DD3FC] font-bold text-xl tracking-wider bg-transparent hover:bg-[#7DD3FC]/10 transition-colors uppercase"
          >
            NEXT
          </button>
        </motion.div>
      </div>
    </div>
  );
}
