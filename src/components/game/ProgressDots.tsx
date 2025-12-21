import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressDotsProps {
  total: number;
  current: number;
  userProgress: number;
  opponentProgress: number;
}

export function ProgressDots({ total, current, userProgress, opponentProgress }: ProgressDotsProps) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, index) => {
        const isCompleted = index < current;
        const isCurrent = index === current;
        
        return (
          <div key={index} className="relative">
            <motion.div
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-colors",
                isCompleted ? "bg-primary" : 
                isCurrent ? "bg-foreground" : "bg-border"
              )}
              animate={isCurrent ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </div>
        );
      })}
    </div>
  );
}
