import { motion } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import iconCoin from "@/assets/icons/icon-coin.png";
import iconGem from "@/assets/icons/icon-gem.png";

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return Math.floor(num / 1000000) + 'M';
  }
  if (num >= 1000) {
    return Math.floor(num / 1000) + 'K';
  }
  return num.toString();
};

interface AvatarCircleProps {
  avatarUrl?: string | null;
  animatedAvatarUrl?: string | null;
  size?: number;
  coins?: number;
  gems?: number;
  level?: number;
  xpProgress?: number; // 0-100 percentage
  xpCurrent?: number;
  xpTotal?: number;
}

export function AvatarCircle({ 
  avatarUrl, 
  animatedAvatarUrl,
  size = 320, 
  coins = 0,
  gems = 0,
  level = 1,
  xpProgress = 0,
  xpCurrent,
  xpTotal,
}: AvatarCircleProps) {
  const [showVideo, setShowVideo] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isReversing, setIsReversing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const progressRingWidth = 10;
  const whiteRingWidth = 24; // Thick white chunky ring
  const ringGap = 6;
  
  // Calculate SVG dimensions for circular progress
  const outerRadius = size / 2;
  const progressRadius = outerRadius - progressRingWidth / 2 - 2;
  
  // Arc goes from bottom-left to bottom-right
  // Extends behind the level badge chip
  const totalArcDegrees = 310;
  const arcCircumference = (totalArcDegrees / 360) * 2 * Math.PI * progressRadius;
  const progressOffset = arcCircumference - (xpProgress / 100) * arcCircumference;
  
  // Start angle adjusted to go behind chip
  const startAngle = 115;

  // Ping-pong reverse playback with delta time for normal speed
  const reversePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    let lastTime = performance.now();

    const step = (currentTime: number) => {
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      if (video.currentTime <= 0.05) {
        video.currentTime = 0;
        setIsReversing(false);
        video.play().catch(console.error);
        return;
      }
      video.currentTime = Math.max(0, video.currentTime - delta);
      animationFrameRef.current = requestAnimationFrame(step);
    };

    animationFrameRef.current = requestAnimationFrame(step);
  };

  const handleVideoEnded = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsReversing(true);
      reversePlay();
    }
  };

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);
  
  return (
    <div 
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Thick white chunky ring background */}
      <div 
        className="absolute rounded-full"
        style={{
          width: size,
          height: size,
          background: "linear-gradient(180deg, #FFFFFF 0%, #F8F6FC 50%, #F0ECF8 100%)",
          boxShadow: "inset 0 3px 8px rgba(140,120,180,0.2), 0 6px 16px rgba(0,0,0,0.12)",
          border: `${whiteRingWidth}px solid rgba(255,255,255,0.95)`,
          boxSizing: "border-box",
        }}
      />

      {/* Background track for progress ring */}
      <svg 
        className="absolute inset-0"
        width={size} 
        height={size}
        style={{ transform: `rotate(${startAngle}deg)` }}
      >
        <circle
          cx={outerRadius}
          cy={outerRadius}
          r={progressRadius}
          fill="none"
          stroke="rgba(200,190,220,0.4)"
          strokeWidth={progressRingWidth}
          strokeLinecap="round"
          strokeDasharray={`${arcCircumference} ${2 * Math.PI * progressRadius}`}
        />
      </svg>
      
      {/* Purple progress ring SVG */}
      <svg 
        className="absolute inset-0"
        width={size} 
        height={size}
        style={{ transform: `rotate(${startAngle}deg)`, zIndex: 1 }}
      >
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#C084FC" />
            <stop offset="50%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#9333EA" />
          </linearGradient>
          <filter id="progressGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Progress arc */}
        <motion.circle
          cx={outerRadius}
          cy={outerRadius}
          r={progressRadius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={progressRingWidth - 2}
          strokeLinecap="round"
          strokeDasharray={`${arcCircumference} ${2 * Math.PI * progressRadius}`}
          initial={{ strokeDashoffset: arcCircumference }}
          animate={{ strokeDashoffset: progressOffset }}
          transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
          filter="url(#progressGlow)"
        />
      </svg>

      {/* Inner white background circle */}
      <div 
        className="absolute rounded-full bg-white"
        style={{
          inset: progressRingWidth + ringGap,
          boxShadow: "inset 0 2px 8px rgba(0,0,0,0.05)",
        }}
      />

      {/* Avatar image/video container */}
      <div 
        className="relative z-10"
        onMouseEnter={() => {
          setIsHovering(true);
          if (animatedAvatarUrl && videoRef.current) {
            setShowVideo(true);
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(console.error);
          }
        }}
        onMouseLeave={() => setIsHovering(false)}
        onTouchStart={() => {
          if (animatedAvatarUrl && videoRef.current) {
            setShowVideo(true);
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(console.error);
          }
        }}
      >
        {avatarUrl ? (
          <>
            {/* Static avatar image */}
            <motion.img 
              src={avatarUrl} 
              alt="Avatar" 
              className="rounded-full object-cover"
              style={{
                width: size - (progressRingWidth + ringGap) * 2 - 8,
                height: size - (progressRingWidth + ringGap) * 2 - 8,
                opacity: showVideo && animatedAvatarUrl ? 0 : 1,
                transition: "opacity 0.3s ease",
              }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: showVideo && animatedAvatarUrl ? 0 : 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
            
            {/* Animated video overlay */}
            {animatedAvatarUrl && (
              <video
                ref={videoRef}
                src={animatedAvatarUrl}
                className="absolute inset-0 rounded-full object-cover"
                style={{
                  width: size - (progressRingWidth + ringGap) * 2 - 8,
                  height: size - (progressRingWidth + ringGap) * 2 - 8,
                  opacity: showVideo ? 1 : 0,
                  transition: "opacity 0.3s ease",
                }}
                muted
                playsInline
                onEnded={handleVideoEnded}
                onLoadedData={() => {
                  if (videoRef.current) {
                    videoRef.current.play().catch(console.error);
                    setShowVideo(true);
                  }
                }}
              />
            )}

            {/* Sparkle indicator for animated avatars */}
          </>
        ) : (
          <div 
            className="rounded-full flex items-center justify-center"
            style={{
              width: size - (progressRingWidth + ringGap) * 2 - 8,
              height: size - (progressRingWidth + ringGap) * 2 - 8,
              background: "linear-gradient(180deg, #FFFFFF 0%, #F5F3FA 50%, #EDE8F5 100%)",
              boxShadow: "inset 0 4px 8px rgba(140,120,180,0.1), inset 0 -2px 4px rgba(255,255,255,0.9), 0 4px 0 #D8D0E8, 0 6px 12px rgba(0,0,0,0.12)",
              border: "3px solid rgba(255,255,255,0.95)",
            }}
          >
            <span className="text-6xl">🎮</span>
          </div>
        )}
      </div>


      {/* Level badge at bottom center - 3D chunky white style */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20" style={{ marginBottom: -15 }}>
        <div 
          className="flex flex-col items-center px-5 py-2 rounded-full whitespace-nowrap"
          style={{
            background: "linear-gradient(180deg, #FFFFFF 0%, #F5F3FA 50%, #EDE8F5 100%)",
            boxShadow: "inset 0 4px 8px rgba(140,120,180,0.1), inset 0 -2px 4px rgba(255,255,255,0.9), 0 4px 0 #D8D0E8, 0 6px 12px rgba(0,0,0,0.12)",
            border: "3px solid rgba(255,255,255,0.95)",
          }}
        >
          <span className="font-bold text-gray-800 text-base">Level {level}</span>
          <span className="text-gray-500 text-xs">
            {xpCurrent !== undefined ? xpCurrent.toLocaleString() : 0} / {xpTotal !== undefined ? xpTotal.toLocaleString() : 0} XP
          </span>
        </div>
      </div>
    </div>
  );
}
