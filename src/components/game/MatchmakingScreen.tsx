import { motion } from "framer-motion";
import { useGame } from "@/contexts/GameContext";

export function MatchmakingScreen() {
  const { phase, preparationProgress } = useGame();
  const isPreparing = phase === "preparing";

  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      {/* Animated circles */}
      <motion.div
        className="relative w-28 h-28 mb-8"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
      >
        {/* Multiple pulsing rings */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full border-2 border-primary/30"
            animate={{
              scale: [1, 1.5 + i * 0.2, 1],
              opacity: [0.6, 0, 0.6],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.3,
            }}
          />
        ))}

        {/* Center circle */}
        <div className="absolute inset-4 flex items-center justify-center bg-primary/20 rounded-full backdrop-blur">
          <motion.span 
            className="text-4xl"
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {isPreparing ? "📚" : "🔍"}
          </motion.span>
        </div>
      </motion.div>

      {/* Text */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-xl font-bold text-foreground mb-2">
          {isPreparing ? "Loading Quiz" : "Finding Opponent"}
        </h2>
        <motion.p
          className="text-muted-foreground text-sm"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {isPreparing ? "Preparing your questions..." : "Matching you with a player..."}
        </motion.p>
      </motion.div>

      {/* Progress bar during preparation */}
      {isPreparing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xs mt-8"
        >
          <div className="h-2 bg-primary/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${preparationProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-center text-sm text-muted-foreground mt-2">
            {preparationProgress}% complete
          </p>
        </motion.div>
      )}

      {/* Bouncing dots */}
      <div className="flex items-center gap-2 mt-8">
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className="w-2.5 h-2.5 bg-primary/50 rounded-full"
            animate={{
              y: [0, -8, 0],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: index * 0.15,
            }}
          />
        ))}
      </div>
    </div>
  );
}
