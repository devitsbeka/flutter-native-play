import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { getCountryFlag, countries } from "@/data/opponents";
import { PowerUpBadge } from "@/components/game/PowerUpBadge";
import { PlayerInfoBadge } from "@/components/game/PlayerInfoBadge";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Slot machine emojis for cycling effect
const slotEmojis = ["😎", "🤓", "🧐", "😏", "🤔", "🦊", "🐱", "🤖", "👾", "🦁", "🐼", "🦄", "🐲", "🤠", "👻"];

type SlotPhase = "searching" | "slowing" | "found";

export function MatchmakingScreen() {
  const { phase, opponent, playerPowerUps } = useGame();
  const { profile } = useAuth();
  const navigate = useNavigate();

  // Slot machine state
  const [slotPhase, setSlotPhase] = useState<SlotPhase>("searching");
  const [currentEmoji, setCurrentEmoji] = useState("?");
  const [currentFlag, setCurrentFlag] = useState("🌍");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const playerAvatar = profile?.avatar_url || "😊";
  const playerPoints = profile?.total_points || 0;

  // Calculate arc positions for power-ups - EXACT same as VSScreen
  const calculateArcPosition = (angleDeg: number, radius: number) => {
    const angleRad = (angleDeg * Math.PI) / 180;
    return {
      x: radius * Math.sin(angleRad),
      y: -radius * Math.cos(angleRad),
    };
  };

  const orbitRadius = 110;
  const topAngles = [-55, -20, 20, 55];
  const topArcPositions = topAngles.map(angle => calculateArcPosition(angle, orbitRadius));

  // Slot machine cycling effect
  useEffect(() => {
    if (phase !== "matchmaking" && phase !== "home" && phase !== "preparing") return;

    let cycleCount = 0;
    const maxCycles = 40;
    
    const getDelay = (count: number): number => {
      if (count < 25) return 80;
      if (count < 30) return 150;
      if (count < 33) return 250;
      if (count < 36) return 400;
      if (count < 38) return 600;
      return 800;
    };

    const cycleSlot = () => {
      cycleCount++;
      
      const randomEmoji = slotEmojis[Math.floor(Math.random() * slotEmojis.length)];
      const randomCountry = countries[Math.floor(Math.random() * countries.length)];
      setCurrentEmoji(randomEmoji);
      setCurrentFlag(randomCountry.flag);

      if (cycleCount < 25) {
        setSlotPhase("searching");
      } else if (cycleCount < maxCycles) {
        setSlotPhase("slowing");
      }

      if (cycleCount < maxCycles) {
        intervalRef.current = setTimeout(cycleSlot, getDelay(cycleCount));
      } else {
        setSlotPhase("found");
        if (opponent) {
          setCurrentEmoji(opponent.avatarEmoji);
          setCurrentFlag(getCountryFlag(opponent.countryCode));
        }
      }
    };

    intervalRef.current = setTimeout(cycleSlot, 300);

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [phase]);

  // Update to final opponent when found
  useEffect(() => {
    if (slotPhase === "found" && opponent) {
      setCurrentEmoji(opponent.avatarEmoji);
      setCurrentFlag(getCountryFlag(opponent.countryCode));
    }
  }, [slotPhase, opponent]);

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden">
      {/* Background comes from parent GameContainer - no local iframe */}
      
      {/* Header - EXACT same as VSScreen */}
      <div className="flex items-center justify-between px-4 py-3 relative z-10">
        <button 
          onClick={() => navigate("/")}
          className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        
        <div className="flex items-center gap-1">
          <span className="text-xl">👑</span>
          <span className="text-white font-bold text-lg">20</span>
        </div>
      </div>

      {/* Main Content - EXACT same layout as VSScreen */}
      <div className="flex-1 flex flex-col items-center justify-start px-6 pt-12 pb-6 overflow-auto">
        
        {/* Player 1 Section - NO ANIMATION to prevent re-appearing */}
        <div className="flex flex-col items-center mt-4">
          {/* Avatar with power-ups arc - NO motion wrapper */}
          <div className="relative">
            {/* Power-ups arc - EXACT same as VSScreen */}
            {topArcPositions.map((pos, index) => {
              const types: Array<"fifty-fifty" | "freeze" | "replace" | "time-drain"> = ["fifty-fifty", "freeze", "replace", "time-drain"];
              const type = types[index];
              return (
                <div
                  key={type}
                  className="absolute"
                  style={{
                    left: `calc(50% + ${pos.x}px)`,
                    top: `calc(50% + ${pos.y}px)`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <PowerUpBadge 
                    type={type}
                    size="sm" 
                    index={index} 
                    count={playerPowerUps.find(p => p.type === type)?.available} 
                  />
                </div>
              );
            })}

            {/* Avatar ring - EXACT same size/style as VSScreen */}
            <div className="w-36 h-36 rounded-full p-2 bg-gradient-to-br from-red-500 via-purple-500 to-blue-500">
              <div className="w-full h-full rounded-full bg-[#6B5BC4] flex items-center justify-center">
                <span className="text-6xl">{playerAvatar}</span>
              </div>
            </div>
          </div>

          {/* Player info badge - EXACT same margin as VSScreen */}
          <div className="-mt-4 z-10">
            <PlayerInfoBadge
              name="You"
              flag={getCountryFlag(profile?.country_code || "US")}
              points={playerPoints}
              delay={0}
              direction="up"
              isPlayer={true}
            />
          </div>
        </div>

        {/* VS Text - EXACT same as VSScreen */}
        <div className="my-3">
          <span className="font-display text-5xl font-bold text-[#FFD700] drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] tracking-wide">
            VS
          </span>
        </div>

        {/* Opponent Section - Slot Machine */}
        <div className="flex flex-col items-center">
          {/* Opponent info badge */}
          <div className="mb-[-16px] z-10 h-12 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {slotPhase === "found" && opponent ? (
                <motion.div
                  key="found"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <PlayerInfoBadge
                    name={opponent.name}
                    flag={getCountryFlag(opponent.countryCode)}
                    points={opponent.points}
                    delay={0}
                    direction="down"
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="searching"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center gap-2 bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20"
                >
                  <span className="text-lg">{currentFlag}</span>
                  <span className="text-white/80 font-medium text-sm tracking-wide">
                    {slotPhase === "slowing" ? "Almost there..." : "Searching..."}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Slot Machine Avatar - EXACT same size as VSScreen */}
          <div className="relative">
            {/* Glow effect when found */}
            <AnimatePresence>
              {slotPhase === "found" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1.2 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400/50 via-yellow-500/50 to-orange-500/50 blur-xl"
                />
              )}
            </AnimatePresence>

            {/* Spinning ring effect during search */}
            {slotPhase !== "found" && (
              <motion.div
                className="absolute inset-[-4px] rounded-full border-2 border-dashed border-white/30"
                animate={{ rotate: 360 }}
                transition={{ 
                  duration: slotPhase === "slowing" ? 3 : 1.5, 
                  repeat: Infinity, 
                  ease: "linear" 
                }}
              />
            )}

            {/* Avatar circle - EXACT same size as VSScreen */}
            <motion.div 
              className={`w-36 h-36 rounded-full p-2 transition-all duration-300 ${
                slotPhase === "found" 
                  ? "bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500" 
                  : "bg-gradient-to-br from-red-500 via-purple-500 to-blue-500"
              }`}
              animate={slotPhase === "found" ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <div className="w-full h-full rounded-full bg-[#6B5BC4] flex items-center justify-center relative overflow-hidden">
                <span className="text-6xl">{currentEmoji}</span>
              </div>
            </motion.div>

            {/* Sparkle particles when found */}
            <AnimatePresence>
              {slotPhase === "found" && (
                <>
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ 
                        opacity: [0, 1, 0], 
                        scale: [0, 1, 0],
                        x: Math.cos((i * Math.PI * 2) / 8) * 80,
                        y: Math.sin((i * Math.PI * 2) / 8) * 80,
                      }}
                      transition={{ 
                        duration: 0.8, 
                        delay: i * 0.05,
                        ease: "easeOut"
                      }}
                      className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-yellow-400"
                      style={{ transform: "translate(-50%, -50%)" }}
                    />
                  ))}
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Status Text */}
        <div className="mt-8">
          <AnimatePresence mode="wait">
            {slotPhase === "found" ? (
              <motion.p
                key="found-text"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="text-2xl font-bold text-emerald-400 tracking-wider"
              >
                MATCH FOUND!
              </motion.p>
            ) : (
              <motion.p
                key="searching-text"
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                className="text-lg text-white/70 tracking-wide"
              >
                Finding opponent
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  ...
                </motion.span>
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
