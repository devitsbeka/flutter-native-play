import { GameModal } from "@/components/ui/game-modal";
import { PowerUpBadge, PowerUpType } from "@/components/game/PowerUpBadge";
import { useLanguage } from "@/contexts/LanguageContext";

interface PowerUpTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  powerUpType: PowerUpType | null;
}

function usePowerUpInfo() {
  const { t } = useLanguage();
  const info: Record<PowerUpType, { name: string; description: string }> = {
    "fifty-fifty": {
      name: t("extra.powerFiftyFifty"),
      description: t("extra.powerFiftyFiftyDesc"),
    },
    "freeze": {
      name: t("extra.powerFreeze"),
      description: t("extra.powerFreezeDesc"),
    },
    "replace": {
      name: t("extra.powerReplace"),
      description: t("extra.powerReplaceDesc"),
    },
    "time-drain": {
      name: t("extra.powerTimeDrain"),
      description: t("extra.powerTimeDrainDesc"),
    },
  };
  return info;
}

export function PowerUpTutorialModal({ isOpen, onClose, powerUpType }: PowerUpTutorialModalProps) {
  const POWER_UP_INFO = usePowerUpInfo();
  if (!powerUpType) return null;

  const info = POWER_UP_INFO[powerUpType];

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      title={info.name}
      variant="info"
    >
      <div className="flex flex-col items-center gap-6 py-4">
        <div className="p-4">
          <PowerUpBadge type={powerUpType} size="lg" />
        </div>
        
        <p className="text-center text-muted-foreground leading-relaxed px-2">
          {info.description}
        </p>
      </div>
    </GameModal>
  );
}
