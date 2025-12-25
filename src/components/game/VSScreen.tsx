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
    <div className="h-full flex flex-col relative overflow-hidden bg-gradient-to-b from-[#8B7FD4] to-[#9B8FE4]">
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
      <div className="flex-1 flex flex-col items-center justify-start px-6 pt-4 pb-6 overflow-auto">
        
        {/* Player 1 Section */}
        <div className="relative mb-2">
          {/* Power-ups in arc around avatar */}
          {/* Top-left */}
          <div className="absolute -left-12 -top-2">
            <PowerUpBadge 
              type="fifty-fifty" 
              size="sm" 
              index={0} 
              count={playerPowerUps.find(p => p.type === "fifty-fifty")?.available} 
            />
          </div>
          {/* Left */}
          <div className="absolute -left-14 top-10">
            <PowerUpBadge 
              type="freeze" 
              size="sm" 
              index={1} 
              count={playerPowerUps.find(p => p.type === "freeze")?.available} 
            />
          </div>
          {/* Top-right */}
          <div className="absolute -right-12 -top-2">
            <PowerUpBadge 
              type="replace" 
              size="sm" 
              index={2} 
              count={playerPowerUps.find(p => p.type === "replace")?.available} 
            />
          </div>
          {/* Right */}
          <div className="absolute -right-14 top-10">
            <PowerUpBadge 
              type="time-drain" 
              size="sm" 
              index={3} 
              count={playerPowerUps.find(p => p.type === "time-drain")?.available} 
            />
          </div>

          {/* Avatar with thick gradient ring */}
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
          </motion.div>

          {/* Name badge overlapping avatar bottom */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap z-10"
          >
            <div className="bg-[#3D3670] px-5 py-2 rounded-full flex items-center gap-2 shadow-lg">
              <span className="text-white font-bold text-base">{playerName}</span>
              <span className="text-xl">{getCountryFlag(profile?.country_code || "US")}</span>
            </div>
          </motion.div>
        </div>

        {/* Points badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-1 mt-6"
        >
          <span className="text-lg">👑</span>
          <span className="text-white font-bold text-lg">{playerPoints}</span>
        </motion.div>

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

        {/* Player 2 (Opponent) Section */}
        <div className="relative mt-2">
          {/* Power-ups in arc - all greyed/disabled for opponent */}
          {/* Top-left */}
          <div className="absolute -left-12 -top-2 opacity-40">
            <PowerUpBadge 
              type="fifty-fifty" 
              size="sm" 
              index={4} 
              count={opponentPowerUps.find(p => p.type === "fifty-fifty")?.available} 
              disabled 
            />
          </div>
          {/* Left */}
          <div className="absolute -left-14 top-10 opacity-40">
            <PowerUpBadge 
              type="freeze" 
              size="sm" 
              index={5} 
              count={opponentPowerUps.find(p => p.type === "freeze")?.available} 
              disabled 
            />
          </div>
          {/* Top-right */}
          <div className="absolute -right-12 -top-2 opacity-40">
            <PowerUpBadge 
              type="replace" 
              size="sm" 
              index={6} 
              count={opponentPowerUps.find(p => p.type === "replace")?.available} 
              disabled 
            />
          </div>
          {/* Right */}
          <div className="absolute -right-14 top-10 opacity-40">
            <PowerUpBadge 
              type="time-drain" 
              size="sm" 
              index={7} 
              count={opponentPowerUps.find(p => p.type === "time-drain")?.available} 
              disabled 
            />
          </div>

          {/* Avatar with thick gradient ring */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.5 }}
            className="relative"
          >
            <div className="w-32 h-32 rounded-full p-1.5 bg-gradient-to-br from-red-500 via-purple-500 to-blue-500">
              <div className="w-full h-full rounded-full bg-[#6B5BC4] flex items-center justify-center">
                <span className="text-6xl">{opponent.avatarEmoji}</span>
              </div>
            </div>
          </motion.div>

          {/* Name badge overlapping avatar bottom */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap z-10"
          >
            <div className="bg-[#3D3670] px-5 py-2 rounded-full flex items-center gap-2 shadow-lg">
              <span className="text-white font-bold text-base">{opponent.name}</span>
              <span className="text-xl">{getCountryFlag(opponent.countryCode)}</span>
            </div>
          </motion.div>
        </div>

        {/* Opponent Points badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex items-center gap-1 mt-6"
        >
          <span className="text-lg">👑</span>
          <span className="text-white font-bold text-lg">{opponent.points.toLocaleString()}</span>
        </motion.div>

        {/* Spacer */}
        <div className="flex-1 min-h-8" />

        {/* Add Power Button - Large */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, delay: 0.8 }}
          className="mb-4"
        >
          <PowerUpBadge type="add-power" size="lg" index={8} className="w-24 h-24" />
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
