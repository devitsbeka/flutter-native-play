import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { getCountryFlag } from "@/data/opponents";
import { PowerUpBadge } from "@/components/game/PowerUpBadge";
import { ChevronLeft, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useMemo } from "react";
import { AvatarCircle } from "@/components/home/AvatarCircle";

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

// Player info card with frosted glass
const PlayerInfoCard = ({
  name,
  flag,
  points,
  wins,
  losses,
  isPlayer = false,
}: {
  name: string;
  flag: string;
  points: number;
  wins: number;
  losses: number;
  isPlayer?: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, y: isPlayer ? 20 : -20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.4, duration: 0.4 }}
    className="flex flex-col items-center gap-2"
  >
    {/* Name with flag */}
    <div
      className="px-5 py-2 rounded-full flex items-center gap-2"
      style={{
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)",
      }}
    >
      {isPlayer ? (
        <>
          <span className="text-xl">{flag}</span>
          <span className="font-bold text-lg" style={{ color: "#1a1a2e" }}>{name}</span>
        </>
      ) : (
        <>
          <span className="font-bold text-lg" style={{ color: "#1a1a2e" }}>{name}</span>
          <span className="text-xl">{flag}</span>
        </>
      )}
    </div>

    {/* Stats row */}
    <div className="flex items-center gap-2">
      {/* Points badge */}
      <div
        className="px-3 py-1.5 rounded-full flex items-center gap-1.5"
        style={{
          background: "linear-gradient(135deg, rgba(255,215,0,0.3) 0%, rgba(255,165,0,0.25) 100%)",
          border: "1px solid rgba(255,215,0,0.5)",
          backdropFilter: "blur(8px)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <Crown className="w-3.5 h-3.5 text-amber-600" fill="currentColor" style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.15))" }} />
        <span 
          className="text-sm font-bold"
          style={{ color: "#b45309", textShadow: "0 1px 2px rgba(255,255,255,0.5)" }}
        >
          {points.toLocaleString()}
        </span>
      </div>

      {/* W/L record */}
      <div
        className="px-3 py-1.5 rounded-full text-sm font-semibold"
        style={{
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(8px)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <span style={{ color: "#059669", textShadow: "0 1px 1px rgba(255,255,255,0.6)" }}>{wins}W</span>
        <span style={{ color: "#6b7280" }} className="mx-1">/</span>
        <span style={{ color: "#e11d48", textShadow: "0 1px 1px rgba(255,255,255,0.6)" }}>{losses}L</span>
      </div>
    </div>
  </motion.div>
);

// Curved power-ups arc component
const PowerUpsArc = ({
  powerUps,
  isInverted = false,
  disabled = false,
  avatarSize,
  powerUpCounts,
}: {
  powerUps: Array<"fifty-fifty" | "freeze" | "replace" | "time-drain">;
  isInverted?: boolean;
  disabled?: boolean;
  avatarSize: number;
  powerUpCounts?: Record<string, number | undefined>;
}) => {
  const arcRadius = avatarSize * 0.62;
  // Player: arc above (angles go from -200 to -340 for top arc)
  // Opponent: arc below (angles go from 20 to 160 for bottom arc)
  const startAngle = isInverted ? 25 : -205;
  const endAngle = isInverted ? 155 : -335;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {powerUps.map((type, index) => {
        const totalItems = powerUps.length;
        const angleRange = endAngle - startAngle;
        const angle = startAngle + (angleRange / (totalItems - 1 || 1)) * index;
        const radian = (angle * Math.PI) / 180;
        const x = Math.cos(radian) * arcRadius;
        const y = Math.sin(radian) * arcRadius;

        return (
          <motion.div
            key={`${type}-${index}`}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: disabled ? 0.5 : 1, scale: 1 }}
            transition={{ delay: 0.6 + index * 0.08, duration: 0.3, type: "spring" }}
            className="absolute pointer-events-auto"
            style={{
              transform: `translate(${x}px, ${y}px)`,
              filter: disabled ? "grayscale(50%)" : "none",
            }}
          >
            <PowerUpBadge 
              type={type} 
              size="sm" 
              disabled={disabled}
              count={powerUpCounts?.[type]}
            />
          </motion.div>
        );
      })}
    </div>
  );
};

