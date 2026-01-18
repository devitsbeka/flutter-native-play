import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type AnswerState = "default" | "selected" | "correct" | "incorrect";

interface AnswerButtonProps {
  text: string;
  state?: AnswerState;
  onClick?: () => void;
  disabled?: boolean;
  index?: number;
}

export function AnswerButton({ 
  text, 
  state = "default",
  onClick,
  disabled = false,
  index = 0
}: AnswerButtonProps) {
  const getStateStyles = () => {
    switch (state) {
      case "correct":
        return {
          bg: "linear-gradient(180deg, hsl(142 70% 50%) 0%, hsl(142 65% 42%) 100%)",
          shadow: "0 4px 0 hsl(142 60% 32%)",
          text: "text-white",
        };
      case "incorrect":
        return {
          bg: "linear-gradient(180deg, hsl(0 70% 55%) 0%, hsl(0 65% 45%) 100%)",
          shadow: "0 4px 0 hsl(0 60% 35%)",
          text: "text-white",
        };
      case "selected":
        return {
          bg: "linear-gradient(180deg, hsl(200 70% 55%) 0%, hsl(200 65% 45%) 100%)",
          shadow: "0 4px 0 hsl(200 60% 35%)",
          text: "text-white",
        };
      default:
        return {
          bg: "linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(0 0% 96%) 100%)",
          shadow: "0 4px 0 hsl(0 0% 85%)",
          text: "text-foreground",
        };
    }
  };

  const styles = getStateStyles();

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full md:max-w-2xl md:mx-auto relative rounded-2xl px-6 py-4 font-semibold text-base transition-all",
        "disabled:opacity-60 disabled:pointer-events-none",
        styles.text
      )}
      style={{
        background: styles.bg,
        boxShadow: styles.shadow,
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={state === "default" ? { scale: 1.02 } : {}}
      whileTap={state === "default" ? { scale: 0.98, y: 2 } : {}}
    >
      {text}
    </motion.button>
  );
}
