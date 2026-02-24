import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

// Import custom 3D icons
import giftBottleIcon from "@/assets/icons/icon-gem.png";
import missionCrystalIcon from "@/assets/icons/icon-compass.png";
import chestBoxIcon from "@/assets/icons/icon-chest-box.png";

interface AdventureQuickActionsProps {
  onGiftsClick: () => void;
  onMissionsClick: () => void;
  onChestClick: () => void;
  onHelpClick: () => void;
}

interface ActionButtonProps {
  icon: string;
  label: string;
  onClick: () => void;
  index: number;
  badge?: number;
}

function ActionButton({ icon, label, onClick, index, badge }: ActionButtonProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + index * 0.1 }}
      onClick={onClick}
      className="flex flex-col items-center gap-2"
    >
      <div 
        className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.05)",
        }}
      >
        <img src={icon} alt={label} className="w-12 h-12 object-contain" />
        
        {/* Badge */}
        {badge !== undefined && badge > 0 && (
          <div 
            className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              boxShadow: "0 2px 0 #b91c1c",
            }}
          >
            {badge}
          </div>
        )}
      </div>
      
      <span 
        className="text-xs font-semibold"
        style={{
          color: "#374151",
          textShadow: "0 1px 2px rgba(255,255,255,0.8)",
        }}
      >
        {label}
      </span>
    </motion.button>
  );
}

export function AdventureQuickActions({ 
  onGiftsClick, 
  onMissionsClick, 
  onChestClick,
  onHelpClick,
}: AdventureQuickActionsProps) {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="flex flex-col items-center gap-4"
    >
      {/* Action Buttons Row - 3 white buttons + Help */}
      <div className="flex items-center justify-center gap-4 px-4">
        <ActionButton
          icon={giftBottleIcon}
          label={t("extra.giftLabel")}
          onClick={onGiftsClick}
          index={0}
          badge={1}
        />
        
        <ActionButton
          icon={missionCrystalIcon}
          label={t("extra.missionLabel")}
          onClick={onMissionsClick}
          index={1}
          badge={3}
        />
        
        <ActionButton
          icon={chestBoxIcon}
          label={t("extra.chestLabel")}
          onClick={onChestClick}
          index={2}
        />

        {/* Help Button - 4th item in row */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onClick={onHelpClick}
          className="flex flex-col items-center gap-2"
        >
          <div 
            className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(10px)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.05)",
            }}
          >
            <HelpCircle className="w-8 h-8" style={{ color: "#7C3AED" }} />
          </div>
          <span 
            className="text-xs font-semibold"
            style={{
              color: "#374151",
              textShadow: "0 1px 2px rgba(255,255,255,0.8)",
            }}
          >
            {t("extra.helpLabel")}
          </span>
        </motion.button>
      </div>
    </motion.div>
  );
}
