import { motion } from "framer-motion";
import { Calendar, Sparkles, Zap } from "lucide-react";

interface DailyChallengeNodeProps {
  isCompleted: boolean;
  bonusXP: number;
  onClick: () => void;
}

export function DailyChallengeNode({ isCompleted, bonusXP, onClick }: DailyChallengeNodeProps) {
  return (
    <div 
      className="absolute left-1/2 -translate-x-1/2"
      style={{ top: "8vh" }}
    >
      {/* Floating sparkles around the node */}
      {!isCompleted && (
        <>
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                left: `${50 + Math.cos((i / 6) * Math.PI * 2) * 60}%`,
                top: `${50 + Math.sin((i / 6) * Math.PI * 2) * 60}%`,
              }}
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [0.5, 1, 0.5],
                y: [0, -10, 0],
              }}
              transition={{
                duration: 2,
                delay: i * 0.3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
            </motion.div>
          ))}
        </>
      )}

      {/* Glowing ring effect */}
      {!isCompleted && (
        <motion.div
          className="absolute inset-0 -m-4 rounded-full"
          style={{
            background: "linear-gradient(135deg, hsl(45 100% 60% / 0.3), hsl(35 100% 50% / 0.3))",
            filter: "blur(15px)",
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {/* Main button */}
      <motion.button
        onClick={onClick}
        disabled={isCompleted}
        className={`relative w-20 h-20 rounded-2xl flex flex-col items-center justify-center shadow-2xl border-2 ${
          isCompleted
            ? "bg-muted border-muted-foreground/30"
            : "bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 border-amber-300"
        }`}
        whileHover={!isCompleted ? { scale: 1.1 } : {}}
        whileTap={!isCompleted ? { scale: 0.95 } : {}}
        animate={
          !isCompleted
            ? {
                boxShadow: [
                  "0 0 20px hsl(45 100% 50% / 0.4)",
                  "0 0 40px hsl(35 100% 50% / 0.6)",
                  "0 0 20px hsl(45 100% 50% / 0.4)",
                ],
              }
            : {}
        }
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Inner glow */}
        {!isCompleted && (
          <div className="absolute inset-1 rounded-xl bg-gradient-to-br from-white/30 to-transparent" />
        )}

        {/* Icon */}
        <Calendar className={`w-7 h-7 ${isCompleted ? "text-muted-foreground" : "text-white"} relative z-10`} />
        
        {/* DAILY badge */}
        <span className={`text-[10px] font-bold tracking-wider mt-0.5 relative z-10 ${
          isCompleted ? "text-muted-foreground" : "text-white"
        }`}>
          DAILY
        </span>
      </motion.button>

      {/* XP Bonus Badge */}
      {!isCompleted && (
        <motion.div
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <Zap className="w-3 h-3 text-white" />
          <span className="text-xs font-bold text-white">+{bonusXP} XP</span>
        </motion.div>
      )}

      {/* Completed checkmark */}
      {isCompleted && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-lg"
        >
          <span className="text-white text-sm">✓</span>
        </motion.div>
      )}
    </div>
  );
}
