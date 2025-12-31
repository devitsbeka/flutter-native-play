import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { PowerUpBadge } from "@/components/game/PowerUpBadge";
import { ChevronLeft, Crown, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
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

// Level and Score badge component
const LevelScoreBadge = ({ level, score }: { level: number; score: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3, duration: 0.3 }}
    className="px-5 py-2.5 rounded-full flex items-center gap-3"
    style={{
      background: "linear-gradient(135deg, #3B3B5C 0%, #2D2D4A 100%)",
      boxShadow: "0 4px 15px rgba(0,0,0,0.25)",
    }}
  >
    <div className="flex items-center gap-1.5">
      <span className="text-lg">🏁</span>
      <span className="text-white font-bold text-sm tracking-wide">LEVEL: {level}</span>
    </div>
    <div className="w-px h-4 bg-white/30" />
    <div className="flex items-center gap-1.5">
      <Crown className="w-4 h-4 text-yellow-400" fill="currentColor" />
      <span className="text-yellow-400 font-bold text-sm">{score.toLocaleString()}</span>
    </div>
  </motion.div>
);

// Power-ups horizontal row component
const PowerUpsRow = ({
  powerUps,
  disabled = false,
  showAddButton = false,
}: {
  powerUps: Array<"fifty-fifty" | "freeze" | "replace" | "time-drain">;
  disabled?: boolean;
  showAddButton?: boolean;
}) => (
  <motion.div 
    className="flex items-center justify-center gap-3"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.5, duration: 0.4 }}
  >
    {powerUps.map((type, index) => (
      <motion.div
        key={`${type}-${index}`}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: disabled ? 0.6 : 1, scale: 1 }}
        transition={{ delay: 0.6 + index * 0.08, duration: 0.3, type: "spring" }}
        style={{ filter: disabled ? "grayscale(30%)" : "none" }}
      >
        <PowerUpBadge type={type} size="md" disabled={disabled} />
      </motion.div>
    ))}
    {showAddButton && (
      <motion.button
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.9, duration: 0.3, type: "spring" }}
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #4ADE80 0%, #22C55E 100%)",
          boxShadow: "0 4px 0 #16A34A, 0 6px 20px rgba(34,197,94,0.4)",
        }}
        whileTap={{ scale: 0.95 }}
      >
        <Plus className="w-6 h-6 text-white" strokeWidth={3} />
      </motion.button>
    )}
  </motion.div>
);

// Rainbow border avatar wrapper
const RainbowAvatar = ({ avatarUrl, size }: { avatarUrl?: string | null; size: number }) => (
  <div 
    className="relative rounded-full p-1.5"
    style={{
      background: "conic-gradient(from 0deg, #ef4444, #f97316, #eab308, #22c55e, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #ef4444)",
      boxShadow: "0 8px 30px rgba(139, 92, 246, 0.3)",
    }}
  >
    <div 
      className="rounded-full overflow-hidden flex items-center justify-center"
      style={{ 
        width: size - 12, 
        height: size - 12,
        background: "#e5e7eb",
      }}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-violet-400 to-purple-600" />
      )}
    </div>
  </div>
);

