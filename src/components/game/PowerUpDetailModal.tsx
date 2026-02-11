import { motion } from "framer-motion";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/contexts/LanguageContext";
import { GameModal } from "@/components/ui/game-modal";
import { TimeIcon } from "@/components/shared/TimeIcon";

// Power-up badge assets (new hexagonal style)
import fiftyFiftyBadge from "@/assets/powers/5050-badge.png";
import freezeBadge from "@/assets/powers/freeze-badge.png";
import replaceBadge from "@/assets/powers/replace-badge.png";
import addPowerImg from "@/assets/powers/add-power.png";

export type PowerUpType = "fifty-fifty" | "freeze" | "replace" | "time-drain" | "add-power";

interface PowerUpDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: PowerUpType;
  onAddClick?: () => void;
}

const powerUpAssets: Record<Exclude<PowerUpType, "time-drain">, string> = {
  "fifty-fifty": fiftyFiftyBadge,
  "freeze": freezeBadge,
  "replace": replaceBadge,
  "add-power": addPowerImg,
};

// Title gradients only (for colored title text)
const powerUpTitleGradients: Record<PowerUpType, { from: string; to: string }> = {
  "fifty-fifty": { from: "#E85C3A", to: "#FFB347" },
  "freeze": { from: "#1C8CA8", to: "#95EBE9" },
  "replace": { from: "#1CA88C", to: "#95EBD4" },
  "time-drain": { from: "#7B4BBF", to: "#C9A8E9" },
  "add-power": { from: "#5BA81C", to: "#B5EB95" },
};

const powerUpTranslationKeys: Record<PowerUpType, string> = {
  "fifty-fifty": "fiftyFifty",
  "freeze": "freeze",
  "replace": "replace",
  "time-drain": "timeDrain",
  "add-power": "addPower",
};


export function PowerUpDetailModal({ isOpen, onClose, type, onAddClick }: PowerUpDetailModalProps) {
  const { t: tl } = useLanguage();
  const isTimeDrain = type === "time-drain";
  const imageSrc = isTimeDrain ? undefined : powerUpAssets[type as Exclude<PowerUpType, "time-drain">];
  const titleGradient = powerUpTitleGradients[type];
  const translationKey = powerUpTranslationKeys[type];
  
  // Clean centered icon - just the badge
  const customIcon = (
    <motion.div
      className="relative flex items-center justify-center"
      initial={{ scale: 0.5 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
    >
      {isTimeDrain ? (
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <TimeIcon size={96} />
        </motion.div>
      ) : (
        <motion.img
          src={imageSrc}
          alt={type}
          className="w-24 h-24 object-contain"
          style={{
            filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.25))",
          }}
          animate={{
            y: [0, -5, 0],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </motion.div>
  );
  
  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      icon={customIcon}
      title={
        <span
          style={{
            background: `linear-gradient(135deg, ${titleGradient.from} 0%, ${titleGradient.to} 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {t(`powerups.${translationKey}.name`)}
        </span>
      }
      subtitle={t(`powerups.${translationKey}.description`)}
      primaryLabel={tl("powerUpDetail.add")}
      onPrimaryClick={() => {
        onClose();
        onAddClick?.();
      }}
      secondaryLabel={tl("powerUpDetail.close")}
      onSecondaryClick={onClose}
      variant="primary"
    >
      {/* Hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="w-full px-4 py-3 rounded-2xl bg-cyan-50 border-2 border-cyan-200"
      >
        <p className="text-center text-sm text-cyan-700">
          💡 {t(`powerups.${translationKey}.hint`)}
        </p>
      </motion.div>
    </GameModal>
  );
}
