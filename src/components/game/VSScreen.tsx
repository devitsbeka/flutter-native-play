import { motion } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { getCountryFlag } from "@/data/opponents";
import { PowerUpBadge } from "@/components/game/PowerUpBadge";
import { PlayerInfoBadge } from "@/components/game/PlayerInfoBadge";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

// Floating star particle
const StarParticle = ({ delay, side, size = "sm" }: { delay: number; side: "player" | "opponent"; size?: "sm" | "md" }) => {
  const isPlayer = side === "player";
  const baseX = isPlayer ? Math.random() * 120 + 20 : Math.random() * 120 + 220;
  const baseY = isPlayer ? Math.random() * 250 + 80 : Math.random() * 250 + 400;
  const dimension = size === "sm" ? 8 : 12;
  
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: baseX,
        top: baseY,
      }}
      initial={{ opacity: 0, scale: 0, rotate: 0 }}
      animate={{ 
        opacity: [0, 1, 1, 0],
        scale: [0, 1, 1.2, 0],
        rotate: [0, 180, 360],
        y: [0, -80, -120],
      }}
      transition={{
        duration: 2.5,
        delay: delay,
        repeat: Infinity,
        ease: "easeOut"
      }}
    >
      <svg width={dimension} height={dimension} viewBox="0 0 24 24" fill="none">
        <path 
          d="M12 2L14.5 9H22L16 14L18.5 22L12 17L5.5 22L8 14L2 9H9.5L12 2Z" 
          fill={isPlayer ? "#a78bfa" : "#e879f9"}
          filter="drop-shadow(0 0 3px currentColor)"
        />
      </svg>
    </motion.div>
  );
};

// Rising sparkle with trail
const RisingSparkle = ({ delay, side }: { delay: number; side: "player" | "opponent" }) => {
  const isPlayer = side === "player";
  const baseX = isPlayer ? Math.random() * 140 + 10 : Math.random() * 140 + 210;
  const baseY = isPlayer ? 350 : 650;
  
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: baseX, top: baseY }}
      initial={{ opacity: 0, y: 0 }}
      animate={{ 
        opacity: [0, 1, 1, 0.5, 0],
        y: [0, -150, -250, -350],
        x: [0, Math.random() * 20 - 10, Math.random() * 30 - 15],
      }}
      transition={{
        duration: 4,
        delay: delay,
        repeat: Infinity,
        ease: "easeOut"
      }}
    >
      <div 
        className={`w-2 h-2 ${isPlayer ? "bg-indigo-400" : "bg-purple-400"} rounded-full`}
        style={{
          boxShadow: `0 0 8px ${isPlayer ? "#818cf8" : "#c084fc"}, 0 0 16px ${isPlayer ? "#818cf8" : "#c084fc"}`,
        }}
      />
    </motion.div>
  );
};

// Hexagon floating particle
const HexParticle = ({ delay, x, y }: { delay: number; x: number; y: number }) => (
  <motion.div
    className="absolute pointer-events-none"
    style={{ left: x, top: y }}
    initial={{ opacity: 0, scale: 0, rotate: 0 }}
    animate={{ 
      opacity: [0, 0.7, 0.7, 0],
      scale: [0.5, 1, 1, 0.5],
      rotate: [0, 60, 120],
      y: [0, -30, -60],
    }}
    transition={{
      duration: 3,
      delay: delay,
      repeat: Infinity,
      ease: "easeInOut"
    }}
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path 
        d="M12 2L21 7V17L12 22L3 17V7L12 2Z" 
        fill="none"
        stroke="#fbbf24"
        strokeWidth="2"
        filter="drop-shadow(0 0 4px #fbbf24)"
      />
    </svg>
  </motion.div>
);

// Diagonal energy spark
const EnergySpark = ({ index }: { index: number }) => {
  const progress = (index + 0.5) / 10;
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: `${100 - progress * 100}%`,
        top: `${progress * 100}%`,
        transform: "translate(-50%, -50%)",
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: [0, 1.5, 1, 1.5, 0],
        opacity: [0, 1, 0.8, 1, 0],
      }}
      transition={{
        duration: 2,
        delay: index * 0.25,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <div 
        className="w-3 h-3 bg-yellow-400 rounded-full"
        style={{
          boxShadow: "0 0 10px #fbbf24, 0 0 20px #fbbf24, 0 0 30px #f59e0b",
        }}
      />
    </motion.div>
  );
};

