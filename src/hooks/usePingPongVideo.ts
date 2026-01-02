import { useEffect, useRef, useState, useCallback } from "react";

interface UsePingPongVideoOptions {
  videoUrl: string | null;
  canvasSize: number;
  fps?: number;
  autoPlay?: boolean;
  loop?: boolean;
}

interface UsePingPongVideoResult {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isReady: boolean;
  isPlaying: boolean;
  play: () => void;
  pause: () => void;
  reset: () => void;
}

// Extracts frames from video using hidden video element + canvas capture
async function extractFramesFromVideo(
  videoUrl: string,
  canvasSize: number,
  fps: number = 30
): Promise<ImageBitmap[]> {
  return new Promise(async (resolve, reject) => {
    try {
      // Fetch video as blob to avoid CORS issues
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";

      const frames: ImageBitmap[] = [];
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvasSize;
      tempCanvas.height = canvasSize;
      const tempCtx = tempCanvas.getContext("2d")!;

      video.onloadedmetadata = async () => {
        const duration = video.duration;
        const frameCount = Math.min(Math.floor(duration * fps), 120); // Cap at 120 frames
        const frameInterval = duration / frameCount;

        // Extract frames by seeking
        for (let i = 0; i < frameCount; i++) {
          video.currentTime = i * frameInterval;
          await new Promise<void>((seekResolve) => {
            video.onseeked = async () => {
              tempCtx.drawImage(video, 0, 0, canvasSize, canvasSize);
              const bitmap = await createImageBitmap(tempCanvas);
              frames.push(bitmap);
              seekResolve();
            };
          });
        }

        URL.revokeObjectURL(blobUrl);
        resolve(frames);
      };

      video.onerror = (e) => {
        URL.revokeObjectURL(blobUrl);
        reject(new Error("Failed to load video"));
      };

      video.src = blobUrl;
      video.load();
    } catch (error) {
      reject(error);
    }
  });
}

export function usePingPongVideo({
  videoUrl,
  canvasSize,
  fps = 30,
  autoPlay = true,
  loop = true,
}: UsePingPongVideoOptions): UsePingPongVideoResult {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<ImageBitmap[]>([]);
  const pingPongFramesRef = useRef<ImageBitmap[]>([]);
  const animationRef = useRef<number | null>(null);
  const frameIndexRef = useRef(0);
  const isPlayingRef = useRef(false);
  const lastTimeRef = useRef(0);

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Create ping-pong sequence from frames
  const createPingPongFrames = useCallback((frames: ImageBitmap[]) => {
    if (frames.length === 0) return [];
    // Forward + reverse (excluding first and last to avoid duplicate frames at boundaries)
    const reversed = [...frames].slice(1, -1).reverse();
    return [...frames, ...reversed];
  }, []);

  // Animation loop
  const animate = useCallback((currentTime: number) => {
    if (!isPlayingRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const frames = pingPongFramesRef.current;

    if (!canvas || !ctx || frames.length === 0) return;

    const frameTime = 1000 / fps;
    const elapsed = currentTime - lastTimeRef.current;

    if (elapsed >= frameTime) {
      lastTimeRef.current = currentTime - (elapsed % frameTime);

      // Draw current frame
      ctx.drawImage(frames[frameIndexRef.current], 0, 0, canvas.width, canvas.height);

      // Move to next frame
      frameIndexRef.current = (frameIndexRef.current + 1) % frames.length;

      // Handle non-looping
      if (!loop && frameIndexRef.current === 0) {
        isPlayingRef.current = false;
        setIsPlaying(false);
        return;
      }
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [fps, loop]);

  const play = useCallback(() => {
    if (isPlayingRef.current || pingPongFramesRef.current.length === 0) return;
    isPlayingRef.current = true;
    setIsPlaying(true);
    lastTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(animate);
  }, [animate]);

  const pause = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    frameIndexRef.current = 0;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const frames = pingPongFramesRef.current;
    if (canvas && ctx && frames.length > 0) {
      ctx.drawImage(frames[0], 0, 0, canvas.width, canvas.height);
    }
  }, []);

  // Extract frames when video URL changes
  useEffect(() => {
    if (!videoUrl) {
      setIsReady(false);
      return;
    }

    let cancelled = false;

    const loadFrames = async () => {
      try {
        console.log("[PingPong] Extracting frames from:", videoUrl);
        const frames = await extractFramesFromVideo(videoUrl, canvasSize, fps);
        
        if (cancelled) {
          frames.forEach((f) => f.close());
          return;
        }

        console.log("[PingPong] Extracted", frames.length, "frames");
        framesRef.current = frames;
        
        const pingPong = createPingPongFrames(frames);
        pingPongFramesRef.current = pingPong;
        console.log("[PingPong] Created ping-pong with", pingPong.length, "frames");

        setIsReady(true);

        // Draw first frame
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (canvas && ctx && pingPong.length > 0) {
          ctx.drawImage(pingPong[0], 0, 0, canvas.width, canvas.height);
        }

        // Auto-play if enabled
        if (autoPlay) {
          isPlayingRef.current = true;
          setIsPlaying(true);
          lastTimeRef.current = performance.now();
          animationRef.current = requestAnimationFrame(animate);
        }
      } catch (error) {
        console.error("[PingPong] Failed to extract frames:", error);
        setIsReady(false);
      }
    };

    loadFrames();

    return () => {
      cancelled = true;
      pause();
      // Clean up bitmaps
      framesRef.current.forEach((f) => f.close());
      framesRef.current = [];
      pingPongFramesRef.current = [];
    };
  }, [videoUrl, canvasSize, fps, autoPlay, animate, pause, createPingPongFrames]);

  return {
    canvasRef,
    isReady,
    isPlaying,
    play,
    pause,
    reset,
  };
}
