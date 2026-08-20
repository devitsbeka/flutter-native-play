import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { resolveAvatarUrl, fallbackAvatarFor } from "@/utils/avatarUtils";

export type QuizPlayerAvatarState = "default" | "active" | "correct" | "wrong" | "loading";
export type QuizPlayerAvatarSize = "default" | "large" | "xlarge";

interface QuizPlayerAvatarProps {
  avatarUrl?: string | null;
  animatedAvatarUrl?: string | null;
  score?: number;
  position?: "left" | "right";
  state?: QuizPlayerAvatarState;
  size?: QuizPlayerAvatarSize;
  className?: string;
}

const QuizPlayerAvatar = React.forwardRef<HTMLDivElement, QuizPlayerAvatarProps>(
  ({ avatarUrl, animatedAvatarUrl, score = 0, position = "left", state = "default", size = "default", className }, ref) => {
    const isLoading = state === "loading";
    const [showVideo, setShowVideo] = useState(false);
    const [videoLoaded, setVideoLoaded] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const [isReversing, setIsReversing] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    
    const getDimensions = () => {
      switch (size) {
        case "xlarge":
          return { width: "min(140px, 31vw)", height: "min(140px, 31vw)", borderRadius: 70 };
        case "large":
          return { width: 50, height: 50, borderRadius: 25 };
        default:
          return { width: 50, height: 50, borderRadius: 25 };
      }
    };
    
    const dimensions = getDimensions();
    const borderWidth = size === "xlarge" ? 4 : 3;
    const shadowOffset = size === "xlarge" ? 6 : 4;

    const borderColors: Record<QuizPlayerAvatarState, string> = {
      default: "#9C99E8",
      active: "#83F7DA",
      correct: "#39CBA6",
      wrong: "#FF5C5C",
      loading: "#9C99E8",
    };

    const shadowColors: Record<QuizPlayerAvatarState, string> = {
      default: "#5957A7",
      active: "#1E9A7F",
      correct: "#1E9A7F",
      wrong: "#B83A3A",
      loading: "#5957A7",
    };

    const scoreColors: Record<"left" | "right", string> = {
      left: "#F2C860",
      right: "#F2FFFB",
    };

    // Ping-pong reverse playback with delta time for normal speed
    const reversePlay = () => {
      const video = videoRef.current;
      if (!video) return;

      let lastTime = performance.now();

      const step = (currentTime: number) => {
        const delta = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        if (video.currentTime <= 0.05) {
          video.currentTime = 0;
          setIsReversing(false);
          video.play().catch(() => setVideoError(true));
          return;
        }
        
        video.currentTime = Math.max(0, video.currentTime - delta);
        animationFrameRef.current = requestAnimationFrame(step);
      };

      animationFrameRef.current = requestAnimationFrame(step);
    };

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

    // Auto-play video when component mounts if animated avatar exists
    useEffect(() => {
      if (animatedAvatarUrl && videoRef.current && !videoError && videoLoaded) {
        setShowVideo(true);
        videoRef.current.play().catch(() => setVideoError(true));
      }
    }, [animatedAvatarUrl, videoError, videoLoaded]);

    const hasAnimatedAvatar = animatedAvatarUrl && !videoError;
    const resolvedAvatar = resolveAvatarUrl(avatarUrl);
    // Seeded on position rather than the player: this component is given an
    // avatar and a side, never an id. It is a weak seed, but it beats what was
    // here — one hardcoded dicebear seed, so both players in a match with no
    // avatars set were rendered as the same stranger, twice on one screen.
    const displayUrl = resolvedAvatar || fallbackAvatarFor(position);

    return (
      <motion.div
        ref={ref}
        className={cn("flex flex-col items-center gap-2", className)}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {/* Avatar Container with 3D effect */}
        <div className="relative" style={{ width: dimensions.width, height: dimensions.height }}>
          {/* 3D Depth shadow */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: shadowColors[state],
              transform: `translateY(${shadowOffset}px)`,
              borderRadius: dimensions.borderRadius,
            }}
          />
          
          {/* Main avatar container */}
          <motion.div
            className="relative w-full h-full overflow-hidden"
            style={{
              border: `${borderWidth}px solid ${borderColors[state]}`,
              backgroundColor: "#F5F4FF",
              borderRadius: dimensions.borderRadius,
            }}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            {isLoading ? (
              <div className="w-full h-full bg-[#E5E4FF] animate-pulse" />
            ) : (
              <>
                {/* Video layer - for animated avatars */}
                {hasAnimatedAvatar && (
                  <video
                    ref={videoRef}
                    src={animatedAvatarUrl}
                    className={cn(
                      "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
                      showVideo && videoLoaded ? "opacity-100 z-10" : "opacity-0"
                    )}
                    muted
                    playsInline
                    onLoadedData={() => {
                      setVideoLoaded(true);
                      if (videoRef.current) {
                        setShowVideo(true);
                        videoRef.current.play().catch(() => setVideoError(true));
                      }
                    }}
                    onEnded={handleVideoEnded}
                    onError={() => setVideoError(true)}
                  />
                )}
                
                {/* Static image - shown as fallback or when video not playing */}
                <img
                  src={displayUrl}
                  alt="Player avatar"
                  className={cn(
                    "w-full h-full object-cover transition-opacity duration-300",
                    hasAnimatedAvatar && showVideo && videoLoaded ? "opacity-0" : "opacity-100"
                  )}
                />
              </>
            )}
          </motion.div>
        </div>

        {/* Score */}
        {isLoading ? (
          <div className="h-7 w-12 bg-white/20 rounded animate-pulse" />
        ) : (
          <motion.span
            className="text-sm font-bold"
            style={{ 
              color: scoreColors[position],
              textShadow: "0 2px 4px rgba(0,0,0,0.2)",
            }}
            key={score}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 15 }}
          >
            {score}
          </motion.span>
        )}
      </motion.div>
    );
  }
);

QuizPlayerAvatar.displayName = "QuizPlayerAvatar";

export { QuizPlayerAvatar };
