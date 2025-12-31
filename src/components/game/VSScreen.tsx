import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { getCountryFlag, countries } from "@/data/opponents";
import { calculateLevel } from "@/utils/levelCalculation";

import botAvatar1 from "@/assets/avatars/bot-avatar-1.png";
import botAvatar2 from "@/assets/avatars/bot-avatar-2.png";
import botAvatar3 from "@/assets/avatars/bot-avatar-3.png";
import botAvatar4 from "@/assets/avatars/bot-avatar-4.png";
import botAvatar5 from "@/assets/avatars/bot-avatar-5.png";
import botAvatar6 from "@/assets/avatars/bot-avatar-6.png";
import botAvatar7 from "@/assets/avatars/bot-avatar-7.png";
import botAvatar8 from "@/assets/avatars/bot-avatar-8.png";
import botAvatar9 from "@/assets/avatars/bot-avatar-9.png";
import botAvatar10 from "@/assets/avatars/bot-avatar-10.png";

// Slot machine avatars for cycling effect
const slotAvatars = [
  botAvatar1, botAvatar2, botAvatar3, botAvatar4, botAvatar5,
  botAvatar6, botAvatar7, botAvatar8, botAvatar9, botAvatar10
];

// Background pattern shapes
const PatternShape = ({ delay, x, y, rotation, type }: { delay: number; x: number; y: number; rotation: number; type: string }) => (
  <motion.div
    className="absolute text-white/[0.07] font-bold pointer-events-none select-none"
    style={{
      left: `${x}%`,
      top: `${y}%`,
      fontSize: type.length === 1 ? '48px' : '32px',
      transform: `rotate(${rotation}deg)`,
    }}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: delay * 0.1, duration: 0.5 }}
  >
    {type}
  </motion.div>
);

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

// Square avatar with mint border
const SquareAvatar = ({ avatarUrl, size = 160, isSearching = false }: { avatarUrl?: string | null; size?: number; isSearching?: boolean }) => (
  <motion.div 
    className="relative"
    animate={isSearching ? { scale: [1, 1.02, 1] } : {}}
    transition={{ duration: 1.5, repeat: isSearching ? Infinity : 0 }}
  >
    {/* Mint/Cyan border */}
    <div 
      className="rounded-3xl p-1.5"
      style={{
        background: "linear-gradient(135deg, #5EEAD4 0%, #2DD4BF 50%, #14B8A6 100%)",
        boxShadow: "0 8px 30px rgba(45, 212, 191, 0.35)",
      }}
    >
      <div 
        className="rounded-2xl overflow-hidden flex items-center justify-center"
        style={{ 
          width: size, 
          height: size,
          background: "#94a3b8",
        }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center">
            <span className="text-5xl">?</span>
          </div>
        )}
      </div>
    </div>
    
    {/* Spinning ring during search */}
    {isSearching && (
      <motion.div
        className="absolute inset-[-6px] rounded-3xl border-2 border-dashed border-white/40"
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      />
    )}
  </motion.div>
);

type SlotPhase = "searching" | "slowing" | "found";

