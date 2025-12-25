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

  // Calculate arc positions using proper circle trigonometry
  // radius = distance from avatar center to badge center
  // angle measured from top (12 o'clock), negative = left, positive = right
  const calculateArcPosition = (angleDeg: number, radius: number) => {
    const angleRad = (angleDeg * Math.PI) / 180;
    return {
      x: radius * Math.sin(angleRad),
      y: -radius * Math.cos(angleRad), // negative because y-axis is inverted in CSS
    };
  };

  const orbitRadius = 95; // distance from avatar center
  
  // Top arc: badges at -55°, -20°, 20°, 55° from vertical
  const topAngles = [-55, -20, 20, 55];
  const topArcPositions = topAngles.map(angle => calculateArcPosition(angle, orbitRadius));

  // Bottom arc: mirrored (180° offset)
  const bottomAngles = [180 + 55, 180 + 20, 180 - 20, 180 - 55]; // 235°, 200°, 160°, 125°
  const bottomArcPositions = bottomAngles.map(angle => calculateArcPosition(angle, orbitRadius));

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

      {/* Main Content - extra top padding to prevent cropping */}
      <div className="flex-1 flex flex-col items-center justify-start px-6 pt-12 pb-6 overflow-auto">
        
        {/* Player 1 Section */}
        <div className="flex flex-col items-center mt-4">
          {/* Avatar with gradient ring and arc badges */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
            className="relative"
          >
            {/* Power-ups in arc at TOP of avatar */}
            {topArcPositions.map((pos, index) => {
              const types: Array<"fifty-fifty" | "freeze" | "replace" | "time-drain"> = ["fifty-fifty", "freeze", "replace", "time-drain"];
              const type = types[index];
              return (
                <div
                  key={type}
                  className="absolute"
                  style={{
                    left: `calc(50% + ${pos.x}px)`,
                    top: `calc(50% + ${pos.y}px)`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <PowerUpBadge 
                    type={type}
                    size="sm" 
                    index={index} 
                    count={playerPowerUps.find(p => p.type === type)?.available} 
                  />
                </div>
              );
            })}

            <div className="w-36 h-36 rounded-full p-2 bg-gradient-to-br from-red-500 via-purple-500 to-blue-500">
              <div className="w-full h-full rounded-full bg-[#6B5BC4] flex items-center justify-center">
                <span className="text-6xl">{playerAvatar}</span>
              </div>
            </div>
          </motion.div>

          {/* Name badge - separate from avatar, centered */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="-mt-4 z-10"
          >
            <div className="bg-[#3D3670] px-5 py-2 rounded-full flex items-center justify-center gap-2 shadow-lg">
              <span className="text-white font-bold text-sm uppercase tracking-wide">{playerName}</span>
              <span className="text-lg">{getCountryFlag(profile?.country_code || "US")}</span>
            </div>
          </motion.div>

          {/* Points badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-1 mt-2"
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
          className="my-3"
        >
          <span className="font-display text-4xl font-bold text-[#C4A84B] drop-shadow-lg tracking-wide">
            VS
          </span>
        </motion.div>

        {/* Player 2 (Opponent) Section */}
        <div className="flex flex-col items-center">
          {/* Name badge - separate from avatar, centered */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-[-16px] z-10"
          >
            <div className="bg-[#3D3670] px-5 py-2 rounded-full flex items-center justify-center gap-2 shadow-lg">
              <span className="text-white font-bold text-sm uppercase tracking-wide">{opponent.name}</span>
              <span className="text-lg">{getCountryFlag(opponent.countryCode)}</span>
            </div>
          </motion.div>

          {/* Avatar with gradient ring and arc badges */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.5 }}
            className="relative"
          >
            <div className="w-36 h-36 rounded-full p-2 bg-gradient-to-br from-red-500 via-purple-500 to-blue-500">
              <div className="w-full h-full rounded-full bg-[#6B5BC4] flex items-center justify-center">
                <span className="text-6xl">{opponent.avatarEmoji}</span>
              </div>
            </div>

            {/* Power-ups in arc at BOTTOM of avatar - greyed for opponent */}
            {bottomArcPositions.map((pos, index) => {
              const types: Array<"fifty-fifty" | "freeze" | "replace" | "time-drain"> = ["fifty-fifty", "freeze", "replace", "time-drain"];
              const type = types[index];
              return (
                <div
                  key={type}
                  className="absolute opacity-50"
                  style={{
                    left: `calc(50% + ${pos.x}px)`,
                    top: `calc(50% + ${pos.y}px)`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <PowerUpBadge 
                    type={type}
                    size="sm" 
                    index={index + 4} 
                    count={opponentPowerUps.find(p => p.type === type)?.available} 
                    disabled 
                  />
                </div>
              );
            })}
          </motion.div>

          {/* Opponent Points badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex items-center gap-1 mt-2"
          >
            <span className="text-lg">👑</span>
            <span className="text-white font-bold text-lg">{opponent.points.toLocaleString()}</span>
          </motion.div>
        </div>

        {/* Spacer */}
        <div className="flex-1 min-h-4" />

        {/* Add Power Button */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, delay: 0.8 }}
          className="mb-4"
        >
          <PowerUpBadge type="add-power" size="md" index={8} className="w-16 h-16" />
        </motion.div>

        {/* Start Button */}
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
