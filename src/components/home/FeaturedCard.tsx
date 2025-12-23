import { motion } from "framer-motion";

interface FeaturedCardProps {
  title: string;
  subtitle: string;
  icon: string;
  bgGradient?: string;
  size?: "small" | "medium" | "large";
  onClick?: () => void;
}

export function FeaturedCard({ 
  title, 
  subtitle, 
  icon, 
  size = "small",
  onClick 
}: FeaturedCardProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="relative overflow-hidden rounded-3xl p-5 text-left w-full h-full flex flex-col bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 shadow-lg shadow-black/20"
    >
      {/* Decorative gradient orb */}
      <div 
        className="absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-30 blur-3xl"
        style={{ 
          background: size === "large" 
            ? "radial-gradient(circle, hsl(142 70% 45%) 0%, transparent 70%)" 
            : size === "medium"
              ? "radial-gradient(circle, hsl(35 90% 55%) 0%, transparent 70%)"
              : "radial-gradient(circle, hsl(220 70% 55%) 0%, transparent 70%)"
        }}
      />

      {/* Icon container */}
      <div className={`flex items-center justify-center rounded-2xl bg-slate-700/60 backdrop-blur-sm mb-auto ${
        size === "large" ? "h-14 w-14 text-3xl" : size === "medium" ? "h-12 w-12 text-2xl" : "h-11 w-11 text-xl"
      }`}>
        {icon}
      </div>
      
      {/* Content at bottom */}
      <div className="mt-auto pt-4">
        <h3 className={`font-display font-black text-white leading-tight tracking-tight ${
          size === "large" ? "text-2xl" : size === "medium" ? "text-xl" : "text-lg"
        }`}>
          {title}
        </h3>
        <p className={`text-slate-400 mt-1.5 font-medium ${
          size === "large" ? "text-base" : "text-sm"
        }`}>
          {subtitle}
        </p>
      </div>

      {/* Subtle inner glow */}
      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/5 pointer-events-none rounded-3xl" />
      
      {/* Bottom accent line */}
      <div 
        className="absolute bottom-0 left-4 right-4 h-1 rounded-full opacity-50"
        style={{ 
          background: size === "large" 
            ? "linear-gradient(90deg, hsl(142 70% 45%), hsl(142 70% 60%))" 
            : size === "medium"
              ? "linear-gradient(90deg, hsl(35 90% 50%), hsl(45 90% 60%))"
              : "linear-gradient(90deg, hsl(220 70% 50%), hsl(240 70% 60%))"
        }}
      />
    </motion.button>
  );
}
