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
    <div 
      className="flex gap-2 p-2 rounded-[20px] overflow-x-auto scrollbar-hide border-2 border-white/50"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.5) 100%)',
        boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.6), 0 4px 12px rgba(0,0,0,0.06)',
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        
        return (
          <motion.button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="relative flex-shrink-0"
            whileTap={{ scale: 0.96 }}
          >
            {/* 3D depth layer */}
            <div 
              className="absolute inset-0 rounded-2xl transition-all duration-150"
              style={{
                background: isActive 
                  ? 'hsl(270 55% 45%)' 
                  : 'rgba(0,0,0,0.06)',
                transform: isActive ? 'translateY(3px)' : 'translateY(4px)',
              }}
            />
            
            {/* Main tab surface */}
            <div 
              className="relative px-5 py-2.5 rounded-2xl transition-all duration-150 border-2"
              style={{
                background: isActive 
                  ? 'linear-gradient(180deg, hsl(270 65% 60%) 0%, hsl(270 55% 50%) 100%)'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.9) 100%)',
                borderColor: isActive 
                  ? 'rgba(255,255,255,0.3)' 
                  : 'rgba(255,255,255,0.6)',
                boxShadow: isActive
                  ? 'inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.15)'
                  : 'inset 0 2px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(0,0,0,0.03)',
                transform: isActive ? 'translateY(1px)' : 'translateY(0)',
              }}
            >
              {/* Top shine */}
              <div 
                className="absolute inset-x-2 top-1 h-1/3 rounded-full pointer-events-none"
                style={{
                  background: isActive 
                    ? 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 100%)'
                    : 'linear-gradient(180deg, rgba(255,255,255,0.6) 0%, transparent 100%)',
                }}
              />
              
              <span 
                className={`relative font-bold uppercase tracking-wide whitespace-nowrap flex items-center gap-1.5 ${
                  isActive ? 'text-white' : 'text-slate-500'
                }`}
                style={{
                  fontSize: '0.8rem',
                  textShadow: isActive 
                    ? '0 1px 2px rgba(0,0,0,0.25)' 
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
