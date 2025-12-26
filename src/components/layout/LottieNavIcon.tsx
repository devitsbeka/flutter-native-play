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
  size = 104, 
  className = "",
}: LottieNavIconProps) {
  return (
    <div 
      className={`rounded-3xl bg-white shadow-sm ${className}`}
      style={{ 
        width: size, 
        height: size,
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          filter: "brightness(0) saturate(100%) invert(28%) sepia(89%) saturate(1640%) hue-rotate(243deg) brightness(88%) contrast(96%)",
        }}
      >
        <Lottie
          animationData={animationMap[type]}
          loop={true}
          autoplay={true}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
}
