import { LiveBadge } from "@/components/social/LiveBadge";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import logoDark from "@/assets/mytrivia-logo.svg";
import logoLight from "@/assets/mytrivia-logo-light.svg";

interface MyTriviaLiveLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  responsive?: boolean;
  textColor?: "light" | "dark";
  className?: string;
}

// height is the rendered height of the SVG logo (crown + wordmark)
const sizeConfig = {
  sm: { height: 30, badgeSize: "sm" as const },
  md: { height: 34, badgeSize: "md" as const },
  lg: { height: 48, badgeSize: "lg" as const },
  xl: { height: 56, badgeSize: "xl" as const },
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
      <img
        src={textColor === "light" ? logoLight : logoDark}
        alt="MyTrivia"
        className="w-auto shrink-0 select-none"
        style={{ height: config.height }}
        draggable={false}
      />
      <span className="flex items-center shrink-0" style={{ marginTop: '-2px' }}>
        <LiveBadge size={config.badgeSize} />
      </span>
    </div>
  );
}
