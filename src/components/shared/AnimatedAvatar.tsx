import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePingPongVideo } from "@/hooks/usePingPongVideo";

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

// Canvas sizes for different avatar sizes (2x for retina)
const canvasSizes = {
  sm: 96,
  md: 128,
  lg: 192,
  xl: 256,
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

  const canvasSize = canvasSizes[size];
  
  // Use ping-pong video hook for smooth bidirectional playback
  const { canvasRef, isReady, play, pause, reset } = usePingPongVideo({
    videoUrl: localVideoUrl,
    canvasSize,
    fps: 30,
    autoPlay,
    loop,
  });

  useEffect(() => {
    if (animatedVideoUrl) {
      setLocalVideoUrl(animatedVideoUrl);
    }
  }, [animatedVideoUrl]);

  // Auto-show video when ready
  useEffect(() => {
    if (isReady && autoPlay) {
      setShowVideo(true);
    }
  }, [isReady, autoPlay]);

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
    if (isReady) {
      setShowVideo(true);
      reset();
      play();
    }
    setIsAnimating(true);
  };

  const handleMouseLeave = () => {
    if (!loop) {
      pause();
      setShowVideo(false);
    }
    setIsAnimating(false);
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
            showVideo && isReady ? "opacity-0" : "opacity-100"
          )}
        />

        {/* Canvas-based ping-pong animation for seamless looping */}
        {localVideoUrl && (
          <canvas
            ref={canvasRef}
            width={canvasSize}
            height={canvasSize}
            className={cn(
              "absolute inset-0 w-full h-full object-cover transition-opacity duration-300 rounded-full",
              showVideo && isReady ? "opacity-100" : "opacity-0"
            )}
          />
        )}

        {/* Loading frames indicator */}
        <AnimatePresence>
          {localVideoUrl && !isReady && !isGenerating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center"
            >
              <Loader2 className="w-4 h-4 animate-spin text-primary/70" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Generating overlay */}
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