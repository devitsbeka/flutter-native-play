import { motion } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { getCountryFlag } from "@/data/opponents";
import { PowerUpBadge } from "@/components/game/PowerUpBadge";
import { PlayerInfoBadge } from "@/components/game/PlayerInfoBadge";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

// Floating particle component
const Particle = ({ delay, side }: { delay: number; side: "blue" | "red" }) => {
  const isBlue = side === "blue";
  return (
    <motion.div
      className={`absolute w-1.5 h-1.5 rounded-full ${isBlue ? "bg-purple-400" : "bg-fuchsia-400"}`}
      initial={{ 
        opacity: 0, 
        scale: 0,
        x: isBlue ? Math.random() * 150 : Math.random() * 150 + 200,
        y: isBlue ? Math.random() * 300 + 50 : Math.random() * 300 + 350,
      }}
      animate={{ 
        opacity: [0, 0.8, 0],
        scale: [0, 1.5, 0],
        y: isBlue ? [null, Math.random() * -100 - 50] : [null, Math.random() * -100 - 50],
      }}
      transition={{
        duration: 3,
        delay: delay,
        repeat: Infinity,
        ease: "easeOut"
      }}
      style={{
        filter: `blur(0.5px) drop-shadow(0 0 4px ${isBlue ? "#a855f7" : "#e879f9"})`,
      }}
    />
  );
};

// Sparkle along diagonal
const DiagonalSparkle = ({ index }: { index: number }) => {
  const progress = index / 8;
  return (
    <motion.div
      className="absolute w-2 h-2 bg-yellow-300 rounded-full"
      style={{
        left: `${100 - progress * 100}%`,
        top: `${progress * 100}%`,
        filter: "blur(0.5px) drop-shadow(0 0 6px #ffd700)",
      }}
      animate={{
        scale: [1, 1.8, 1],
        opacity: [0.5, 1, 0.5],
      }}
      transition={{
        duration: 1.5,
        delay: index * 0.2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
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

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <Particle key={`blue-${i}`} delay={i * 0.3} side="blue" />
        ))}
        {[...Array(12)].map((_, i) => (
          <Particle key={`red-${i}`} delay={i * 0.3 + 0.15} side="red" />
        ))}
      </div>

      {/* Diagonal sparkles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <DiagonalSparkle key={i} index={i} />
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
