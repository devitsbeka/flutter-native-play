import { motion } from "framer-motion";
import { Coins } from "lucide-react";

import iconFireDeals from "@/assets/icons/icon-fire-deals.png";
import iconPowersBottle from "@/assets/icons/icon-powers-bottle.png";
import iconFramesLantern from "@/assets/icons/icon-frames-lantern.png";
import iconVipCrown from "@/assets/icons/icon-vip-crown.png";

export type ShopTab = "hot" | "powers" | "coins" | "vip" | "frames";

interface Tab {
  id: ShopTab;
  label: string;
  icon: React.ReactNode;
  gradient: string;
}

const TABS: Tab[] = [
  {
    id: "hot",
    label: "🔥 ფასდაკლება",
    icon: <img src={iconFireDeals} alt="" className="w-5 h-5 object-contain" />,
    gradient: "linear-gradient(135deg, hsl(25 95% 55%) 0%, hsl(350 80% 55%) 100%)",
  },
  {
    id: "powers",
    label: "ძალები",
    icon: <img src={iconPowersBottle} alt="" className="w-5 h-5 object-contain" />,
    gradient: "linear-gradient(135deg, hsl(263 60% 55%) 0%, hsl(280 70% 50%) 100%)",
  },
  {
    id: "frames",
    label: "ჩარჩოები",
    icon: <img src={iconFramesLantern} alt="" className="w-5 h-5 object-contain" />,
    gradient: "linear-gradient(135deg, hsl(280 70% 55%) 0%, hsl(320 75% 50%) 100%)",
  },
  {
    id: "coins",
    label: "მონეტები",
    icon: <Coins className="w-4 h-4" />,
    gradient: "linear-gradient(135deg, hsl(45 90% 55%) 0%, hsl(35 85% 50%) 100%)",
  },
  {
    id: "vip",
    label: "VIP",
    icon: <img src={iconVipCrown} alt="" className="w-5 h-5 object-contain" />,
    gradient: "linear-gradient(135deg, hsl(45 90% 55%) 0%, hsl(340 80% 55%) 100%)",
  },
];

interface ShopTabBarProps {
  activeTab: ShopTab;
  onTabChange: (tab: ShopTab) => void;
}

export function ShopTabBar({ activeTab, onTabChange }: ShopTabBarProps) {
  return (
    <div className="px-4 mb-4">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide py-3">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <motion.button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex items-center gap-1.5 px-4 py-2.5 rounded-full flex-shrink-0 font-semibold text-sm transition-all"
              style={{
                background: isActive
                  ? tab.gradient
                  : "hsl(var(--muted))",
                color: isActive ? "white" : "hsl(var(--muted-foreground))",
                boxShadow: isActive
                  ? "0 4px 0 hsl(0 0% 0% / 0.15), inset 0 1px 0 hsl(0 0% 100% / 0.2)"
                  : "0 2px 0 hsl(var(--border))",
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {tab.icon}
              <span>{tab.label}</span>

              {/* Glow effect for active tab */}
              {isActive && (
                <motion.div
                  layoutId="tabGlow"
                  className="absolute inset-0 rounded-full -z-10"
                  style={{
                    background: tab.gradient,
                    filter: "blur(12px)",
                    opacity: 0.5,
                  }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
