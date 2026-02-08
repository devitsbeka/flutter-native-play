import { useRef, useEffect, useState } from "react";
import { getVideoBlobUrl } from "@/components/game/VideoPreloader";
import { videoLoadQueue } from "@/utils/videoLoadQueue";
import { useResponsiveVideo } from "@/hooks/useResponsiveVideo";
import { toWebmUrl } from "@/config/videoConfig";

interface PingPongVideoProps {
  src: string;
  posterUrl?: string;
  className?: string;
  rootMargin?: string;
  style?: React.CSSProperties;
  /** When true, skip mobile WebM and always use desktop 720px variant */
  forceDesktopQuality?: boolean;
  /** When false, video will not load or play (default: true) */
  active?: boolean;
}

export function PingPongVideo({
  src,
  posterUrl,
  className = "",
  rootMargin = "200px",
  style,
  forceDesktopQuality = false,
  active = true,
}: PingPongVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [hasAcquiredSlot, setHasAcquiredSlot] = useState(false);
  const [posterError, setPosterError] = useState(false);

  // Get responsive video URLs (WebM + MP4, sized for viewport)
  const { webm: responsiveWebm, mp4: mp4Src } = useResponsiveVideo(src);
  // If forceDesktopQuality, always use desktop WebM (skip mobile variant)
  const webmSrc = forceDesktopQuality ? toWebmUrl(src) : responsiveWebm;

  // Get preloaded blob URL if available, fallback to WebM source
  const preloadedUrl = getVideoBlobUrl(webmSrc);
  const videoSrc = preloadedUrl !== webmSrc ? preloadedUrl : webmSrc;

  // Intersection Observer - detect when video enters viewport
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { rootMargin }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [rootMargin]);

  // Queue-based video loading - also respects `active` prop
  // Once loaded, video stays loaded (isReady persists) - only pause/resume on visibility
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // If not in view or not active, just pause (don't unload)
    if (!isInView || !active) {
      video.pause();
      // Release slot when leaving view but keep isReady state
      if (hasAcquiredSlot) {
        videoLoadQueue.release(videoSrc);
        setHasAcquiredSlot(false);
      }
      return;
    }

    // If already loaded, just resume playback
    if (isReady) {
      video.play().catch(() => {});
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

        // Load via <source> elements - browser picks best format
        video.load();

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
  }, [isInView, videoSrc, hasAcquiredSlot, active, isReady]);

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
      >
        <source src={videoSrc} type="video/webm" />
        <source src={mp4Src} type="video/mp4" />
      </video>
    </div>
  );
}
