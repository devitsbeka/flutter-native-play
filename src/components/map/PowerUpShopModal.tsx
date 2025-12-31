import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { PowerUpBadge } from "@/components/game/PowerUpBadge";
import { PowerUpDemoPreview } from "./PowerUpDemoPreview";
import { useUserPowerUps, PowerUpType } from "@/hooks/useUserPowerUps";

interface PowerUpShopModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PowerUpInfo {
  type: PowerUpType;
  name: string;
  description: string;
}

const POWER_UP_INFO: PowerUpInfo[] = [
  {
    type: "5050",
    name: "50/50",
    description: "წაშლის 2 არასწორ პასუხს",
  },
  {
    type: "freeze",
    name: "გაყინვა",
    description: "აყინებს მოწინააღმდეგეს 5 წამით",
  },
  {
    type: "replace",
    name: "ჩანაცვლება",
    description: "ცვლის ერთ არასწორ პასუხს",
  },
  {
    type: "time-drain",
    name: "დრო+",
    description: "ამატებს 3 წამს",
  },
];

export function PowerUpShopModal({ isOpen, onClose }: PowerUpShopModalProps) {
  const { powerUps, isLoading } = useUserPowerUps();
  const [selectedType, setSelectedType] = useState<PowerUpType>("5050");
  const [animationKey, setAnimationKey] = useState(0);

  // Restart animation when switching power-ups
  const handleSelectPowerUp = (type: PowerUpType) => {
    setSelectedType(type);
    setAnimationKey((prev) => prev + 1);
  };

  // Auto-loop animation every 4 seconds
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setAnimationKey((prev) => prev + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, [isOpen, selectedType]);

  const selectedInfo = POWER_UP_INFO.find((p) => p.type === selectedType)!;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center pb-24"
        >
          {/* Modal Card - no backdrop, map visible */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-md mx-4"
          >
            <div className="bg-gradient-to-b from-[#1a1a2e]/95 to-[#16213e]/95 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="relative px-6 pt-5 pb-3">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5 text-white/70" />
                </button>

                <div className="text-center">
                  <h2 className="text-xl font-display text-white">
                    ⚡ ძალები
                  </h2>
                  <p className="text-white/50 text-sm">
                    შენი სუპერ ძალები
                  </p>
                </div>
              </div>

              {/* Demo Preview Area */}
              <div className="px-4">
                <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
                  <PowerUpDemoPreview
                    type={selectedType}
                    animationKey={animationKey}
                  />
                </div>
                
                {/* Description */}
                <motion.p
                  key={selectedType}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-white/70 text-sm mt-3 mb-4"
                >
                  <span className="font-semibold text-white">{selectedInfo.name}</span>
                  {" — "}
                  {selectedInfo.description}
                </motion.p>
              </div>

              {/* Power-up Selector Buttons */}
              <div className="px-4 pb-4">
                <div className="flex justify-center gap-3">
                  {POWER_UP_INFO.map((info) => {
                    const isSelected = selectedType === info.type;
                    const count = isLoading ? 0 : powerUps[info.type];
                    
                    return (
                      <motion.button
                        key={info.type}
                        onClick={() => handleSelectPowerUp(info.type)}
                        whileTap={{ scale: 0.95 }}
                        className={`relative p-2 rounded-2xl transition-all ${
                          isSelected
                            ? "bg-white/15 ring-2 ring-white/30"
                            : "bg-white/5 hover:bg-white/10"
                        }`}
                      >
                        <PowerUpBadge
                          type={info.type === "5050" ? "fifty-fifty" : info.type}
                          size="md"
                          count={count}
                          disabled={count === 0}
                        />
                        
                        {/* Selection indicator */}
                        {isSelected && (
                          <motion.div
                            layoutId="selector"
                            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white"
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
