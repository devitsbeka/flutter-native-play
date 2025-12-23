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
  const sizeClasses = {
    small: "col-span-1 row-span-1 min-h-[120px]",
    medium: "col-span-1 row-span-2 min-h-[260px]",
    large: "col-span-2 row-span-1 min-h-[140px]",
  };

  const iconSizeClasses = {
    small: "h-10 w-10 text-xl",
    medium: "h-14 w-14 text-3xl",
    large: "h-12 w-12 text-2xl",
  };

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`liquid-glass relative overflow-hidden rounded-2xl p-4 text-left w-full h-full flex flex-col ${sizeClasses[size]}`}
    >
      {/* Decorative gradient orb */}
      <div 
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-20 blur-2xl"
        style={{ 
          background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)" 
        }}
      />

      {/* Icon */}
      <div className={`flex items-center justify-center rounded-2xl bg-foreground/10 backdrop-blur-sm ${iconSizeClasses[size]}`}>
        {icon}
      </div>
      
      {/* Content */}
      <div className={`mt-auto ${size === "medium" ? "pt-6" : "pt-3"}`}>
        <h3 className={`font-display font-bold text-foreground leading-tight ${
          size === "large" ? "text-lg" : size === "medium" ? "text-base" : "text-sm"
        }`}>
          {title}
        </h3>
        <p className={`text-muted-foreground mt-1 ${
          size === "large" ? "text-sm line-clamp-2" : "text-xs line-clamp-1"
        }`}>
          {subtitle}
        </p>
      </div>

      {/* Subtle shine effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
    </motion.button>
  );
}
