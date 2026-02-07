import { LiveBadge } from "@/components/social/LiveBadge";
import { useBreakpoint } from "@/hooks/use-breakpoint";

interface MyTriviaLiveLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  responsive?: boolean;
  textColor?: "light" | "dark";
  className?: string;
}

const sizeConfig = {
  sm: { fontSize: 26, badgeSize: "sm" as const },
  md: { fontSize: 28, badgeSize: "md" as const },
  lg: { fontSize: 40, badgeSize: "lg" as const },
  xl: { fontSize: 48, badgeSize: "xl" as const },
};

export function MyTriviaLiveLogo({ 
  size = "md", 
  responsive = false,
  textColor = "dark",
  className = "" 
}: MyTriviaLiveLogoProps) {
  const breakpoint = useBreakpoint();
  
  // Auto-size based on breakpoint when responsive is enabled
  let effectiveSize = size;
  if (responsive) {
    if (breakpoint === "xxs" || breakpoint === "xs" || breakpoint === "sm") {
      effectiveSize = "sm";  // Mobile
    } else if (breakpoint === "md") {
      effectiveSize = "sm";  // Tablet (same as mobile)
    } else {
      effectiveSize = "md";  // Desktop (lg, xl, 2xl) - md not lg
    }
  }
  
  const config = sizeConfig[effectiveSize];
  const colorClass = textColor === "light" ? "text-white" : "text-black";

  return (
<div 
      className={`flex flex-row flex-nowrap items-center gap-2 shrink-0 ${className}`}
      style={{ 
        display: 'inline-flex',
        flexWrap: 'nowrap',
        width: 'fit-content',
        minWidth: 'fit-content',
        maxWidth: 'fit-content',
      }}
    >
      <span 
        className={`font-slackey ${colorClass} leading-none whitespace-nowrap`}
        style={{ 
          fontSize: config.fontSize,
          textShadow: textColor === "light" 
            ? '0 2px 4px rgba(0,0,0,0.3)' 
            : 'none',
        }}
      >
        MyTrivia
      </span>
      <span className="flex items-center shrink-0" style={{ marginTop: '-2px' }}>
        <LiveBadge size={config.badgeSize} />
      </span>
    </div>
  );
}
