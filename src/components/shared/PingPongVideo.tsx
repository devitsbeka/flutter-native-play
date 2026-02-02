import { useRef, useEffect, useState } from "react";
import { getVideoBlobUrl } from "@/components/game/VideoPreloader";

interface PingPongVideoProps {
  src: string;
  className?: string;
  rootMargin?: string;
  style?: React.CSSProperties;
}

export function PingPongVideo({ 
  src, 
  className = "",
  rootMargin = "200px",
  style,
}: PingPongVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Get preloaded blob URL if available, fallback to original src
  const preloadedUrl = getVideoBlobUrl(src);
  const videoSrc = preloadedUrl !== src ? preloadedUrl : src;

  // Intersection Observer - detect when video enters viewport
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      {
        rootMargin,
        threshold: 0.1,
      }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [rootMargin]);

  // Only load and play video when in view
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isInView) {
      // Video is in viewport - load and play
      // Always set src when in view to ensure video loads
      if (video.src !== videoSrc) {
        video.src = videoSrc;
        video.load();
      }
      
      const handleCanPlay = () => {
        setIsReady(true);
        video.play().catch(() => {});
      };

      video.addEventListener("canplay", handleCanPlay);
      video.addEventListener("loadeddata", handleCanPlay);
      
      if (video.readyState >= 3) {
        setIsReady(true);
        video.play().catch(() => {});
      }

      return () => {
        video.removeEventListener("canplay", handleCanPlay);
        video.removeEventListener("loadeddata", handleCanPlay);
      };
    } else {
      // Video left viewport - pause to save resources
      video.pause();
    }
  }, [isInView, videoSrc]);

  // Handle page visibility changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isReady || !isInView) return;

    const handleVisibility = () => {
      if (document.hidden) {
        video.pause();
      } else if (isInView) {
        video.play().catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [isReady, isInView]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <video
        ref={videoRef}
        muted
        playsInline
        loop
        preload="none"
        style={style}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          isReady && isInView ? 'opacity-100' : 'opacity-0'
        } ${className}`}
      />
    </div>
  );
}
