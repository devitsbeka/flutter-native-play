import { motion } from "framer-motion";
import { Search } from "lucide-react";

export function MatchmakingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background via-background to-primary/10">
      {/* Searching animation */}
      <motion.div
        className="relative w-32 h-32 mb-8"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
      >
        {/* Outer pulsing ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-primary/30"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        {/* Middle pulsing ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-primary/50"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.7, 0, 0.7],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.3,
          }}
        />

        {/* Center circle with icon */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-primary rounded-full shadow-lg"
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <Search className="w-12 h-12 text-primary-foreground" />
        </motion.div>
      </motion.div>

      {/* Text */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Finding Opponent
        </h2>
        <motion.p
          className="text-muted-foreground"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Searching for a worthy challenger...
        </motion.p>
      </motion.div>

      {/* Orbiting dots */}
      <div className="relative w-48 h-48 mt-8">
        {[0, 1, 2, 3].map((index) => (
          <motion.div
            key={index}
            className="absolute w-3 h-3 bg-chart-1 rounded-full"
            style={{
              top: "50%",
              left: "50%",
            }}
            animate={{
              x: [
                Math.cos((index * Math.PI) / 2) * 80,
                Math.cos((index * Math.PI) / 2 + Math.PI / 2) * 80,
                Math.cos((index * Math.PI) / 2 + Math.PI) * 80,
                Math.cos((index * Math.PI) / 2 + (3 * Math.PI) / 2) * 80,
                Math.cos((index * Math.PI) / 2 + 2 * Math.PI) * 80,
              ],
              y: [
                Math.sin((index * Math.PI) / 2) * 80,
                Math.sin((index * Math.PI) / 2 + Math.PI / 2) * 80,
                Math.sin((index * Math.PI) / 2 + Math.PI) * 80,
                Math.sin((index * Math.PI) / 2 + (3 * Math.PI) / 2) * 80,
                Math.sin((index * Math.PI) / 2 + 2 * Math.PI) * 80,
              ],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>
    </div>
  );
}
