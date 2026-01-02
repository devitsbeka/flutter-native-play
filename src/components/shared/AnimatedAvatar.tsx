import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AnimatedAvatarProps {
  avatarUrl: string | null;
  animatedVideoUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  onAnimationGenerated?: (videoUrl: string) => void;
  showAnimateButton?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
}

const sizeClasses = {
  sm: "w-12 h-12",
  md: "w-16 h-16",
  lg: "w-24 h-24",
  xl: "w-32 h-32",
};

export function AnimatedAvatar({
  avatarUrl,
  animatedVideoUrl,
  size = "md",
  className,
  onAnimationGenerated,
  showAnimateButton = false,
  autoPlay = true,
  loop = true,
}: AnimatedAvatarProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(animatedVideoUrl || null);
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playbackDirectionRef = useRef<1 | -1>(1); // 1 = forward, -1 = backward
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (animatedVideoUrl) {
      setLocalVideoUrl(animatedVideoUrl);
    }
  }, [animatedVideoUrl]);

  // Smooth ping-pong playback using requestAnimationFrame
  const pingPongLoop = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.paused || !loop) return;

    const playbackSpeed = 1; // Normal speed
    const frameTime = 1 / 60; // ~60fps
    const step = frameTime * playbackSpeed;

    if (playbackDirectionRef.current === 1) {
      // Forward playback
      if (video.currentTime >= video.duration - 0.05) {
        // Reached end, reverse
        playbackDirectionRef.current = -1;
      }
    } else {
      // Backward playback
      video.currentTime = Math.max(0, video.currentTime - step * 2);
      if (video.currentTime <= 0.05) {
        // Reached start, go forward
        playbackDirectionRef.current = 1;
        video.currentTime = 0;
      }
    }

    animationFrameRef.current = requestAnimationFrame(pingPongLoop);
  }, [loop]);

  // Start/stop ping-pong animation
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !localVideoUrl || !loop) return;

    const handlePlay = () => {
      playbackDirectionRef.current = 1;
      animationFrameRef.current = requestAnimationFrame(pingPongLoop);
    };

    const handlePause = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handlePause);

    // If already playing, start the loop
    if (!video.paused) {
      handlePlay();
    }

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handlePause);
      handlePause();
    };
  }, [localVideoUrl, loop, pingPongLoop]);

  const generateAnimation = async () => {
    if (!avatarUrl || isGenerating) return;

    setIsGenerating(true);
    toast.info("Generating animated avatar... This may take a minute.");

    try {
      const { data, error } = await supabase.functions.invoke("animate-avatar", {
        body: { imageUrl: avatarUrl },
      });

      if (error) throw error;

      if (data?.success && data?.videoUrl) {
        setLocalVideoUrl(data.videoUrl);
        onAnimationGenerated?.(data.videoUrl);
        toast.success("Avatar animation ready!");
      } else {
        throw new Error(data?.error || "Failed to generate animation");
      }
    } catch (err) {
      console.error("Animation generation error:", err);
      toast.error("Failed to animate avatar. Try again later.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMouseEnter = () => {
    if (localVideoUrl && videoRef.current) {
      setShowVideo(true);
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(console.error);
    }
    setIsAnimating(true);
  };

  const handleMouseLeave = () => {
    if (!loop && videoRef.current) {
      setShowVideo(false);
    }
    setIsAnimating(false);
  };

  const handleVideoEnded = () => {
    if (!loop) {
      setShowVideo(false);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <motion.div
        className={cn(
          "relative rounded-full overflow-hidden",
          sizeClasses[size],
          isAnimating && "ring-2 ring-primary/50"
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleMouseEnter}
        onTouchEnd={handleMouseLeave}
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.2 }}
      >
        {/* Static avatar image */}
        <img
          src={avatarUrl || "/placeholder.svg"}
          alt="Avatar"
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            showVideo && localVideoUrl ? "opacity-0" : "opacity-100"
          )}
        />

        {/* Animated video overlay - using manual ping-pong, not native loop */}
        {localVideoUrl && (
          <video
            ref={videoRef}
            src={localVideoUrl}
            className={cn(
              "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
              showVideo ? "opacity-100" : "opacity-0"
            )}
            muted
            playsInline
            autoPlay={autoPlay}
            loop={false} // Disable native loop - we handle ping-pong manually
            onEnded={handleVideoEnded}
            onLoadedData={() => {
              if (autoPlay && videoRef.current) {
                videoRef.current.play().catch(console.error);
                setShowVideo(true);
              }
            }}
          />
        )}

        {/* Loading overlay */}
        <AnimatePresence>
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center"
            >
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sparkle indicator for animated avatars */}
        {localVideoUrl && !isGenerating && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg"
          >
            <Sparkles className="w-3 h-3 text-white" />
          </motion.div>
        )}
      </motion.div>

      {/* Animate button */}
      {showAnimateButton && !localVideoUrl && avatarUrl && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={generateAnimation}
          disabled={isGenerating}
          className={cn(
            "absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full",
            "bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-medium",
            "shadow-lg hover:shadow-xl transition-all",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "flex items-center gap-1"
          )}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Animating...
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3" />
              Animate
            </>
          )}
        </motion.button>
      )}
    </div>
  );
}
