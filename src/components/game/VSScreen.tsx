import { motion } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { calculateLevel } from "@/utils/levelCalculation";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { QuizPlayerAvatar } from "@/components/ui/quiz-player-avatar";
import { VSMatchHelpModal } from "./VSMatchHelpModal";
import { CloudCategoryFlight } from "./CloudCategoryFlight";

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

// Topographic wave pattern SVG (matching MatchResultScreen)
const WavePattern = () => (
  <svg
    className="absolute bottom-0 left-0 w-full"
    viewBox="0 0 400 200"
    preserveAspectRatio="none"
    style={{ height: "40%" }}
  >
    <path
      d="M0 100 Q50 80 100 100 T200 100 T300 100 T400 100 L400 200 L0 200 Z"
      fill="rgba(255,255,255,0.03)"
    />
    <path
      d="M0 120 Q50 100 100 120 T200 120 T300 120 T400 120 L400 200 L0 200 Z"
      fill="rgba(255,255,255,0.05)"
    />
    <path
      d="M0 140 Q50 120 100 140 T200 140 T300 140 T400 140 L400 200 L0 200 Z"
      fill="rgba(255,255,255,0.07)"
    />
    <path
      d="M0 160 Q50 140 100 160 T200 160 T300 160 T400 160 L400 200 L0 200 Z"
      fill="rgba(255,255,255,0.09)"
    />
  </svg>
);

type SlotPhase = "searching" | "slowing" | "found" | "ready";

