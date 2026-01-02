import { GameModal } from "@/components/ui/game-modal";
import { PowerUpBadge, PowerUpType } from "@/components/game/PowerUpBadge";

interface PowerUpTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  powerUpType: PowerUpType | null;
}

const POWER_UP_INFO: Record<PowerUpType, { name: string; description: string }> = {
  "fifty-fifty": {
    name: "50/50",
    description: "ორი არასწორი პასუხი გაქრება და დარჩება მხოლოდ ერთი არასწორი და სწორი პასუხი. ეს გაგიადვილებს არჩევანს!",
  },
  "freeze": {
    name: "გაყინვა",
    description: "დრო გაიყინება 10 წამით. შეგიძლია მშვიდად დაფიქრდე კითხვაზე დროის დაკარგვის გარეშე!",
  },
  "replace": {
    name: "ჩანაცვლება",
    description: "მიმდინარე კითხვა შეიცვლება ახალით. გამოიყენე როცა კითხვა ძალიან რთულია!",
  },
  "time-drain": {
    name: "დრო+",
    description: "დაემატება 15 დამატებითი წამი დროს. გამოიყენე როცა დრო იწურება!",
  },
};

export function PowerUpTutorialModal({ isOpen, onClose, powerUpType }: PowerUpTutorialModalProps) {
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
