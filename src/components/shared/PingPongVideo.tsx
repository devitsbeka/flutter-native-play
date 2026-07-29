import { useRef, useEffect, useState } from "react";
import { getVideoBlobUrl } from "@/components/game/VideoPreloader";
import { videoLoadQueue } from "@/utils/videoLoadQueue";
import { useResponsiveVideo } from "@/hooks/useResponsiveVideo";

interface PingPongVideoProps {
  src: string;
  posterUrl?: string;
  className?: string;
  rootMargin?: string;
  style?: React.CSSProperties;
  /** When false, video will not load or play (default: true) */
  active?: boolean;
}

export function PingPongVideo({
  src,
  posterUrl,
  className = "",
  rootMargin = "200px",
  style,
  active = true,
}: PingPongVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [posterError, setPosterError] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Get responsive video URLs (WebM + MP4, sized for viewport)
  const { webm: webmSrc, mp4: mp4Src } = useResponsiveVideo(src);

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
      return;
    }

    // If already loaded, just resume playback
    if (isReady) {
      video.play().catch(() => {});
      return;
    }

    let cancelled = false;
    let cleanupListeners: (() => void) | null = null;

    const loadVideo = async () => {
      try {
        // Wait for a slot in the queue
        await videoLoadQueue.acquire(videoSrc);
        if (cancelled) {
          videoLoadQueue.release(videoSrc);
          return;
        }

        // Load via <source> elements - browser picks best format
        video.load();

        const handleCanPlay = () => {
          if (!cancelled) {
            setIsReady(true);
            // Release queue slot immediately - download is done
            videoLoadQueue.release(videoSrc);
            video.play().catch(() => {});
          }
        };

        const handleError = () => {
          if (!cancelled) {
            // Release queue slot so other videos can load
            videoLoadQueue.release(videoSrc);
            // Mark as error so poster stays visible instead of permanent blank
            setVideoError(true);
            setIsReady(true);
          }
        };

        video.addEventListener("canplay", handleCanPlay, { once: true });
        video.addEventListener("loadeddata", handleCanPlay, { once: true });
        video.addEventListener("error", handleError, { once: true });

        cleanupListeners = () => {
          video.removeEventListener("canplay", handleCanPlay);
          video.removeEventListener("loadeddata", handleCanPlay);
          video.removeEventListener("error", handleError);
        };

        if (video.readyState >= 3) {
          handleCanPlay();
        }
      } catch {
        // Queue cancelled
      }
    };

    loadVideo();

    return () => {
      cancelled = true;
      cleanupListeners?.();
      videoLoadQueue.release(videoSrc);
      video.pause();
    };
  }, [isInView, videoSrc, active, isReady]);

  // Handle page visibility changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isReady || !isInView || videoError) return;

    const handleVisibility = () => {
      if (document.hidden) {
        video.pause();
      } else if (isInView) {
        video.play().catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [isReady, isInView, videoError]);

  return (
    // pointer-events-none: this is decorative background only, never
    // interactive. Without it the <video> swallows taps - on iOS a video
    // element captures touches even with playsInline and no controls - so a
    // tap on the artwork, which is most of a category card, never reached the
    // card's own onClick. That is the "I had to tap several times to open a
    // category" report: the taps that did work were the ones that happened to
    // land on the title strip below the video.
    //
    // Every other overlay in AirbnbCategoryCard already sets this; the media
    // layer was the one that did not. Applied here rather than at the call
    // site so all seven usages get it - they are all backgrounds behind
    // clickable cards.
    <div ref={containerRef} className="absolute inset-0 pointer-events-none">
      {/* Poster image - shows instantly while video loads, stays visible on video error */}
      {posterUrl && !posterError && (
        <img
          src={posterUrl}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            isReady && !videoError ? 'opacity-0' : 'opacity-100'
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
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
          isReady && !videoError ? 'opacity-100' : 'opacity-0'
        } ${className}`}
      >
        <source src={videoSrc} type="video/webm" />
        <source src={mp4Src} type="video/mp4" />
      </video>
    </div>
  );
}
