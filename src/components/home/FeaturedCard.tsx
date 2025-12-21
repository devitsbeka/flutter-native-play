import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

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
      whileTap={{ scale: 0.98 }}
      className={`relative w-full overflow-hidden rounded-3xl bg-gradient-to-r ${bgGradient} p-5 text-left`}
      style={{
        boxShadow: "0 8px 0 0 hsl(0 0% 0% / 0.15), 0 12px 24px -4px hsl(0 0% 0% / 0.2)",
      }}
    >
      {/* 3D depth effect */}
      <div className="absolute inset-x-0 bottom-0 h-2 bg-gradient-to-t from-black/20 to-transparent" />
      
      {/* Content */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div 
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-3xl backdrop-blur-sm"
            style={{
              boxShadow: "inset 0 -2px 0 0 hsl(0 0% 0% / 0.1)",
            }}
          >
            {icon}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <p className="text-sm text-white/80">{subtitle}</p>
          </div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
          <ChevronRight className="h-5 w-5 text-white" />
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-xl" />
      <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
    </motion.button>
  );
}
