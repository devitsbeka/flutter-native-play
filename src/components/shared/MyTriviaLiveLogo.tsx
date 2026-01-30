import { motion } from "framer-motion";

interface MyTriviaLiveLogoProps {
  size?: "sm" | "md" | "lg";
  animate?: boolean;
  className?: string;
}

export function MyTriviaLiveLogo({ size = "md", animate = true, className = "" }: MyTriviaLiveLogoProps) {
  const sizes = {
    sm: {
      text: "text-lg",
      badge: "px-1.5 py-0.5 text-[10px]",
      dot: "w-1.5 h-1.5 mr-1",
      gap: "ml-1.5",
    },
    md: {
      text: "text-xl",
      badge: "px-2 py-0.5 text-xs",
      dot: "w-2 h-2 mr-1.5",
      gap: "ml-2",
    },
    lg: {
      text: "text-3xl",
      badge: "px-2.5 py-1 text-sm",
      dot: "w-2.5 h-2.5 mr-2",
      gap: "ml-3",
    },
  };

  const s = sizes[size];

  return (
    <div className={`flex items-center ${className}`}>
      <span 
        className={`${s.text} font-slackey text-foreground tracking-tight`}
        style={{
          textShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        MyTrivia
      </span>
      
      {/* LIVE Badge */}
      <motion.span className={s.gap}>
        <span 
          className={`relative inline-flex items-center ${s.badge} rounded-md font-bold uppercase tracking-wider text-white`}
          style={{
            background: '#EF4444',
            boxShadow: '0 2px 0 #B91C1C, 0 3px 6px rgba(0,0,0,0.15)',
          }}
        >
          {animate && (
            <motion.span
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              className={`${s.dot} rounded-full bg-white`}
            />
          )}
          LIVE
        </span>
      </motion.span>
    </div>
  );
}
