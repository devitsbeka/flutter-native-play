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

  const playerPoints = profile?.total_points || 0;

  // Calculate arc positions using proper circle trigonometry
  const calculateArcPosition = (angleDeg: number, radius: number) => {
    const angleRad = (angleDeg * Math.PI) / 180;
    return {
      x: radius * Math.sin(angleRad),
      y: -radius * Math.cos(angleRad),
    };
  };

  const orbitRadius = 85;
  
  // Power-up positions for player (arc above avatar)
  const playerAngles = [-50, -18, 18, 50];
  const playerArcPositions = playerAngles.map(angle => calculateArcPosition(angle, orbitRadius));

  // Power-up positions for opponent (arc below avatar)
  const opponentAngles = [130, 162, 198, 230];
  const opponentArcPositions = opponentAngles.map(angle => calculateArcPosition(angle, orbitRadius));

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden">
      {/* Diagonal Background Split */}
      <div className="absolute inset-0">
        {/* Top-left section - Blue/Teal for Player */}
        <div 
          className="absolute inset-0 bg-gradient-to-br from-[#1A5570] via-[#2A6A85] to-[#3A7F9A]"
          style={{
            clipPath: "polygon(0 0, 100% 0, 0 100%)",
          }}
        />
        {/* Bottom-right section - Red/Crimson for Opponent */}
        <div 
          className="absolute inset-0 bg-gradient-to-tl from-[#6B2020] via-[#8B3030] to-[#A04040]"
          style={{
            clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
          }}
        />
        {/* Diagonal gold line accent */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(135deg, transparent 48.5%, #C5A028 48.5%, #FFD700 50%, #C5A028 51.5%, transparent 51.5%)",
          }}
        />
      </div>
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 relative z-10">
        <button 
          onClick={() => navigate("/")}
          className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        
        <div className="flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5">
          <span className="text-xl">👑</span>
          <span className="text-white font-bold text-lg">20</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative z-10 px-4">
        
        {/* Player Section - Top Left Area */}
        <div className="flex justify-start pt-2">
          <motion.div 
            className="flex flex-col items-center"
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {/* Avatar with power-ups arc */}
            <div className="relative">
              {/* Power-ups arc above avatar */}
              {playerArcPositions.map((pos, index) => {
                const types: Array<"fifty-fifty" | "freeze" | "replace" | "time-drain"> = ["fifty-fifty", "freeze", "replace", "time-drain"];
                const type = types[index];
                return (
                  <div
                    key={type}
                    className="absolute z-10"
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

              <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-br from-cyan-400 via-blue-500 to-cyan-300 shadow-xl">
                <div className="w-full h-full rounded-full bg-[#2A6A85] flex items-center justify-center overflow-hidden border-2 border-cyan-300/30">
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
            <div className="-mt-3 z-20">
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

        {/* VS Text - Centered in the middle of the screen */}
        <div className="flex-1 flex items-center justify-center">
          <motion.div 
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.5, delay: 0.15, type: "spring", stiffness: 180 }}
          >
            <span 
              className="font-display text-7xl font-black text-[#FFD700] tracking-wider"
              style={{
                textShadow: "0 0 40px rgba(255,215,0,0.7), 0 4px 12px rgba(0,0,0,0.5), 2px 2px 0 #B8860B",
                WebkitTextStroke: "2px #B8860B",
              }}
            >
              VS
            </span>
          </motion.div>
        </div>

        {/* Opponent Section - Bottom Right Area */}
        <div className="flex justify-end pb-2">
          <motion.div 
            className="flex flex-col items-center"
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          >
            {/* Opponent info badge */}
            <div className="mb-[-12px] z-20">
              <PlayerInfoBadge
                name={opponent.name}
                flag={getCountryFlag(opponent.countryCode)}
                points={opponent.points}
                delay={0}
                direction="down"
              />
            </div>

            {/* Avatar with power-ups arc */}
            <div className="relative">
              <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-br from-orange-500 via-red-500 to-orange-400 shadow-xl">
                <div className="w-full h-full rounded-full bg-[#8B3030] flex items-center justify-center overflow-hidden border-2 border-orange-300/30">
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

              {/* Power-ups arc below avatar - greyed for opponent */}
              {opponentArcPositions.map((pos, index) => {
                const types: Array<"fifty-fifty" | "freeze" | "replace" | "time-drain"> = ["fifty-fifty", "freeze", "replace", "time-drain"];
                const type = types[index];
                return (
                  <div
                    key={type}
                    className="absolute opacity-50 z-10"
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
      </div>

      {/* Bottom Actions */}
      <div className="px-6 pb-6 flex flex-col items-center gap-3 relative z-10">
        {/* Add Power Button */}
        <PowerUpBadge type="add-power" size="md" index={8} className="w-14 h-14" />

        {/* Start Button */}
        <motion.button
          onClick={startMatch}
          className="w-full max-w-xs py-4 rounded-full bg-gradient-to-b from-[#FFD700] to-[#E6A800] text-black font-bold text-xl tracking-wider shadow-lg uppercase border-b-4 border-[#B8860B]"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          NEXT
        </motion.button>
      </div>
    </div>
  );
}
