import { motion } from "framer-motion";

interface FeaturedCardProps {
  title: string;
  subtitle: string;
  icon: string;
  bgGradient?: string;
  onClick?: () => void;
}

export function FeaturedCard({ title, subtitle, icon, onClick }: FeaturedCardProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
      className="liquid-glass relative flex-shrink-0 w-36 aspect-square overflow-hidden rounded-3xl p-4 text-left"
    >
      {/* Icon */}
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground/10 backdrop-blur-sm text-2xl">
        {icon}
      </div>
      
      {/* Content */}
      <div className="mt-auto pt-3">
        <h3 className="text-sm font-display font-bold text-foreground leading-tight">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{subtitle}</p>
      </div>
    </motion.button>
  );
}
