import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useMemo } from "react";
import { useCategories } from "@/hooks/useCategories";

// Soft rounded rectangle path
const roundedRectPath = "M0.5,0.06 C0.82,0.06 0.94,0.18 0.94,0.5 C0.94,0.82 0.82,0.94 0.5,0.94 C0.18,0.94 0.06,0.82 0.06,0.5 C0.06,0.18 0.18,0.06 0.5,0.06";
const borderRectPath = "M0.5,0.04 C0.84,0.04 0.96,0.16 0.96,0.5 C0.96,0.84 0.84,0.96 0.5,0.96 C0.16,0.96 0.04,0.84 0.04,0.5 C0.04,0.16 0.16,0.04 0.5,0.04";

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
  videoSrc?: string;
  isLocked: boolean;
  shouldAnimate?: boolean;
}

export function InteractiveBlobVideo({ iconUrl, videoSrc, isLocked, shouldAnimate = false }: InteractiveBlobVideoProps) {
  const { categories } = useCategories();
  const [slotIndex, setSlotIndex] = useState(0);
  const [iconsPreloaded, setIconsPreloaded] = useState(false);
  const slotIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get all category icons for slot animation - build URLs from icon_slug
  const categoryIcons = useMemo(() => 
    categories
      .filter(c => c.icon_slug)
      .map(c => getIconUrl(c.icon_slug!)),
    [categories]
  );

  // Preload all category icons immediately when available
  useEffect(() => {
    if (categoryIcons.length === 0 || iconsPreloaded) return;
    
    let loadedCount = 0;
    const totalIcons = categoryIcons.length;
    
    categoryIcons.forEach(url => {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        if (loadedCount === totalIcons) {
          setIconsPreloaded(true);
        }
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount === totalIcons) {
          setIconsPreloaded(true);
        }
      };
      img.src = url;
    });
  }, [categoryIcons, iconsPreloaded]);

  // Slot machine animation - only runs when shouldAnimate is true, not locked, and icons are preloaded
  useEffect(() => {
    if (isLocked || !shouldAnimate || categoryIcons.length === 0 || !iconsPreloaded) {
      if (slotIntervalRef.current) {
        clearInterval(slotIntervalRef.current);
        slotIntervalRef.current = null;
      }
      return;
    }

    // Start cycling immediately
    slotIntervalRef.current = setInterval(() => {
      setSlotIndex(prev => (prev + 1) % categoryIcons.length);
    }, 120);

    return () => {
      if (slotIntervalRef.current) {
        clearInterval(slotIntervalRef.current);
      }
    };
  }, [isLocked, shouldAnimate, categoryIcons.length, iconsPreloaded]);

  // Current slot data
  const currentIconUrl = categoryIcons[slotIndex] || "";
  const currentColor = SLOT_COLORS[slotIndex % SLOT_COLORS.length];
  const isSpinning = shouldAnimate && !isLocked && categoryIcons.length > 0 && iconsPreloaded;

  return (
    <div className="relative w-[280px] h-[280px] select-none">
      {/* SVG Definitions */}
      <svg className="absolute w-0 h-0">
        <defs>
          <clipPath id="mainBlobClip" clipPathUnits="objectBoundingBox">
            <path d={roundedRectPath} />
          </clipPath>
          <clipPath id="borderBlobClip" clipPathUnits="objectBoundingBox">
            <path d={borderRectPath} />
          </clipPath>
        </defs>
      </svg>

      {/* Main container */}
      <div className="absolute inset-0">
        {/* Border - changes color during spin */}
        <motion.div
          className="absolute inset-0"
          style={{ clipPath: "url(#borderBlobClip)" }}
          animate={{
            background: isLocked 
              ? "linear-gradient(135deg, hsl(48 70% 80%), hsl(42 65% 75%), hsl(38 60% 78%), hsl(48 70% 80%))"
              : isSpinning 
                ? `linear-gradient(135deg, ${currentColor.border}, ${currentColor.particle})`
                : "linear-gradient(135deg, rgba(255,255,255,0.6), rgba(255,255,255,0.3))",
          }}
          transition={{ duration: 0.1 }}
        />

        {/* Content container with colored background */}
        <motion.div
          className="absolute inset-[8px] overflow-hidden"
          style={{ clipPath: "url(#mainBlobClip)" }}
          animate={{
            background: isLocked 
              ? "rgba(255,255,255,0.1)"
              : isSpinning 
                ? currentColor.bg
                : "rgba(255,255,255,0.2)",
          }}
          transition={{ duration: 0.1 }}
        >
          <AnimatePresence mode="wait">
            {isLocked && videoSrc ? (
              <motion.video
                key="video"
                src={videoSrc}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
                style={{ transform: "scale(1.3)" }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              />
            ) : (
              <motion.div
                key={slotIndex}
                className="w-full h-full flex items-center justify-center"
                initial={{ y: -80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                transition={{ duration: 0.08, ease: "easeOut" }}
              >
                {currentIconUrl && (
                  <img 
                    src={currentIconUrl} 
                    alt="" 
                    className="w-28 h-28 object-contain drop-shadow-lg"
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Floating particles - during spin with matching colors */}
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
              transition={{
                duration: 0.4,
                ease: "easeOut",
              }}
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
