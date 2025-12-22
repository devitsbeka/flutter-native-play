import { motion } from "framer-motion";

interface FeaturedCardProps {
  title: string;
  subtitle: string;
  icon: string;
  bgGradient: string;
  onClick?: () => void;
}

export function FeaturedCard({ title, subtitle, icon, bgGradient, onClick }: FeaturedCardProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
      className={`relative flex-shrink-0 w-32 h-32 overflow-hidden rounded-2xl bg-gradient-to-br ${bgGradient} p-3 text-left`}
      style={{
        boxShadow: "0 6px 0 0 hsl(0 0% 0% / 0.15), 0 10px 20px -4px hsl(0 0% 0% / 0.2)",
      }}
    >
      {/* 3D depth effect */}
      <div className="absolute inset-x-0 bottom-0 h-2 bg-gradient-to-t from-black/20 to-transparent" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        <div 
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-2xl backdrop-blur-sm"
          style={{
            boxShadow: "inset 0 -2px 0 0 hsl(0 0% 0% / 0.1)",
          }}
        >
          {icon}
        </div>
        <div className="mt-auto">
          <h3 className="text-sm font-bold text-white leading-tight">{title}</h3>
          <p className="text-xs text-white/70 mt-0.5 line-clamp-1">{subtitle}</p>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/10 blur-xl" />
      <div className="absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-white/5 blur-2xl" />
    </motion.button>
  );
}
