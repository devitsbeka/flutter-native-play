import { motion } from "framer-motion";
import { Plus, Gamepad2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChunkyButton } from "@/components/ui/chunky-button";

interface MyTriviaTabProps {
  onCreateQuiz?: () => void;
}

export function MyTriviaTab({ onCreateQuiz }: MyTriviaTabProps) {
  const { t } = useLanguage();

  // For now, show empty state since user hasn't created any quizzes yet
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-6"
    >
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
        <Gamepad2 className="w-10 h-10 text-muted-foreground" />
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mb-2">
        შენი Trivia-ები
      </h3>
      
      <p className="text-muted-foreground text-center text-sm mb-6 max-w-xs">
        შექმენი შენი საკუთარი ქვიზები და გაუზიარე მეგობრებს!
      </p>
      
      <ChunkyButton onClick={onCreateQuiz} className="gap-2">
        <Plus className="w-5 h-5" />
        შექმენი Trivia
      </ChunkyButton>
    </motion.div>
  );
}
