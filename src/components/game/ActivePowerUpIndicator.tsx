import { motion, AnimatePresence } from "framer-motion";
import { Snowflake, Clock, Shuffle, Sparkles } from "lucide-react";
import { PowerUpType } from "@/hooks/useUserPowerUps";

interface ActivePowerUpIndicatorProps {
  type: PowerUpType;
  remainingTime?: number;
  isVisible: boolean;
}

const POWER_UP_CONFIG: Record<PowerUpType, {
  icon: React.ReactNode;
  label: string;
  color: string;
  bgColor: string;
  glowColor: string;
}> = {
  "5050": {
    icon: <Sparkles className="w-4 h-4" />,
    label: "50/50",
    color: "#A855F7",
    bgColor: "linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)",
    glowColor: "rgba(168, 85, 247, 0.4)",
  },
  "freeze": {
    icon: <Snowflake className="w-4 h-4" />,
    label: "გაყინვა",
    color: "#22D3EE",
    bgColor: "linear-gradient(135deg, #22D3EE 0%, #0891B2 100%)",
    glowColor: "rgba(34, 211, 238, 0.4)",
  },
  "replace": {
    icon: <Shuffle className="w-4 h-4" />,
    label: "შეცვლა",
    color: "#10B981",
    bgColor: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
    glowColor: "rgba(16, 185, 129, 0.4)",
  },
  "time-drain": {
    icon: <Clock className="w-4 h-4" />,
    label: "+დრო",
    color: "#F59E0B",
    bgColor: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
    glowColor: "rgba(245, 158, 11, 0.4)",
  },
};

export function ActivePowerUpIndicator({ type, remainingTime, isVisible }: ActivePowerUpIndicatorProps) {
  const config = POWER_UP_CONFIG[type];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -10 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
        >
          <motion.div
            className="flex items-center gap-2 px-4 py-2 rounded-full text-white font-bold shadow-lg"
            style={{
              background: config.bgColor,
              boxShadow: `0 4px 20px ${config.glowColor}, 0 0 30px ${config.glowColor}`,
            }}
            animate={{
              scale: [1, 1.02, 1],
              boxShadow: [
                `0 4px 20px ${config.glowColor}, 0 0 30px ${config.glowColor}`,
                `0 4px 30px ${config.glowColor}, 0 0 50px ${config.glowColor}`,
                `0 4px 20px ${config.glowColor}, 0 0 30px ${config.glowColor}`,
              ],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {config.icon}
            <span>{config.label}</span>
            {remainingTime !== undefined && remainingTime > 0 && (
              <motion.span
                key={remainingTime}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="bg-white/20 rounded-full px-2 py-0.5 text-sm"
              >
                {remainingTime}წ
              </motion.span>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Screen-wide effect overlays for each power-up
export function PowerUpScreenEffect({ type, isActive }: { type: PowerUpType | null; isActive: boolean }) {
  if (!type || !isActive) return null;

  return (
    <AnimatePresence>
      {isActive && (
        <>
          {/* 50/50 Effect - Purple corners glow */}
          {type === "5050" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 pointer-events-none z-30"
            >
              <div className="absolute top-0 left-0 w-40 h-40 bg-gradient-radial from-purple-500/30 to-transparent" />
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-radial from-purple-500/30 to-transparent" />
              <motion.div
                className="absolute inset-0 border-4 border-purple-500/20 rounded-3xl m-2"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </motion.div>
          )}

          {/* Freeze Effect - Ice border and floating snowflakes */}
          {type === "freeze" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 pointer-events-none z-30"
            >
              {/* Ice border glow */}
              <motion.div
                className="absolute inset-0 border-4 border-cyan-400/40 rounded-3xl m-1"
                animate={{ 
                  borderColor: ["rgba(34,211,238,0.4)", "rgba(34,211,238,0.7)", "rgba(34,211,238,0.4)"],
                  boxShadow: [
                    "inset 0 0 30px rgba(34,211,238,0.2)",
                    "inset 0 0 50px rgba(34,211,238,0.4)",
                    "inset 0 0 30px rgba(34,211,238,0.2)",
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              {/* Floating snowflakes */}
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute text-cyan-300"
                  style={{
                    left: `${15 + i * 15}%`,
                    top: -20,
                  }}
                  animate={{
                    y: [0, window.innerHeight + 40],
                    x: [0, Math.sin(i) * 30, 0],
                    rotate: [0, 360],
                    opacity: [0, 1, 1, 0],
                  }}
                  transition={{
                    duration: 4 + i * 0.5,
                    repeat: Infinity,
                    delay: i * 0.3,
                    ease: "linear",
                  }}
                >
                  <Snowflake className="w-5 h-5" />
                </motion.div>
              ))}
              {/* Frost corners */}
              <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-cyan-300/30 to-transparent" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-300/30 to-transparent" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-cyan-300/30 to-transparent" />
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-cyan-300/30 to-transparent" />
            </motion.div>
          )}

          {/* Time Drain Effect - Golden pulse */}
          {type === "time-drain" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 pointer-events-none z-30"
            >
              {/* Golden border pulse */}
              <motion.div
                className="absolute inset-0 border-4 border-amber-400/30 rounded-3xl m-2"
                animate={{
                  borderColor: ["rgba(251,191,36,0.3)", "rgba(251,191,36,0.6)", "rgba(251,191,36,0.3)"],
                }}
                transition={{ duration: 1, repeat: 3 }}
              />
              {/* Floating +time icons */}
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute text-amber-400 font-bold text-lg"
                  style={{
                    left: `${20 + i * 20}%`,
                    bottom: 100,
                  }}
                  initial={{ opacity: 0, y: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    y: -100,
                  }}
                  transition={{
                    duration: 1.5,
                    delay: i * 0.2,
                  }}
                >
                  +5
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Replace Effect - Green swirl */}
          {type === "replace" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 pointer-events-none z-30"
            >
              {/* Swirl effect */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8 }}
              >
                <motion.div
                  className="w-64 h-64 rounded-full border-4 border-dashed border-emerald-400/50"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: [0.5, 1.5], opacity: [0.8, 0] }}
                  transition={{ duration: 0.8 }}
                />
              </motion.div>
              {/* Green flash */}
              <motion.div
                className="absolute inset-0 bg-emerald-400/10"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.3, 0] }}
                transition={{ duration: 0.5 }}
              />
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
