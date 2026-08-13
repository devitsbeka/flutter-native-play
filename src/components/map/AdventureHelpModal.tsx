import { ICON_URLS } from "@/lib/toast-icons";
import { motion } from "framer-motion";
import { GameModal } from "@/components/ui/game-modal";
import giftBottleIcon from "@/assets/icons/icon-gem.png";
import missionCrystalIcon from "@/assets/icons/icon-compass.png";
import chestBoxIcon from "@/assets/icons/icon-chest-box.png";
import xpIcon from "@/assets/level/xp-spark.png";
import powersIcon from "@/assets/icons/icon-powers-3d.png";
import { useLanguage } from "@/contexts/LanguageContext";

interface AdventureHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HelpItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
  index: number;
}

function HelpItem({ icon, title, description, gradient, index }: HelpItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 + index * 0.08 }}
      className="flex gap-3 p-2.5 rounded-xl"
      style={{ 
        background: "#F9FAFB",
        boxShadow: "0 2px 0 #E5E7EB, inset 0 1px 2px rgba(255,255,255,0.8)",
      }}
    >
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: gradient }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-gray-800 text-sm leading-tight">{title}</h4>
        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{description}</p>
      </div>
    </motion.div>
  );
}

export function AdventureHelpModal({ isOpen, onClose }: AdventureHelpModalProps) {
  const { t } = useLanguage();

  const helpItems = [
    {
      icon: <img src={giftBottleIcon} alt="" className="w-6 h-6 object-contain" />,
      title: t("extra.adventureGift"),
      description: t("extra.adventureGiftDesc"),
      gradient: "linear-gradient(135deg, #f472b6, #ec4899)",
    },
    {
      icon: <img src={missionCrystalIcon} alt="" className="w-6 h-6 object-contain" />,
      title: t("extra.adventureMission"),
      description: t("extra.adventureMissionDesc"),
      gradient: "linear-gradient(135deg, #60a5fa, #3b82f6)",
    },
    {
      icon: <img src={chestBoxIcon} alt="" className="w-6 h-6 object-contain" />,
      title: t("extra.adventureChest"),
      description: t("extra.adventureChestDesc"),
      gradient: "linear-gradient(135deg, #fbbf24, #f59e0b)",
    },
    {
      icon: <img src={xpIcon} alt="" className="w-6 h-6 object-contain" />,
      title: t("extra.adventureXP"),
      description: t("extra.adventureXPDesc"),
      gradient: "linear-gradient(135deg, #a855f7, #7c3aed)",
    },
    {
      icon: <img src={powersIcon} alt="" className="w-6 h-6 object-contain" />,
      title: t("extra.adventurePowers"),
      description: t("extra.adventurePowersDesc"),
      gradient: "linear-gradient(135deg, #22c55e, #16a34a)",
    },
  ];

  return (
    <GameModal 
      isOpen={isOpen} 
      onClose={onClose}
      iconSrc={ICON_URLS.questionMark}
      title={t("extra.adventureHelp")}
      subtitle={t("extra.adventureHelpSubtitle")}
      primaryLabel={t("extra.adventureGotIt")}
      onPrimaryClick={onClose}
    >
      <div className="space-y-1.5">
        {helpItems.map((item, index) => (
          <HelpItem
            key={index}
            icon={item.icon}
            title={item.title}
            description={item.description}
            gradient={item.gradient}
            index={index}
          />
        ))}
      </div>
    </GameModal>
  );
}
