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
    <div className="h-full w-full flex flex-col relative overflow-hidden">
      {/* Gradient background matching home page - pink/lavender */}
      <div 
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, #E8D4F0 0%, #F0E0F5 30%, #F5E8FA 60%, #F8F0FC 100%)",
        }}
      />

      {/* Subtle blob decorations */}
      <motion.div
        className="absolute top-[5%] right-[-20%] w-[80%] h-[40%] rounded-full opacity-50 blur-3xl"
        style={{ background: "linear-gradient(135deg, #C5A8D8 0%, #D4B8E8 100%)" }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[15%] left-[-15%] w-[50%] h-[35%] rounded-full opacity-40 blur-3xl"
        style={{ background: "linear-gradient(135deg, #B8D8C8 0%, #A8E8D0 100%)" }}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Ambient sparkle particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(10)].map((_, i) => (
          <SparkleParticle 
            key={`sparkle-${i}`} 
            delay={i * 0.3} 
            x={10 + (i * 8) % 80} 
            y={15 + (i * 12) % 70} 
          />
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 relative z-30">
        <motion.button 
          onClick={() => navigate("/")}
          className="w-11 h-11 rounded-2xl flex items-center justify-center"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{ 
            background: "rgba(255,255,255,0.8)",
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
        
        {/* === PLAYER SECTION === */}
        <div className="flex items-start gap-3">
          {/* Player Power-ups - Left side */}
          <div className="flex flex-col gap-1.5 pt-1">
            {powerTypes.map((type, index) => (
              <motion.div
                key={`player-${type}`}
                initial={{ scale: 0, x: -30 }}
                animate={{ scale: 1, x: 0 }}
                transition={{ delay: 0.8 + index * 0.06, type: "spring", stiffness: 200 }}
              >
                <PowerUpBadge 
                  type={type}
                  size="sm" 
                  index={index} 
                  count={playerPowerUps.find(p => p.type === type)?.available} 
                />
              </motion.div>
            ))}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.1, type: "spring", stiffness: 200 }}
            >
              <PowerUpBadge type="add-power" size="sm" index={5} />
            </motion.div>
          </div>

          {/* Player Avatar + Info - Centered */}
          <div className="flex-1 flex flex-col items-center">
            {/* Face-off zoom entrance animation */}
            <motion.div
              className="relative"
              initial={{ scale: 2.5, opacity: 0, y: -100 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.6, 
                type: "spring", 
                stiffness: 80,
                damping: 12
              }}
            >
              {/* Glow effect */}
              <motion.div 
                className="absolute inset-0 blur-2xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                style={{ 
                  background: "radial-gradient(circle, rgba(0,255,255,0.5) 0%, transparent 60%)",
                  transform: "scale(1.4)",
                }}
              />
              {/* Avatar */}
              <div className="relative w-36 h-36">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="You" 
                    className="w-full h-full object-contain drop-shadow-2xl"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-7xl">
                    👤
                  </div>
                )}
              </div>
            </motion.div>
            
            {/* Player info */}
            <motion.div 
              className="flex items-center gap-2 mt-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <span className="text-2xl">{getCountryFlag(profile?.country_code || "US")}</span>
              <span 
                className="font-bold text-xl text-gray-800"
                style={{ fontFamily: "'TASolivare', sans-serif" }}
              >
                YOU
              </span>
            </motion.div>
            
            {/* Points badge */}
            <motion.div 
              className="flex items-center gap-1.5 rounded-xl px-3 py-1 mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              style={{
                background: "linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(168,85,247,0.15) 100%)",
              }}
            >
              <span className="text-base">👑</span>
              <span className="text-purple-700 font-bold text-sm">{playerPoints.toLocaleString()}</span>
            </motion.div>

            {/* Win/Loss Record */}
            <motion.div 
              className="flex items-center gap-2 mt-1.5 text-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <span className="text-green-600 font-semibold">{playerWins}W</span>
              <span className="text-gray-400">/</span>
              <span className="text-red-500 font-semibold">{playerGames - playerWins}L</span>
              <span className="text-gray-500 ml-1">
                ({playerGames > 0 ? Math.round((playerWins / playerGames) * 100) : 0}%)
              </span>
            </motion.div>
          </div>
        </div>

        {/* === VS SECTION (Center) === */}
        <div className="flex-1 flex items-center justify-center relative my-2">
          {/* Diagonal gold line */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            <defs>
              <linearGradient id="goldLineVS" x1="0%" y1="50%" x2="100%" y2="50%">
                <stop offset="0%" stopColor="#FFE55C" />
                <stop offset="50%" stopColor="#FFD700" />
                <stop offset="100%" stopColor="#E6A800" />
              </linearGradient>
              <filter id="glowVS" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <motion.line 
              x1="0%" y1="50%" 
              x2="100%" y2="50%" 
              stroke="url(#goldLineVS)" 
              strokeWidth="6"
              filter="url(#glowVS)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            />
          </svg>
          
          {/* VS Text with dramatic entrance */}
          <AnimatePresence>
            {showVS && (
              <motion.div 
                className="relative z-10"
                initial={{ scale: 3, opacity: 0, rotate: -20 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ 
                  duration: 0.4, 
                  type: "spring", 
                  stiffness: 150,
                  damping: 10
                }}
              >
                <motion.span 
                  className="font-display text-5xl font-black tracking-wider"
                  animate={{ 
                    textShadow: [
                      "0 4px 0 #8B6914, 0 0 20px rgba(255,215,0,0.5)",
                      "0 4px 0 #8B6914, 0 0 40px rgba(255,215,0,0.8)",
                      "0 4px 0 #8B6914, 0 0 20px rgba(255,215,0,0.5)",
                    ]
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{
                    background: "linear-gradient(180deg, #FFE55C 0%, #FFD700 30%, #E6A800 70%, #CC8800 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    filter: "drop-shadow(0 4px 0 #8B6914)",
                  }}
                >
                  VS
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* === OPPONENT SECTION === */}
        <div className="flex items-end gap-3">
          {/* Opponent Avatar + Info - Centered */}
          <div className="flex-1 flex flex-col items-center">
            {/* Win/Loss Record */}
            <motion.div 
              className="flex items-center gap-2 mb-1.5 text-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <span className="text-green-600 font-semibold">{opponentWins}W</span>
              <span className="text-gray-400">/</span>
              <span className="text-red-500 font-semibold">{opponentGames - opponentWins}L</span>
              <span className="text-gray-500 ml-1">
                ({opponentGames > 0 ? Math.round((opponentWins / opponentGames) * 100) : 0}%)
              </span>
            </motion.div>

            {/* Points badge */}
            <motion.div 
              className="flex items-center gap-1.5 rounded-xl px-3 py-1 mb-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              style={{
                background: "linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(168,85,247,0.15) 100%)",
              }}
            >
              <span className="text-base">👑</span>
              <span className="text-purple-700 font-bold text-sm">{opponent.points.toLocaleString()}</span>
            </motion.div>

            {/* Opponent info */}
            <motion.div 
              className="flex items-center gap-2 mb-2"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <span 
                className="font-bold text-xl text-gray-800"
                style={{ fontFamily: "'TASolivare', sans-serif" }}
              >
                {opponent.name.toUpperCase()}
              </span>
              <span className="text-2xl">{getCountryFlag(opponent.countryCode)}</span>
            </motion.div>

            {/* Face-off zoom entrance animation */}
            <motion.div
              className="relative"
              initial={{ scale: 2.5, opacity: 0, y: 100 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.6, 
                delay: 0.15,
                type: "spring", 
                stiffness: 80,
                damping: 12
              }}
            >
              {/* Glow effect */}
              <motion.div 
                className="absolute inset-0 blur-2xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                style={{ 
                  background: "radial-gradient(circle, rgba(255,0,200,0.4) 0%, transparent 60%)",
                  transform: "scale(1.4)",
                }}
              />
              {/* Avatar */}
              <div className="relative w-36 h-36">
                {opponent.avatarUrl ? (
                  <img 
                    src={opponent.avatarUrl} 
                    alt={opponent.name} 
                    className="w-full h-full object-contain drop-shadow-2xl"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-7xl">
                    🤖
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Opponent Power-ups - Right side */}
          <div className="flex flex-col gap-1.5 pb-1 opacity-60">
            {powerTypes.map((type, index) => (
              <motion.div
                key={`opponent-${type}`}
                initial={{ scale: 0, x: 30 }}
                animate={{ scale: 1, x: 0 }}
                transition={{ delay: 0.9 + index * 0.06, type: "spring", stiffness: 200 }}
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
      <div className="px-6 pb-6 pt-3 relative z-20">
        <motion.button
          onClick={handleStartCountdown}
          disabled={isCountingDown}
          className="relative w-full py-4 rounded-2xl font-bold text-xl tracking-widest uppercase overflow-hidden disabled:opacity-70"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          whileHover={{ scale: isCountingDown ? 1 : 1.02 }}
          whileTap={{ scale: isCountingDown ? 1 : 0.98 }}
          style={{
            background: "linear-gradient(180deg, #FFE55C 0%, #FFD700 20%, #E6A800 80%, #CC8800 100%)",
            boxShadow: "0 6px 0 #8B6914, 0 8px 20px rgba(0,0,0,0.15)",
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
