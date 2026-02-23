import { motion } from "framer-motion";
import { PowerUpType } from "@/hooks/useUserPowerUps";
import { useLanguage } from "@/contexts/LanguageContext";
import power5050 from "@/assets/powers/5050.png";
import powerFreeze from "@/assets/powers/freeze.png";
import powerReplace from "@/assets/powers/replace.png";
import timeDrainIcon from "@/assets/powers/time-drain.png";

interface PowerUpDemoPreviewProps {
  type: PowerUpType;
  animationKey: number;
}

const POWER_UP_IMAGES: Record<PowerUpType, string> = {
  "5050": power5050,
  "freeze": powerFreeze,
  "replace": powerReplace,
  "time-drain": timeDrainIcon,
};

const POWER_UP_DESC_KEYS: Record<PowerUpType, string> = {
  "5050": "extra.demoDesc5050",
  "freeze": "extra.demoDescFreeze",
  "replace": "extra.demoDescReplace",
  "time-drain": "extra.demoDescTimeDrain",
};

export function PowerUpDemoPreview({ type, animationKey }: PowerUpDemoPreviewProps) {
  const { t } = useLanguage();
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
        {t(POWER_UP_DESC_KEYS[type])}
      </p>
    </motion.div>
  );
}
