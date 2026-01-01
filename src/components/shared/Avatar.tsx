import { cn } from "@/lib/utils";
import { getCountryFlag } from "@/data/opponents";

interface AvatarProps {
  emoji?: string;
  imageUrl?: string;
  countryCode?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showRing?: boolean;
  ringColor?: string;
  className?: string;
}

const sizeClasses = {
  sm: "w-10 h-10 text-lg",
  md: "w-14 h-14 text-2xl",
  lg: "w-20 h-20 text-4xl",
  xl: "w-28 h-28 text-5xl",
};

export function Avatar({
  emoji = "👤",
  imageUrl,
  countryCode,
  size = "md",
  showRing = false,
  ringColor = "ring-primary/30",
  className,
}: AvatarProps) {
  return (
    <div className="relative inline-block">
      <div
        className={cn(
          "rounded-full bg-secondary flex items-center justify-center overflow-hidden",
          sizeClasses[size],
          showRing && `ring-4 ${ringColor}`,
          className
        )}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{emoji}</span>
        )}
      </div>
      
      {/* Country flag badge */}
      {countryCode && (
        <div className="absolute -bottom-1 -right-1 text-lg">
          {getCountryFlag(countryCode)}
        </div>
      )}
    </div>
  );
}
