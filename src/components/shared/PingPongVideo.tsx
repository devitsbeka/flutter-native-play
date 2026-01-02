import { useRef, useEffect } from "react";

interface PingPongVideoProps {
  src: string;
  className?: string;
  segmentDuration?: number; // Duration of the ping-pong segment in seconds
}

export function PingPongVideo({ 
  src, 
  className = "",
  segmentDuration = 2.5 // Use 2.5 seconds of the video
}: PingPongVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);
  const directionRef = useRef<1 | -1>(1); // 1 = forward, -1 = backward
  const lastFrameTimeRef = useRef<number>(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let isMounted = true;

    const animate = (timestamp: number) => {
      if (!isMounted || !video) return;

      // Calculate delta time
      const delta = lastFrameTimeRef.current ? (timestamp - lastFrameTimeRef.current) / 1000 : 0;
      lastFrameTimeRef.current = timestamp;

      // Clamp delta to avoid large jumps
      const clampedDelta = Math.min(delta, 0.1);

      // Update video time based on direction
      const newTime = video.currentTime + (clampedDelta * directionRef.current);

      // Check bounds and reverse direction
      if (newTime >= segmentDuration) {
        video.currentTime = segmentDuration;
        directionRef.current = -1; // Start going backward
      } else if (newTime <= 0) {
        video.currentTime = 0;
        directionRef.current = 1; // Start going forward
      } else {
        video.currentTime = newTime;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    const startAnimation = () => {
      video.pause(); // We control playback manually
      video.currentTime = 0;
      directionRef.current = 1;
      lastFrameTimeRef.current = 0;
      rafRef.current = requestAnimationFrame(animate);
    };

    // Wait for video to be ready
    if (video.readyState >= 2) {
      startAnimation();
    } else {
      video.addEventListener("loadeddata", startAnimation, { once: true });
    }

    return () => {
      isMounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [src, segmentDuration]);

  return (
    <video
      ref={videoRef}
      src={src}
      muted
      playsInline
      preload="auto"
      className={`absolute inset-0 w-full h-full object-cover ${className}`}
    />
  );
}