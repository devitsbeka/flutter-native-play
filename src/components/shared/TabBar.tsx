import { motion } from "framer-motion";

interface Tab {
  id: string;
  label: string;
  icon?: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="flex gap-1 p-1.5 rounded-2xl bg-white/60 backdrop-blur-sm overflow-x-auto scrollbar-hide">
      {tabs.map((tab) => (
        <motion.button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className="flex-1 relative min-w-fit"
          whileTap={{ scale: 0.95 }}
        >
          {activeTab === tab.id ? (
            // 3D Chunky Active State
            <div className="relative">
              {/* 3D depth shadow */}
              <div 
                className="absolute inset-0 rounded-xl bg-primary/80"
                style={{ top: 3 }}
              />
              {/* Main face */}
              <div className="relative px-4 py-2.5 rounded-xl text-sm font-bold text-primary-foreground bg-primary shadow-md flex items-center justify-center gap-1.5 whitespace-nowrap">
                {tab.icon && <span>{tab.icon}</span>}
                {tab.label}
              </div>
            </div>
          ) : (
            // Inactive state
            <div className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-white/80 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap">
              {tab.icon && <span>{tab.icon}</span>}
              {tab.label}
            </div>
          )}
        </motion.button>
      ))}
    </div>
  );
}
