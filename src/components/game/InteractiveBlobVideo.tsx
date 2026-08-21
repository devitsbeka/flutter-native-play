import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useMemo } from "react";
import { useCategories } from "@/hooks/useCategories";
import { toWebmUrl, videoUrl } from "@/config/videoConfig";

// CSS clip-path squircle paths (pixel units for 220x220 container)
const MAIN_BLOB_PATH = "M110,26.4 C171.6,26.4 193.6,48.4 193.6,110 C193.6,171.6 171.6,193.6 110,193.6 C48.4,193.6 26.4,171.6 26.4,110 C26.4,48.4 48.4,26.4 110,26.4";
const BORDER_BLOB_PATH = "M110,22 C176,22 198,44 198,110 C198,176 176,198 110,198 C44,198 22,176 22,110 C22,44 44,22 110,22";

// Build icon URL from slug
function getIconUrl(slug: string): string {
  return `https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library/${slug}.png`;
}

// Color palettes for slot animation
const SLOT_COLORS = [
  { bg: "linear-gradient(135deg, #FF6B6B, #FF8E8E)", particle: "#FF6B6B", border: "#FFB3B3" },
  { bg: "linear-gradient(135deg, #4ECDC4, #7EDDD6)", particle: "#4ECDC4", border: "#A8EBE6" },
  { bg: "linear-gradient(135deg, #45B7D1, #6FC9DD)", particle: "#45B7D1", border: "#A3DDE9" },
  { bg: "linear-gradient(135deg, #96CEB4, #B0DAC7)", particle: "#96CEB4", border: "#C8E8D8" },
  { bg: "linear-gradient(135deg, #FFEAA7, #FFF0C2)", particle: "#FFEAA7", border: "#FFF5D6" },
  { bg: "linear-gradient(135deg, #DDA0DD, #E8BFE8)", particle: "#DDA0DD", border: "#F0D4F0" },
  { bg: "linear-gradient(135deg, #F39C12, #F5B041)", particle: "#F39C12", border: "#F8C77B" },
  { bg: "linear-gradient(135deg, #9B59B6, #B47CC7)", particle: "#9B59B6", border: "#CDA0D8" },
];

interface InteractiveBlobVideoProps {
  iconUrl?: string;
  iconSlug?: string;
  videoSrc?: string;
  isLocked: boolean;
  shouldAnimate?: boolean;
}

const SLOT_SPIN_COUNT = 6;

