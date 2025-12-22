import { motion } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { Globe, Sparkles } from "lucide-react";

export function MatchmakingScreen() {
  const { phase, preparationProgress } = useGame();
  const isPreparing = phase === "preparing";

  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      {/* Glass Card Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-border/50 max-w-sm w-full"
      >
        {/* Animated Icon */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          {/* Pulsing rings */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full border-2 border-primary/40"
              animate={{
                scale: [1, 1.4 + i * 0.15],
                opacity: [0.6, 0],
              }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: "easeOut",
                delay: i * 0.4,
              }}
            />
          ))}

          {/* Center icon */}
          <motion.div 
            className="absolute inset-0 flex items-center justify-center bg-primary/20 rounded-full"
            animate={{ rotate: isPreparing ? 0 : 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            {isPreparing ? (
              <Sparkles className="w-10 h-10 text-primary" />
            ) : (
              <Globe className="w-10 h-10 text-primary" />
            )}
          </motion.div>
        </div>

        {/* Heading */}
        <h2 className="font-display text-2xl font-bold text-foreground text-center mb-2">
          {isPreparing ? "Loading Quiz" : "Finding Opponent"}
        </h2>
        
        {/* Subtitle */}
        <p className="text-muted-foreground text-center text-sm mb-6">
          {isPreparing ? "Preparing your questions..." : "Matching you with a player..."}
        </p>

        {/* Progress bar during preparation */}
        {isPreparing && (
          <div className="space-y-2">
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${preparationProgress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
            <p className="text-center text-sm text-muted-foreground font-medium">
              {preparationProgress}% complete
            </p>
          </div>
        )}

        {/* Bouncing dots for matchmaking */}
        {!isPreparing && (
          <div className="flex items-center justify-center gap-2 mt-2">
            {[0, 1, 2].map((index) => (
              <motion.div
                key={index}
                className="w-2.5 h-2.5 bg-primary rounded-full"
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
        )}
      </motion.div>
    </div>
  );
}
