import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useCategories } from "@/hooks/useCategories";

// Soft rounded rectangle path
const roundedRectPath = "M0.5,0.06 C0.82,0.06 0.94,0.18 0.94,0.5 C0.94,0.82 0.82,0.94 0.5,0.94 C0.18,0.94 0.06,0.82 0.06,0.5 C0.06,0.18 0.18,0.06 0.5,0.06";
const borderRectPath = "M0.5,0.04 C0.84,0.04 0.96,0.16 0.96,0.5 C0.96,0.84 0.84,0.96 0.5,0.96 C0.16,0.96 0.04,0.84 0.04,0.5 C0.04,0.16 0.16,0.04 0.5,0.04";

interface InteractiveBlobVideoProps {
  iconUrl?: string;
  videoSrc?: string;
  isLocked: boolean;
}

export function InteractiveBlobVideo({ iconUrl, videoSrc, isLocked }: InteractiveBlobVideoProps) {
  const { categories } = useCategories();
  const [slotIconUrl, setSlotIconUrl] = useState<string>("");
  const slotIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get all category icons for slot animation
  const categoryIcons = categories
    .map(c => c.image_url)
    .filter((url): url is string => !!url);

  // Slot machine animation - runs until locked
  useEffect(() => {
    if (isLocked || categoryIcons.length === 0) {
      if (slotIntervalRef.current) {
        clearInterval(slotIntervalRef.current);
        slotIntervalRef.current = null;
      }
      return;
    }

    // Start cycling immediately
    let index = 0;
    setSlotIconUrl(categoryIcons[index]);
    
    slotIntervalRef.current = setInterval(() => {
      index = (index + 1) % categoryIcons.length;
      setSlotIconUrl(categoryIcons[index]);
    }, 100); // Fast cycling

    return () => {
      if (slotIntervalRef.current) {
        clearInterval(slotIntervalRef.current);
      }
    };
  }, [isLocked, categoryIcons.length]);

  // Determine which icon to show
  const displayIcon = isLocked ? iconUrl : slotIconUrl;

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
        {/* Border */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: "url(#borderBlobClip)",
            background: isLocked 
              ? "linear-gradient(135deg, hsl(48 70% 80%), hsl(42 65% 75%), hsl(38 60% 78%), hsl(48 70% 80%))"
              : "linear-gradient(135deg, rgba(255,255,255,0.6), rgba(255,255,255,0.3), rgba(255,255,255,0.5))",
          }}
        />

        {/* Content container */}
        <div
          className="absolute inset-[8px] overflow-hidden bg-white/10"
          style={{ clipPath: "url(#mainBlobClip)" }}
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
                key={displayIcon || "empty"}
                className="w-full h-full flex items-center justify-center bg-white/20"
                initial={{ rotateY: 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: -90, opacity: 0 }}
                transition={{ duration: 0.08, ease: "easeOut" }}
                style={{ transformStyle: "preserve-3d" }}
              >
                {displayIcon && (
                  <img 
                    src={displayIcon} 
                    alt="" 
                    className="w-32 h-32 object-contain"
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Floating particles when locked */}
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
