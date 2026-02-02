import { LiveBadge } from "@/components/social/LiveBadge";

interface MyTriviaLiveLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  textColor?: "light" | "dark";
  className?: string;
}

const sizeConfig = {
  sm: { fontSize: 20, badgeSize: "sm" as const },
  md: { fontSize: 28, badgeSize: "md" as const },
  lg: { fontSize: 40, badgeSize: "lg" as const },
  xl: { fontSize: 48, badgeSize: "xl" as const },
};

export function MyTriviaLiveLogo({ 
  size = "md", 
  textColor = "dark",
  className = "" 
}: MyTriviaLiveLogoProps) {
  const config = sizeConfig[size];
  const colorClass = textColor === "light" ? "text-white" : "text-black";

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <span 
        className={`font-slackey ${colorClass} leading-none`}
        style={{ 
          fontSize: config.fontSize,
          textShadow: textColor === "light" 
            ? '0 2px 4px rgba(0,0,0,0.3)' 
            : 'none',
        }}
      >
        MyTrivia
      </span>
      <LiveBadge size={config.badgeSize} />
    </div>
  );
}
