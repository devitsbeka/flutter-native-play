import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { getCountryFlag } from "@/data/opponents";
import { PowerUpBadge } from "@/components/game/PowerUpBadge";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useMemo } from "react";

// Countdown overlay component
const CountdownOverlay = ({ count }: { count: number | string }) => (
  <motion.div 
    className="fixed inset-0 z-50 flex items-center justify-center"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
    
    <AnimatePresence mode="wait">
      <motion.div
        key={count}
        className="relative z-10"
        initial={{ scale: 3, opacity: 0, rotate: -10 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        exit={{ scale: 0.5, opacity: 0, rotate: 10 }}
        transition={{ duration: 0.3, type: "spring", stiffness: 200, damping: 15 }}
      >
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: count === "GO!" 
              ? "radial-gradient(circle, rgba(34,197,94,0.6) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(255,215,0,0.6) 0%, transparent 70%)",
            transform: "scale(3)",
          }}
          animate={{ scale: [2.5, 3.5, 2.5], opacity: [0.8, 0.4, 0.8] }}
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

  useEffect(() => {
    const timer = setTimeout(() => setShowVS(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleStartCountdown = useCallback(() => {
    if (isCountingDown) return;
    setIsCountingDown(true);
    setCountdown(3);
    
    const sequence = [
      { value: 3, delay: 0 },
      { value: 2, delay: 800 },
      { value: 1, delay: 1600 },
      { value: "GO!", delay: 2400 },
    ];
    
    sequence.forEach(({ value, delay }) => {
      setTimeout(() => setCountdown(value), delay);
    });
    
    setTimeout(() => {
      setCountdown(null);
      setIsCountingDown(false);
      startMatch();
    }, 3200);
  }, [isCountingDown, startMatch]);

  // Memoize opponent stats to prevent recalculation on every render
  const opponentStats = useMemo(() => {
    const wins = Math.floor((opponent?.points || 0) / 500);
    const games = wins + Math.floor(Math.random() * 10) + 5;
    return { wins, games };
  }, [opponent?.points]);

  if (!opponent) return null;

  const playerPoints = profile?.total_points || 0;
  const playerWins = profile?.games_won || 0;
  const playerGames = profile?.games_played || 0;
  
  const powerTypes: Array<"fifty-fifty" | "freeze" | "replace" | "time-drain"> = ["fifty-fifty", "freeze", "replace", "time-drain"];

  return (
    <div className="h-[100dvh] w-full flex flex-col relative overflow-hidden">
      {/* Transparent - Spline shows through from GlobalSplineBackground */}
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 relative z-30 shrink-0">
        <motion.button 
          onClick={() => navigate("/")}
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          whileTap={{ scale: 0.95 }}
          style={{ 
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(10px)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)" 
          }}
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </motion.button>
        
        <motion.div 
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{
            background: "rgba(255,255,255,0.9)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}
        >
          <span className="text-lg">👑</span>
          <span className="text-gray-800 font-bold">20</span>
        </motion.div>
      </div>

      {/* Main Content - Equal sections */}
      <div className="flex-1 flex flex-col relative z-10 min-h-0 px-3">
        
        {/* === PLAYER SECTION (Top 40%) === */}
        <div className="h-[38%] flex items-center justify-center relative">
          {/* Player Power-ups - Absolute left */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-20">
            {powerTypes.slice(0, 3).map((type, index) => (
              <motion.div
                key={`player-${type}`}
                initial={{ scale: 0, x: -30 }}
                animate={{ scale: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.06, type: "spring", stiffness: 200 }}
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

          {/* Player Avatar + Info */}
          <div className="flex flex-col items-center">
            {/* Large Avatar with glow and fade masks */}
            <motion.div
              className="relative"
              initial={{ scale: 2, opacity: 0, y: -50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.5, type: "spring", stiffness: 100, damping: 12 }}
            >
              {/* Top fade mask */}
              <div 
                className="absolute -top-4 left-1/2 -translate-x-1/2 w-[200%] h-8 z-10 pointer-events-none"
                style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, transparent 100%)" }}
              />
              
              {/* Cyan glow */}
              <div 
                className="absolute inset-0 blur-3xl pointer-events-none"
                style={{ 
                  background: "radial-gradient(circle, rgba(0,255,255,0.6) 0%, transparent 50%)",
                  transform: "scale(2)",
                }}
              />
              
              {/* Avatar - BIG */}
              <div className="relative w-32 h-32 sm:w-40 sm:h-40">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="You" 
                    className="w-full h-full object-contain"
                    style={{ filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.35))" }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl sm:text-7xl">
                    👤
                  </div>
                )}
              </div>
              
              {/* Bottom fade mask */}
              <div 
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[200%] h-6 z-10 pointer-events-none"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.15) 0%, transparent 100%)" }}
              />
            </motion.div>
            
            {/* Player info */}
            <motion.div 
              className="flex items-center gap-2 mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <span className="text-xl drop-shadow-lg">{getCountryFlag(profile?.country_code || "US")}</span>
              <span 
                className="font-bold text-lg text-white"
                style={{ fontFamily: "'TASolivare', sans-serif", textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}
              >
                YOU
              </span>
            </motion.div>
            
            {/* Points + W/L */}
            <motion.div 
              className="flex items-center gap-2 mt-0.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div 
                className="flex items-center gap-1 rounded-full px-2.5 py-0.5"
                style={{ background: "rgba(255,255,255,0.9)", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}
              >
                <span className="text-xs">👑</span>
                <span className="text-purple-700 font-bold text-xs">{playerPoints.toLocaleString()}</span>
              </div>
              <span className="text-[11px] text-white/90 font-medium" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                {playerWins}W/{playerGames - playerWins}L
              </span>
            </motion.div>
          </div>
        </div>

        {/* === VS DIVIDER (Fixed height) === */}
        <div className="h-14 flex items-center justify-center relative shrink-0">
          {/* Gold line */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            <defs>
              <linearGradient id="goldLineVS" x1="0%" y1="50%" x2="100%" y2="50%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="10%" stopColor="#FFE55C" />
                <stop offset="50%" stopColor="#FFD700" />
                <stop offset="90%" stopColor="#E6A800" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
              <filter id="glowVS" x="-20%" y="-100%" width="140%" height="300%">
                <feGaussianBlur stdDeviation="3" result="blur" />
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
              strokeWidth="5"
              filter="url(#glowVS)"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            />
          </svg>
          
          {/* VS Text */}
          <AnimatePresence>
            {showVS && (
              <motion.span 
                className="relative z-10 font-display text-4xl sm:text-5xl font-black"
                initial={{ scale: 2.5, opacity: 0, rotate: -15 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ duration: 0.35, type: "spring", stiffness: 150, damping: 12 }}
                style={{
                  background: "linear-gradient(180deg, #FFE55C 0%, #FFD700 30%, #E6A800 70%, #CC8800 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 3px 0 #8B6914) drop-shadow(0 0 20px rgba(255,215,0,0.6))",
                }}
              >
                VS
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* === OPPONENT SECTION (Bottom 40%) === */}
        <div className="h-[38%] flex items-center justify-center relative">
          {/* Opponent Avatar + Info */}
          <div className="flex flex-col items-center">
            {/* Points + W/L */}
            <motion.div 
              className="flex items-center gap-2 mb-0.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div 
                className="flex items-center gap-1 rounded-full px-2.5 py-0.5"
                style={{ background: "rgba(255,255,255,0.9)", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}
              >
                <span className="text-xs">👑</span>
                <span className="text-purple-700 font-bold text-xs">{opponent.points.toLocaleString()}</span>
              </div>
              <span className="text-[11px] text-white/90 font-medium" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                {opponentStats.wins}W/{opponentStats.games - opponentStats.wins}L
              </span>
            </motion.div>
            
            {/* Opponent info */}
            <motion.div 
              className="flex items-center gap-2 mb-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <span 
                className="font-bold text-lg text-white"
                style={{ fontFamily: "'TASolivare', sans-serif", textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}
              >
                {opponent.name.toUpperCase()}
              </span>
              <span className="text-xl drop-shadow-lg">{getCountryFlag(opponent.countryCode)}</span>
            </motion.div>

            {/* Large Avatar with glow and fade masks */}
            <motion.div
              className="relative"
              initial={{ scale: 2, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, type: "spring", stiffness: 100, damping: 12 }}
            >
              {/* Top fade mask */}
              <div 
                className="absolute -top-2 left-1/2 -translate-x-1/2 w-[200%] h-6 z-10 pointer-events-none"
                style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, transparent 100%)" }}
              />
              
              {/* Magenta glow */}
              <div 
                className="absolute inset-0 blur-3xl pointer-events-none"
                style={{ 
                  background: "radial-gradient(circle, rgba(255,0,200,0.5) 0%, transparent 50%)",
                  transform: "scale(2)",
                }}
              />
              
              {/* Avatar - BIG */}
              <div className="relative w-32 h-32 sm:w-40 sm:h-40">
                {opponent.avatarUrl ? (
                  <img 
                    src={opponent.avatarUrl} 
                    alt={opponent.name} 
                    className="w-full h-full object-contain"
                    style={{ filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.35))" }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl sm:text-7xl">
                    🤖
                  </div>
                )}
              </div>
              
              {/* Bottom fade mask */}
              <div 
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[200%] h-8 z-10 pointer-events-none"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.2) 0%, transparent 100%)" }}
              />
            </motion.div>
          </div>

          {/* Opponent Power-ups - Absolute right */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-60 z-20">
            {powerTypes.slice(0, 3).map((type, index) => (
              <motion.div
                key={`opponent-${type}`}
                initial={{ scale: 0, x: 30 }}
                animate={{ scale: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.06, type: "spring", stiffness: 200 }}
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
      <div className="px-4 pb-4 pt-2 relative z-20 shrink-0">
        <motion.button
          onClick={handleStartCountdown}
          disabled={isCountingDown}
          className="relative w-full py-3 rounded-xl font-bold text-lg tracking-widest uppercase overflow-hidden disabled:opacity-70"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          whileHover={{ scale: isCountingDown ? 1 : 1.02 }}
          whileTap={{ scale: isCountingDown ? 1 : 0.98 }}
          style={{
            background: "linear-gradient(180deg, #FFE55C 0%, #FFD700 20%, #E6A800 80%, #CC8800 100%)",
            boxShadow: "0 5px 0 #8B6914, 0 6px 20px rgba(0,0,0,0.2)",
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
        {countdown !== null && <CountdownOverlay count={countdown} />}
      </AnimatePresence>
    </div>
  );
}
