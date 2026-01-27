import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  src: string;
  autoPlay?: boolean;
  className?: string;
}

export function AudioPlayer({ src, autoPlay = true, className }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      if (autoPlay) {
        audio.play().catch(() => {
          // Autoplay blocked, user needs to interact
          setIsPlaying(false);
        });
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    const handleTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [autoPlay, src]);

  // Reset when src changes
  useEffect(() => {
    setProgress(0);
    setIsPlaying(false);
  }, [src]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  // Waveform bars animation
  const bars = Array.from({ length: 20 }, (_, i) => i);

  return (
    <div className={cn("w-full h-32 flex flex-col items-center justify-center gap-4 rounded-t-2xl bg-gradient-to-r from-purple-600 to-blue-600", className)}>
      <audio ref={audioRef} src={src} preload="metadata" />
      
      {/* Waveform visualization */}
      <div className="flex items-end gap-1 h-12">
        {bars.map((i) => (
          <motion.div
            key={i}
            className="w-1.5 bg-white/80 rounded-full"
            animate={{
              height: isPlaying 
                ? [8, 16 + Math.random() * 24, 8] 
                : 8,
            }}
            transition={{
              duration: 0.4 + Math.random() * 0.3,
              repeat: isPlaying ? Infinity : 0,
              delay: i * 0.05,
            }}
            style={{ height: 8 }}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlayPause}
          className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
        >
          {isPlaying ? (
            <Pause className="w-7 h-7 text-white" fill="white" />
          ) : (
            <Play className="w-7 h-7 text-white ml-1" fill="white" />
          )}
        </button>
        
        {/* Progress bar */}
        <div className="w-32 h-1.5 bg-white/30 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-white rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <Volume2 className="w-5 h-5 text-white/70" />
      </div>
    </div>
  );
}
