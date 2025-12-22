import { motion } from "framer-motion";

interface GameProgressBarProps {
  current: number;
  total: number;
  label?: string;
}

export function GameProgressBar({ current, total, label }: GameProgressBarProps) {
  const progress = (current / total) * 100;
  
  return (
    <div className="w-full space-y-2">
      {label && (
        <p className="text-center text-sm text-muted-foreground font-medium">
          {label}
        </p>
      )}
      
      <div 
        className="relative h-6 rounded-full overflow-hidden"
        style={{
          background: "linear-gradient(180deg, hsl(0 0% 20%) 0%, hsl(0 0% 15%) 100%)",
          boxShadow: "inset 0 2px 4px hsl(0 0% 0% / 0.5)"
        }}
      >
        {/* Progress fill */}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: "linear-gradient(180deg, hsl(45 95% 55%) 0%, hsl(40 90% 50%) 100%)",
            boxShadow: "inset 0 2px 0 hsl(45 95% 70%), 0 0 10px hsl(45 95% 55% / 0.5)"
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        
        {/* Shine effect */}
        <motion.div
          className="absolute inset-0 opacity-30"
          style={{
            background: "linear-gradient(90deg, transparent 0%, white 50%, transparent 100%)",
            width: "50%"
          }}
          animate={{ x: ["-100%", "300%"] }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            repeatDelay: 1,
            ease: "easeInOut" 
          }}
        />
        
        {/* End caps */}
        <div 
          className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-4 rounded-full"
          style={{
            background: "linear-gradient(180deg, hsl(120 60% 45%) 0%, hsl(120 55% 35%) 100%)"
          }}
        />
        <div 
          className="absolute right-1 top-1/2 -translate-y-1/2 w-2 h-4 rounded-full"
          style={{
            background: "linear-gradient(180deg, hsl(120 60% 45%) 0%, hsl(120 55% 35%) 100%)"
          }}
        />
      </div>
    </div>
  );
}
