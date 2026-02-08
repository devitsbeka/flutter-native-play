import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useAvatarFrames, AvatarFrame } from "@/hooks/useAvatarFrames";
import { useVipStatus } from "@/hooks/useVipStatus";
import { Crown } from "lucide-react";
import { resolveAvatarUrl } from "@/utils/avatarUtils";

interface AvatarWithFrameProps {
  imageUrl?: string;
  emoji?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showVipBadge?: boolean;
  frameOverride?: AvatarFrame | null;
}

const sizeClasses = {
  sm: { container: "w-12 h-12", text: "text-xl", badge: "w-4 h-4 -top-0.5 -right-0.5", badgeIcon: "w-2.5 h-2.5" },
  md: { container: "w-16 h-16", text: "text-2xl", badge: "w-5 h-5 -top-1 -right-1", badgeIcon: "w-3 h-3" },
  lg: { container: "w-24 h-24", text: "text-4xl", badge: "w-7 h-7 -top-1 -right-1", badgeIcon: "w-4 h-4" },
  xl: { container: "w-32 h-32", text: "text-5xl", badge: "w-8 h-8 -top-1 -right-1", badgeIcon: "w-5 h-5" },
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
  const { isVip } = useVipStatus();
  
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

      {/* VIP Crown Badge */}
      {showVipBadge && isVip && (
        <motion.div
          className={cn(
            "absolute rounded-full flex items-center justify-center",
            sizeConfig.badge
          )}
          style={{
            background: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
            boxShadow: "0 2px 8px rgba(255, 215, 0, 0.5)",
          }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
        >
          <Crown className={cn(sizeConfig.badgeIcon, "text-white fill-white")} />
        </motion.div>
      )}
    </div>
  );
}
