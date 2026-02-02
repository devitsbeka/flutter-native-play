import { motion, AnimatePresence } from "framer-motion";
import { useUserPowerUps, PowerUpType } from "@/hooks/useUserPowerUps";

import icon5050 from "@/assets/powers/5050.png";
import iconFreeze from "@/assets/powers/freeze.png";
import iconReplace from "@/assets/powers/replace.png";
import iconTimeDrain from "@/assets/powers/time-drain.png";

const POWER_UP_ICONS: Record<PowerUpType, string> = {
  "5050": icon5050,
  "freeze": iconFreeze,
  "replace": iconReplace,
  "time-drain": iconTimeDrain,
};

const POWER_UP_ORDER: PowerUpType[] = ["5050", "freeze", "replace", "time-drain"];

export function PowerUpsSummary() {
  const { powerUps, isLoading } = useUserPowerUps();

  if (isLoading) {
    return null;
  }

  return (
    <div className="flex flex-nowrap items-center gap-1.5 md:gap-2">
      {POWER_UP_ORDER.map((type) => (
        <div
          key={type}
          className="flex items-center justify-between gap-2 px-2 py-0.5 rounded-full bg-background/80 backdrop-blur-sm min-w-[48px]"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}
        >
          <img src={POWER_UP_ICONS[type]} alt="" className="w-4 h-4" />
          <AnimatePresence mode="wait">
            <motion.span
              key={powerUps[type]}
              initial={{ scale: 1.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="text-xs font-bold text-foreground/90"
            >
              {powerUps[type]}
            </motion.span>
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
