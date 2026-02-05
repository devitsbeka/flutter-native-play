import { useRef, useEffect, useState } from "react";
import { getVideoBlobUrl } from "@/components/game/VideoPreloader";
import { videoLoadQueue } from "@/utils/videoLoadQueue";

interface PingPongVideoProps {
  src: string;
  posterUrl?: string;
  className?: string;
  rootMargin?: string;
  style?: React.CSSProperties;
}

export function PingPongVideo({ 
  src, 
  posterUrl,
  className = "",
  rootMargin = "50px", // Reduced from 200px for better performance
  style,
}: PingPongVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [hasAcquiredSlot, setHasAcquiredSlot] = useState(false);
  const [posterError, setPosterError] = useState(false);

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

  // Queue-based video loading
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isInView) {
      // Release slot when leaving view
      if (hasAcquiredSlot) {
        videoLoadQueue.release(videoSrc);
        setHasAcquiredSlot(false);
      }
      return;
    }

    let cancelled = false;

    const loadVideo = async () => {
      try {
        // Wait for a slot in the queue
        await videoLoadQueue.acquire(videoSrc);
        if (cancelled) {
          videoLoadQueue.release(videoSrc);
          return;
        }
        setHasAcquiredSlot(true);

        // Now load the video
        if (video.src !== videoSrc) {
          video.src = videoSrc;
          video.load();
        }

        const handleCanPlay = () => {
          if (!cancelled) {
            setIsReady(true);
            video.play().catch(() => {});
          }
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
      } catch {
        // Queue cancelled
      }
    };

    loadVideo();

    return () => {
      cancelled = true;
      if (hasAcquiredSlot) {
        videoLoadQueue.release(videoSrc);
        setHasAcquiredSlot(false);
      }
      video.pause();
    };
  }, [isInView, videoSrc, hasAcquiredSlot]);

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
      {/* Poster image - shows instantly while video loads, hidden on error */}
      {posterUrl && !posterError && (
        <img 
          src={posterUrl}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            isReady && isInView ? 'opacity-0' : 'opacity-100'
          }`}
          loading="lazy"
          onError={() => setPosterError(true)}
        />
      )}
      <video
        ref={videoRef}
        muted
        playsInline
        loop
        preload="none"
        style={style}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          isReady && isInView ? 'opacity-100' : 'opacity-0'
        } ${className}`}
      />
    </div>
  );
}
