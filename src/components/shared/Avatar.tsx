import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { getCountryFlag } from "@/data/opponents";
import { resolveAvatarUrl } from "@/utils/avatarUtils";

interface AvatarProps {
  emoji?: string;
  imageUrl?: string;
  countryCode?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showRing?: boolean;
  ringColor?: string;
  className?: string;
}

const sizeClasses = {
  xs: "w-5 h-5 text-xs",
  sm: "w-10 h-10 text-lg",
  md: "w-14 h-14 text-2xl",
  lg: "w-20 h-20 text-4xl",
  xl: "w-28 h-28 text-5xl",
};

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      emoji = "👤",
      imageUrl,
      countryCode,
      size = "md",
      showRing = false,
      ringColor = "ring-primary/30",
      className,
    },
    ref
  ) => {
    return (
      <div ref={ref} className="relative inline-block">
        <div
          className={cn(
            "rounded-full bg-secondary flex items-center justify-center overflow-hidden",
            sizeClasses[size],
            showRing && `ring-4 ${ringColor}`,
            className
          )}
        >
          <AvatarContent imageUrl={imageUrl} emoji={emoji} />
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
);

Avatar.displayName = "Avatar";

// Internal component for avatar content with error handling
function AvatarContent({ imageUrl, emoji }: { imageUrl?: string; emoji: string }) {
  const [hasError, setHasError] = useState(false);
  const resolvedUrl = resolveAvatarUrl(imageUrl);
  
  if (!resolvedUrl || hasError) {
    return <span>{emoji}</span>;
  }
  
  return (
    <img
      src={resolvedUrl}
      alt="Avatar"
      className="w-full h-full object-cover"
      onError={() => setHasError(true)}
    />
  );
}
