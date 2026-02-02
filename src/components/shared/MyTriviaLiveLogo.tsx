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
      badge: "px-2 py-0.5 text-[10px] gap-1",
      dot: "w-1.5 h-1.5",
      gap: "ml-1.5",
    },
    md: {
      text: "text-xl",
      badge: "px-2.5 py-1 text-xs gap-1.5",
      dot: "w-2 h-2",
      gap: "ml-2",
    },
    lg: {
      text: "text-3xl",
      badge: "px-3 py-1.5 text-sm gap-1.5",
      dot: "w-2.5 h-2.5",
      gap: "ml-3",
    },
  };

  const s = sizes[size];

  return (
    <div className={`flex items-center ${className}`}>
      <span 
        className={`${s.text} font-slackey tracking-tight`}
        style={{
          color: '#1e293b', // Dark navy like in the screenshot
        }}
      >
        MyTrivia
      </span>
      
      {/* LIVE Badge - 8px rounded corners */}
      <span className={s.gap}>
        <span 
          className={`inline-flex items-center ${s.badge} rounded-lg font-bold uppercase tracking-wider text-white`}
          style={{
            background: '#EF4444',
            boxShadow: '0 2px 0 #B91C1C',
          }}
        >
          {animate ? (
            <motion.span
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              className={`${s.dot} rounded-full bg-white`}
            />
          ) : (
            <span className={`${s.dot} rounded-full bg-white`} />
          )}
          LIVE
        </span>
      </span>
    </div>
  );
}
