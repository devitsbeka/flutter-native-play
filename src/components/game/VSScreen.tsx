import { motion } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { getCountryFlag } from "@/data/opponents";
import { PowerUpBadge } from "@/components/game/PowerUpBadge";
import { PlayerInfoBadge } from "@/components/game/PlayerInfoBadge";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Floating star particle
const StarParticle = ({ delay, x, y, color }: { delay: number; x: number; y: number; color: string }) => (
  <motion.div
    className="absolute pointer-events-none"
    style={{ left: `${x}%`, top: `${y}%` }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{ 
      opacity: [0, 0.8, 0],
      scale: [0, 1, 0],
      y: [0, -30],
    }}
    transition={{ duration: 2.5, delay, repeat: Infinity, ease: "easeOut" }}
  >
    <svg width="10" height="10" viewBox="0 0 24 24">
      <path d="M12 2L14.5 9H22L16 14L18.5 22L12 17L5.5 22L8 14L2 9H9.5L12 2Z" fill={color} />
    </svg>
  </motion.div>
);

// Hexagon outline particle
const HexOutline = ({ delay, x, y }: { delay: number; x: number; y: number }) => (
  <motion.div
    className="absolute pointer-events-none"
    style={{ left: `${x}%`, top: `${y}%` }}
    initial={{ opacity: 0, scale: 0, rotate: 0 }}
    animate={{ 
      opacity: [0, 0.5, 0],
      scale: [0.5, 1, 0.5],
      rotate: [0, 30, 60],
      y: [0, -20],
    }}
    transition={{ duration: 3, delay, repeat: Infinity, ease: "easeInOut" }}
  >
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" fill="none" stroke="#fbbf24" strokeWidth="1.5" opacity="0.6" />
    </svg>
  </motion.div>
);

