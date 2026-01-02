import { motion } from "framer-motion";
import { PowerUpType } from "@/hooks/useUserPowerUps";
import power5050 from "@/assets/powers/5050.png";
import powerFreeze from "@/assets/powers/freeze.png";
import powerReplace from "@/assets/powers/replace.png";
import powerTimeDrain from "@/assets/powers/time-drain.png";

interface PowerUpDemoPreviewProps {
  type: PowerUpType;
  animationKey: number;
}

const POWER_UP_IMAGES: Record<PowerUpType, string> = {
  "5050": power5050,
  "freeze": powerFreeze,
  "replace": powerReplace,
  "time-drain": powerTimeDrain,
};

const POWER_UP_DESCRIPTIONS: Record<PowerUpType, string> = {
  "5050": "წაშლის 2 არასწორ პასუხს",
  "freeze": "ყინავს მოწინააღმდეგეს 5 წამით",
  "replace": "ცვლის კითხვას ახლით",
  "time-drain": "დაამატებს 3 წამს",
};

export function PowerUpDemoPreview({ type, animationKey }: PowerUpDemoPreviewProps) {
  return (
    <motion.div
      key={animationKey}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-2 gap-2"
    >
      <motion.img 
        src={POWER_UP_IMAGES[type]} 
        alt={type}
        className="w-16 h-16 object-contain drop-shadow-lg"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      <p className="text-sm text-muted-foreground text-center font-medium">
        {POWER_UP_DESCRIPTIONS[type]}
      </p>
    </motion.div>
  );
}
