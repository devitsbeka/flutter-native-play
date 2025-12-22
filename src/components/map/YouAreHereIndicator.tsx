import { motion } from "framer-motion";
import { MapPin } from "lucide-react";

interface YouAreHereIndicatorProps {
  x: number;
  y: number;
}

export function YouAreHereIndicator({ x, y }: YouAreHereIndicatorProps) {
  return (
    <motion.div
      className="absolute z-30 pointer-events-none"
      style={{
        left: `${x}%`,
        top: `${y}vh`,
        transform: "translate(-50%, -100%)",
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, type: "spring" }}
    >
      {/* Dotted line connecting to node */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 bottom-0 w-0.5 h-16"
        style={{
          background: "repeating-linear-gradient(to bottom, hsl(var(--primary)) 0px, hsl(var(--primary)) 4px, transparent 4px, transparent 8px)",
        }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />

      {/* Main indicator container */}
      <motion.div
        className="relative -mb-12"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Glowing background */}
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/30 blur-xl"
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        {/* Badge container */}
        <div className="relative flex flex-col items-center">
          {/* Text badge */}
          <motion.div
            className="px-3 py-1.5 rounded-full bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/30"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <span className="text-xs font-bold text-primary-foreground whitespace-nowrap tracking-wide">
              YOU ARE HERE
            </span>
          </motion.div>

          {/* Arrow pointing down */}
          <motion.div
            className="mt-1"
            animate={{ y: [0, 4, 0] }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          >
            <div 
              className="w-4 h-4 bg-primary rotate-45 shadow-lg shadow-primary/40"
              style={{ 
                clipPath: "polygon(0 0, 100% 0, 100% 100%)",
                transform: "rotate(135deg)",
              }}
            />
          </motion.div>

          {/* Pulsing pin icon */}
          <motion.div
            className="absolute -bottom-8 left-1/2 -translate-x-1/2"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <div className="relative">
              <motion.div
                className="absolute inset-0 rounded-full bg-primary"
                animate={{ scale: [1, 2, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <MapPin className="w-6 h-6 text-primary drop-shadow-lg" />
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}