import { motion } from "framer-motion";
import { Check, Crown, Sparkles, Zap } from "lucide-react";
import gemIcon from "@/assets/icons/icon-gem.png";
import { ChunkyButton } from "@/components/ui/chunky-button";

export interface ShopBundleCardProps {
  id: string;
  title: string;
  subtitle: string;
  items: { icon: React.ReactNode; label: string }[];
  price: number;
  originalPrice?: number;
  gradient: string;
  icon: React.ReactNode;
  badge?: string;
  isLoading?: boolean;
  onClick: () => void;
}

export function ShopBundleCard({
  title,
  subtitle,
  items,
  price,
  originalPrice,
  gradient,
  icon,
  badge,
  isLoading = false,
  onClick,
}: ShopBundleCardProps) {
  const savings = originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.99 }}
      className="relative rounded-3xl p-4 overflow-hidden cursor-pointer"
      style={{
        background: gradient,
        boxShadow: "0 6px 0 hsl(0 0% 0% / 0.15), inset 0 2px 0 hsl(0 0% 100% / 0.2)",
      }}
      onClick={onClick}
    >
      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          backgroundPosition: ["200% 0%", "-200% 0%"],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, hsl(0 0% 100% / 0.1) 50%, transparent 100%)",
          backgroundSize: "200% 100%",
        }}
      />

      {/* Badge */}
      {badge && (
        <motion.div
          className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold text-white"
          style={{
            background: "hsl(0 0% 0% / 0.25)",
            boxShadow: "inset 0 1px 0 hsl(0 0% 100% / 0.2)",
          }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {badge}
        </motion.div>
      )}

      {/* Savings Badge */}
      {savings > 0 && (
        <motion.div
          className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold text-amber-900"
          style={{
            background: "linear-gradient(180deg, hsl(50 95% 65%) 0%, hsl(45 90% 55%) 100%)",
            boxShadow: "0 2px 0 hsl(40 80% 45%)",
          }}
        >
          -{savings}%
        </motion.div>
      )}

      <div className="flex items-center gap-4">
        {/* Icon */}
        <motion.div
          className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{
            background: "hsl(0 0% 100% / 0.2)",
            boxShadow: "0 3px 0 hsl(0 0% 0% / 0.1)",
          }}
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {icon}
        </motion.div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-display font-bold text-white mb-0.5 drop-shadow-md">
            {title}
          </h3>
          <p className="text-white/80 text-xs mb-2">{subtitle}</p>

          {/* Items */}
          <div className="flex flex-wrap gap-1.5">
            {items.slice(0, 4).map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white/90"
                style={{ background: "hsl(0 0% 100% / 0.15)" }}
              >
                {item.icon}
                <span>{item.label}</span>
              </div>
            ))}
            {items.length > 4 && (
              <div
                className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white/90"
                style={{ background: "hsl(0 0% 100% / 0.15)" }}
              >
                +{items.length - 4}
              </div>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="flex flex-col items-end gap-1">
          {originalPrice && (
            <span className="text-white/50 line-through text-sm">{originalPrice}</span>
          )}
          <motion.div
            className="flex items-center gap-1.5 px-4 py-2 rounded-full"
            style={{
              background: "hsl(0 0% 100% / 0.25)",
              boxShadow: "inset 0 1px 0 hsl(0 0% 100% / 0.3)",
            }}
            whileHover={{ scale: 1.05 }}
          >
            <img src={gemIcon} alt="" className="w-5 h-5" />
            <span className="text-lg font-bold text-white">{price}</span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
