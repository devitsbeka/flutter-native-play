import { useState, useRef, useEffect } from "react";
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

// Get pixel size from size class
const sizePx = {
  sm: 48,
  md: 64,
  lg: 96,
  xl: 128,
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
  const [framesReady, setFramesReady] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<ImageData[]>([]);
  const animationRef = useRef<number | null>(null);
  const frameIndexRef = useRef(0);
  const directionRef = useRef<1 | -1>(1);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    if (animatedVideoUrl) {
      setLocalVideoUrl(animatedVideoUrl);
    }
  }, [animatedVideoUrl]);

  // Extract frames from video into memory for smooth bidirectional playback
  useEffect(() => {
    if (!localVideoUrl) return;

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    const extractFrames = async () => {
      const frames: ImageData[] = [];
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      const pixelSize = sizePx[size] * 2; // 2x for retina
      tempCanvas.width = pixelSize;
      tempCanvas.height = pixelSize;

      // Wait for video metadata
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => resolve();
        video.src = localVideoUrl;
      });

      const duration = video.duration;
      const fps = 30;
      const frameCount = Math.min(Math.floor(duration * fps), 90); // Cap at 90 frames (3 sec @ 30fps)
      const frameInterval = duration / frameCount;

      // Extract frames by seeking
      for (let i = 0; i < frameCount; i++) {
        video.currentTime = i * frameInterval;
        await new Promise<void>((resolve) => {
          video.onseeked = () => {
            tempCtx.drawImage(video, 0, 0, pixelSize, pixelSize);
            frames.push(tempCtx.getImageData(0, 0, pixelSize, pixelSize));
            resolve();
          };
        });
      }

      framesRef.current = frames;
      frameIndexRef.current = 0;
      directionRef.current = 1;
      setFramesReady(true);

      // Auto-play if enabled
      if (autoPlay && frames.length > 0) {
        setShowVideo(true);
        startAnimation();
      }
    };

    extractFrames().catch(console.error);

    return () => {
      video.src = '';
      stopAnimation();
    };
  }, [localVideoUrl, size, autoPlay]);

  const startAnimation = () => {
    if (isPlayingRef.current || framesRef.current.length === 0) return;
    isPlayingRef.current = true;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const fps = 30;
    const frameTime = 1000 / fps;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      if (!isPlayingRef.current) return;

      const elapsed = currentTime - lastTime;
      if (elapsed >= frameTime) {
        lastTime = currentTime - (elapsed % frameTime);

        const frames = framesRef.current;
        if (frames.length === 0) return;

        // Draw current frame
        ctx.putImageData(frames[frameIndexRef.current], 0, 0);

        // Move to next frame
        frameIndexRef.current += directionRef.current;

        // Handle ping-pong
        if (frameIndexRef.current >= frames.length - 1) {
          frameIndexRef.current = frames.length - 1;
          directionRef.current = -1;
        } else if (frameIndexRef.current <= 0) {
          frameIndexRef.current = 0;
          if (loop) {
            directionRef.current = 1;
          } else {
            isPlayingRef.current = false;
            setShowVideo(false);
            return;
          }
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  const stopAnimation = () => {
    isPlayingRef.current = false;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  };

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
    if (framesReady) {
      setShowVideo(true);
      frameIndexRef.current = 0;
      directionRef.current = 1;
      startAnimation();
    }
    setIsAnimating(true);
  };

  const handleMouseLeave = () => {
    if (!loop) {
      stopAnimation();
      setShowVideo(false);
    }
    setIsAnimating(false);
  };

  const canvasSize = sizePx[size] * 2; // Retina

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
            showVideo && framesReady ? "opacity-0" : "opacity-100"
          )}
        />

        {/* Canvas-based animation for smooth ping-pong */}
        {framesReady && (
          <canvas
            ref={canvasRef}
            width={canvasSize}
            height={canvasSize}
            className={cn(
              "absolute inset-0 w-full h-full object-cover transition-opacity duration-300 rounded-full",
              showVideo ? "opacity-100" : "opacity-0"
            )}
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