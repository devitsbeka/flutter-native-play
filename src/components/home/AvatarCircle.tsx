import { motion } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Sparkles } from "lucide-react";
import iconCoin from "@/assets/icons/icon-coin.png";
import iconGem from "@/assets/icons/icon-gem.png";
import aiSparkleIcon from "@/assets/icons/ai-sparkle.png";
import { resolveAvatarUrl } from "@/utils/avatarUtils";
import { SinglePlayVideo } from "@/components/shared/SinglePlayVideo";
import { ProBadge } from "@/components/shared/ProBadge";
import guestWelcomeVideo from "@/assets/guest-welcome-avatar.mp4";

// Silently ignore AbortError from play() — expected when video is removed from DOM (e.g. StrictMode remount)
const safePlay = (video: HTMLVideoElement) =>
  video.play().catch((e) => { if (e.name !== "AbortError") console.error(e); });

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
  hideStats?: boolean;
  showAvatarPrompt?: boolean; // Show sparkle badge to prompt user to create animated avatar
  showMascotReminder?: boolean; // Show mascot video as reminder to set avatar
  showAnimatePrompt?: boolean; // Show "გააცოცხლე ავატარი" pill button
  onAnimateClick?: () => void; // Callback when animate button is tapped
  userId?: string; // User ID for localStorage tracking
  autoPlayInterval?: number; // Auto-replay video every N ms (e.g. 5000 for 5s)
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
  hideStats = false,
  showAvatarPrompt = false,
  showMascotReminder = false,
  showAnimatePrompt = false,
  onAnimateClick,
  userId,
  autoPlayInterval,
}: AvatarCircleProps) {
  const { t } = useLanguage();
  const [showVideo, setShowVideo] = useState(!!autoPlayInterval);
  const [isHovering, setIsHovering] = useState(false);
  const [isReversing, setIsReversing] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);
  const [mascotFinished, setMascotFinished] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const autoPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Check if mascot has been shown for this user (localStorage)
  const mascotStorageKey = userId ? `mytrivia_mascot_shown_${userId}` : null;
  const [hasMascotPlayed, setHasMascotPlayed] = useState(() => {
    if (!mascotStorageKey) return true; // No userId = don't show mascot
    return localStorage.getItem(mascotStorageKey) === 'true';
  });
  
  // Determine if we should show the mascot reminder
  const shouldShowMascot = showMascotReminder && !avatarUrl && !hasMascotPlayed && !mascotFinished;
  // Auto-play mode: show video as primary content, no static image needed
  const isAutoPlayMode = !!autoPlayInterval && !!animatedAvatarUrl;
  const progressRingWidth = 20;
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
        // In auto-play mode, schedule next play after interval
        if (isAutoPlayMode && autoPlayInterval) {
          autoPlayTimerRef.current = setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.currentTime = 0;
              safePlay(videoRef.current);
            }
          }, autoPlayInterval);
        } else {
          safePlay(video);
        }
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

  // Cleanup animation frame and auto-play timer on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
    };
  }, []);

  // Auto-play mode: start playing on mount
  useEffect(() => {
    if (isAutoPlayMode && videoRef.current) {
      videoRef.current.currentTime = 0;
      safePlay(videoRef.current);
      setShowVideo(true);
    }
  }, [isAutoPlayMode]);

  // Reset error state when avatarUrl changes
  useEffect(() => {
    setHasImageError(false);
  }, [avatarUrl]);
  
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
          if (!isAutoPlayMode) {
            setIsHovering(true);
            if (animatedAvatarUrl && videoRef.current) {
              setShowVideo(true);
              videoRef.current.currentTime = 0;
              safePlay(videoRef.current);
            }
          }
        }}
        onMouseLeave={() => { if (!isAutoPlayMode) setIsHovering(false); }}
        onTouchStart={() => {
          if (!isAutoPlayMode && animatedAvatarUrl && videoRef.current) {
            setShowVideo(true);
            videoRef.current.currentTime = 0;
            safePlay(videoRef.current);
          }
        }}
      >
        {/* Auto-play mode: video is primary content (e.g. guest mascot) */}
        {isAutoPlayMode ? (
          <div 
            className="rounded-full overflow-hidden relative"
            style={{
              width: size - (progressRingWidth + ringGap) * 2 - 8,
              height: size - (progressRingWidth + ringGap) * 2 - 8,
            }}
          >
            <video
              ref={videoRef}
              src={animatedAvatarUrl!}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: 'center 20%', transform: 'scale(1.3)' }}
              muted
              playsInline
              onEnded={handleVideoEnded}
              onLoadedData={() => {
                if (videoRef.current) {
                  safePlay(videoRef.current);
                  setShowVideo(true);
                }
              }}
            />
          </div>
        ) : avatarUrl && !hasImageError ? (
          <>
            {/* Static avatar image */}
            <motion.img 
              src={resolveAvatarUrl(avatarUrl) || avatarUrl} 
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
              onError={() => setHasImageError(true)}
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
                    safePlay(videoRef.current);
                    setShowVideo(true);
                  }
                }}
              />
            )}

            {/* Sparkle indicator for animated avatars */}
            
            {/* Avatar prompt badge - shows when user should create animated avatar */}
            {showAvatarPrompt && !animatedAvatarUrl && (
              <motion.div
                className="absolute -top-2 -right-2 rounded-full p-2 shadow-lg z-20"
                style={{
                  background: "linear-gradient(135deg, #A855F7 0%, #EC4899 100%)",
                  boxShadow: "0 4px 12px rgba(168, 85, 247, 0.4)",
                }}
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles className="w-4 h-4 text-white" />
              </motion.div>
            )}
          </>
        ) : shouldShowMascot ? (
          /* Mascot reminder video - plays once for users without avatar */
          <div 
            className="rounded-full overflow-hidden relative"
            style={{
              width: size - (progressRingWidth + ringGap) * 2 - 8,
              height: size - (progressRingWidth + ringGap) * 2 - 8,
            }}
          >
            <SinglePlayVideo 
              src={guestWelcomeVideo}
              className="w-full h-full object-cover"
              style={{ objectPosition: 'center 20%', transform: 'scale(1.3)' }}
              onEnded={() => {
                setMascotFinished(true);
                setHasMascotPlayed(true);
                if (mascotStorageKey) {
                  localStorage.setItem(mascotStorageKey, 'true');
                }
              }}
            />
          </div>
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


      {/* PRO crown, top-right of the ring. Placed off the circle's own radius
          rather than a corner of the box, so it sits ON the ring at every
          size this avatar is drawn at. Nothing renders for a player without a
          subscription. */}
      <div
        className="absolute z-30 pointer-events-none"
        style={{
          top: size * 0.5 - Math.cos(Math.PI / 4) * (size * 0.5) - size * 0.04,
          left: size * 0.5 + Math.sin(Math.PI / 4) * (size * 0.5) - size * 0.04,
        }}
      >
        <ProBadge variant="crown" size={size >= 200 ? "xl" : "lg"} />
      </div>

      {/* "გააცოცხლე ავატარი" animate prompt button - above level badge */}
      {showAnimatePrompt && !hideStats && (
        <motion.button
          className="absolute left-1/2 -translate-x-1/2 z-30 flex items-center justify-center gap-1.5 px-6 py-2 rounded-full pointer-events-auto"
          style={{
            bottom: 38,
            background: "linear-gradient(135deg, #EC4899 0%, #8B5CF6 50%, #3B82F6 100%)",
            boxShadow: "0 4px 14px rgba(59, 130, 246, 0.4), 0 2px 6px rgba(236, 72, 153, 0.3)",
            border: "2px solid rgba(255,255,255,0.3)",
          }}
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          whileTap={{ scale: 0.92 }}
          onClick={(e) => {
            e.stopPropagation();
            onAnimateClick?.();
          }}
        >
          <img src={aiSparkleIcon} alt="" className="w-4 h-4" />
          <span className="text-white text-sm font-bold whitespace-nowrap">{t("extra.animateAvatarPrompt")}</span>
        </motion.button>
      )}

      {/* Level badge at bottom center - 3D chunky purple style with particles */}
      {!hideStats && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20" style={{ marginBottom: -15 }}>
          <div 
            className="relative flex flex-col items-center px-5 py-2 rounded-full whitespace-nowrap overflow-hidden"
            style={{
              background: "linear-gradient(180deg, #C084FC 0%, #A855F7 50%, #9333EA 100%)",
              boxShadow: "inset 0 4px 8px rgba(255,255,255,0.25), inset 0 -3px 6px rgba(0,0,0,0.2), 0 5px 0 #7C3AED, 0 8px 16px rgba(0,0,0,0.25)",
              border: "3px solid rgba(255,255,255,0.3)",
            }}
          >
            {/* Animated particles for 3D depth */}
            <div className="absolute inset-0 overflow-hidden rounded-full">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: Math.random() * 4 + 2,
                    height: Math.random() * 4 + 2,
                    background: `rgba(255,255,255,${Math.random() * 0.4 + 0.2})`,
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    y: [0, -15, 0],
                    x: [0, Math.random() * 10 - 5, 0],
                    opacity: [0.3, 0.8, 0.3],
                    scale: [1, 1.3, 1],
                  }}
                  transition={{
                    duration: Math.random() * 2 + 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
            
            {/* Glossy highlight */}
            <div 
              className="absolute inset-x-0 top-0 h-1/2 rounded-t-full opacity-30"
              style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 100%)",
              }}
            />
            
            <span className="relative font-bold text-white text-base drop-shadow-sm">{t("extra.levelNum", { num: level })}</span>
            <span className="relative text-white/80 text-xs drop-shadow-sm">
              {xpCurrent !== undefined ? xpCurrent.toLocaleString() : 0} / {xpTotal !== undefined ? xpTotal.toLocaleString() : 0} XP
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