export function VSScreen() {
  const { opponent, startMatch } = useGame();
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

  if (!opponent) return null;

  const powerTypes: Array<"fifty-fifty" | "freeze" | "replace" | "time-drain"> = ["fifty-fifty", "freeze", "replace", "time-drain"];
  const avatarSize = 160;
  const playerLevel = 10;
  const opponentLevel = 10;
  const playerScore = 1301;
  const opponentScore = 1301;

  return (
    <div className="h-[100dvh] w-full flex flex-col relative overflow-hidden">
      {/* Header */}
      <motion.div 
        className="flex items-center justify-between px-4 pt-4 pb-2 relative z-30 shrink-0"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <motion.button 
          onClick={() => navigate("/")}
          className="p-2"
          whileTap={{ scale: 0.95 }}
        >
          <ChevronLeft className="w-7 h-7 text-slate-800" strokeWidth={2.5} />
        </motion.button>
        
        <motion.div className="flex items-center gap-1">
          <Crown className="w-6 h-6 text-amber-500" fill="currentColor" />
          <span className="text-slate-800 font-bold text-lg">20</span>
        </motion.div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative z-10 min-h-0 px-4">
        
        {/* === OPPONENT SECTION (Top) === */}
        <motion.div 
          className="flex flex-col items-center pt-2"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Opponent Power-ups Row */}
          <PowerUpsRow powerUps={powerTypes} disabled />

          {/* Opponent Avatar with rainbow border */}
          <div className="mt-4">
            <RainbowAvatar avatarUrl={opponent.avatarUrl} size={avatarSize} />
          </div>

          {/* Opponent Level/Score Badge */}
          <div className="mt-3">
            <LevelScoreBadge level={opponentLevel} score={opponentScore} />
          </div>

          {/* Opponent Name */}
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-3 text-2xl font-black text-white uppercase tracking-wider"
            style={{
              fontFamily: "'TASolivare', sans-serif",
              textShadow: "0 2px 10px rgba(0,0,0,0.3)",
            }}
          >
            PLAYER 1
          </motion.h2>
        </motion.div>

        {/* === VS TEXT === */}
        <div className="flex items-center justify-center py-3 shrink-0">
          <AnimatePresence>
            {showVS && (
              <motion.span
                initial={{ scale: 2.5, opacity: 0, rotate: -15 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ duration: 0.4, type: "spring", stiffness: 150, damping: 12 }}
                className="text-4xl font-black italic"
                style={{
                  fontFamily: "'TASolivare', sans-serif",
                  background: "linear-gradient(180deg, #FFE55C 0%, #FFD700 50%, #F59E0B 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 3px 0 #B45309)",
                }}
              >
                VS
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* === PLAYER SECTION (Bottom) === */}
        <motion.div 
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          {/* Player Name */}
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mb-3 text-2xl font-black text-white uppercase tracking-wider"
            style={{
              fontFamily: "'TASolivare', sans-serif",
              textShadow: "0 2px 10px rgba(0,0,0,0.3)",
            }}
          >
            YOU
          </motion.h2>

          {/* Player Avatar with rainbow border */}
          <RainbowAvatar avatarUrl={profile?.avatar_url} size={avatarSize} />

          {/* Player Level/Score Badge */}
          <div className="mt-3">
            <LevelScoreBadge level={playerLevel} score={playerScore} />
          </div>

          {/* Player Power-ups Row with Add button */}
          <div className="mt-4">
            <PowerUpsRow powerUps={powerTypes} showAddButton />
          </div>
        </motion.div>
      </div>

      {/* Bottom PLAY Button - Lavender style */}
      <motion.div 
        className="px-5 pb-6 pt-4 relative z-20 shrink-0"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <motion.button
          onClick={handleStartCountdown}
          disabled={isCountingDown}
          whileTap={{ scale: 0.98 }}
          className="w-full py-4 rounded-full text-xl font-black uppercase tracking-widest transition-all"
          style={{
            fontFamily: "'TASolivare', sans-serif",
            background: "linear-gradient(180deg, #C4B5FD 0%, #A78BFA 50%, #8B5CF6 100%)",
            color: "#3B2D6B",
            boxShadow: "0 6px 0 #6D28D9, 0 8px 25px rgba(139, 92, 246, 0.4)",
            textShadow: "0 1px 0 rgba(255,255,255,0.3)",
          }}
        >
          {isCountingDown ? "GET READY..." : "PLAY"}
        </motion.button>
      </motion.div>

      {/* Countdown Overlay */}
      <AnimatePresence>
        {countdown !== null && <CountdownOverlay count={countdown} />}
      </AnimatePresence>
    </div>
  );
}