export function InteractiveBlobVideo({ iconUrl, iconSlug, videoSrc, isLocked, shouldAnimate = false }: InteractiveBlobVideoProps) {
  const { categories } = useCategories();
  const [slotIndex, setSlotIndex] = useState(0);
  const [iconsPreloaded, setIconsPreloaded] = useState(false);
  const [slotSequence, setSlotSequence] = useState<number[]>([]);
  const slotIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinCountRef = useRef(0);
  
  // Get all category icons for slot animation
  const categoryIcons = useMemo(() => 
    categories
      .filter(c => c.icon_slug)
      .map(c => getIconUrl(c.icon_slug!)),
    [categories]
  );

  // Resolve the locked icon: iconUrl > iconSlug > question mark. The last
  // step matters: the "Guess the ..." media categories shipped with no
  // icon_slug at all, and an empty src rendered the blob as a blank beige
  // square on the quick-game screen. A category with no icon still gets a
  // face.
  const lockedIconUrl = useMemo(() => {
    if (iconUrl) return iconUrl;
    if (iconSlug) return getIconUrl(iconSlug);
    return getIconUrl("question-mark");
  }, [iconUrl, iconSlug]);

  // Both sources go through videoUrl().
  //
  // The category videos are not in the iOS bundle — prune-ios-videos strips
  // all but a first-run handful, and everything else streams from
  // VIDEO_BASE_URL. A raw `/videos/foo.mp4` resolves against
  // capacitor://localhost, so on device it pointed inside the bundle at a
  // file that had been removed: the blob rendered empty with WebKit's own
  // play glyph over it, which is what "the icon doesn't render" looks like.
  const resolvedSrc = useMemo(() => (videoSrc ? videoUrl(videoSrc) : undefined), [videoSrc]);
  const webmSrc = useMemo(
    () => (videoSrc ? videoUrl(toWebmUrl(videoSrc)) : undefined),
    [videoSrc],
  );

  // The autoplay attribute is a request, not a guarantee: iOS refuses it in
  // Low Power Mode and while a stream is still buffering, and paints its own
  // play glyph over the paused element. So playback is driven imperatively —
  // retried when the video becomes playable, when the app returns to the
  // foreground, and on any tap (a user gesture is what Low Power Mode
  // accepts) — and the video stays invisible until frames actually roll,
  // with the category icon in its place, so the glyph never has a paused
  // video to be drawn on.
  // State, not a ref: AnimatePresence mounts the video only after the icon's
  // exit animation, so an effect keyed on isLocked would run before the
  // element exists and bind nothing. The callback ref re-runs the effect at
  // the moment the element is actually there.
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  useEffect(() => {
    setVideoPlaying(false);
    const video = videoEl;
    if (!video || !resolvedSrc) return;

    const tryPlay = () => {
      video.muted = true;
      void video.play().catch(() => {});
    };
    const onPlaying = () => setVideoPlaying(true);
    const onPause = () => setVideoPlaying(false);
    const onVisible = () => {
      if (!document.hidden) tryPlay();
    };

    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onPause);
    video.addEventListener("canplay", tryPlay);
    video.addEventListener("loadeddata", tryPlay);
    document.addEventListener("visibilitychange", onVisible);
    document.addEventListener("pointerdown", tryPlay, true);
    document.addEventListener("touchend", tryPlay, true);
    if (video.readyState >= 3) tryPlay();

    return () => {
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("canplay", tryPlay);
      video.removeEventListener("loadeddata", tryPlay);
      document.removeEventListener("visibilitychange", onVisible);
      document.removeEventListener("pointerdown", tryPlay, true);
      document.removeEventListener("touchend", tryPlay, true);
    };
  }, [videoEl, resolvedSrc]);

  // Generate random slot sequence when animation should start
  useEffect(() => {
    if (shouldAnimate && !isLocked && categoryIcons.length > 0 && iconsPreloaded) {
      const randomIndices: number[] = [];
      const availableIndices = [...Array(categoryIcons.length).keys()];
      
      for (let i = 0; i < SLOT_SPIN_COUNT && availableIndices.length > 0; i++) {
        const randIdx = Math.floor(Math.random() * availableIndices.length);
        randomIndices.push(availableIndices[randIdx]);
        availableIndices.splice(randIdx, 1);
      }
      
      setSlotSequence(randomIndices);
      spinCountRef.current = 0;
      setSlotIndex(0);
    }
  }, [shouldAnimate, isLocked, categoryIcons.length, iconsPreloaded]);

  // Preload all category icons
  useEffect(() => {
    if (categoryIcons.length === 0 || iconsPreloaded) return;
    
    let loadedCount = 0;
    const totalIcons = categoryIcons.length;
    
    categoryIcons.forEach(url => {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        if (loadedCount === totalIcons) setIconsPreloaded(true);
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount === totalIcons) setIconsPreloaded(true);
      };
      img.src = url;
    });
  }, [categoryIcons, iconsPreloaded]);

  // Slot machine animation
  useEffect(() => {
    if (isLocked || !shouldAnimate || slotSequence.length === 0 || !iconsPreloaded) {
      if (slotIntervalRef.current) {
        clearInterval(slotIntervalRef.current);
        slotIntervalRef.current = null;
      }
      return;
    }

    slotIntervalRef.current = setInterval(() => {
      spinCountRef.current++;
      if (spinCountRef.current >= slotSequence.length) {
        spinCountRef.current = 0;
      }
      setSlotIndex(spinCountRef.current);
    }, 150);

    return () => {
      if (slotIntervalRef.current) clearInterval(slotIntervalRef.current);
    };
  }, [isLocked, shouldAnimate, slotSequence.length, iconsPreloaded]);

  const actualCategoryIndex = slotSequence[slotIndex] ?? 0;
  const currentIconUrl = categoryIcons[actualCategoryIndex] || "";
  const currentColor = SLOT_COLORS[slotIndex % SLOT_COLORS.length];
  const isSpinning = shouldAnimate && !isLocked && slotSequence.length > 0 && iconsPreloaded;

  return (
    <div className="relative w-[220px] h-[220px] select-none">
      {/* Border layer */}
      <motion.div
        className="absolute inset-0"
        style={{ clipPath: `path('${BORDER_BLOB_PATH}')` }}
        animate={{
          background: isLocked 
            ? "linear-gradient(135deg, hsl(48 70% 80%), hsl(42 65% 75%), hsl(38 60% 78%), hsl(48 70% 80%))"
            : isSpinning 
              ? `linear-gradient(135deg, ${currentColor.border}, ${currentColor.particle})`
              : "linear-gradient(135deg, rgba(255,255,255,0.6), rgba(255,255,255,0.3))",
        }}
        transition={{ duration: 0.1 }}
      />

      {/* Content container */}
      <motion.div
        className="absolute inset-0 overflow-hidden flex items-center justify-center"
        style={{
          clipPath: `path('${MAIN_BLOB_PATH}')`,
          background: isLocked
            ? "rgba(255,255,255,0.1)"
            : isSpinning
              ? currentColor.bg
              : "rgba(255,255,255,0.2)",
        }}
      >
        <AnimatePresence mode="wait">
          {isLocked && resolvedSrc ? (
            <motion.div
              key="video"
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              {!videoPlaying && lockedIconUrl && (
                <img
                  src={lockedIconUrl}
                  alt=""
                  className="absolute w-20 h-20 object-contain drop-shadow-lg"
                />
              )}
              <video
                ref={setVideoEl}
                autoPlay
                loop
                muted
                playsInline
                controls={false}
                className={`w-full h-full object-cover transition-opacity duration-300 ${videoPlaying ? "opacity-100" : "opacity-0"} [&::-webkit-media-controls]:hidden [&::-webkit-media-controls-play-button]:hidden [&::-webkit-media-controls-start-playback-button]:hidden`}
                style={{ pointerEvents: 'none' }}
              >
                {webmSrc && <source src={webmSrc} type="video/webm" />}
                <source src={resolvedSrc} type="video/mp4" />
              </video>
            </motion.div>
          ) : (
            <motion.div
              key={isLocked ? "locked-icon" : slotIndex}
              className="w-full h-full flex items-center justify-center"
              initial={{ y: -80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ duration: 0.08, ease: "easeOut" }}
            >
              {(isLocked ? lockedIconUrl : currentIconUrl) && (
                <img 
                  src={isLocked ? lockedIconUrl : currentIconUrl} 
                  alt="" 
                  className="w-20 h-20 object-contain drop-shadow-lg"
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Floating particles - during spin */}
      {isSpinning && (
        <>
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={`spin-${i}-${slotIndex}`}
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 8 + (i % 3) * 6,
                height: 8 + (i % 3) * 6,
                background: currentColor.particle,
                left: `${10 + i * 15}%`,
                top: `${15 + (i % 3) * 25}%`,
              }}
              initial={{ opacity: 0, scale: 0, y: 0 }}
              animate={{
                opacity: [0, 0.8, 0],
                scale: [0.5, 1.2, 0.5],
                y: [0, -30],
                x: [(i % 2 === 0 ? 1 : -1) * 10],
              }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          ))}
        </>
      )}

      {/* Floating particles when locked - golden */}
      {isLocked && (
        <>
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 6 + (i % 3) * 4,
                height: 6 + (i % 3) * 4,
                background: i % 2 === 0 ? "hsl(48 70% 80%)" : "hsl(42 65% 75%)",
                left: `${15 + i * 10}%`,
                top: `${20 + (i % 4) * 15}%`,
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
                y: [-5, -50],
                x: [0, (i % 2 === 0 ? 1 : -1) * 15],
              }}
              transition={{
                duration: 2,
                delay: i * 0.12,
                repeat: Infinity,
                repeatDelay: 0.5,
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}
