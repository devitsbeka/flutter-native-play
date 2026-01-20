import { motion } from "framer-motion";
import crownMascot from "@/assets/crown-mascot.png";

interface CategoryBadgeProps {
  category: string;
  color?: string;
}

export function CategoryBadge({ category, color = "hsl(280 60% 55%)" }: CategoryBadgeProps) {
  return (
    <motion.div 
      className="flex items-center gap-3"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Crown Mascot */}
      <div 
        className="w-28 h-28 rounded-full flex items-center justify-center p-2"
        style={{
          background: `linear-gradient(180deg, ${color} 0%, ${color}dd 100%)`,
          boxShadow: `0 6px 0 ${color}99, 0 8px 20px ${color}40`
        }}
      >
        <img 
          src={crownMascot} 
          alt="Category mascot" 
          className="w-full h-full object-contain"
        />
      </div>
      
      {/* Category Name */}
      <h2 
        className="font-display font-bold uppercase tracking-wide"
        style={{ 
          fontSize: "21px",
          color: "white",
          textShadow: "0 2px 4px hsl(0 0% 0% / 0.3)"
        }}
      >
        {category}
      </h2>
    </motion.div>
  );
}
