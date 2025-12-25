import { motion } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { getCountryFlag } from "@/data/opponents";
import { PowerUpBadge } from "@/components/game/PowerUpBadge";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Floating sparkle particle
const SparkleParticle = ({ delay, x, y }: { delay: number; x: number; y: number }) => (
  <motion.div
    className="absolute pointer-events-none"
    style={{ left: `${x}%`, top: `${y}%` }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{ 
      opacity: [0, 1, 0],
      scale: [0, 1, 0],
    }}
    transition={{ duration: 2, delay, repeat: Infinity, ease: "easeOut" }}
  >
    <div className="w-1.5 h-1.5 rounded-full bg-white" style={{ boxShadow: "0 0 6px 2px rgba(255,255,255,0.8)" }} />
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
      {/* Gradient background matching home page - pink/lavender */}
      <div 
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, #E8D4F0 0%, #F0E0F5 30%, #F5E8FA 60%, #F8F0FC 100%)",
        }}
      />

      {/* Subtle blob decorations like home page */}
      <motion.div
        className="absolute top-[5%] right-[-20%] w-[80%] h-[50%] rounded-full opacity-60 blur-3xl"
        style={{ background: "linear-gradient(135deg, #C5A8D8 0%, #D4B8E8 100%)" }}
        animate={{ 
          scale: [1, 1.1, 1],
          x: [0, 10, 0],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[10%] left-[-10%] w-[60%] h-[40%] rounded-full opacity-50 blur-3xl"
        style={{ background: "linear-gradient(135deg, #B8D8C8 0%, #A8E8D0 100%)" }}
        animate={{ 
          scale: [1, 1.15, 1],
          x: [0, -10, 0],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Ambient sparkle particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <SparkleParticle 
            key={`sparkle-${i}`} 
            delay={i * 0.3} 
            x={10 + (i * 7) % 80} 
            y={10 + (i * 11) % 80} 
          />
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 relative z-20">
        <motion.button 
          onClick={() => navigate("/")}
          className="w-11 h-11 rounded-2xl flex items-center justify-center"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{ 
            background: "rgba(255,255,255,0.7)",
            backdropFilter: "blur(10px)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.08)" 
          }}
        >
          <ChevronLeft className="w-6 h-6 text-gray-700" />
        </motion.button>
        
        <motion.div 
          className="flex items-center gap-1.5 rounded-full px-4 py-2"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{
            background: "rgba(255,255,255,0.9)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          }}
        >
          <span className="text-xl">👑</span>
          <span className="text-gray-800 font-bold text-lg">20</span>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative z-10 px-4">
        
        {/* === PLAYER SECTION (Top Area) === */}
        <div className="flex items-start gap-3 pt-2">
          {/* Player Power-ups - Vertical stack */}
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

          {/* Player Avatar - Large and Visible */}
          <motion.div
            className="flex-1 flex flex-col items-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <div className="relative">
              {/* Cyan glow behind avatar */}
              <div 
                className="absolute inset-0 rounded-full blur-2xl"
                style={{ 
                  background: "radial-gradient(circle, rgba(0,255,255,0.4) 0%, transparent 70%)",
                  transform: "scale(1.3)",
                }}
              />
              {/* Avatar image */}
              <div 
                className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-white/50"
                style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}
              >
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="You" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-4xl">
                    👤
                  </div>
                )}
              </div>
            </div>
            
            {/* Player info below avatar */}
            <motion.div 
              className="flex items-center gap-2 mt-3"
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <span className="text-2xl">{getCountryFlag(profile?.country_code || "US")}</span>
              <span 
                className="font-bold text-xl text-gray-800"
                style={{ fontFamily: "'TASolivare', sans-serif" }}
              >
                YOU
              </span>
            </motion.div>
            <motion.div 
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 mt-1"
              style={{
                background: "linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(168,85,247,0.2) 100%)",
              }}
            >
              <span className="text-lg">👑</span>
              <span className="text-purple-700 font-bold">{playerPoints.toLocaleString()}</span>
            </motion.div>
          </motion.div>
        </div>

        {/* === VS TEXT (Center) with Diagonal Line === */}
        <div className="flex-1 flex items-center justify-center relative">
          {/* Diagonal gold line */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            <defs>
              <linearGradient id="goldLineVS" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FFE55C" />
                <stop offset="50%" stopColor="#FFD700" />
                <stop offset="100%" stopColor="#E6A800" />
              </linearGradient>
              <filter id="glowVS" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <line 
              x1="0%" y1="100%" 
              x2="100%" y2="0%" 
              stroke="url(#goldLineVS)" 
              strokeWidth="6"
              filter="url(#glowVS)"
            />
          </svg>

          <motion.div 
            className="relative z-10"
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
        </div>

        {/* === OPPONENT SECTION (Bottom Area) === */}
        <div className="flex items-end justify-end gap-3 pb-2">
          {/* Opponent Avatar - Large and Visible */}
          <motion.div
            className="flex-1 flex flex-col items-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
          >
            {/* Opponent info above avatar */}
            <motion.div 
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 mb-1"
              style={{
                background: "linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(168,85,247,0.2) 100%)",
              }}
            >
              <span className="text-lg">👑</span>
              <span className="text-purple-700 font-bold">{opponent.points.toLocaleString()}</span>
            </motion.div>
            <motion.div 
              className="flex items-center gap-2 mb-3"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <span 
                className="font-bold text-xl text-gray-800"
                style={{ fontFamily: "'TASolivare', sans-serif" }}
              >
                {opponent.name.toUpperCase()}
              </span>
              <span className="text-2xl">{getCountryFlag(opponent.countryCode)}</span>
            </motion.div>

            <div className="relative">
              {/* Magenta glow behind avatar */}
              <div 
                className="absolute inset-0 rounded-full blur-2xl"
                style={{ 
                  background: "radial-gradient(circle, rgba(255,0,200,0.3) 0%, transparent 70%)",
                  transform: "scale(1.3)",
                }}
              />
              {/* Avatar image */}
              <div 
                className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-white/50"
                style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}
              >
                {opponent.avatarUrl ? (
                  <img 
                    src={opponent.avatarUrl} 
                    alt={opponent.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-fuchsia-400 to-pink-400 flex items-center justify-center text-4xl">
                    🤖
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Opponent Power-ups - Vertical stack on right */}
          <div className="flex flex-col gap-2 opacity-60">
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
            boxShadow: "0 6px 0 #8B6914, 0 8px 20px rgba(0,0,0,0.2)",
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
