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

    const reversePlayback = () => {
      if (!isMounted || !video) return;
      
      const now = performance.now();
      const delta = (now - lastTimeRef.current) / 1000; // Convert to seconds
      lastTimeRef.current = now;

      // Move backwards at normal speed
      video.currentTime = Math.max(0, video.currentTime - delta);

      if (video.currentTime <= 0.05) {
        // Reached the start, switch to forward
        setIsReversing(false);
        video.currentTime = 0;
        video.play().catch(() => {});
      } else {
        rafRef.current = requestAnimationFrame(reversePlayback);
      }
    };

    const handleEnded = () => {
      if (!isMounted) return;
      // Video reached the end, start reversing
      video.pause();
      setIsReversing(true);
      lastTimeRef.current = performance.now();
      rafRef.current = requestAnimationFrame(reversePlayback);
    };

    video.addEventListener("ended", handleEnded);
    video.play().catch(() => {});

    return () => {
      isMounted = false;
      video.removeEventListener("ended", handleEnded);
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