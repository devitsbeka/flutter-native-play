import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface SmartAvatarProps {
  avatarUrl?: string | null;
  animatedAvatarUrl?: string | null;
  fallback?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  showSparkle?: boolean;
  autoPlay?: boolean;
  playOnHover?: boolean;
  ringColor?: string;
  onlineStatus?: boolean | null;
}

const sizeClasses = {
  xs: "w-8 h-8",
  sm: "w-10 h-10",
  md: "w-12 h-12",
  lg: "w-14 h-14",
  xl: "w-16 h-16",
  "2xl": "w-20 h-20",
};

const sparkleSizes = {
  xs: "w-3 h-3",
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-4 h-4",
  xl: "w-5 h-5",
  "2xl": "w-6 h-6",
};

const sparkleContainerSizes = {
  xs: "w-4 h-4 -top-0.5 -right-0.5",
  sm: "w-4 h-4 -top-0.5 -right-0.5",
  md: "w-5 h-5 -top-1 -right-1",
  lg: "w-5 h-5 -top-1 -right-1",
  xl: "w-6 h-6 -top-1 -right-1",
  "2xl": "w-7 h-7 -top-1 -right-1",
};

export function SmartAvatar({
  avatarUrl,
  animatedAvatarUrl,
  fallback = "?",
  size = "md",
  className,
  showSparkle = true,
  autoPlay = false,
  playOnHover = true,
  ringColor,
  onlineStatus,
}: SmartAvatarProps) {
  const [showVideo, setShowVideo] = useState(autoPlay);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isReversing, setIsReversing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Ping-pong reverse playback using requestAnimationFrame
  const reversePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    const step = () => {
      if (video.currentTime <= 0.05) {
        // Reached start, switch to forward
        video.currentTime = 0;
        setIsReversing(false);
        video.play().catch(() => setVideoError(true));
        return;
      }
      
      // Move backwards (~60fps equivalent)
      video.currentTime = Math.max(0, video.currentTime - 0.033);
      animationFrameRef.current = requestAnimationFrame(step);
    };

    animationFrameRef.current = requestAnimationFrame(step);
  };

  // Handle video ending - start reverse playback
  const handleVideoEnded = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsReversing(true);
      reversePlay();
    }
  };

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Auto-play video if autoPlay is true
  useEffect(() => {
    if (autoPlay && animatedAvatarUrl && videoRef.current && !videoError) {
      videoRef.current.play().catch(() => setVideoError(true));
      setShowVideo(true);
    }
  }, [autoPlay, animatedAvatarUrl, videoError]);

  const handleMouseEnter = () => {
    if (playOnHover && animatedAvatarUrl && videoRef.current && !videoError) {
      setShowVideo(true);
      // Cancel any ongoing reverse animation
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setIsReversing(false);
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => setVideoError(true));
    }
  };

  const handleMouseLeave = () => {
    if (playOnHover && !autoPlay) {
      // Keep showing video but let it finish current ping-pong cycle
    }
  };

  const handleTouchStart = () => {
    if (animatedAvatarUrl && videoRef.current && !videoError) {
      setShowVideo(true);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setIsReversing(false);
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => setVideoError(true));
    }
  };

  const hasAnimatedAvatar = animatedAvatarUrl && !videoError;
  const displayUrl = avatarUrl || undefined;

  return (
    <div
      className={cn("relative inline-block", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
    >
      <Avatar
        className={cn(
          sizeClasses[size],
          ringColor && `ring-2 ${ringColor}`,
          "overflow-hidden"
        )}
      >
        {/* Video layer - prioritized when available */}
        {hasAnimatedAvatar && (
          <video
            ref={videoRef}
            src={animatedAvatarUrl}
            className={cn(
              "absolute inset-0 w-full h-full object-cover rounded-full transition-opacity duration-300",
              showVideo && videoLoaded ? "opacity-100 z-10" : "opacity-0"
            )}
            muted
            playsInline
            onLoadedData={() => {
              setVideoLoaded(true);
              if (autoPlay && videoRef.current) {
                videoRef.current.play().catch(() => setVideoError(true));
                setShowVideo(true);
              }
            }}
            onEnded={handleVideoEnded}
            onError={() => setVideoError(true)}
          />
        )}

        {/* Static image - shown as fallback or when video not playing */}
        <AvatarImage
          src={displayUrl}
          className={cn(
            "transition-opacity duration-300",
            hasAnimatedAvatar && showVideo && videoLoaded ? "opacity-0" : "opacity-100"
          )}
        />
        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold">
          {fallback.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Sparkle indicator for animated avatars */}
      {showSparkle && hasAnimatedAvatar && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={cn(
            "absolute bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg z-20",
            sparkleContainerSizes[size]
          )}
        >
          <Sparkles className={cn("text-white", sparkleSizes[size])} />
        </motion.div>
      )}

      {/* Online status indicator */}
      {onlineStatus !== undefined && onlineStatus !== null && (
        <motion.div
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-2 border-white shadow-sm",
            onlineStatus ? "bg-green-400" : "bg-gray-400",
            size === "xs" || size === "sm" ? "w-3 h-3" : "w-4 h-4"
          )}
          animate={onlineStatus ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </div>
  );
}
