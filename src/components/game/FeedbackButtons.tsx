import { motion } from "framer-motion";
import { ThumbsDown, ThumbsUp } from "lucide-react";

interface FeedbackButtonsProps {
  onBoring?: () => void;
  onFun?: () => void;
}

export function FeedbackButtons({ onBoring, onFun }: FeedbackButtonsProps) {
  return (
    <div className="flex gap-3 w-full">
      <motion.button
        onClick={onBoring}
        className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-white"
        style={{
          background: "linear-gradient(180deg, hsl(174 50% 50%) 0%, hsl(174 45% 42%) 100%)",
          boxShadow: "0 4px 0 hsl(174 40% 32%)"
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98, y: 2 }}
      >
        <ThumbsDown className="w-5 h-5" />
        <span>Boring</span>
      </motion.button>
      
      <motion.button
        onClick={onFun}
        className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-white"
        style={{
          background: "linear-gradient(180deg, hsl(174 55% 55%) 0%, hsl(174 50% 47%) 100%)",
          boxShadow: "0 4px 0 hsl(174 45% 37%)"
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98, y: 2 }}
      >
        <ThumbsUp className="w-5 h-5" />
        <span>Fun</span>
      </motion.button>
    </div>
  );
}
