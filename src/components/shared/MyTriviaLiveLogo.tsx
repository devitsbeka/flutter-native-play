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
  sm: { height: 38 },
  md: { height: 42 },
  lg: { height: 60 },
  xl: { height: 70 },
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
    </div>
  );
}
