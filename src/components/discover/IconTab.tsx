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
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className="relative flex-shrink-0"
    >
      {/* Simple pill tag */}
      <div 
        className={`px-5 py-2.5 rounded-full transition-all duration-200 ${
          isActive 
            ? 'bg-primary/80 shadow-md' 
            : 'bg-white/80 hover:bg-white/90'
        }`}
        style={{
          boxShadow: isActive
            ? '0 4px 12px rgba(139, 92, 246, 0.3)'
            : '0 2px 6px rgba(0, 0, 0, 0.06)',
        }}
      >
        <span 
          className={`font-semibold whitespace-nowrap text-[15px] md:text-sm ${
            isActive ? 'text-white' : 'text-slate-600'
          }`}
        >
          {label}
        </span>
      </div>
    </motion.button>
  );
}
