import { useRef, useEffect, useState } from "react";

interface PingPongVideoProps {
  src: string;
  className?: string;
  segmentDuration?: number;
}

export function PingPongVideo({ 
  src, 
  className = "",
  segmentDuration = 2.5
}: PingPongVideoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const framesRef = useRef<ImageData[]>([]);
  const [isReady, setIsReady] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let isMounted = true;

    // Create hidden video element
    const video = document.createElement("video");
    video.src = src;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.crossOrigin = "anonymous";
    videoRef.current = video;

    const captureFrames = async () => {
      if (!isMounted) return;

      // Set canvas size to match video
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;

      const frames: ImageData[] = [];
      const fps = 30;
      const totalFrames = Math.floor(segmentDuration * fps);
      
      // Capture frames by seeking through the video
      for (let i = 0; i < totalFrames && isMounted; i++) {
        const time = (i / fps);
        video.currentTime = time;
        
        await new Promise<void>((resolve) => {
          const onSeeked = () => {
            video.removeEventListener("seeked", onSeeked);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            frames.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
            resolve();
          };
          video.addEventListener("seeked", onSeeked);
        });
      }

      if (!isMounted) return;

      // Create ping-pong sequence: forward + reverse (excluding first and last to avoid pause)
      const reversedFrames = frames.slice(1, -1).reverse();
      framesRef.current = [...frames, ...reversedFrames];
      setIsReady(true);

      // Start playback loop
      let frameIndex = 0;
      const frameInterval = 1000 / fps;
      let lastTime = performance.now();

      const animate = (timestamp: number) => {
        if (!isMounted) return;

        const elapsed = timestamp - lastTime;
        
        if (elapsed >= frameInterval) {
          lastTime = timestamp - (elapsed % frameInterval);
          
          if (framesRef.current.length > 0) {
            ctx.putImageData(framesRef.current[frameIndex], 0, 0);
            frameIndex = (frameIndex + 1) % framesRef.current.length;
          }
        }

        rafRef.current = requestAnimationFrame(animate);
      };

      rafRef.current = requestAnimationFrame(animate);
    };

    video.addEventListener("loadeddata", () => {
      if (video.readyState >= 2) {
        captureFrames();
      }
    });

    video.load();

    return () => {
      isMounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      video.src = "";
      framesRef.current = [];
    };
  }, [src, segmentDuration]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full object-cover ${className}`}
      style={{ opacity: isReady ? 1 : 0 }}
    />
  );
}