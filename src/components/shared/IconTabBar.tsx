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
            className="relative flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all"
            style={{
              background: isActive 
                ? "linear-gradient(180deg, #A78BFA 0%, #8B5CF6 100%)"
                : "linear-gradient(180deg, #FFFFFF 0%, #FAFAFA 100%)",
              boxShadow: isActive
                ? "0 4px 0 #6D28D9, 0 6px 16px rgba(139, 92, 246, 0.35), inset 0 2px 0 rgba(255,255,255,0.3)"
                : "0 3px 0 #E5E0EE, 0 4px 12px rgba(0,0,0,0.08), inset 0 2px 0 rgba(255,255,255,1)",
              border: isActive ? "2px solid #A78BFA" : "2px solid #EDE9F5",
              minWidth: 64,
            }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95, y: 2 }}
          >
            {/* Icon */}
            <div className="relative w-9 h-9 flex items-center justify-center">
              <img 
                src={iconSrc} 
                alt={tab.label}
                className="w-8 h-8 object-contain"
                style={{
                  filter: isActive ? "brightness(1.1)" : "none",
                }}
              />
            </div>
            
            {/* Label */}
            <span 
              className="text-[10px] font-semibold leading-tight text-center whitespace-nowrap"
              style={{
                color: isActive ? "#FFFFFF" : "#64748B",
                textShadow: isActive ? "0 1px 2px rgba(0,0,0,0.2)" : "none",
              }}
            >
              {tab.label}
            </span>
            
            {/* Active indicator glow */}
            {isActive && (
              <motion.div
                layoutId="activeTabGlow"
                className="absolute inset-0 rounded-2xl"
                style={{
                  background: "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.3) 0%, transparent 60%)",
                  pointerEvents: "none",
                }}
                initial={false}
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
