import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

import fiftyFiftyIcon from "@/assets/powers/5050.png";
import freezeIcon from "@/assets/powers/freeze.png";
import replaceIcon from "@/assets/powers/replace.png";
import timeDrainIcon from "@/assets/powers/time-drain.png";

const POWER_UP_CARDS = [
  {
    icon: fiftyFiftyIcon,
    titleKey: "fiftyFifty",
    color: { from: "#E85C3A", to: "#FFB347" },
  },
  {
    icon: freezeIcon,
    titleKey: "freeze",
    color: { from: "#1C8CA8", to: "#95EBE9" },
  },
  {
    icon: replaceIcon,
    titleKey: "replace",
    color: { from: "#1CA88C", to: "#95EBD4" },
  },
  {
    icon: timeDrainIcon,
    titleKey: "timeDrain",
    color: { from: "#7B4BBF", to: "#C9A8E9" },
  },
];

interface PowerUpGuideCardProps {
  icon: string;
  titleKey: string;
  color: { from: string; to: string };
}

function PowerUpGuideCard({ icon, titleKey, color }: PowerUpGuideCardProps) {
  const { t } = useLanguage();

  return (
    <motion.div
      className="p-4 rounded-2xl"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        border: '1px solid rgba(0,0,0,0.05)',
      }}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <motion.img 
          src={icon} 
          alt="" 
          className="w-12 h-12 object-contain flex-shrink-0"
          whileHover={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 0.4 }}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4
            className="font-bold text-sm mb-1"
            style={{
              background: `linear-gradient(135deg, ${color.from}, ${color.to})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {t(`powerups.${titleKey}.name`)}
          </h4>
          <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
            {t(`powerups.${titleKey}.description`)}
          </p>
          <div className="px-2 py-1.5 rounded-lg bg-amber-50 border border-amber-100">
            <p className="text-xs text-amber-700">
              💡 {t(`powerups.${titleKey}.hint`)}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function ShopPowerUpGuide() {
  const { t } = useLanguage();
  return (
    <div 
      className="sticky top-4 p-5 rounded-3xl space-y-4"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.75) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 4px 24px -4px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.9)',
        border: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-amber-500" />
        <h3 className="font-bold text-slate-700">{t("extra.howToUsePowers")}</h3>
      </div>

      {/* Power-up cards */}
      {POWER_UP_CARDS.map((card, index) => (
        <motion.div
          key={card.titleKey}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <PowerUpGuideCard {...card} />
        </motion.div>
      ))}
    </div>
  );
}
