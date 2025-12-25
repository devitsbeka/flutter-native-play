import { useGame } from "@/contexts/GameContext";
import { HomeScreen } from "./HomeScreen";
import { MatchmakingScreen } from "./MatchmakingScreen";
import { VSScreen } from "./VSScreen";
import { QuestionScreen } from "./QuestionScreen";
import { MatchResultScreen } from "./MatchResultScreen";
import { AnimatePresence, motion } from "framer-motion";

export function GameContainer() {
  const { phase } = useGame();

  // Use stable key for question-related phases to prevent unmount/remount
  const getStableKey = () => {
    if (phase === "playing" || phase === "question-result") return "question-flow";
    if (phase === "home" || phase === "matchmaking" || phase === "preparing") return "matchmaking-flow";
    return phase;
  };

  return (
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
  );
}
