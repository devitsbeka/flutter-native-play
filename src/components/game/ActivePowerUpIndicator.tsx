import { motion, AnimatePresence } from "framer-motion";
import { Snowflake } from "lucide-react";
import { PowerUpType } from "@/hooks/useUserPowerUps";

// There used to be an ActivePowerUpIndicator here — a "დრო გაყინულია"
// pill fixed near the top of the screen. It sat exactly where the
// difficulty pill and question header live and covered them, so the
// status labels now render inside QuizPowerUpBar (its `badges` prop),
// anchored above the power-up that caused them.

// The effect frames must stay inside the safe area: `inset-0` on a real
// device puts the top border behind the notch and the bottom behind the
// home indicator, which is why the freeze frame looked cropped.
const SAFE_FRAME = {
  top: "var(--safe-top)",
  bottom: "var(--safe-bottom)",
} as const;

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
              className="fixed left-0 right-0 pointer-events-none z-30"
              style={SAFE_FRAME}
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
              className="fixed left-0 right-0 pointer-events-none z-30"
              style={SAFE_FRAME}
            >
            {/* Ice border glow */}
              <motion.div
                className="absolute inset-0 border-4 border-cyan-400/40 rounded-3xl m-1"
                animate={{ 
                  borderColor: ["rgba(34,211,238,0.4)", "rgba(34,211,238,0.7)", "rgba(34,211,238,0.4)"],
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
              <div className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-cyan-300/15 to-transparent" />
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-cyan-300/15 to-transparent" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-cyan-300/15 to-transparent" />
              <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tl from-cyan-300/15 to-transparent" />
            </motion.div>
          )}

          {/* Time Drain Effect - Golden pulse */}
          {type === "time-drain" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed left-0 right-0 pointer-events-none z-30"
              style={SAFE_FRAME}
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
              className="fixed left-0 right-0 pointer-events-none z-30"
              style={SAFE_FRAME}
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
