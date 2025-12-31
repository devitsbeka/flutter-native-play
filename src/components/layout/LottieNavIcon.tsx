import Lottie from "lottie-react";
import compassAnimation from "@/assets/animations/compass.json";
import rateStarAnimation from "@/assets/animations/rate-star.json";
import rocketAnimation from "@/assets/animations/rocket.json";
import televisionAnimation from "@/assets/animations/television-2.json";

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
          filter: "brightness(0) saturate(100%) invert(54%) sepia(45%) saturate(1000%) hue-rotate(210deg) brightness(92%) contrast(88%)",
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
