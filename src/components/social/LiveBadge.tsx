import { motion } from "framer-motion";

interface LiveBadgeProps {
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeConfig = {
  sm: { text: "text-[8px]", dot: "w-1 h-1", px: "px-2", py: "py-1", gap: "gap-1", rounded: "rounded-full" },
  md: { text: "text-[10px]", dot: "w-1.5 h-1.5", px: "px-2.5", py: "py-1", gap: "gap-1", rounded: "rounded-full" },
  lg: { text: "text-[13px]", dot: "w-2 h-2", px: "px-3", py: "py-1.5", gap: "gap-1.5", rounded: "rounded-full" },
  xl: { text: "text-[15px]", dot: "w-2.5 h-2.5", px: "px-4", py: "py-2", gap: "gap-2", rounded: "rounded-full" },
};

export function LiveBadge({ size = "md" }: LiveBadgeProps) {
  const config = sizeConfig[size];
  
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center"
    >
      <span 
        className={`inline-flex items-center ${config.gap} ${config.px} ${config.py} ${config.rounded} ${config.text} font-bold uppercase tracking-wider text-white`}
        style={{
          background: '#EF4444',
          boxShadow: '0 2px 0 #B91C1C',
        }}
      >
        {/* Blinking dot */}
        <motion.span
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          className={`${config.dot} rounded-full bg-white`}
        />
        LIVE
      </span>
    </motion.span>
  );
}
