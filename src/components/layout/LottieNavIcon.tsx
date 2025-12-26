import Lottie from "lottie-react";
import { useRef, useState } from "react";
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
  isActive?: boolean;
}

export function LottieNavIcon({ 
  type, 
  size = 52, 
  className = "",
  isActive = false 
}: LottieNavIconProps) {
  const lottieRef = useRef<any>(null);
  const [isHovered, setIsHovered] = useState(false);
  
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (lottieRef.current) {
      lottieRef.current.play();
    }
  };
  
  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div 
      className={className}
      style={{ width: size, height: size }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={animationMap[type]}
        loop={isHovered || isActive}
        autoplay={isActive}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
