import { useState } from "react";
import { motion } from "framer-motion";
import { GameModal } from "@/components/ui/game-modal";
import { PowerUpBadge, PowerUpType as BadgePowerUpType } from "@/components/game/PowerUpBadge";
import { useUserPowerUps, PowerUpType as HookPowerUpType } from "@/hooks/useUserPowerUps";
import { PowerUpShopModal } from "@/components/map/PowerUpShopModal";
import { GemShopModal } from "@/components/home/GemShopModal";
import { PowerUpTutorialModal } from "@/components/home/PowerUpTutorialModal";
import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";
import powerBottleIcon from "@/assets/icons/icon-power-bottle.png";

interface MyPowersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Map from hook types to badge types
const POWER_UP_ORDER: { hookType: HookPowerUpType; badgeType: BadgePowerUpType; name: string }[] = [
  { hookType: "5050", badgeType: "fifty-fifty", name: "50/50" },
  { hookType: "freeze", badgeType: "freeze", name: "გაყინვა" },
  { hookType: "replace", badgeType: "replace", name: "ჩანაცვლება" },
  { hookType: "time-drain", badgeType: "time-drain", name: "დრო+" },
];

export function MyPowersModal({ isOpen, onClose }: MyPowersModalProps) {
  const { powerUps, isLoading } = useUserPowerUps();
  const [showCoinShop, setShowCoinShop] = useState(false);
  const [showGemShop, setShowGemShop] = useState(false);
  const [selectedPowerUp, setSelectedPowerUp] = useState<BadgePowerUpType | null>(null);

  const handleBuyWithCoins = () => {
    onClose();
    setTimeout(() => setShowCoinShop(true), 100);
  };

  const handleBuyWithGems = () => {
    onClose();
    setTimeout(() => setShowGemShop(true), 100);
  };

  return (
    <>
      <GameModal
        isOpen={isOpen}
        onClose={onClose}
        title="ჩემი ძალები"
        icon={<img src={powerBottleIcon} alt="" className="w-20 h-20 object-contain" />}
        variant="info"
      >
        <div className="space-y-6">
          {/* Power-ups grid */}
          <div className="grid grid-cols-4 gap-3 p-2 overflow-visible">
            {POWER_UP_ORDER.map((powerUp) => (
              <motion.div
                key={powerUp.hookType}
                className="flex flex-col items-center gap-2"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div 
                  onClick={() => setSelectedPowerUp(powerUp.badgeType)}
                  className="cursor-pointer"
                >
                  <PowerUpBadge
                    type={powerUp.badgeType}
                    size="md"
                    count={powerUps[powerUp.hookType] || 0}
                    disabled={isLoading}
                  />
                </div>
                <span className="text-xs font-medium text-gray-600 text-center">
                  {powerUp.name}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-200" />

          {/* Buy buttons */}
          <div className="space-y-3">
            <motion.button
              onClick={handleBuyWithCoins}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl"
              style={{
                background: "linear-gradient(180deg, #FDE047 0%, #FACC15 50%, #EAB308 100%)",
                boxShadow: "0 4px 0 #CA8A04, 0 6px 12px rgba(234,179,8,0.25)",
              }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98, y: 0 }}
            >
              <img src={coinIcon} alt="" className="w-6 h-6" />
              <span className="font-bold text-amber-900">
                ყიდვა მონეტებით
              </span>
            </motion.button>

            <motion.button
              onClick={handleBuyWithGems}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl"
              style={{
                background: "linear-gradient(180deg, #A78BFA 0%, #8B5CF6 50%, #7C3AED 100%)",
                boxShadow: "0 4px 0 #6D28D9, 0 6px 12px rgba(139,92,246,0.25)",
              }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98, y: 0 }}
            >
              <img src={gemIcon} alt="" className="w-6 h-6" />
              <span className="font-bold text-white drop-shadow-sm">
                ყიდვა ალმასებით
              </span>
            </motion.button>
          </div>
        </div>
      </GameModal>

      {/* Coin Shop Modal */}
      <PowerUpShopModal
        isOpen={showCoinShop}
        onClose={() => setShowCoinShop(false)}
      />

      {/* Gem Shop Modal */}
      <GemShopModal
        isOpen={showGemShop}
        onClose={() => setShowGemShop(false)}
        defaultCategory="powerup"
      />

      {/* Power-up Tutorial Modal */}
      <PowerUpTutorialModal
        isOpen={!!selectedPowerUp}
        onClose={() => setSelectedPowerUp(null)}
        powerUpType={selectedPowerUp}
      />
    </>
  );
}
