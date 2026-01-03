import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

// New hexagonal badge icons
import power5050Badge from "@/assets/powers/5050-badge.png";
import powerFreezeBadge from "@/assets/powers/freeze-badge.png";
import powerReplaceBadge from "@/assets/powers/replace-badge.png";
import powerTimeDrainBadge from "@/assets/powers/time-drain-badge.png";
import { PowerUpType } from "@/hooks/useUserPowerUps";

interface PowerUpEffectOverlayProps {
  activeEffect: PowerUpType | null;
  onComplete: () => void;
}

const POWER_UP_IMAGES: Record<PowerUpType, string> = {
  "5050": power5050Badge,
  "freeze": powerFreezeBadge,
  "replace": powerReplaceBadge,
  "time-drain": powerTimeDrainBadge,
};

const POWER_UP_NAMES: Record<PowerUpType, string> = {
  "5050": "50/50",
  "freeze": "გაყინვა",
  "replace": "შეცვლა",
  "time-drain": "დრო+",
};

const POWER_UP_COLORS: Record<PowerUpType, { from: string; to: string }> = {
  "5050": { from: "#A855F7", to: "#7C3AED" },
  "freeze": { from: "#22D3EE", to: "#0891B2" },
  "replace": { from: "#10B981", to: "#059669" },
  "time-drain": { from: "#F59E0B", to: "#D97706" },
};

export function PowerUpEffectOverlay({ activeEffect, onComplete }: PowerUpEffectOverlayProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (activeEffect) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(onComplete, 300);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [activeEffect, onComplete]);

  return (
    <AnimatePresence>
      {show && activeEffect && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, ${POWER_UP_COLORS[activeEffect].from}20 0%, transparent 70%)`,
          }}
        >
          {/* Animated rings */}
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0.5, opacity: 0.8 }}
              animate={{ scale: 2 + i * 0.5, opacity: 0 }}
              transition={{
                duration: 1,
                delay: i * 0.15,
                ease: "easeOut",
              }}
              className="absolute rounded-full border-4"
              style={{
                width: 100,
                height: 100,
                borderColor: POWER_UP_COLORS[activeEffect].from,
              }}
            />
          ))}

          {/* Power-up icon with bounce - just the badge */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 15,
            }}
            className="relative"
          >
            {/* Glow effect */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{ duration: 0.6, repeat: Infinity }}
              className="absolute inset-0 rounded-full blur-xl"
              style={{
                background: `radial-gradient(circle, ${POWER_UP_COLORS[activeEffect].from} 0%, transparent 70%)`,
                transform: "scale(2)",
              }}
            />
            
            {/* Icon - just the badge, no container */}
            <motion.img
              src={POWER_UP_IMAGES[activeEffect]}
              alt={activeEffect}
              className="relative w-28 h-28 object-contain"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 0.5, repeat: 2 }}
              style={{
                filter: `drop-shadow(0 8px 24px ${POWER_UP_COLORS[activeEffect].from}80)`,
              }}
            />

            {/* Name label */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap"
            >
              <span
                className="text-lg font-bold px-4 py-1.5 rounded-full text-white"
                style={{
                  background: `linear-gradient(135deg, ${POWER_UP_COLORS[activeEffect].from} 0%, ${POWER_UP_COLORS[activeEffect].to} 100%)`,
                  boxShadow: `0 4px 16px ${POWER_UP_COLORS[activeEffect].from}60`,
                }}
              >
                {POWER_UP_NAMES[activeEffect]}
              </span>
            </motion.div>
          </motion.div>

          {/* Particle burst for replace */}
          {activeEffect === "replace" && (
            <>
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={`particle-${i}`}
                  initial={{ scale: 0, x: 0, y: 0 }}
                  animate={{
                    scale: [0, 1, 0],
                    x: Math.cos((i * 30 * Math.PI) / 180) * 120,
                    y: Math.sin((i * 30 * Math.PI) / 180) * 120,
                  }}
                  transition={{
                    duration: 0.8,
                    delay: 0.2,
                    ease: "easeOut",
                  }}
                  className="absolute w-3 h-3 rounded-full"
                  style={{
                    background: POWER_UP_COLORS[activeEffect].from,
                  }}
                />
              ))}
            </>
          )}

          {/* Snowflakes for freeze */}
          {activeEffect === "freeze" && (
            <>
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={`snow-${i}`}
                  initial={{ opacity: 0, y: -50, x: (i - 4) * 40 }}
                  animate={{
                    opacity: [0, 1, 0],
                    y: 100,
                    rotate: 360,
                  }}
                  transition={{
                    duration: 1.2,
                    delay: i * 0.1,
                    ease: "easeOut",
                  }}
                  className="absolute text-2xl"
                >
                  ❄️
                </motion.div>
              ))}
            </>
          )}

          {/* Clock icons for time-drain */}
          {activeEffect === "time-drain" && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="absolute -top-16 text-4xl"
            >
              ⏱️
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
