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
    <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        
        return (
          <motion.button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="relative flex-shrink-0 mb-1"
            whileTap={{ scale: 0.96 }}
          >
            {/* 3D depth layer - darker purple shadow */}
            <div 
              className="absolute inset-0 rounded-full"
              style={{
                background: isActive 
                  ? 'linear-gradient(180deg, #5B21B6 0%, #4C1D95 100%)' 
                  : 'rgba(0,0,0,0.12)',
                transform: 'translateY(4px)',
              }}
            />
            
            {/* Main tab surface */}
            <div 
              className="relative px-6 py-3 rounded-full border-2"
              style={{
                background: isActive 
                  ? 'linear-gradient(180deg, #A78BFA 0%, #8B5CF6 50%, #7C3AED 100%)'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.92) 100%)',
                borderColor: isActive 
                  ? 'rgba(255,255,255,0.4)' 
                  : 'rgba(255,255,255,0.7)',
                boxShadow: isActive
                  ? 'inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.15), 0 4px 12px rgba(124, 58, 237, 0.3)'
                  : 'inset 0 2px 4px rgba(255,255,255,0.8), inset 0 -1px 2px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              {/* Top shine highlight */}
              <div 
                className="absolute inset-x-3 top-1.5 h-1/3 rounded-full pointer-events-none"
                style={{
                  background: isActive 
                    ? 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, transparent 100%)'
                    : 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, transparent 100%)',
                }}
              />
              
              <span 
                className={`relative font-bold whitespace-nowrap flex items-center gap-1.5 ${
                  isActive ? 'text-white' : 'text-slate-600'
                }`}
                style={{
                  fontSize: '0.85rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  textShadow: isActive 
                    ? '0 1px 2px rgba(0,0,0,0.3)' 
                    : '0 1px 0 rgba(255,255,255,0.9)',
                }}
              >
                {tab.icon && <span>{tab.icon}</span>}
                {tab.label}
              </span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
