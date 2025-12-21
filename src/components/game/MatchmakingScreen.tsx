import { motion } from "framer-motion";
import { useGame } from "@/contexts/GameContext";

export function MatchmakingScreen() {
  const { phase, preparationProgress } = useGame();
  const isPreparing = phase === "preparing";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      {/* Pulsing circle */}
      <motion.div
        className="relative w-24 h-24 mb-10"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
      >
        {/* Outer ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-primary/30"
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.6, 0, 0.6],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        {/* Inner ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-primary/50"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.8, 0, 0.8],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.3,
          }}
        />

        {/* Center */}
        <div className="absolute inset-0 flex items-center justify-center bg-primary rounded-full">
          <motion.div
            className="w-3 h-3 bg-primary-foreground rounded-full"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        </div>
      </motion.div>

      {/* Text */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          {isPreparing ? "Loading Quiz" : "Finding Opponent"}
        </h2>
        <motion.p
          className="text-muted-foreground"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {isPreparing ? "Preparing your questions..." : "Searching..."}
        </motion.p>
      </motion.div>

      {/* Progress bar during preparation */}
      {isPreparing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xs mt-8"
        >
          <div className="h-1 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${preparationProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-center text-xs text-muted-foreground mt-3">
            {preparationProgress}%
          </p>
        </motion.div>
      )}

      {/* Dots */}
      <div className="flex items-center gap-2 mt-10">
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className="w-2 h-2 bg-muted-foreground/30 rounded-full"
            animate={{
              backgroundColor: [
                "hsl(var(--muted-foreground) / 0.3)",
                "hsl(var(--primary))",
                "hsl(var(--muted-foreground) / 0.3)",
              ],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: index * 0.2,
            }}
          />
        ))}
      </div>
    </div>
  );
}
