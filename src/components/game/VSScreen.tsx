import { motion } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useMemo } from "react";
import { calculateLevel } from "@/utils/levelCalculation";
import { QuizAnswerButton } from "@/components/ui/quiz-answer-button";

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

// Square avatar with mint border
const SquareAvatar = ({ avatarUrl, size = 120, isSearching = false }: { avatarUrl?: string | null; size?: number; isSearching?: boolean }) => (
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
            <span className="text-4xl text-white/60">?</span>
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

// Player card component for consistent layout
const PlayerCard = ({ 
  avatarUrl, 
  name, 
  points, 
  level, 
  isPlayer = false,
  isSearching = false,
  avatarSize = 120,
}: { 
  avatarUrl?: string | null;
  name: string;
  points: string;
  level: string;
  isPlayer?: boolean;
  isSearching?: boolean;
  avatarSize?: number;
}) => (
  <motion.div 
    className="flex flex-col items-center"
    initial={{ opacity: 0, y: isPlayer ? -30 : 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: isPlayer ? 0 : 0.2 }}
  >
    {/* Avatar */}
    <SquareAvatar avatarUrl={avatarUrl} size={avatarSize} isSearching={isSearching} />

    {/* Score & Level - Fixed height container */}
    <div className="mt-3 text-center h-8 flex items-center justify-center">
      <span className="text-white/90 text-xl font-bold">
        {points}
      </span>
      <span className="text-white/60 text-lg ml-2">
        ({level})
      </span>
    </div>

    {/* Name - Fixed height container */}
    <div className="h-10 flex items-center justify-center">
      <h2
        className="text-2xl font-black tracking-wide"
        style={{
          fontFamily: "'TASolivare', sans-serif",
          color: isPlayer ? "#86EFAC" : "#FFFFFF",
          textShadow: isPlayer 
            ? "0 2px 10px rgba(134, 239, 172, 0.4)"
            : "0 2px 10px rgba(0,0,0,0.3)",
        }}
      >
        {name}
      </h2>
    </div>
  </motion.div>
);

type SlotPhase = "searching" | "slowing" | "found" | "ready";

export function VSScreen() {
  const { opponent, startMatch, phase } = useGame();
  const { profile } = useAuth();
  const navigate = useNavigate();
  
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
  const playerPoints = profile?.total_points || 0;
  const playerLevelInfo = calculateLevel(playerPoints);
  const opponentPoints = opponent?.points || 0;
  const opponentLevelInfo = calculateLevel(opponentPoints);

  // Derived display values
  const isMatchFound = slotPhase === "found" || slotPhase === "ready";
  const opponentName = isMatchFound ? (opponent?.name || "მოწინააღმდეგე") : "...";
  const opponentPointsDisplay = isMatchFound ? opponentPoints.toLocaleString() : "???";
  const opponentLevelDisplay = isMatchFound ? `Lvl.${opponentLevelInfo.level}` : "Lvl.?";

  // Slot machine cycling effect
  useEffect(() => {
    if (phase !== "matchmaking" && phase !== "preparing" && phase !== "vs-screen") return;
    if (slotPhase === "found" || slotPhase === "ready") return;

    let cycleCount = 0;
    const maxCycles = 20;
    
    const getDelay = (count: number): number => {
      if (count < 10) return 60;
      if (count < 14) return 120;
      if (count < 17) return 200;
      if (count < 19) return 350;
      return 500;
    };

    const cycleSlot = () => {
      cycleCount++;
      
      const randomAvatar = slotAvatars[Math.floor(Math.random() * slotAvatars.length)];
      setCurrentAvatar(randomAvatar);

      if (cycleCount < 10) {
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

    intervalRef.current = setTimeout(cycleSlot, 300);

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

  // Transition to ready state after found
  useEffect(() => {
    if (slotPhase === "found") {
      const timer = setTimeout(() => {
        setSlotPhase("ready");
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [slotPhase]);

  const handleStart = () => {
    startMatch();
  };

  const avatarSize = 120;

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

      {/* Main Content - Stable layout with fixed structure */}
      <div className="flex-1 flex flex-col items-center justify-between relative z-10 px-6 py-4">
        
        {/* Players Section - Centered vertically */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          
          {/* Player (You) */}
          <PlayerCard
            avatarUrl={profile?.avatar_url}
            name="შენ"
            points={playerPoints.toLocaleString()}
            level={`Lvl.${playerLevelInfo.level}`}
            isPlayer={true}
            avatarSize={avatarSize}
          />

          {/* VS Divider - Always visible, simple line with dots */}
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="w-12 h-0.5 bg-white/30 rounded-full" />
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-white/50"
                  animate={!isMatchFound ? { 
                    opacity: [0.3, 1, 0.3],
                    scale: [0.8, 1, 0.8],
                  } : { opacity: 1, scale: 1 }}
                  transition={{
                    duration: 1,
                    repeat: !isMatchFound ? Infinity : 0,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
            <div className="w-12 h-0.5 bg-white/30 rounded-full" />
          </motion.div>

          {/* Opponent */}
          <PlayerCard
            avatarUrl={currentAvatar}
            name={opponentName}
            points={opponentPointsDisplay}
            level={opponentLevelDisplay}
            isPlayer={false}
            isSearching={!isMatchFound}
            avatarSize={avatarSize}
          />
        </div>

        {/* Button Section - Fixed at bottom, always takes space */}
        <div className="w-full max-w-sm h-24 flex items-center justify-center">
          <motion.div
            className="w-full"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: isMatchFound ? 1 : 0,
              y: isMatchFound ? 0 : 20,
            }}
            transition={{ duration: 0.3 }}
          >
            <QuizAnswerButton
              state="next"
              text="დაწყება"
              onClick={handleStart}
              showLabel={false}
              disabled={!isMatchFound}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
