import { useGame } from "@/contexts/GameContext";
import { HomeScreen } from "./HomeScreen";
import { MatchmakingScreen } from "./MatchmakingScreen";
import { VSScreen } from "./VSScreen";
import { QuestionScreen } from "./QuestionScreen";
import { QuestionResultScreen } from "./QuestionResultScreen";
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
        transition={{ duration: 0.2 }}
        className="w-full"
      >
        {phase === "home" && <HomeScreen />}
        {phase === "matchmaking" && <MatchmakingScreen />}
        {phase === "vs-screen" && <VSScreen />}
        {phase === "playing" && <QuestionScreen />}
        {phase === "question-result" && <QuestionResultScreen />}
        {phase === "match-result" && <MatchResultScreen />}
      </motion.div>
    </AnimatePresence>
  );
}
