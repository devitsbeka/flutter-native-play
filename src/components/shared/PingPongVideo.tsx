import { useRef, useEffect, useState } from "react";
import { getVideoBlobUrl } from "@/components/game/VideoPreloader";

interface PingPongVideoProps {
  src: string;
  className?: string;
}

export function PingPongVideo({ 
  src, 
  className = "",
}: PingPongVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isReady, setIsReady] = useState(false);

  // Get preloaded blob URL if available
  const videoSrc = getVideoBlobUrl(src);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => {
      setIsReady(true);
      // Attempt autoplay
      video.play().catch(() => {
        // If autoplay blocked, will play on user interaction
      });
    };

    const handleEnded = () => {
      // Loop the video
      video.currentTime = 0;
      video.play().catch(() => {});
    };

    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("ended", handleEnded);

    // If video is already ready (preloaded), play immediately
    if (video.readyState >= 3) {
      setIsReady(true);
      video.play().catch(() => {});
    }

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("ended", handleEnded);
    };
  }, [videoSrc]);

  // Handle visibility changes - pause when hidden, play when visible
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isReady) return;

    const handleVisibility = () => {
      if (document.hidden) {
        video.pause();
      } else {
        video.play().catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [isReady]);

  return (
    <video
      ref={videoRef}
      src={videoSrc}
      muted
      playsInline
      loop
      preload="auto"
      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isReady ? 'opacity-100' : 'opacity-0'} ${className}`}
    />
  );
}