export function VSScreen() {
  const { opponent, startMatch, playerPowerUps, opponentPowerUps } = useGame();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    setShowContent(true);
  }, []);

  if (!opponent) return null;

  const playerPoints = profile?.total_points || 0;
  const powerTypes: Array<"fifty-fifty" | "freeze" | "replace" | "time-drain"> = ["fifty-fifty", "freeze", "replace", "time-drain"];

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden">
      {/* Background with gradient overlays for depth */}
      <div className="absolute inset-0">
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
          {/* Player section - Deep indigo/purple */}
          <defs>
            <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1a1a3e" />
              <stop offset="50%" stopColor="#2d2d5a" />
              <stop offset="100%" stopColor="#3d3d7a" />
            </linearGradient>
            {/* Opponent section - Bright purple/magenta */}
            <linearGradient id="redGradient" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#6B21A8" />
              <stop offset="50%" stopColor="#9333EA" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>
            <linearGradient id="goldGradient" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFE55C" />
              <stop offset="25%" stopColor="#FFD700" />
              <stop offset="50%" stopColor="#FFC800" />
              <stop offset="75%" stopColor="#FFD700" />
              <stop offset="100%" stopColor="#E6A800" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          <polygon points="0,0 100,0 0,100" fill="url(#blueGradient)" />
          <polygon points="100,0 100,100 0,100" fill="url(#redGradient)" />
          
          {/* Gold diagonal - thicker with glow */}
          <line 
            x1="100" y1="-1" 
            x2="-1" y2="100" 
            stroke="url(#goldGradient)" 
            strokeWidth="2.5"
            filter="url(#glow)"
          />
        </svg>
        
        {/* Depth overlay gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-900/10 via-transparent to-red-900/10" />
      </div>

      {/* Star particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <StarParticle key={`star-p-${i}`} delay={i * 0.4} side="player" size={i % 3 === 0 ? "md" : "sm"} />
        ))}
        {[...Array(8)].map((_, i) => (
          <StarParticle key={`star-o-${i}`} delay={i * 0.4 + 0.2} side="opponent" size={i % 3 === 0 ? "md" : "sm"} />
        ))}
      </div>

      {/* Rising sparkles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <RisingSparkle key={`rise-p-${i}`} delay={i * 0.7} side="player" />
        ))}
        {[...Array(6)].map((_, i) => (
          <RisingSparkle key={`rise-o-${i}`} delay={i * 0.7 + 0.35} side="opponent" />
        ))}
      </div>

      {/* Hex particles scattered */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <HexParticle key={`hex-${i}`} delay={i * 0.6} x={80 + i * 60} y={200 + i * 80} />
        ))}
      </div>

      {/* Energy sparks along diagonal */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <EnergySpark key={i} index={i} />
        ))}
      </div>
      
      {/* Header with glass effect */}
      <div className="flex items-center justify-between px-4 py-3 relative z-10">
        <motion.button 
          onClick={() => navigate("/")}
          className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-lg"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            boxShadow: "0 4px 15px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)"
          }}
        >
          <ChevronLeft className="w-6 h-6 text-white drop-shadow-md" />
        </motion.button>
        
        <motion.div 
          className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md rounded-full px-4 py-2 border border-white/10"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{
            boxShadow: "0 4px 15px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)"
          }}
        >
          <span className="text-xl drop-shadow-md">👑</span>
          <span className="text-white font-bold text-lg drop-shadow-md">20</span>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative z-10">
        
        {/* Player Section - Top Left */}
        <div className="flex-1 flex flex-col items-start justify-start px-5 pt-2">
          <motion.div 
            className="flex flex-col items-center"
            initial={{ x: -50, opacity: 0, scale: 0.8 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut", type: "spring", stiffness: 100 }}
          >
            {/* Power-ups row with Add button */}
            <div className="flex items-center gap-1.5 mb-3">
              {powerTypes.map((type, index) => (
                <motion.div
                  key={type}
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
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
              {/* Add power button next to power-ups */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
              >
                <PowerUpBadge type="add-power" size="sm" index={5} />
              </motion.div>
            </div>

            {/* Avatar with premium frame */}
            <motion.div 
              className="relative"
              animate={{ 
                filter: ["drop-shadow(0 0 15px rgba(168,85,247,0.3))", "drop-shadow(0 0 25px rgba(168,85,247,0.5))", "drop-shadow(0 0 15px rgba(168,85,247,0.3))"]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* Outer glow ring */}
              <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-purple-400/30 via-indigo-500/20 to-violet-300/30 blur-md" />
              
              {/* Main avatar frame */}
              <div className="relative w-28 h-28 rounded-full p-1 bg-gradient-to-br from-purple-400 via-indigo-500 to-violet-600"
                style={{
                  boxShadow: "0 0 20px rgba(168,85,247,0.4), inset 0 2px 4px rgba(255,255,255,0.3), 0 8px 25px rgba(0,0,0,0.4)"
                }}
              >
                {/* Inner border highlight */}
                <div className="w-full h-full rounded-full p-0.5 bg-gradient-to-b from-white/30 to-transparent">
                  <div className="w-full h-full rounded-full bg-[#2a2a4a] flex items-center justify-center overflow-hidden"
                    style={{
                      boxShadow: "inset 0 4px 8px rgba(0,0,0,0.4)"
                    }}
                  >
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
            </motion.div>

            {/* Player info badge */}
            <motion.div 
              className="-mt-3 z-20"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <PlayerInfoBadge
                name="You"
                flag={getCountryFlag(profile?.country_code || "US")}
                points={playerPoints}
                delay={0}
                direction="up"
                isPlayer={true}
              />
            </motion.div>
          </motion.div>
        </div>

        {/* VS Text - Centered with epic styling */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div 
            className="relative"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, delay: 0.2, type: "spring", stiffness: 150 }}
          >
            {/* Glow layers */}
            <div className="absolute inset-0 flex items-center justify-center blur-xl">
              <span className="text-8xl font-black text-yellow-400/50">VS</span>
            </div>
            <div className="absolute inset-0 flex items-center justify-center blur-md">
              <span className="text-8xl font-black text-yellow-500/70">VS</span>
            </div>
            
            {/* Main VS text with 3D effect */}
            <motion.span 
              className="relative font-display text-7xl font-black tracking-wider"
              style={{
                background: "linear-gradient(180deg, #FFE55C 0%, #FFD700 30%, #E6A800 70%, #CC8800 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "0 4px 0 #8B6914, 0 8px 15px rgba(0,0,0,0.5)",
                filter: "drop-shadow(0 0 10px rgba(255,215,0,0.5))",
              }}
              animate={{
                textShadow: [
                  "0 4px 0 #8B6914, 0 8px 15px rgba(0,0,0,0.5)",
                  "0 4px 0 #8B6914, 0 8px 25px rgba(255,215,0,0.3)",
                  "0 4px 0 #8B6914, 0 8px 15px rgba(0,0,0,0.5)",
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              VS
            </motion.span>
          </motion.div>
        </div>

        {/* Opponent Section - Bottom Right */}
        <div className="flex-1 flex flex-col items-end justify-end px-5 pb-4">
          <motion.div 
            className="flex flex-col items-center"
            initial={{ x: 50, opacity: 0, scale: 0.8 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.15, ease: "easeOut", type: "spring", stiffness: 100 }}
          >
            {/* Opponent info badge */}
            <motion.div 
              className="mb-[-12px] z-20"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <PlayerInfoBadge
                name={opponent.name}
                flag={getCountryFlag(opponent.countryCode)}
                points={opponent.points}
                delay={0}
                direction="down"
              />
            </motion.div>

            {/* Avatar with premium frame - purple theme */}
            <motion.div 
              className="relative"
              animate={{ 
                filter: ["drop-shadow(0 0 15px rgba(192,132,252,0.3))", "drop-shadow(0 0 25px rgba(192,132,252,0.5))", "drop-shadow(0 0 15px rgba(192,132,252,0.3))"]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            >
              {/* Outer glow ring */}
              <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-purple-400/30 via-fuchsia-500/20 to-violet-400/30 blur-md" />
              
              {/* Main avatar frame */}
              <div className="relative w-28 h-28 rounded-full p-1 bg-gradient-to-br from-purple-400 via-fuchsia-500 to-violet-500"
                style={{
                  boxShadow: "0 0 20px rgba(192,132,252,0.4), inset 0 2px 4px rgba(255,255,255,0.3), 0 8px 25px rgba(0,0,0,0.4)"
                }}
              >
                {/* Inner border highlight */}
                <div className="w-full h-full rounded-full p-0.5 bg-gradient-to-b from-white/30 to-transparent">
                  <div className="w-full h-full rounded-full bg-[#581c87] flex items-center justify-center overflow-hidden"
                    style={{
                      boxShadow: "inset 0 4px 8px rgba(0,0,0,0.4)"
                    }}
                  >
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
              </div>
            </motion.div>

            {/* Power-ups row - greyed for opponent */}
            <div className="flex gap-1.5 mt-3 opacity-40">
              {powerTypes.map((type, index) => (
                <motion.div
                  key={type}
                  initial={{ scale: 0, rotate: 20 }}
                  animate={{ scale: 1, rotate: 0 }}
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

      {/* Bottom Action - Premium NEXT Button */}
      <div className="px-6 pb-6 relative z-10">
        <motion.button
          onClick={startMatch}
          className="relative w-full py-4 rounded-2xl font-bold text-xl tracking-widest uppercase overflow-hidden"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98, y: 2 }}
          style={{
            background: "linear-gradient(180deg, #FFE55C 0%, #FFD700 20%, #E6A800 80%, #CC8800 100%)",
            boxShadow: "0 6px 0 #8B6914, 0 8px 20px rgba(0,0,0,0.4), inset 0 2px 0 rgba(255,255,255,0.4)",
            textShadow: "0 1px 2px rgba(0,0,0,0.3)",
            color: "#5C4A00",
          }}
        >
          {/* Shine effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{
              x: ["-100%", "200%"],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3,
              ease: "easeInOut",
            }}
          />
          <span className="relative z-10">NEXT</span>
        </motion.button>
      </div>
    </div>
  );
}