export function VSScreen() {
  const { opponent, startMatch, beginPlaying, phase } = useGame();
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  // Slot machine state
  const [slotPhase, setSlotPhase] = useState<SlotPhase>("searching");
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showWheel, setShowWheel] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);
  const [selectedCategoryVideo, setSelectedCategoryVideo] = useState<string | null>(null);
  const [showCategoryBubble, setShowCategoryBubble] = useState(false);
  const [canStart, setCanStart] = useState(false);

  // Player data
  const playerPoints = profile?.total_points || 0;
  const playerLevelInfo = calculateLevel(playerPoints);
  const opponentPoints = opponent?.points || 0;
  const opponentLevelInfo = calculateLevel(opponentPoints);

  // Derived display values
  const isMatchFound = slotPhase === "found" || slotPhase === "ready";
  const opponentName = isMatchFound ? (opponent?.name || "მოწინააღმდეგე") : "ძებნა...";
  const opponentPointsDisplay = isMatchFound ? opponentPoints : 0;
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

  // Transition to ready state after found - then show wheel
  useEffect(() => {
    if (slotPhase === "found") {
      const timer = setTimeout(() => {
        setSlotPhase("ready");
        // Automatically show wheel when match is ready
        setShowWheel(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [slotPhase]);

  // Handle when category is selected by wheel
  const handleCategorySelected = (categoryId: string, categoryName: string, videoUrl: string) => {
    setShowWheel(false);
    setSelectedCategoryId(categoryId);
    setSelectedCategoryName(categoryName);
    setSelectedCategoryVideo(videoUrl);
    // Delay showing the bubble for smooth entrance
    setTimeout(() => {
      setShowCategoryBubble(true);
      setCanStart(true);
    }, 100);
  };

  // Start button now begins the game with the selected category
  const handleStart = () => {
    if (selectedCategoryId) {
      beginPlaying(selectedCategoryId);
    }
  };

  return (
    <div 
      className="h-[100dvh] w-full flex flex-col relative overflow-hidden"
      style={{ background: "#7E7ADB" }}
    >
      {/* Wave Pattern Background */}
      <WavePattern />

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
          <ArrowLeft className="w-6 h-6 text-white" strokeWidth={2.5} />
        </motion.button>
        
        <motion.button 
          className="p-2" 
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowHelpModal(true)}
        >
          <HelpCircle className="w-6 h-6 text-white/80" strokeWidth={2} />
        </motion.button>
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 flex flex-col relative z-10 px-5">
        
        {/* Before Category Selected: Vertical VS Layout */}
        {!selectedCategoryName && (
          <div className="flex-1 flex flex-col items-center justify-center gap-1 sm:gap-2">
            {/* Player Section - Top */}
            <motion.div 
              className="flex flex-col items-center gap-2"
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <QuizPlayerAvatar
                avatarUrl={profile?.avatar_url}
                animatedAvatarUrl={profile?.animated_avatar_url}
                score={playerPoints}
                position="left"
                state="active"
                size="xlarge"
              />
              <h2
                className="text-2xl font-black tracking-wide"
                style={{
                  fontFamily: "'TASolivare', sans-serif",
                  color: "#FFFFFF",
                  textShadow: "0 2px 10px rgba(0,0,0,0.3)",
                }}
              >
                {profile?.nickname || "შენ"}
              </h2>
              <p className="text-white/70 text-sm">
                დონე {playerLevelInfo.level}
              </p>
            </motion.div>

            {/* VS Badge - Center */}
            <motion.div 
              className="py-2 sm:py-4"
              animate={!isMatchFound ? { scale: [1, 1.15, 1] } : { scale: 1 }}
              transition={{ duration: 1.2, repeat: !isMatchFound ? Infinity : 0, ease: "easeInOut" }}
            >
              <span 
                className="text-4xl sm:text-6xl font-black text-white"
                style={{ 
                  textShadow: "0 6px 30px rgba(0,0,0,0.4)",
                  fontFamily: "'TASolivare', sans-serif",
                }}
              >
                VS
              </span>
            </motion.div>

            {/* Opponent Section - Bottom */}
            <motion.div 
              className="flex flex-col items-center gap-2"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <QuizPlayerAvatar
                avatarUrl={currentAvatar || slotAvatars[0]}
                score={opponentPointsDisplay}
                position="right"
                state="default"
                size="xlarge"
              />
              <h2
                className="text-2xl font-black tracking-wide"
                style={{
                  fontFamily: "'TASolivare', sans-serif",
                  color: "#FFFFFF",
                  textShadow: "0 2px 10px rgba(0,0,0,0.3)",
                }}
              >
                {opponentName}
              </h2>
              <p className="text-white/70 text-sm">
                {isMatchFound ? `დონე ${opponentLevelInfo.level}` : "დონე ?"}
              </p>
            </motion.div>
          </div>
        )}

        {/* After Category Selected: Diagonal Layout */}
        {selectedCategoryName && (
          <div className="flex-1 flex flex-col justify-between py-4">
            
            {/* Opponent - Top Left */}
            <motion.div 
              className="flex justify-start"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div className="flex items-center gap-3">
                {/* Avatar with golden gradient stroke */}
                <div 
                  className="p-1 rounded-full"
                  style={{
                    background: "linear-gradient(135deg, #FFD700, #FFA500, #FFEC8B, #FFD700)",
                    boxShadow: "0 4px 15px rgba(255,215,0,0.4)"
                  }}
                >
                  <div className="w-20 h-20 rounded-full overflow-hidden">
                    <img 
                      src={opponent?.avatarUrl || currentAvatar || slotAvatars[0]} 
                      alt="Opponent"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                {/* Text Info - Right of avatar */}
                <div className="flex flex-col">
                  <h3
                    className="text-2xl font-black text-white"
                    style={{
                      fontFamily: "'TASolivare', sans-serif",
                      textShadow: "0 2px 10px rgba(0,0,0,0.4)",
                    }}
                  >
                    {opponent?.name || "მოწინააღმდეგე"}
                  </h3>
                  <p className="text-white/70 text-sm">
                    დონე {opponentLevelInfo.level}
                  </p>
                  <p className="text-amber-300 text-sm font-medium">
                    {opponentPoints.toLocaleString()}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Category - Center */}
            <motion.div 
              className="flex flex-col items-center justify-center gap-3"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
            >
              {/* Video Container - Rectangular */}
              {selectedCategoryVideo && showCategoryBubble && (
                <motion.div
                  initial={{ scale: 1.5, y: -50, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  transition={{ 
                    duration: 0.6, 
                    ease: [0.34, 1.56, 0.64, 1],
                    delay: 0.3
                  }}
                  className="w-[304px] h-[179px] rounded-[18px] overflow-hidden"
                  style={{ 
                    border: "4px solid rgba(255,215,0,0.7)",
                    boxShadow: "0 0 25px rgba(255,215,0,0.4), 0 8px 32px rgba(0,0,0,0.3)"
                  }}
                >
                  <video
                    src={selectedCategoryVideo}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              )}
              
              {/* Category Name */}
              <h2 
                className="text-2xl font-black text-white text-center"
                style={{ 
                  fontFamily: "'TASolivare', sans-serif",
                  textShadow: "0 4px 20px rgba(0,0,0,0.4)"
                }}
              >
                {selectedCategoryName}
              </h2>
            </motion.div>

            {/* Player - Bottom Right */}
            <motion.div 
              className="flex justify-end"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div className="flex items-center gap-3">
                {/* Text Info - Left of avatar */}
                <div className="flex flex-col items-end">
                  <h3
                    className="text-2xl font-black text-white"
                    style={{
                      fontFamily: "'TASolivare', sans-serif",
                      textShadow: "0 2px 10px rgba(0,0,0,0.4)",
                    }}
                  >
                    {profile?.nickname || "შენ"}
                  </h3>
                  <p className="text-white/70 text-sm">
                    დონე {playerLevelInfo.level}
                  </p>
                  <p className="text-amber-300 text-sm font-medium">
                    {playerPoints.toLocaleString()}
                  </p>
                </div>
                {/* Avatar with golden gradient stroke */}
                <div 
                  className="p-1 rounded-full"
                  style={{
                    background: "linear-gradient(135deg, #FFD700, #FFA500, #FFEC8B, #FFD700)",
                    boxShadow: "0 4px 15px rgba(255,215,0,0.4)"
                  }}
                >
                  <div className="w-20 h-20 rounded-full overflow-hidden">
                    <img 
                      src={profile?.animated_avatar_url || profile?.avatar_url || "/placeholder.svg"} 
                      alt="Player"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Button Section - Fixed at bottom */}
      <div className="w-full max-w-sm mx-auto pb-4 sm:pb-8 pt-4 px-6 relative z-10">
        <motion.div
          className="w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ 
            opacity: canStart ? 1 : 0,
            y: canStart ? 0 : 20,
          }}
          transition={{ duration: 0.3 }}
        >
          <ChunkyButton
            variant="mint"
            size="xl"
            onClick={handleStart}
            disabled={!canStart}
            className="w-full"
          >
            დაწყება
          </ChunkyButton>
        </motion.div>
      </div>

      {/* Help Modal */}
      <VSMatchHelpModal 
        isOpen={showHelpModal} 
        onClose={() => setShowHelpModal(false)} 
      />

      {/* Cloud Category Flight */}
      <CloudCategoryFlight
        isOpen={showWheel}
        onCategorySelected={handleCategorySelected}
      />
    </div>
  );
}
