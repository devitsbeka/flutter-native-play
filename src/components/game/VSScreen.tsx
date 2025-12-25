import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { getCountryFlag } from "@/data/opponents";
import { PowerUpBadge } from "@/components/game/PowerUpBadge";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";

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

// Countdown overlay component
const CountdownOverlay = ({ count, onComplete }: { count: number | string; onComplete?: () => void }) => (
  <motion.div 
    className="fixed inset-0 z-50 flex items-center justify-center"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    {/* Dark overlay */}
    <motion.div 
      className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    />
    
    {/* Countdown number/text */}
    <AnimatePresence mode="wait">
      <motion.div
        key={count}
        className="relative z-10"
        initial={{ scale: 3, opacity: 0, rotate: -10 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        exit={{ scale: 0.5, opacity: 0, rotate: 10 }}
        transition={{ duration: 0.3, type: "spring", stiffness: 200, damping: 15 }}
      >
        {/* Glow ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: count === "GO!" 
              ? "radial-gradient(circle, rgba(34,197,94,0.6) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(255,215,0,0.6) 0%, transparent 70%)",
            transform: "scale(3)",
          }}
          animate={{ 
            scale: [2.5, 3.5, 2.5],
            opacity: [0.8, 0.4, 0.8],
          }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
        
        <span 
          className="text-8xl font-black"
          style={{
            fontFamily: "'TASolivare', sans-serif",
            background: count === "GO!" 
              ? "linear-gradient(180deg, #4ADE80 0%, #22C55E 50%, #16A34A 100%)"
              : "linear-gradient(180deg, #FFE55C 0%, #FFD700 30%, #E6A800 70%, #CC8800 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: count === "GO!"
              ? "drop-shadow(0 4px 0 #166534) drop-shadow(0 0 30px rgba(34,197,94,0.8))"
              : "drop-shadow(0 4px 0 #8B6914) drop-shadow(0 0 30px rgba(255,215,0,0.8))",
          }}
        >
          {count}
        </span>
      </motion.div>
    </AnimatePresence>
  </motion.div>
);

export function VSScreen() {
  const { opponent, startMatch, playerPowerUps, opponentPowerUps } = useGame();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [showVS, setShowVS] = useState(false);
  const [countdown, setCountdown] = useState<number | string | null>(null);
  const [isCountingDown, setIsCountingDown] = useState(false);

  // Trigger VS text after avatars animate in
  useEffect(() => {
    const timer = setTimeout(() => setShowVS(true), 600);
    return () => clearTimeout(timer);
  }, []);

  // Countdown timer logic
  const handleStartCountdown = useCallback(() => {
    if (isCountingDown) return;
    setIsCountingDown(true);
    setCountdown(3);
    
    const countdownSequence = [
      { value: 3, delay: 0 },
      { value: 2, delay: 800 },
      { value: 1, delay: 1600 },
      { value: "GO!", delay: 2400 },
    ];
    
    countdownSequence.forEach(({ value, delay }) => {
      setTimeout(() => setCountdown(value), delay);
    });
    
    // Start match after GO!
    setTimeout(() => {
      setCountdown(null);
      setIsCountingDown(false);
      startMatch();
    }, 3200);
  }, [isCountingDown, startMatch]);

  if (!opponent) return null;

  const playerPoints = profile?.total_points || 0;
  const playerWins = profile?.games_won || 0;
  const playerGames = profile?.games_played || 0;
  const opponentWins = Math.floor(opponent.points / 500); // Simulated
  const opponentGames = opponentWins + Math.floor(Math.random() * 10) + 5; // Simulated
  
  const powerTypes: Array<"fifty-fifty" | "freeze" | "replace" | "time-drain"> = ["fifty-fifty", "freeze", "replace", "time-drain"];

  return (
    <div className="h-[100dvh] w-full flex flex-col relative overflow-hidden">
      {/* Gradient background matching home page - pink/lavender */}
      <div 
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, #E8D4F0 0%, #F0E0F5 30%, #F5E8FA 60%, #F8F0FC 100%)",
        }}
      />

      {/* Subtle blob decorations */}
      <motion.div
        className="absolute top-[5%] right-[-20%] w-[60%] h-[30%] rounded-full opacity-50 blur-3xl"
        style={{ background: "linear-gradient(135deg, #C5A8D8 0%, #D4B8E8 100%)" }}
      />
      <motion.div
        className="absolute bottom-[20%] left-[-15%] w-[40%] h-[25%] rounded-full opacity-40 blur-3xl"
        style={{ background: "linear-gradient(135deg, #B8D8C8 0%, #A8E8D0 100%)" }}
      />

      {/* Ambient sparkle particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <SparkleParticle 
            key={`sparkle-${i}`} 
            delay={i * 0.4} 
            x={15 + (i * 12) % 70} 
            y={20 + (i * 15) % 60} 
          />
        ))}
      </div>

      {/* Header - Compact */}
      <div className="flex items-center justify-between px-4 py-2 relative z-30 shrink-0">
        <motion.button 
          onClick={() => navigate("/")}
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          whileTap={{ scale: 0.95 }}
          style={{ 
            background: "rgba(255,255,255,0.8)",
            backdropFilter: "blur(10px)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)" 
          }}
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </motion.button>
        
        <motion.div 
          className="flex items-center gap-1 rounded-full px-3 py-1.5"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{
            background: "rgba(255,255,255,0.9)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <span className="text-lg">👑</span>
          <span className="text-gray-800 font-bold">20</span>
        </motion.div>
      </div>

      {/* Main Content - Flex to fill remaining space */}
      <div className="flex-1 flex flex-col justify-between relative z-10 px-3 min-h-0">
        
        {/* === PLAYER SECTION === */}
        <div className="flex items-start gap-2">
          {/* Player Power-ups - Left side, compact */}
          <div className="flex flex-col gap-1">
            {powerTypes.slice(0, 3).map((type, index) => (
              <motion.div
                key={`player-${type}`}
                initial={{ scale: 0, x: -20 }}
                animate={{ scale: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.05, type: "spring", stiffness: 200 }}
              >
                <PowerUpBadge 
                  type={type}
                  size="sm" 
                  index={index} 
                  count={playerPowerUps.find(p => p.type === type)?.available} 
                />
              </motion.div>
            ))}
          </div>

          {/* Player Avatar + Info - Centered */}
          <div className="flex-1 flex flex-col items-center">
            {/* Face-off zoom entrance animation */}
            <motion.div
              className="relative"
              initial={{ scale: 2, opacity: 0, y: -60 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.5, type: "spring", stiffness: 100, damping: 12 }}
            >
              {/* Glow effect */}
              <motion.div 
                className="absolute inset-0 blur-xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                style={{ 
                  background: "radial-gradient(circle, rgba(0,255,255,0.4) 0%, transparent 60%)",
                  transform: "scale(1.3)",
                }}
              />
              {/* Avatar - Smaller */}
              <div className="relative w-24 h-24">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="You" 
                    className="w-full h-full object-contain drop-shadow-xl"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl">
                    👤
                  </div>
                )}
              </div>
            </motion.div>
            
            {/* Player info - Compact */}
            <motion.div 
              className="flex items-center gap-1.5 mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <span className="text-xl">{getCountryFlag(profile?.country_code || "US")}</span>
              <span className="font-bold text-lg text-gray-800" style={{ fontFamily: "'TASolivare', sans-serif" }}>
                YOU
              </span>
            </motion.div>
            
            {/* Points + W/L in one row */}
            <motion.div 
              className="flex items-center gap-2 mt-0.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center gap-1 rounded-lg px-2 py-0.5" style={{ background: "rgba(139,92,246,0.12)" }}>
                <span className="text-sm">👑</span>
                <span className="text-purple-700 font-bold text-xs">{playerPoints.toLocaleString()}</span>
              </div>
              <span className="text-[10px] text-gray-500">
                <span className="text-green-600 font-semibold">{playerWins}W</span>
                <span className="mx-0.5">/</span>
                <span className="text-red-500 font-semibold">{playerGames - playerWins}L</span>
              </span>
            </motion.div>
          </div>

          {/* Empty space for symmetry */}
          <div className="w-10" />
        </div>

        {/* === VS SECTION (Center) === */}
        <div className="flex items-center justify-center relative py-2">
          {/* Horizontal gold line */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            <defs>
              <linearGradient id="goldLineVS" x1="0%" y1="50%" x2="100%" y2="50%">
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
            <motion.line 
              x1="5%" y1="50%" 
              x2="95%" y2="50%" 
              stroke="url(#goldLineVS)" 
              strokeWidth="5"
              filter="url(#glowVS)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            />
          </svg>
          
          {/* VS Text */}
          <AnimatePresence>
            {showVS && (
              <motion.div 
                className="relative z-10"
                initial={{ scale: 2.5, opacity: 0, rotate: -15 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ duration: 0.3, type: "spring", stiffness: 180, damping: 12 }}
              >
                <motion.span 
                  className="font-display text-4xl font-black tracking-wider"
                  animate={{ 
                    textShadow: [
                      "0 3px 0 #8B6914, 0 0 15px rgba(255,215,0,0.5)",
                      "0 3px 0 #8B6914, 0 0 30px rgba(255,215,0,0.8)",
                      "0 3px 0 #8B6914, 0 0 15px rgba(255,215,0,0.5)",
                    ]
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{
                    background: "linear-gradient(180deg, #FFE55C 0%, #FFD700 30%, #E6A800 70%, #CC8800 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    filter: "drop-shadow(0 3px 0 #8B6914)",
                  }}
                >
                  VS
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* === OPPONENT SECTION === */}
        <div className="flex items-end gap-2">
          {/* Empty space for symmetry */}
          <div className="w-10" />

          {/* Opponent Avatar + Info - Centered */}
          <div className="flex-1 flex flex-col items-center">
            {/* Points + W/L in one row */}
            <motion.div 
              className="flex items-center gap-2 mb-0.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <div className="flex items-center gap-1 rounded-lg px-2 py-0.5" style={{ background: "rgba(139,92,246,0.12)" }}>
                <span className="text-sm">👑</span>
                <span className="text-purple-700 font-bold text-xs">{opponent.points.toLocaleString()}</span>
              </div>
              <span className="text-[10px] text-gray-500">
                <span className="text-green-600 font-semibold">{opponentWins}W</span>
                <span className="mx-0.5">/</span>
                <span className="text-red-500 font-semibold">{opponentGames - opponentWins}L</span>
              </span>
            </motion.div>

            {/* Opponent info - Compact */}
            <motion.div 
              className="flex items-center gap-1.5 mb-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <span className="font-bold text-lg text-gray-800" style={{ fontFamily: "'TASolivare', sans-serif" }}>
                {opponent.name.toUpperCase()}
              </span>
              <span className="text-xl">{getCountryFlag(opponent.countryCode)}</span>
            </motion.div>

            {/* Face-off zoom entrance animation */}
            <motion.div
              className="relative"
              initial={{ scale: 2, opacity: 0, y: 60 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, type: "spring", stiffness: 100, damping: 12 }}
            >
              {/* Glow effect */}
              <motion.div 
                className="absolute inset-0 blur-xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                style={{ 
                  background: "radial-gradient(circle, rgba(255,0,200,0.35) 0%, transparent 60%)",
                  transform: "scale(1.3)",
                }}
              />
              {/* Avatar - Smaller */}
              <div className="relative w-24 h-24">
                {opponent.avatarUrl ? (
                  <img 
                    src={opponent.avatarUrl} 
                    alt={opponent.name} 
                    className="w-full h-full object-contain drop-shadow-xl"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl">
                    🤖
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Opponent Power-ups - Right side, compact */}
          <div className="flex flex-col gap-1 opacity-60">
            {powerTypes.slice(0, 3).map((type, index) => (
              <motion.div
                key={`opponent-${type}`}
                initial={{ scale: 0, x: 20 }}
                animate={{ scale: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.05, type: "spring", stiffness: 200 }}
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

      {/* Bottom Button - Compact */}
      <div className="px-4 pb-4 pt-2 relative z-20 shrink-0">
        <motion.button
          onClick={handleStartCountdown}
          disabled={isCountingDown}
          className="relative w-full py-3.5 rounded-xl font-bold text-lg tracking-widest uppercase overflow-hidden disabled:opacity-70"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          whileHover={{ scale: isCountingDown ? 1 : 1.02 }}
          whileTap={{ scale: isCountingDown ? 1 : 0.98 }}
          style={{
            background: "linear-gradient(180deg, #FFE55C 0%, #FFD700 20%, #E6A800 80%, #CC8800 100%)",
            boxShadow: "0 5px 0 #8B6914, 0 6px 15px rgba(0,0,0,0.12)",
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

      {/* Countdown Overlay */}
      <AnimatePresence>
        {countdown !== null && (
          <CountdownOverlay count={countdown} />
        )}
      </AnimatePresence>
    </div>
  );
}
