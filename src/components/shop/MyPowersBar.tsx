import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useUserPowerUps, PowerUpType } from "@/hooks/useUserPowerUps";

// 3D cube-style power-up icons
import fiftyFiftyIcon from "@/assets/powers/5050.png";
import freezeIcon from "@/assets/powers/freeze.png";
import replaceIcon from "@/assets/powers/replace.png";
import timeDrainIcon from "@/assets/powers/time-drain.png";

const POWER_UP_ICONS: Record<PowerUpType, string> = {
  "5050": fiftyFiftyIcon,
  freeze: freezeIcon,
  replace: replaceIcon,
  "time-drain": timeDrainIcon,
};

const POWER_UP_NAMES: Record<PowerUpType, string> = {
  "5050": "50/50",
  freeze: "გაყინვა",
  replace: "შეცვლა",
  "time-drain": "დრო+",
};

const POWER_UP_GRADIENTS: Record<PowerUpType, string> = {
  "5050": "linear-gradient(135deg, hsl(350 80% 60%) 0%, hsl(330 75% 55%) 100%)",
  freeze: "linear-gradient(135deg, hsl(190 90% 55%) 0%, hsl(210 80% 55%) 100%)",
  replace: "linear-gradient(135deg, hsl(150 75% 50%) 0%, hsl(140 70% 45%) 100%)",
  "time-drain": "linear-gradient(135deg, hsl(270 70% 60%) 0%, hsl(280 65% 55%) 100%)",
};

interface MyPowersBarProps {
  onPowerClick: (type: PowerUpType) => void;
}

export function MyPowersBar({ onPowerClick }: MyPowersBarProps) {
  const { powerUps, isLoading } = useUserPowerUps();

  const powerTypes: PowerUpType[] = ["5050", "freeze", "replace", "time-drain"];

  return (
    <div className="px-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-display font-bold text-foreground">ჩემი ძალები</h2>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide pt-3 pb-2">
        {powerTypes.map((type, index) => {
          const count = isLoading ? 0 : powerUps[type] || 0;
          const isEmpty = count === 0;

          return (
            <motion.button
              key={type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onPowerClick(type)}
              className="relative flex-shrink-0 p-3 rounded-2xl min-w-[85px]"
              style={{
                background: isEmpty
                  ? "hsl(var(--muted))"
                  : "linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--muted) / 0.5) 100%)",
                boxShadow: isEmpty
                  ? "0 3px 0 hsl(var(--border))"
                  : "0 4px 0 hsl(var(--border)), inset 0 1px 2px hsl(0 0% 100% / 0.5)",
                border: "2px solid hsl(var(--border))",
                opacity: isEmpty ? 0.6 : 1,
              }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Count Badge */}
              <motion.div
                className="absolute -top-2 -right-2 min-w-[26px] h-[26px] rounded-full flex items-center justify-center text-white font-bold text-xs px-1"
                style={{
                  background: isEmpty
                    ? "hsl(var(--muted-foreground))"
                    : POWER_UP_GRADIENTS[type],
                  boxShadow: "0 2px 0 hsl(0 0% 0% / 0.2)",
                }}
                whileHover={{ scale: 1.1 }}
              >
                {isEmpty ? (
                  <Plus className="w-3.5 h-3.5" />
                ) : (
                  count
                )}
              </motion.div>

              {/* Icon - just the badge, no container */}
              <div className="flex justify-center mb-2">
                <img
                  src={POWER_UP_ICONS[type]}
                  alt={POWER_UP_NAMES[type]}
                  className="w-11 h-11 object-contain"
                  style={{ 
                    filter: isEmpty ? "grayscale(1)" : "drop-shadow(0 2px 4px rgba(0,0,0,0.2))" 
                  }}
                />
              </div>

              {/* Name */}
              <p className="text-xs font-semibold text-center text-foreground truncate">
                {POWER_UP_NAMES[type]}
              </p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
