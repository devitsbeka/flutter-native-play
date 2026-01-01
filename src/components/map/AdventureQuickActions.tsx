import { motion } from "framer-motion";
import { Gift, Target, Package, Star } from "lucide-react";

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
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  gradient: string;
  shadowColor: string;
  index: number;
  badge?: number;
}

function ActionButton({ icon, label, onClick, gradient, shadowColor, index, badge }: ActionButtonProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + index * 0.1 }}
      onClick={onClick}
      className="flex flex-col items-center gap-2"
    >
      <div 
        className="relative w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{
          background: gradient,
          boxShadow: `0 4px 0 ${shadowColor}`,
        }}
      >
        {icon}
        
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
  onXPClick,
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
      {/* Action Buttons Row */}
      <div className="flex items-center justify-center gap-6 px-4">
        <ActionButton
          icon={<Gift className="w-6 h-6 text-white" />}
          label="საჩუქრები"
          onClick={onGiftsClick}
          gradient="linear-gradient(135deg, #f472b6, #ec4899)"
          shadowColor="#be185d"
          index={0}
          badge={1}
        />
        
        <ActionButton
          icon={<Target className="w-6 h-6 text-white" />}
          label="მისიები"
          onClick={onMissionsClick}
          gradient="linear-gradient(135deg, #60a5fa, #3b82f6)"
          shadowColor="#1d4ed8"
          index={1}
          badge={3}
        />
        
        <ActionButton
          icon={<Package className="w-6 h-6 text-white" />}
          label="ხაზინა"
          onClick={onChestClick}
          gradient="linear-gradient(135deg, #fbbf24, #f59e0b)"
          shadowColor="#b45309"
          index={2}
        />
        
        <ActionButton
          icon={<Star className="w-6 h-6 text-white" />}
          label={`${totalXP.toLocaleString()} XP`}
          onClick={onXPClick}
          gradient="linear-gradient(135deg, #a855f7, #7c3aed)"
          shadowColor="#6d28d9"
          index={3}
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
