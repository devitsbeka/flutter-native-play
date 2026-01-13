import { motion } from "framer-motion";

export function LiveBadge() {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center ml-1.5"
    >
      <span 
        className="relative inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-white"
        style={{
          background: '#EF4444',
          boxShadow: '0 2px 0 #B91C1C, 0 3px 6px rgba(0,0,0,0.15)',
        }}
      >
        {/* Blinking dot */}
        <motion.span
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          className="w-1.5 h-1.5 rounded-full bg-white mr-1"
        />
        LIVE
      </span>
    </motion.span>
  );
}
