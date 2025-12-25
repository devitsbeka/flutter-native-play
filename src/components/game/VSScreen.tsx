import { motion } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { getCountryFlag } from "@/data/opponents";
import { PowerUpBadge } from "@/components/game/PowerUpBadge";
import { PlayerInfoBadge } from "@/components/game/PlayerInfoBadge";
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
  const calculateArcPosition = (angleDeg: number, radius: number) => {
    const angleRad = (angleDeg * Math.PI) / 180;
    return {
      x: radius * Math.sin(angleRad),
      y: -radius * Math.cos(angleRad),
    };
  };

  const orbitRadius = 90;
  
  // Power-up positions for player (right side)
  const playerAngles = [-45, -15, 15, 45];
  const playerArcPositions = playerAngles.map(angle => calculateArcPosition(angle, orbitRadius));

  // Power-up positions for opponent (left side) - mirrored
  const opponentAngles = [135, 165, 195, 225];
  const opponentArcPositions = opponentAngles.map(angle => calculateArcPosition(angle, orbitRadius));

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden">
      {/* Diagonal Background Split */}
      <div className="absolute inset-0">
        {/* Top-left section - Blue/Teal for Player */}
        <div 
          className="absolute inset-0 bg-gradient-to-br from-[#0D4F6C] via-[#1A6B8A] to-[#2589A8]"
          style={{
            clipPath: "polygon(0 0, 100% 0, 0 100%)",
          }}
        />
        {/* Bottom-right section - Red/Orange for Opponent */}
        <div 
          className="absolute inset-0 bg-gradient-to-tl from-[#8B2323] via-[#A83232] to-[#C94545]"
          style={{
            clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
          }}
        />
        {/* Diagonal line accent */}
        <div 
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, transparent 49.5%, rgba(255,215,0,0.8) 49.5%, rgba(255,215,0,0.8) 50.5%, transparent 50.5%)",
          }}
        />
        {/* Subtle overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30" />
      </div>
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 relative z-10">
        <button 
          onClick={() => navigate("/")}
          className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        
        <div className="flex items-center gap-1 bg-black/20 backdrop-blur-sm rounded-full px-3 py-1">
          <span className="text-xl">👑</span>
          <span className="text-white font-bold text-lg">20</span>
        </div>
      </div>

      {/* Main Content - Diagonal Layout */}
      <div className="flex-1 flex flex-col relative z-10">
        
        {/* Player Section - Top Left */}
        <div className="flex-1 flex items-center justify-start pl-8 pt-4">
          <motion.div 
            className="flex flex-col items-center"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {/* Avatar with gradient ring */}
            <div className="relative">
              {/* Power-ups arc */}
              {playerArcPositions.map((pos, index) => {
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

              <div className="w-28 h-28 rounded-full p-1.5 bg-gradient-to-br from-cyan-400 via-blue-500 to-teal-500 shadow-lg shadow-cyan-500/30">
                <div className="w-full h-full rounded-full bg-[#1A5570] flex items-center justify-center overflow-hidden border-2 border-white/20">
                  {profile?.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt="Your avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-5xl">😊</span>
                  )}
                </div>
              </div>
            </div>

            {/* Player info badge */}
            <div className="-mt-3 z-10">
              <PlayerInfoBadge
                name="You"
                flag={getCountryFlag(profile?.country_code || "US")}
                points={playerPoints}
                delay={0}
                direction="up"
                isPlayer={true}
              />
            </div>
          </motion.div>
        </div>

        {/* VS Text - Center with glow effect */}
        <motion.div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20"
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.4, delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <div className="relative">
            <span className="font-display text-6xl font-black text-[#FFD700] drop-shadow-[0_0_20px_rgba(255,215,0,0.6)] tracking-wider"
              style={{
                textShadow: "0 0 30px rgba(255,215,0,0.8), 0 4px 8px rgba(0,0,0,0.5)",
              }}
            >
              VS
            </span>
          </div>
        </motion.div>

        {/* Opponent Section - Bottom Right */}
        <div className="flex-1 flex items-center justify-end pr-8 pb-4">
          <motion.div 
            className="flex flex-col items-center"
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          >
            {/* Opponent info badge */}
            <div className="mb-[-12px] z-10">
              <PlayerInfoBadge
                name={opponent.name}
                flag={getCountryFlag(opponent.countryCode)}
                points={opponent.points}
                delay={0}
                direction="down"
              />
            </div>

            {/* Avatar with gradient ring */}
            <div className="relative">
              <div className="w-28 h-28 rounded-full p-1.5 bg-gradient-to-br from-orange-400 via-red-500 to-rose-600 shadow-lg shadow-red-500/30">
                <div className="w-full h-full rounded-full bg-[#6B3030] flex items-center justify-center overflow-hidden border-2 border-white/20">
                  {opponent.avatarUrl ? (
                    <img 
                      src={opponent.avatarUrl} 
                      alt={opponent.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-5xl">{opponent.avatarEmoji}</span>
                  )}
                </div>
              </div>

              {/* Power-ups in arc - greyed for opponent */}
              {opponentArcPositions.map((pos, index) => {
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
            </div>
          </motion.div>
        </div>

        {/* Bottom Actions */}
        <div className="px-6 pb-6 flex flex-col items-center gap-4">
          {/* Add Power Button */}
          <PowerUpBadge type="add-power" size="md" index={8} className="w-14 h-14" />

          {/* Start Button */}
          <motion.button
            onClick={startMatch}
            className="w-full max-w-xs py-4 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black font-bold text-xl tracking-wider shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all uppercase"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            NEXT
          </motion.button>
        </div>
      </div>
    </div>
  );
}
