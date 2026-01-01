import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { PowerUpBadge } from "@/components/game/PowerUpBadge";
import { PowerUpDemoPreview } from "./PowerUpDemoPreview";
import { useUserPowerUps, PowerUpType } from "@/hooks/useUserPowerUps";
import { ChunkyButton } from "@/components/ui/chunky-button";

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
        <>
          {/* Backdrop - semi-transparent to show map behind */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 bottom-24 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:max-w-md z-50"
          >
            <div 
              className="rounded-3xl overflow-hidden"
              style={{
                background: "#7E7BDC",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
              }}
            >
              {/* Header */}
              <div className="relative px-6 pt-5 pb-3">
                <motion.button
                  onClick={onClose}
                  className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-gray-900/80 flex items-center justify-center hover:bg-gray-900 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X className="w-4 h-4 text-white" />
                </motion.button>

                <div className="text-center">
                  <h2 className="text-xl font-display text-white">
                    ⚡ ძალები
                  </h2>
                  <p className="text-white/60 text-sm">
                    შენი სუპერ ძალები
                  </p>
                </div>
              </div>

              {/* Demo Preview Area */}
              <div className="px-4">
                <div className="rounded-2xl overflow-hidden">
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
                <div className="flex justify-center gap-3 mb-4">
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
                            ? "bg-white/25 ring-2 ring-white/40"
                            : "bg-white/10 hover:bg-white/15"
                        }`}
                      >
                        <PowerUpBadge
                          type={info.type === "5050" ? "fifty-fifty" : info.type}
                          size="sm"
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

                <ChunkyButton
                  variant="success"
                  size="md"
                  className="w-full"
                  onClick={onClose}
                >
                  დახურვა
                </ChunkyButton>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
