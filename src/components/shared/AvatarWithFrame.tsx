import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useAvatarFrames, AvatarFrame } from "@/hooks/useAvatarFrames";
import { ProBadge } from "@/components/shared/ProBadge";
import { resolveAvatarUrl } from "@/utils/avatarUtils";

interface AvatarWithFrameProps {
  imageUrl?: string;
  emoji?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showVipBadge?: boolean;
  frameOverride?: AvatarFrame | null;
}

// Badge size comes from ProBadge now; only where it sits is local.
const sizeClasses = {
  sm: { container: "w-12 h-12", text: "text-xl", badgePosition: "-top-0.5 -right-0.5" },
  md: { container: "w-16 h-16", text: "text-2xl", badgePosition: "-top-1 -right-1" },
  lg: { container: "w-24 h-24", text: "text-4xl", badgePosition: "-top-1 -right-1" },
  xl: { container: "w-32 h-32", text: "text-5xl", badgePosition: "-top-1 -right-1" },
};

export function AvatarWithFrame({
  imageUrl,
  emoji = "👤",
  size = "md",
  className,
  showVipBadge = true,
  frameOverride,
}: AvatarWithFrameProps) {
  const { getEquippedFrameData } = useAvatarFrames();
  
  const equippedFrame = frameOverride !== undefined ? frameOverride : getEquippedFrameData();
  const sizeConfig = sizeClasses[size];
  const resolvedImageUrl = resolveAvatarUrl(imageUrl);

  return (
    <div className={cn("relative inline-block", className)}>
      {/* Frame glow effect */}
      {equippedFrame && (
        <motion.div
          className={cn(
            "absolute inset-0 rounded-full bg-gradient-to-r",
            equippedFrame.gradient,
            "blur-md opacity-60 scale-110"
          )}
          animate={{
            scale: [1.1, 1.15, 1.1],
            opacity: [0.5, 0.7, 0.5],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Avatar container with frame */}
      <motion.div
        className={cn(
          "relative rounded-full overflow-hidden flex items-center justify-center",
          sizeConfig.container,
          equippedFrame ? equippedFrame.borderStyle : "border-2 border-border",
          equippedFrame?.animationClass,
          "bg-secondary"
        )}
        style={equippedFrame ? {
          boxShadow: `0 0 20px rgba(139, 92, 246, 0.4), 0 0 40px rgba(139, 92, 246, 0.2)`,
        } : undefined}
      >
        {/* Gradient border overlay for frames */}
        {equippedFrame && (
          <div 
            className={cn(
              "absolute inset-0 rounded-full bg-gradient-to-r pointer-events-none",
              equippedFrame.gradient
            )}
            style={{
              padding: "4px",
              mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              maskComposite: "exclude",
              WebkitMaskComposite: "xor",
            }}
          />
        )}

        {/* Avatar image or emoji */}
        {resolvedImageUrl ? (
          <img
            src={resolvedImageUrl}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className={sizeConfig.text}>{emoji}</span>
        )}
      </motion.div>

      {/* VIP Crown Badge — the same one the home avatar and the profile
          carry, drawn from one place so the three cannot drift apart. */}
      {showVipBadge && (
        <ProBadge variant="crown" size={size} className={cn("absolute", sizeConfig.badgePosition)} />
      )}
    </div>
  );
}
