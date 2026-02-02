import myTriviaLogo from "@/assets/mytrivia-live-logo.png";

interface MyTriviaLiveLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function MyTriviaLiveLogo({ size = "md", className = "" }: MyTriviaLiveLogoProps) {
  const heights = {
    sm: 28,
    md: 36,
    lg: 56,
  };

  return (
    <img 
      src={myTriviaLogo} 
      alt="MyTrivia LIVE" 
      className={className}
      style={{ height: heights[size], width: 'auto' }}
    />
  );
}
