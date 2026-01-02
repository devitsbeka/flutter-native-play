import { useRef, useEffect, useState } from "react";

interface PingPongVideoProps {
  src: string;
  className?: string;
}

export function PingPongVideo({ src, className = "" }: PingPongVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isReversing, setIsReversing] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let isMounted = true;
    let reversing = false;

    const reversePlayback = () => {
      if (!isMounted || !video) return;
      
      const now = performance.now();
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      // Move backwards at normal speed
      video.currentTime = Math.max(0, video.currentTime - delta);

      if (video.currentTime <= 0.02) {
        // Reached the start, switch to forward
        reversing = false;
        setIsReversing(false);
        video.currentTime = 0;
        video.play().catch(() => {});
      } else {
        rafRef.current = requestAnimationFrame(reversePlayback);
      }
    };

    const handleTimeUpdate = () => {
      if (!isMounted || reversing) return;
      
      // Start reversing when we're very close to the end (within 50ms)
      if (video.duration && video.currentTime >= video.duration - 0.05) {
        video.pause();
        reversing = true;
        setIsReversing(true);
        lastTimeRef.current = performance.now();
        rafRef.current = requestAnimationFrame(reversePlayback);
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.play().catch(() => {});

    return () => {
      isMounted = false;
      video.removeEventListener("timeupdate", handleTimeUpdate);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      src={src}
      muted
      playsInline
      className={`absolute inset-0 w-full h-full object-cover ${className}`}
    />
  );
}