export function VSScreen() {
  const { opponent, startMatch, playerPowerUps, opponentPowerUps } = useGame();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [showVS, setShowVS] = useState(false);
  const [countdown, setCountdown] = useState<number | string | null>(null);
  const [isCountingDown, setIsCountingDown] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowVS(true), 400);
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

  // Memoize opponent stats
  const opponentStats = useMemo(() => {
    const wins = Math.floor((opponent?.points || 0) / 500);
    const games = wins + Math.floor(Math.random() * 10) + 5;
    return { wins, losses: games - wins };
  }, [opponent?.points]);

  // Power-up counts
  const playerPowerUpCounts = useMemo(() => {
    const counts: Record<string, number | undefined> = {};
    playerPowerUps.forEach(p => { counts[p.type] = p.available; });
    return counts;
  }, [playerPowerUps]);

  const opponentPowerUpCounts = useMemo(() => {
    const counts: Record<string, number | undefined> = {};
    opponentPowerUps.forEach(p => { counts[p.type] = p.available; });
    return counts;
  }, [opponentPowerUps]);

  if (!opponent) return null;

  const playerPoints = profile?.total_points || 0;
  const playerWins = profile?.games_won || 0;
  const playerGames = profile?.games_played || 0;
  
  const powerTypes: Array<"fifty-fifty" | "freeze" | "replace" | "time-drain"> = ["fifty-fifty", "freeze", "replace", "time-drain"];

  // Avatar sizes
  const playerAvatarSize = 160;
  const opponentAvatarSize = 145;

  return (
    <div className="h-[100dvh] w-full flex flex-col relative overflow-hidden">
      {/* Vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-[5]"
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.3) 100%)",
        }}
      />

      {/* Header */}
      <motion.div 
        className="flex items-center justify-between px-4 pt-4 pb-2 relative z-30 shrink-0"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <motion.button 
          onClick={() => navigate("/")}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          whileTap={{ scale: 0.95 }}
          style={{ 
            background: "rgba(255,255,255,0.95)",
            boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
          }}
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </motion.button>
        
        <motion.div 
          className="flex items-center gap-1.5 rounded-full px-4 py-2"
          style={{
            background: "rgba(255,255,255,0.95)",
            boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
          }}
        >
          <Crown className="w-5 h-5 text-amber-500" fill="currentColor" />
          <span className="text-foreground font-bold">20</span>
        </motion.div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative z-10 min-h-0 px-4">
        
        {/* === PLAYER SECTION === */}
        <motion.div 
          className="flex-1 flex flex-col items-center justify-center relative"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Avatar with curved power-ups arc above */}
          <div 
            className="relative" 
            style={{ width: playerAvatarSize + 80, height: playerAvatarSize + 40 }}
          >
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <PowerUpsArc
                powerUps={powerTypes}
                isInverted={false}
                avatarSize={playerAvatarSize}
                powerUpCounts={playerPowerUpCounts}
              />
              <AvatarCircle avatarUrl={profile?.avatar_url} size={playerAvatarSize} />
            </div>
          </div>

          {/* Player info card */}
          <div className="mt-3">
            <PlayerInfoCard
              name="YOU"
              flag={getCountryFlag(profile?.country_code || "US")}
              points={playerPoints}
              wins={playerWins}
              losses={playerGames - playerWins}
              isPlayer
            />
          </div>
        </motion.div>

        {/* === VS DIVIDER === */}
        <div className="h-16 flex items-center justify-center relative shrink-0 my-1">
          {/* Gold line */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            <defs>
              <linearGradient id="goldLineVS" x1="0%" y1="50%" x2="100%" y2="50%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="15%" stopColor="#FFE55C" />
                <stop offset="50%" stopColor="#FFD700" />
                <stop offset="85%" stopColor="#E6A800" />
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
              strokeWidth="4"
              filter="url(#glowVS)"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            />
          </svg>
          
          {/* VS Badge */}
          <AnimatePresence>
            {showVS && (
              <motion.div
                initial={{ scale: 2.5, opacity: 0, rotate: -15 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ duration: 0.4, type: "spring", stiffness: 150, damping: 12 }}
                className="relative z-10"
              >
                <motion.div
                  animate={{
                    boxShadow: [
                      "0 0 20px rgba(255,215,0,0.4)",
                      "0 0 35px rgba(255,215,0,0.6)",
                      "0 0 20px rgba(255,215,0,0.4)",
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{
                    background: "linear-gradient(145deg, #FFE55C 0%, #FFD700 40%, #E6A800 100%)",
                    border: "3px solid rgba(255,255,255,0.5)",
                    boxShadow: "0 4px 0 #8B6914",
                  }}
                >
                  <span
                    className="text-xl font-black"
                    style={{
                      color: "#5C4A00",
                      textShadow: "0 1px 0 rgba(255,255,255,0.5)",
                    }}
                  >
                    VS
                  </span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* === OPPONENT SECTION === */}
        <motion.div 
          className="flex-1 flex flex-col items-center justify-center relative"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          {/* Opponent info card */}
          <div className="mb-3">
            <PlayerInfoCard
              name={opponent.name.toUpperCase()}
              flag={getCountryFlag(opponent.countryCode)}
              points={opponent.points}
              wins={opponentStats.wins}
              losses={opponentStats.losses}
            />
          </div>

          {/* Avatar with curved power-ups arc below */}
          <div 
            className="relative" 
            style={{ width: opponentAvatarSize + 80, height: opponentAvatarSize + 40 }}
          >
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <AvatarCircle avatarUrl={opponent.avatarUrl} size={opponentAvatarSize} />
              <PowerUpsArc
                powerUps={powerTypes}
                isInverted={true}
                disabled={true}
                avatarSize={opponentAvatarSize}
                powerUpCounts={opponentPowerUpCounts}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Button */}
      <motion.div 
        className="px-5 pb-6 pt-3 relative z-20 shrink-0"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <motion.button
          onClick={handleStartCountdown}
          disabled={isCountingDown}
          className="relative w-full py-4 rounded-2xl font-bold text-lg tracking-widest uppercase overflow-hidden disabled:opacity-70"
          whileHover={{ scale: isCountingDown ? 1 : 1.02 }}
          whileTap={{ scale: isCountingDown ? 1 : 0.98 }}
          style={{
            background: "linear-gradient(180deg, #FFE55C 0%, #FFD700 20%, #E6A800 80%, #CC8800 100%)",
            boxShadow: "0 6px 0 #8B6914, 0 8px 25px rgba(0,0,0,0.2)",
            color: "#5C4A00",
          }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          />
          <span className="relative z-10">{isCountingDown ? "GET READY..." : "NEXT"}</span>
        </motion.button>
      </motion.div>

      {/* Countdown Overlay */}
      <AnimatePresence>
        {countdown !== null && <CountdownOverlay count={countdown} />}
      </AnimatePresence>
    </div>
  );
}
