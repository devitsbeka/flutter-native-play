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

  // Diagonal positions for power-ups (percentage based)
  // Player power-ups: top-right area, cascading down-left along diagonal
  const playerPowerPositions = [
    { x: 78, y: 12 },  // time-drain - top right
    { x: 68, y: 18 },  // replace
    { x: 58, y: 26 },  // freeze
    { x: 50, y: 34 },  // fifty-fifty
  ];
  
  // Opponent power-ups: bottom-left area, cascading down along diagonal
  const opponentPowerPositions = [
    { x: 22, y: 66 },  // time-drain
    { x: 30, y: 74 },  // replace
    { x: 38, y: 82 },  // freeze
    { x: 48, y: 90 },  // fifty-fifty
  ];

  // Add power button position (on diagonal, between player area and VS)
  const addPowerPosition = { x: 38, y: 52 };

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden">
      {/* Background gradient - deep indigo to purple */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a3e] via-[#2d2060] to-[#4a1a6e]" />
      
      {/* Diagonal gold line with glow */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
        <defs>
          <linearGradient id="goldLine" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFE55C" />
            <stop offset="50%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#E6A800" />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Main diagonal line */}
        <line 
          x1="100%" y1="0%" 
          x2="0%" y2="100%" 
          stroke="url(#goldLine)" 
          strokeWidth="8"
          filter="url(#glow)"
        />
      </svg>

      {/* Ambient particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <StarParticle key={`star-${i}`} delay={i * 0.5} x={15 + i * 10} y={20 + i * 8} color="#a78bfa" />
        ))}
        {[...Array(8)].map((_, i) => (
          <StarParticle key={`star2-${i}`} delay={i * 0.5 + 0.25} x={55 + i * 5} y={50 + i * 6} color="#e879f9" />
        ))}
        {[...Array(6)].map((_, i) => (
          <HexOutline key={`hex-${i}`} delay={i * 0.7} x={10 + i * 15} y={30 + i * 10} />
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

      {/* Main Content Area */}
      <div className="flex-1 relative z-10">
        
        {/* Player Section - Upper area */}
        <motion.div 
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: "8%" }}
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Avatar */}
          <div className="relative w-28 h-28 mx-auto">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-purple-400 via-indigo-500 to-violet-600 blur-sm" />
            <div className="relative w-full h-full rounded-full p-1 bg-gradient-to-br from-purple-400 via-indigo-500 to-violet-600">
              <div className="w-full h-full rounded-full bg-[#2a2a4a] overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="You" className="w-full h-full object-cover" />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-5xl">😊</span>
                )}
              </div>
            </div>
          </div>
          
          {/* Player badge */}
          <div className="-mt-3 relative z-10">
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

        {/* Player Power-ups along diagonal (top-right area) */}
        {powerTypes.map((type, index) => {
          const pos = playerPowerPositions[index];
          return (
            <motion.div
              key={`player-${type}`}
              className="absolute z-10"
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)" }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 + index * 0.1, type: "spring", stiffness: 200 }}
            >
              <PowerUpBadge 
                type={type}
                size="sm" 
                index={index} 
                count={playerPowerUps.find(p => p.type === type)?.available} 
              />
            </motion.div>
          );
        })}

        {/* Add Power Button on diagonal */}
        <motion.div
          className="absolute z-10"
          style={{ left: `${addPowerPosition.x}%`, top: `${addPowerPosition.y}%`, transform: "translate(-50%, -50%)" }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
        >
          <PowerUpBadge type="add-power" size="md" index={5} />
        </motion.div>

        {/* VS Text - Centered */}
        <motion.div 
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
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
              textShadow: "0 4px 0 #8B6914",
              filter: "drop-shadow(0 0 20px rgba(255,215,0,0.5))",
            }}
          >
            VS
          </span>
        </motion.div>

        {/* Opponent Power-ups along diagonal (bottom-left area) */}
        {powerTypes.map((type, index) => {
          const pos = opponentPowerPositions[index];
          return (
            <motion.div
              key={`opponent-${type}`}
              className="absolute z-10 opacity-50"
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)" }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.5 }}
              transition={{ delay: 0.4 + index * 0.1, type: "spring", stiffness: 200 }}
            >
              <PowerUpBadge 
                type={type}
                size="sm" 
                index={index + 4} 
                count={opponentPowerUps.find(p => p.type === type)?.available} 
                disabled
              />
            </motion.div>
          );
        })}

        {/* Opponent Section - Lower area */}
        <motion.div 
          className="absolute left-1/2 -translate-x-1/2"
          style={{ bottom: "18%" }}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Opponent badge */}
          <div className="mb-[-12px] relative z-10">
            <PlayerInfoBadge
              name={opponent.name}
              flag={getCountryFlag(opponent.countryCode)}
              points={opponent.points}
              delay={0}
              direction="down"
            />
          </div>
          
          {/* Avatar */}
          <div className="relative w-28 h-28 mx-auto">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-purple-400 via-fuchsia-500 to-pink-500 blur-sm" />
            <div className="relative w-full h-full rounded-full p-1 bg-gradient-to-br from-purple-400 via-fuchsia-500 to-pink-500">
              <div className="w-full h-full rounded-full bg-[#4a2a5a] overflow-hidden">
                {opponent.avatarUrl ? (
                  <img src={opponent.avatarUrl} alt={opponent.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-5xl">{opponent.avatarEmoji}</span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
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