export function VSScreen() {
  const { opponent, startMatch, phase } = useGame();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState<number | string | null>(null);
  const [isCountingDown, setIsCountingDown] = useState(false);
  
  // Slot machine state
  const [slotPhase, setSlotPhase] = useState<SlotPhase>("searching");
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate pattern shapes
  const patternShapes = useMemo(() => {
    const shapes = ['A', 'X', 'O', '△', '□', 'M', 'V', '♦', '+', 'Y', 'Z', 'K'];
    return Array.from({ length: 35 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      rotation: Math.random() * 360,
      type: shapes[Math.floor(Math.random() * shapes.length)],
      delay: i,
    }));
  }, []);

  // Player data
  const playerPoints = profile?.total_points || 3212;
  const playerLevelInfo = calculateLevel(playerPoints);
  const opponentPoints = opponent?.points || 3212;
  const opponentLevelInfo = calculateLevel(opponentPoints);

  // Slot machine cycling effect
  useEffect(() => {
    if (phase !== "matchmaking" && phase !== "preparing" && phase !== "vs-screen") return;
    if (slotPhase === "found") return;

    let cycleCount = 0;
    const maxCycles = 35;
    
    const getDelay = (count: number): number => {
      if (count < 20) return 80;
      if (count < 25) return 150;
      if (count < 28) return 250;
      if (count < 31) return 400;
      if (count < 33) return 600;
      return 800;
    };

    const cycleSlot = () => {
      cycleCount++;
      
      const randomAvatar = slotAvatars[Math.floor(Math.random() * slotAvatars.length)];
      setCurrentAvatar(randomAvatar);

      if (cycleCount < 20) {
        setSlotPhase("searching");
      } else if (cycleCount < maxCycles) {
        setSlotPhase("slowing");
      }

      if (cycleCount < maxCycles) {
        intervalRef.current = setTimeout(cycleSlot, getDelay(cycleCount));
      } else {
        setSlotPhase("found");
        if (opponent) {
          setCurrentAvatar(opponent.avatarUrl);
        }
      }
    };

    intervalRef.current = setTimeout(cycleSlot, 500);

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [phase, opponent]);

  // Update to final opponent when found
  useEffect(() => {
    if (slotPhase === "found" && opponent) {
      setCurrentAvatar(opponent.avatarUrl);
    }
  }, [slotPhase, opponent]);

  const handleStartCountdown = useCallback(() => {
    if (isCountingDown || slotPhase !== "found") return;
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
  }, [isCountingDown, startMatch, slotPhase]);

  // Auto-start countdown when opponent found
  useEffect(() => {
    if (slotPhase === "found" && !isCountingDown) {
      const timer = setTimeout(() => {
        handleStartCountdown();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [slotPhase, isCountingDown, handleStartCountdown]);

  const avatarSize = 150;

  return (
    <div 
      className="h-[100dvh] w-full flex flex-col relative overflow-hidden"
      style={{ background: "#7E7BDC" }}
    >
      {/* Pattern Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {patternShapes.map((shape) => (
          <PatternShape key={shape.id} {...shape} />
        ))}
      </div>

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
          <ArrowLeft className="w-6 h-6 text-white/80" strokeWidth={2} />
        </motion.button>
        
        <motion.button className="p-2" whileTap={{ scale: 0.95 }}>
          <HelpCircle className="w-6 h-6 text-white/80" strokeWidth={2} />
        </motion.button>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-4 -mt-8">
        
        {/* === PLAYER SECTION (Top - You) === */}
        <motion.div 
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Player Avatar */}
          <SquareAvatar avatarUrl={profile?.avatar_url} size={avatarSize} />

          {/* Player Score & Level */}
          <motion.div
            className="mt-4 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span className="text-white/90 text-2xl font-bold">
              {playerPoints.toLocaleString()}
            </span>
            <span className="text-white/60 text-xl ml-2">
              (Lvl.{playerLevelInfo.level})
            </span>
          </motion.div>

          {/* Player Name */}
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-1 text-3xl font-black tracking-wide"
            style={{
              fontFamily: "'TASolivare', sans-serif",
              color: "#86EFAC",
              textShadow: "0 2px 10px rgba(134, 239, 172, 0.4)",
            }}
          >
            შენ
          </motion.h2>
        </motion.div>

        {/* === VS BADGE === */}
        <motion.div 
          className="my-6"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 15 }}
        >
          {/* 3D VS Platform */}
          <div className="relative">
            {/* Platform base */}
            <div 
              className="w-32 h-8 rounded-full mx-auto"
              style={{
                background: "linear-gradient(180deg, #A78BFA 0%, #7C3AED 100%)",
                transform: "perspective(200px) rotateX(60deg)",
                boxShadow: "0 10px 30px rgba(124, 58, 237, 0.4)",
              }}
            />
            
            {/* VS Text */}
            <motion.div
              className="absolute -top-10 left-1/2 -translate-x-1/2"
              animate={{ 
                y: [0, -5, 0],
                rotateY: [0, 5, 0, -5, 0],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <span 
                className="text-6xl font-black italic"
                style={{
                  fontFamily: "'TASolivare', sans-serif",
                  background: "linear-gradient(180deg, #FDE047 0%, #FACC15 30%, #EAB308 70%, #CA8A04 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 4px 0 #92400E) drop-shadow(0 6px 20px rgba(250, 204, 21, 0.5))",
                  letterSpacing: "-2px",
                }}
              >
                VS
              </span>
            </motion.div>
          </div>
        </motion.div>

        {/* === OPPONENT SECTION (Bottom) === */}
        <motion.div 
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Opponent Name */}
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mb-1 text-2xl font-black text-white uppercase tracking-wider"
            style={{
              fontFamily: "'TASolivare', sans-serif",
              textShadow: "0 2px 10px rgba(0,0,0,0.3)",
            }}
          >
            {slotPhase === "found" && opponent ? opponent.name : "..."}
          </motion.h2>

          {/* Opponent Score & Level */}
          <motion.div
            className="mb-4 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: slotPhase === "found" ? 1 : 0.5 }}
            transition={{ delay: 0.4 }}
          >
            <span className="text-white/90 text-2xl font-bold">
              {slotPhase === "found" ? opponentPoints.toLocaleString() : "???"}
            </span>
            <span className="text-white/60 text-xl ml-2">
              (Lvl.{slotPhase === "found" ? opponentLevelInfo.level : "?"})
            </span>
          </motion.div>

          {/* Opponent Avatar */}
          <SquareAvatar 
            avatarUrl={currentAvatar} 
            size={avatarSize} 
            isSearching={slotPhase !== "found"}
          />
        </motion.div>
      </div>

      {/* Countdown Overlay */}
      <AnimatePresence>
        {countdown !== null && <CountdownOverlay count={countdown} />}
      </AnimatePresence>
    </div>
  );
}
