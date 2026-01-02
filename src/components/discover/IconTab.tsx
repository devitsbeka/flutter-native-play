import { motion } from "framer-motion";

interface IconTabProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export function IconTab({ label, isActive, onClick }: IconTabProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="relative flex-shrink-0"
    >
      {/* 3D depth layer */}
      <div 
        className={`absolute inset-0 rounded-full transition-all duration-200 ${
          isActive ? 'translate-y-[3px]' : 'translate-y-[4px]'
        }`}
        style={{
          background: isActive 
            ? 'hsl(270 60% 55%)' 
            : 'rgba(0, 0, 0, 0.08)',
        }}
      />
      
      {/* Main tab surface */}
      <div 
        className={`relative px-5 py-2.5 rounded-full transition-all duration-200 border-2 ${
          isActive 
            ? 'border-white/30' 
            : 'border-white/50'
        }`}
        style={{
          background: isActive 
            ? 'linear-gradient(180deg, hsl(270 70% 65%) 0%, hsl(270 60% 55%) 100%)'
            : 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
          boxShadow: isActive
            ? 'inset 0 2px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.1)'
            : 'inset 0 2px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(0,0,0,0.05)',
          transform: isActive ? 'translateY(1px)' : 'translateY(0)',
        }}
      >
        {/* Top shine */}
        <div 
          className="absolute inset-x-2 top-1 h-1/3 rounded-full pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, transparent 100%)',
          }}
        />
        
        <span 
          className={`relative font-bold uppercase tracking-wide whitespace-nowrap ${
            isActive ? 'text-white' : 'text-slate-600'
          }`}
          style={{
            fontSize: '0.85rem',
            textShadow: isActive 
              ? '0 1px 2px rgba(0,0,0,0.2)' 
              : '0 1px 0 rgba(255,255,255,0.8)',
          }}
        >
          {label}
        </span>
      </div>
    </motion.button>
  );
}
