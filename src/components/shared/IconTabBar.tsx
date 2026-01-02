import { motion } from "framer-motion";

// Import tab icons
import allIcon from "@/assets/tabs/all.png";
import favIcon from "@/assets/tabs/fav.png";
import classicIcon from "@/assets/tabs/classic.png";
import funIcon from "@/assets/tabs/fun.png";
import eduIcon from "@/assets/tabs/edu.png";

interface IconTab {
  id: string;
  label: string;
  icon: string;
}

const iconMap: Record<string, string> = {
  all: allIcon,
  favorites: favIcon,
  classic: classicIcon,
  fun: funIcon,
  educational: eduIcon,
};

interface IconTabBarProps {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function IconTabBar({ tabs, activeTab, onTabChange }: IconTabBarProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-2">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const iconSrc = iconMap[tab.id];
        
        return (
          <motion.button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="relative flex flex-col items-center gap-1 px-2 py-1"
            whileHover={{ scale: 1.08, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Icon */}
            <div className="relative w-12 h-12 flex items-center justify-center">
              <img 
                src={iconSrc} 
                alt={tab.label}
                className="w-12 h-12 object-contain"
                style={{
                  filter: isActive ? "drop-shadow(0 4px 8px rgba(139, 92, 246, 0.4))" : "none",
                  transform: isActive ? "scale(1.1)" : "scale(1)",
                  transition: "all 0.2s ease",
                }}
              />
            </div>
            
            {/* Label */}
            <span 
              className="text-[11px] font-bold leading-tight text-center whitespace-nowrap"
              style={{
                color: isActive ? "#8B5CF6" : "#64748B",
                textShadow: isActive ? "0 0 8px rgba(139, 92, 246, 0.3)" : "none",
              }}
            >
              {tab.label}
            </span>
            
            {/* Active indicator dot */}
            {isActive && (
              <motion.div
                layoutId="activeTabDot"
                className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-violet-500"
                initial={false}
                transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
