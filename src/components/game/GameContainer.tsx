import { useGame } from "@/contexts/GameContext";
import { HomeScreen } from "./HomeScreen";
import { MatchmakingScreen } from "./MatchmakingScreen";
import { VSScreen } from "./VSScreen";
import { QuestionScreen } from "./QuestionScreen";
import { MatchResultScreen } from "./MatchResultScreen";
import { AnimatePresence, motion } from "framer-motion";

export function GameContainer() {
  const { phase } = useGame();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={phase}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="w-full h-full"
      >
        {phase === "home" && <HomeScreen />}
        {(phase === "matchmaking" || phase === "preparing") && <MatchmakingScreen />}
        {phase === "vs-screen" && <VSScreen />}
        {(phase === "playing" || phase === "question-result") && <QuestionScreen />}
        {phase === "match-result" && <MatchResultScreen />}
      </motion.div>
    </AnimatePresence>
  );
}
