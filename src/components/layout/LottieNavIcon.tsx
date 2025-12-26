import Lottie from "lottie-react";
import compassAnimation from "@/assets/animations/compass.json";
import rateStarAnimation from "@/assets/animations/rate-star.json";
import rocketAnimation from "@/assets/animations/rocket.json";
import televisionAnimation from "@/assets/animations/television.json";

export type NavIconType = "explore" | "map" | "rank" | "team";

const animationMap: Record<NavIconType, unknown> = {
  explore: rocketAnimation,
  map: compassAnimation,
  rank: rateStarAnimation,
  team: televisionAnimation,
};

interface LottieNavIconProps {
  type: NavIconType;
  size?: number;
  className?: string;
}

export function LottieNavIcon({ 
  type, 
  size = 52, 
  className = "",
}: LottieNavIconProps) {
  // TV icon needs special handling - use drop-shadow to add purple glow
  // while preserving inner white areas
  const isTV = type === "team";
  
  return (
    <div 
      className={`${className}`}
      style={{ 
        width: size, 
        height: size,
        padding: 0,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          // Standard filter for most icons (colorizes white to purple)
          // TV uses different approach to preserve white inner frame
          filter: isTV 
            ? "drop-shadow(0 0 1px hsl(263 60% 59%)) drop-shadow(0 0 2px hsl(263 60% 59%))"
            : "brightness(0) saturate(100%) invert(40%) sepia(15%) saturate(1000%) hue-rotate(220deg) brightness(95%) contrast(90%)",
        }}
      >
        <Lottie
          animationData={animationMap[type]}
          loop={true}
          autoplay={true}
          style={{ 
            width: "100%", 
            height: "100%",
            // For TV, add purple tint overlay while keeping white visible
            ...(isTV ? { 
              filter: "brightness(0.6) sepia(100%) saturate(300%) hue-rotate(210deg) brightness(1.1)",
            } : {}),
          }}
        />
      </div>
    </div>
  );
}
