import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { calculateLevel } from "@/utils/levelCalculation";

// Import custom 3D icons
import giftBottleIcon from "@/assets/icons/icon-gift-bottle.png";
import missionCrystalIcon from "@/assets/icons/icon-mission-crystal.png";
import chestBoxIcon from "@/assets/icons/icon-chest-box.png";

interface AdventureQuickActionsProps {
  onGiftsClick: () => void;
  onMissionsClick: () => void;
  onChestClick: () => void;
  onXPClick: () => void;
  onLevelClick: () => void;
  totalXP: number;
  level: number;
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
        <img src={icon} alt={label} className="w-10 h-10 object-contain" />
        
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
  onLevelClick,
  totalXP,
  level,
}: AdventureQuickActionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="flex flex-col items-center gap-4"
    >
      {/* Action Buttons Row - 3 white buttons */}
      <div className="flex items-center justify-center gap-6 px-4">
        <ActionButton
          icon={giftBottleIcon}
          label="საჩუქარი"
          onClick={onGiftsClick}
          index={0}
          badge={1}
        />
        
        <ActionButton
          icon={missionCrystalIcon}
          label="მისია"
          onClick={onMissionsClick}
          index={1}
          badge={3}
        />
        
        <ActionButton
          icon={chestBoxIcon}
          label="სკივრი"
          onClick={onChestClick}
          index={2}
        />
      </div>

      {/* Level Badge Below */}
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        onClick={onLevelClick}
        className="flex items-center gap-2 px-5 py-2 rounded-full"
        style={{
          background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
          boxShadow: "0 4px 0 #5b21b6",
        }}
      >
        <Star className="w-4 h-4 text-yellow-300" fill="#fde047" />
        <span className="text-white font-bold text-sm">Level {level}</span>
      </motion.button>
    </motion.div>
  );
}
