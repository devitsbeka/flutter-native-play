import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

// Use the SAME 3D cube icons as the power-up bar
import power5050 from "@/assets/powers/5050.png";
import powerFreeze from "@/assets/powers/freeze.png";
import powerReplace from "@/assets/powers/replace.png";
import powerTimeDrain from "@/assets/powers/time-drain.png";
import { PowerUpType } from "@/hooks/useUserPowerUps";

interface PowerUpEffectOverlayProps {
  activeEffect: PowerUpType | null;
  onComplete: () => void;
}

const POWER_UP_IMAGES: Record<PowerUpType, string> = {
  "5050": power5050,
  "freeze": powerFreeze,
  "replace": powerReplace,
  "time-drain": powerTimeDrain,
};

const POWER_UP_NAMES: Record<PowerUpType, string> = {
  "5050": "50/50",
  "freeze": "გაყინვა",
  "replace": "შეცვლა",
  "time-drain": "დრო+",
};

const POWER_UP_GRADIENTS: Record<PowerUpType, string> = {
  "5050": "linear-gradient(180deg, hsl(350 80% 60%) 0%, hsl(330 75% 55%) 100%)",
  "freeze": "linear-gradient(180deg, hsl(190 90% 55%) 0%, hsl(210 80% 55%) 100%)",
  "replace": "linear-gradient(180deg, hsl(150 75% 50%) 0%, hsl(140 70% 45%) 100%)",
  "time-drain": "linear-gradient(180deg, hsl(270 70% 60%) 0%, hsl(280 65% 55%) 100%)",
};

export function PowerUpEffectOverlay({ activeEffect, onComplete }: PowerUpEffectOverlayProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (activeEffect) {
      setShow(true);
      // Shorter duration - 600ms instead of 1200ms
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(onComplete, 200);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [activeEffect, onComplete]);

  return (
    <AnimatePresence>
      {show && activeEffect && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
        >
          <motion.div className="flex flex-col items-center gap-2">
            {/* Icon - same 3D cube style as power-up bar */}
            <motion.img
              src={POWER_UP_IMAGES[activeEffect]}
              alt={activeEffect}
              className="w-14 h-14 object-contain"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 0.3 }}
              style={{
                filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))",
              }}
            />

            {/* Label */}
            <motion.span
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-sm font-bold px-4 py-1.5 rounded-full text-white shadow-lg"
              style={{
                background: POWER_UP_GRADIENTS[activeEffect],
              }}
            >
              {POWER_UP_NAMES[activeEffect]}
            </motion.span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
