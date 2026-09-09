import { useBreakpoint } from "@/hooks/use-breakpoint";
import logoDark from "@/assets/mytrivia-logo.svg";
import logoLight from "@/assets/mytrivia-logo-light.svg";
import wordmarkDark from "@/assets/mytrivia-wordmark.svg";
import wordmarkLight from "@/assets/mytrivia-wordmark-light.svg";

interface MyTriviaLiveLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  responsive?: boolean;
  textColor?: "light" | "dark";
  /** The crown rides above the wordmark by default. The app's own header
      turns it off: there the logo sits in a 76px row beside a burger and two
      balance pills, and the crown is the first thing that has to give. Every
      other home for the logo — the splash, the TV screens, the loading
      screens — keeps it. */
  crown?: boolean;
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
  crown = true,
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
  // The crownless art is cropped to the wordmark, so the same rendered height
  // would draw it nearly twice the size. 0.62 of the full logo's height puts
  // the letters a little above where they read with the crown on — the row
  // has the width to spare once the crown is gone.
  const height = crown ? config.height : Math.round(config.height * 0.62);

  return (
    // The crowned logo is locked to its own width — it is the only thing in
    // whatever row it sits in. The crownless one shares a 76px header with a
    // burger and two balance pills, and on a 360px phone that row is 30px
    // over: fit-content cannot give any of it back, so the wordmark simply
    // overlapped the first pill. It shrinks instead — max-width from the
    // row, height as a ceiling rather than a fixed value, so the art scales
    // rather than squashing.
    <div
      className={`flex flex-row flex-nowrap items-center gap-2 ${crown ? "shrink-0" : "min-w-0"} ${className}`}
      style={{
        display: 'inline-flex',
        flexWrap: 'nowrap',
        width: 'fit-content',
        minWidth: crown ? 'fit-content' : 0,
        maxWidth: 'fit-content',
      }}
    >
      <img
        src={
          crown
            ? textColor === "light" ? logoLight : logoDark
            : textColor === "light" ? wordmarkLight : wordmarkDark
        }
        alt="MyTrivia"
        className={crown ? "w-auto shrink-0 select-none" : "h-auto w-auto max-w-full select-none"}
        style={crown ? { height } : { maxHeight: height }}
        draggable={false}
      />
    </div>
  );
}
