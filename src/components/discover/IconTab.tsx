import { motion } from "framer-motion";

interface IconTabProps {
  icon: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export function IconTab({ icon, label, isActive, onClick }: IconTabProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 px-4 py-2 relative min-w-[64px]"
    >
      <span className="text-2xl">{icon}</span>
      <span 
        className={`text-xs transition-colors ${
          isActive 
            ? "text-foreground font-medium" 
            : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
      {isActive && (
        <motion.div
          layoutId="activeTab"
          className="absolute bottom-0 left-2 right-2 h-0.5 bg-foreground rounded-full"
        />
      )}
    </button>
  );
}
