import { useGame } from "@/contexts/GameContext";
import { VSScreen } from "./VSScreen";
import { QuizGameScreenProd } from "./QuizGameScreenProd";
import { MatchResultScreen } from "./MatchResultScreen";
import { AnimatePresence, motion } from "framer-motion";

export function GameContainer() {
  const { phase } = useGame();

  // Use stable key for question-related phases to prevent unmount/remount
  const getStableKey = () => {
    if (phase === "playing" || phase === "question-result") return "question-flow";
    // Keep VS screen mounted during all pre-game phases
    if (phase === "home" || phase === "matchmaking" || phase === "preparing" || phase === "vs-screen") return "vs-flow";
    return phase;
  };

  return (
    <div className="w-full h-full relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={getStableKey()}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          className="w-full h-full"
        >
          {/* VS Screen handles matchmaking + vs-screen phases */}
          {(phase === "home" || phase === "matchmaking" || phase === "preparing" || phase === "vs-screen") && <VSScreen />}
          {(phase === "playing" || phase === "question-result") && <QuizGameScreenProd />}
          {phase === "match-result" && <MatchResultScreen />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
