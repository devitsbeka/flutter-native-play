import { useGame } from "@/contexts/GameContext";
import { HomeScreen } from "./HomeScreen";
import { MatchmakingScreen } from "./MatchmakingScreen";
import { VSScreen } from "./VSScreen";
import { QuestionScreen } from "./QuestionScreen";
import { MatchResultScreen } from "./MatchResultScreen";
import { AnimatePresence, motion } from "framer-motion";

export function GameContainer() {
  const { phase } = useGame();

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
      {/* Shared persistent Spline background - never unmounts during matchmaking/vs transitions */}
      <iframe 
        src="https://my.spline.design/floatingblob-fNd2CwqSRe1QdyRbYBDFvR22/" 
        frameBorder="0" 
        className="absolute inset-0 w-full h-full -z-10 transition-opacity duration-200"
        style={{ 
          opacity: showBlobBackground ? 1 : 0,
          pointerEvents: showBlobBackground ? "auto" : "none"
        }}
        title="Game Background"
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
