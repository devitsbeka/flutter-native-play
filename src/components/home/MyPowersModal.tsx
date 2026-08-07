import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { GameModal } from "@/components/ui/game-modal";
import { PowerUpBadge, PowerUpType as BadgePowerUpType } from "@/components/game/PowerUpBadge";
import { useUserPowerUps, PowerUpType as HookPowerUpType } from "@/hooks/useUserPowerUps";
import powerBottleIcon from "@/assets/icons/icon-power-bottle.png";
import { useLanguage } from "@/contexts/LanguageContext";

interface MyPowersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MyPowersModal({ isOpen, onClose }: MyPowersModalProps) {
  const navigate = useNavigate();
  const { powerUps, isLoading } = useUserPowerUps();
  const { t } = useLanguage();

  // Map from hook types to badge types
  const POWER_UP_ORDER: { hookType: HookPowerUpType; badgeType: BadgePowerUpType; nameKey: string }[] = [
    { hookType: "5050", badgeType: "fifty-fifty", nameKey: "powerups.fiftyFifty.name" },
    { hookType: "freeze", badgeType: "freeze", nameKey: "powerups.freeze.name" },
    { hookType: "replace", badgeType: "replace", nameKey: "powerups.replace.name" },
    { hookType: "time-drain", badgeType: "time-drain", nameKey: "powerups.timeDrain.name" },
  ];

  const handleGoToShop = () => {
    onClose();
    setTimeout(() => navigate("/power-ups?section=powers"), 100);
  };

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      fullScreen={false}
      title={t("modals.myPowers")}
      icon={<img src={powerBottleIcon} alt="" className="w-20 h-20 object-contain" />}
      variant="info"
    >
      <div className="space-y-6">
        {/* Power-ups grid */}
        <div className="grid grid-cols-4 gap-3 p-2 overflow-visible">
          {isLoading ? (
            // Loading skeletons
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-[69px] h-[69px] rounded-full bg-muted animate-pulse" />
                <div className="w-12 h-3 rounded bg-muted animate-pulse" />
              </div>
            ))
          ) : (
            POWER_UP_ORDER.map((powerUp) => (
              <motion.div
                key={powerUp.hookType}
                className="flex flex-col items-center gap-2"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <PowerUpBadge
                  type={powerUp.badgeType}
                  size="md"
                  count={powerUps[powerUp.hookType] || 0}
                  disabled={false}
                />
                <span className="text-xs font-medium text-muted-foreground text-center">
                  {t(powerUp.nameKey)}
                </span>
              </motion.div>
            ))
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-200" />

        {/* Single shop button */}
        <motion.button
          onClick={handleGoToShop}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl"
          style={{
            background: "linear-gradient(180deg, #10B981 0%, #059669 100%)",
            boxShadow: "0 4px 0 #047857, 0 6px 12px rgba(16, 185, 129, 0.25)",
          }}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98, y: 0 }}
        >
          <ShoppingBag className="w-5 h-5 text-white" />
          <span className="font-bold text-white">
            {t("modals.goToShop")}
          </span>
        </motion.button>
      </div>
    </GameModal>
  );
}