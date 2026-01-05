import { motion } from "framer-motion";
import { GameModal, GameModalFooter } from "@/components/ui/game-modal";
import { useLanguage } from "@/contexts/LanguageContext";

// 3D icons
import iconParty from "@/assets/icons/icon-party.png";
import iconCompass from "@/assets/icons/icon-compass.png";
import iconOtherGames from "@/assets/icons/icon-other-games.png";
import iconTrophy from "@/assets/icons/icon-trophy-3d.png";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function HelpItem({ 
  icon, 
  title, 
  description,
  index 
}: { 
  icon: string; 
  title: string; 
  description: string;
  index: number;
}) {
  return (
    <motion.div 
      className="flex gap-3 p-3 rounded-xl"
      style={{
        background: "#F9FAFB",
        boxShadow: "0 2px 0 #E5E7EB, inset 0 1px 2px rgba(255,255,255,0.8)",
      }}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: "linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)",
          boxShadow: "0 2px 0 #C4B5FD",
        }}
      >
        <img src={icon} alt={title} className="w-6 h-6 object-contain" />
      </div>
      <div>
        <h3 className="font-semibold text-gray-800 mb-0.5">{title}</h3>
        <p className="text-gray-500 text-sm leading-snug">{description}</p>
      </div>
    </motion.div>
  );
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const { t } = useLanguage();

  const helpItems = [
    {
      icon: iconOtherGames,
      title: t("help.createGame"),
      description: t("help.createGameDesc"),
    },
    {
      icon: iconCompass,
      title: t("help.shareCode"),
      description: t("help.shareCodeDesc"),
    },
    {
      icon: iconParty,
      title: t("help.playWithFriends"),
      description: t("help.playWithFriendsDesc"),
    },
    {
      icon: iconTrophy,
      title: t("help.winning"),
      description: t("help.winningDesc"),
    },
  ];

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("help.howItWorks")}
      iconEmoji="❓"
      showSparkles={false}
    >
      {/* Content */}
      <div className="space-y-3 mb-4">
        {helpItems.map((item, index) => (
          <HelpItem
            key={item.title}
            icon={item.icon}
            title={item.title}
            description={item.description}
            index={index}
          />
        ))}
      </div>

      <GameModalFooter
        primaryLabel={t("common.gotIt")}
        onPrimary={onClose}
        primaryVariant="success"
      />
    </GameModal>
  );
}