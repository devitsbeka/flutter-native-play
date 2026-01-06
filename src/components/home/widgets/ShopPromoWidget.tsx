import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Gift } from "lucide-react";

export function ShopPromoWidget() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      whileTap={{ y: 2 }}
      onClick={() => navigate("/shop")}
      className="relative overflow-hidden rounded-2xl p-4 cursor-pointer group bg-card border-2 border-border"
      style={{
        boxShadow: "inset 0 2px 0 0 rgba(255,255,255,0.1), 0 4px 0 0 hsl(var(--border)), 0 6px 15px -3px rgba(0,0,0,0.15)",
      }}
    >
      {/* Gradient overlay */}
      <div 
        className="absolute inset-0 opacity-40"
        style={{
          background: "linear-gradient(135deg, hsl(187, 70%, 60% / 0.3) 0%, hsl(var(--primary) / 0.2) 100%)",
        }}
      />
      
      {/* Decorative elements */}
      <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-primary/10 blur-xl" />
      
      {/* Content */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
            <Gift className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-base font-bold text-foreground">
            საჩუქრები მაღაზიაში
          </h3>
        </div>
        
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="text-muted-foreground group-hover:text-primary transition-colors"
        >
          <path
            d="M6 3L11 8L6 13"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </motion.div>
  );
}
