import { useGame } from "@/contexts/GameContext";
import { HomeScreen } from "./HomeScreen";
import { MatchmakingScreen } from "./MatchmakingScreen";
import { VSScreen } from "./VSScreen";
import { QuestionScreen } from "./QuestionScreen";
import { MatchResultScreen } from "./MatchResultScreen";
import { AnimatePresence, motion } from "framer-motion";
import { SPLINE_BLOB_URL, isSplineLoaded } from "./SplinePreloader";
import { useState, useEffect } from "react";

export function GameContainer() {
  const { phase } = useGame();
  const [splineReady, setSplineReady] = useState(isSplineLoaded());

  useEffect(() => {
    // If already loaded, we're good
    if (isSplineLoaded()) {
      setSplineReady(true);
      return;
    }
    
    // Small delay to allow cached iframe to show
    const timer = setTimeout(() => setSplineReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Phases that need the shared Spline blob background
  const showBlobBackground = phase === "home" || phase === "matchmaking" || phase === "preparing" || phase === "vs-screen";

  // Use stable key for question-related phases to prevent unmount/remount
  const getStableKey = () => {
    if (phase === "playing" || phase === "question-result") return "question-flow";
    if (phase === "home" || phase === "matchmaking" || phase === "preparing" || phase === "vs-screen") return "blob-flow";
    return phase;
  };

  return (
    <div className="w-full h-full relative">
      {/* Gradient fallback to prevent black flash */}
      <div 
        className="absolute inset-0 -z-20"
        style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)"
        }}
      />
      
      {/* Shared persistent Spline background - never unmounts during matchmaking/vs transitions */}
      <iframe 
        src={SPLINE_BLOB_URL}
        frameBorder="0" 
        className="absolute inset-0 w-full h-full -z-10 transition-opacity duration-300"
        style={{ 
          opacity: showBlobBackground ? 1 : 0,
          pointerEvents: showBlobBackground ? "auto" : "none"
        }}
        title="Game Background"
        loading="eager"
      />
      
      <AnimatePresence mode="wait">
        <motion.div
          key={getStableKey()}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          className="w-full h-full"
        >
          {(phase === "home" || phase === "matchmaking" || phase === "preparing") && <MatchmakingScreen />}
          {phase === "vs-screen" && <VSScreen />}
          {(phase === "playing" || phase === "question-result") && <QuestionScreen />}
          {phase === "match-result" && <MatchResultScreen />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