export function VSScreen() {
  const { opponent, startMatch, playerPowerUps, opponentPowerUps } = useGame();
  const { profile } = useAuth();
  const navigate = useNavigate();

  if (!opponent) return null;

  const playerPoints = profile?.total_points || 0;
  const powerTypes: Array<"fifty-fifty" | "freeze" | "replace" | "time-drain"> = ["fifty-fifty", "freeze", "replace", "time-drain"];

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden">
      {/* Player Avatar Background (Top-Left Diagonal) */}
      <div 
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
      >
        {profile?.avatar_url ? (
          <div 
            className="absolute w-[200%] h-[200%] -top-1/4 -left-1/4"
            style={{
              backgroundImage: `url(${profile.avatar_url})`,
              backgroundSize: "cover",
              backgroundPosition: "center top",
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a3e] via-[#2d2060] to-[#3a2a70]" />
        )}
        {/* Dark overlay with indigo tint */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/70 via-purple-900/75 to-violet-900/80" />
      </div>

      {/* Opponent Avatar Background (Bottom-Right Diagonal) */}
      <div 
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}
      >
        {opponent.avatarUrl ? (
          <div 
            className="absolute w-[200%] h-[200%] -bottom-1/4 -right-1/4"
            style={{
              backgroundImage: `url(${opponent.avatarUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center top",
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-tl from-[#4a1a6e] via-[#5a2080] to-[#6a3090]" />
        )}
        {/* Dark overlay with magenta tint */}
        <div className="absolute inset-0 bg-gradient-to-tl from-fuchsia-900/70 via-purple-900/75 to-pink-900/80" />
      </div>
      
      {/* Diagonal gold line with glow */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" preserveAspectRatio="none">
        <defs>
          <linearGradient id="goldLine" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFE55C" />
            <stop offset="50%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#E6A800" />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <line 
          x1="100%" y1="0%" 
          x2="0%" y2="100%" 
          stroke="url(#goldLine)" 
          strokeWidth="10"
          filter="url(#glow)"
        />
      </svg>

      {/* Ambient particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <StarParticle key={`star-${i}`} delay={i * 0.5} x={10 + i * 12} y={15 + i * 10} color="#a78bfa" />
        ))}
        {[...Array(6)].map((_, i) => (
          <StarParticle key={`star2-${i}`} delay={i * 0.5 + 0.25} x={60 + i * 6} y={55 + i * 7} color="#e879f9" />
        ))}
        {[...Array(4)].map((_, i) => (
          <HexOutline key={`hex-${i}`} delay={i * 0.8} x={5 + i * 20} y={25 + i * 15} />
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 relative z-20">
        <motion.button 
          onClick={() => navigate("/")}
          className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{ boxShadow: "0 4px 15px rgba(0,0,0,0.3)" }}
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </motion.button>
        
        <motion.div 
          className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md rounded-full px-4 py-2 border border-white/10"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <span className="text-xl">👑</span>
          <span className="text-white font-bold text-lg">20</span>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative z-10 px-4">
        
        {/* === PLAYER SECTION (Top-Left Area) === */}
        <div className="flex-1 flex items-start pt-6">
          <motion.div 
            className="flex items-start gap-4"
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Player Power-ups - Vertical stack on far left */}
            <div className="flex flex-col gap-2">
              {powerTypes.map((type, index) => (
                <motion.div
                  key={`player-${type}`}
                  initial={{ scale: 0, x: -20 }}
                  animate={{ scale: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.08, type: "spring", stiffness: 200 }}
                >
                  <PowerUpBadge 
                    type={type}
                    size="sm" 
                    index={index} 
                    count={playerPowerUps.find(p => p.type === type)?.available} 
                  />
                </motion.div>
              ))}
              {/* Add power button */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
              >
                <PowerUpBadge type="add-power" size="sm" index={5} />
              </motion.div>
            </div>

            {/* Player Name/Flag/Points - UFC Style */}
            <motion.div 
              className="flex flex-col items-start"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-3xl">{getCountryFlag(profile?.country_code || "US")}</span>
                <span className="text-white font-black text-2xl uppercase tracking-wide drop-shadow-lg">
                  YOU
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5">
                <span className="text-yellow-400 text-lg">👑</span>
                <span className="text-yellow-400 font-bold text-xl">{playerPoints.toLocaleString()}</span>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* === VS TEXT (Center) === */}
        <motion.div 
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.5, delay: 0.3, type: "spring" }}
        >
          <span 
            className="font-display text-7xl font-black tracking-wider"
            style={{
              background: "linear-gradient(180deg, #FFE55C 0%, #FFD700 30%, #E6A800 70%, #CC8800 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 4px 0 #8B6914) drop-shadow(0 0 20px rgba(255,215,0,0.5))",
            }}
          >
            VS
          </span>
        </motion.div>

        {/* === OPPONENT SECTION (Bottom-Right Area) === */}
        <div className="flex-1 flex items-end justify-end pb-6">
          <motion.div 
            className="flex items-end gap-4"
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            {/* Opponent Name/Flag/Points - UFC Style */}
            <motion.div 
              className="flex flex-col items-end"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white font-black text-2xl uppercase tracking-wide drop-shadow-lg">
                  {opponent.name}
                </span>
                <span className="text-3xl">{getCountryFlag(opponent.countryCode)}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5">
                <span className="text-yellow-400 text-lg">👑</span>
                <span className="text-yellow-400 font-bold text-xl">{opponent.points.toLocaleString()}</span>
              </div>
            </motion.div>

            {/* Opponent Power-ups - Vertical stack on far right */}
            <div className="flex flex-col gap-2 opacity-50">
              {powerTypes.map((type, index) => (
                <motion.div
                  key={`opponent-${type}`}
                  initial={{ scale: 0, x: 20 }}
                  animate={{ scale: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.08, type: "spring", stiffness: 200 }}
                >
                  <PowerUpBadge 
                    type={type}
                    size="sm" 
                    index={index + 4} 
                    count={opponentPowerUps.find(p => p.type === type)?.available} 
                    disabled
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Button */}
      <div className="px-6 pb-6 relative z-20">
        <motion.button
          onClick={startMatch}
          className="relative w-full py-4 rounded-2xl font-bold text-xl tracking-widest uppercase overflow-hidden"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            background: "linear-gradient(180deg, #FFE55C 0%, #FFD700 20%, #E6A800 80%, #CC8800 100%)",
            boxShadow: "0 6px 0 #8B6914, 0 8px 20px rgba(0,0,0,0.4)",
            color: "#5C4A00",
          }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          />
          <span className="relative z-10">NEXT</span>
        </motion.button>
      </div>
    </div>
  );
}
