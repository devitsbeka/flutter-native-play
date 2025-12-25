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
  // radius = distance from avatar center to badge center
  // angle measured from top (12 o'clock), negative = left, positive = right
  const calculateArcPosition = (angleDeg: number, radius: number) => {
    const angleRad = (angleDeg * Math.PI) / 180;
    return {
      x: radius * Math.sin(angleRad),
      y: -radius * Math.cos(angleRad), // negative because y-axis is inverted in CSS
    };
  };

  const orbitRadius = 110; // increased distance from avatar center for more spacing
  
  // Top arc: badges at -55°, -20°, 20°, 55° from vertical
  const topAngles = [-55, -20, 20, 55];
  const topArcPositions = topAngles.map(angle => calculateArcPosition(angle, orbitRadius));

  // Bottom arc: mirrored (180° offset)
  const bottomAngles = [180 + 55, 180 + 20, 180 - 20, 180 - 55]; // 235°, 200°, 160°, 125°
  const bottomArcPositions = bottomAngles.map(angle => calculateArcPosition(angle, orbitRadius));

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden">
      {/* Background comes from parent GameContainer - no local iframe */}
      
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
        
        {/* Player 1 Section - NO ANIMATION for seamless transition */}
        <div className="flex flex-col items-center mt-4">
          {/* Avatar with gradient ring and arc badges - NO motion wrapper */}
          <div className="relative">
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
              <div className="w-full h-full rounded-full bg-[#6B5BC4] flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="Your avatar" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-6xl">😊</span>
                )}
              </div>
            </div>
          </div>

          {/* Player info badge with flag, name, points */}
          <div className="-mt-4 z-10">
            <PlayerInfoBadge
              name="You"
              flag={getCountryFlag(profile?.country_code || "US")}
              points={playerPoints}
              delay={0}
              direction="up"
              isPlayer={true}
            />
          </div>
        </div>

        {/* VS Text - NO animation for seamless transition */}
        <div className="my-3">
          <span className="font-display text-5xl font-bold text-[#FFD700] drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] tracking-wide">
            VS
          </span>
        </div>

        {/* Player 2 (Opponent) Section */}
        <div className="flex flex-col items-center">
          {/* Opponent info badge */}
          <div className="mb-[-16px] z-10">
            <PlayerInfoBadge
              name={opponent.name}
              flag={getCountryFlag(opponent.countryCode)}
              points={opponent.points}
              delay={0}
              direction="down"
            />
          </div>

          {/* Avatar with gradient ring and arc badges - smooth scale in */}
          <motion.div
            initial={{ scale: 1 }}
            animate={{ scale: 1 }}
            className="relative"
          >
            <div className="w-36 h-36 rounded-full p-2 bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500">
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
        </div>

        {/* Spacer */}
        <div className="flex-1 min-h-4" />

        {/* Add Power Button */}
        <div className="mb-4">
          <PowerUpBadge type="add-power" size="md" index={8} className="w-16 h-16" />
        </div>

        {/* Start Button */}
        <div className="w-full max-w-xs">
          <button
            onClick={startMatch}
            className="w-full py-4 rounded-full border-2 border-[#7DD3FC] text-[#7DD3FC] font-bold text-xl tracking-wider bg-transparent hover:bg-[#7DD3FC]/10 transition-colors uppercase"
          >
            NEXT
          </button>
        </div>
      </div>
    </div>
  );
}
