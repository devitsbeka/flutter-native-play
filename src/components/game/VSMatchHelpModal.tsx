import { motion } from "framer-motion";
import { GameModal, GameModalFooter } from "@/components/ui/game-modal";
import { Trophy, Zap, Coins, Target, Timer } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface VSMatchHelpModalProps {
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

const HelpItem = ({ icon, title, description, gradient, index }: HelpItemProps) => (
  <motion.div
    className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50"
    style={{ boxShadow: "0 2px 0 #E5E7EB" }}
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.1 }}
  >
    <div 
      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
      style={{ background: gradient }}
    >
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="font-bold text-gray-900 text-sm">{title}</h4>
      <p className="text-gray-600 text-xs mt-0.5 leading-relaxed">{description}</p>
    </div>
  </motion.div>
);

export function VSMatchHelpModal({ isOpen, onClose }: VSMatchHelpModalProps) {
  const { t } = useLanguage();

  const helpItems = [
    {
      icon: <Target className="w-5 h-5 text-white" />,
      title: t("game.whatIsQuickMatch"),
      description: t("game.quickMatchDescription"),
      gradient: "linear-gradient(135deg, #6366F1, #8B5CF6)",
    },
    {
      icon: <Timer className="w-5 h-5 text-white" />,
      title: t("game.howToWin"),
      description: t("game.howToWinDescription"),
      gradient: "linear-gradient(135deg, #F59E0B, #EF4444)",
    },
    {
      icon: <Trophy className="w-5 h-5 text-white" />,
      title: t("game.xpPoints"),
      description: t("game.xpPointsDescription"),
      gradient: "linear-gradient(135deg, #10B981, #059669)",
    },
    {
      icon: <Coins className="w-5 h-5 text-white" />,
      title: t("game.coinsReward"),
      description: t("game.coinsRewardDescription"),
      gradient: "linear-gradient(135deg, #F2C860, #F59E0B)",
    },
    {
      icon: <Zap className="w-5 h-5 text-white" />,
      title: t("game.powerUpsHelp"),
      description: t("game.powerUpsHelpDescription"),
      gradient: "linear-gradient(135deg, #EC4899, #8B5CF6)",
    },
  ];

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("game.quickMatch")}
      iconEmoji="⚔️"
      showSparkles={false}
    >
      <div className="space-y-1.5 mb-2">
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
      
      <GameModalFooter
        primaryLabel={t("common.gotIt")}
        onPrimary={onClose}
      />
    </GameModal>
  );
}
