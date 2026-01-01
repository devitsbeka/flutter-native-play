import { motion } from "framer-motion";
import { Gift, Target, Package } from "lucide-react";

interface AdventureQuickActionsProps {
  onGiftsClick: () => void;
  onMissionsClick: () => void;
  onChestClick: () => void;
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
        className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
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
      
      <span className="text-white/80 text-xs font-medium">
        {label}
      </span>
    </motion.button>
  );
}

export function AdventureQuickActions({ 
  onGiftsClick, 
  onMissionsClick, 
  onChestClick 
}: AdventureQuickActionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="flex items-center justify-center gap-8 px-6"
    >
      <ActionButton
        icon={<Gift className="w-7 h-7 text-white" />}
        label="საჩუქრები"
        onClick={onGiftsClick}
        gradient="linear-gradient(135deg, #f472b6, #ec4899)"
        shadowColor="#be185d"
        index={0}
        badge={1}
      />
      
      <ActionButton
        icon={<Target className="w-7 h-7 text-white" />}
        label="მისიები"
        onClick={onMissionsClick}
        gradient="linear-gradient(135deg, #60a5fa, #3b82f6)"
        shadowColor="#1d4ed8"
        index={1}
        badge={3}
      />
      
      <ActionButton
        icon={<Package className="w-7 h-7 text-white" />}
        label="ხაზინა"
        onClick={onChestClick}
        gradient="linear-gradient(135deg, #fbbf24, #f59e0b)"
        shadowColor="#b45309"
        index={2}
      />
    </motion.div>
  );
}
