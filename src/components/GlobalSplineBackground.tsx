import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { SPLINE_BLOB_URL, isSplineLoaded } from "@/components/game/SplinePreloader";

// Pages where the Spline background should be visible
const SPLINE_PAGES = ["/", "/game"];

// White sparkle particle - more prominent
const SparkleParticle = ({ delay, x, size, duration }: { delay: number; x: number; size: number; duration: number }) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{
      left: `${x}%`,
      bottom: "-5%",
      width: size,
      height: size,
      background: "radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.8) 30%, rgba(255,255,255,0.3) 60%, transparent 80%)",
      boxShadow: "0 0 12px rgba(255,255,255,0.9), 0 0 20px rgba(255,255,255,0.5)",
    }}
    animate={{
      y: [0, -700 - Math.random() * 500],
      opacity: [0, 1, 0.9, 0.6, 0],
      scale: [0.2, 1.2, 1, 0.6, 0.1],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: "easeOut",
    }}
  />
);

export function GlobalSplineBackground() {
  const location = useLocation();
  const [ready, setReady] = useState(isSplineLoaded());
  
  // Check if current page should show Spline
  const shouldShow = SPLINE_PAGES.includes(location.pathname);
  
  // Generate more sparkle particles - 80 particles for dense effect
  const sparkles = useMemo(() => 
    Array.from({ length: 80 }, (_, i) => ({
      id: i,
      delay: Math.random() * 15,
      x: Math.random() * 100,
      size: 3 + Math.random() * 8,
      duration: 5 + Math.random() * 7,
    })), []
  );
  
  useEffect(() => {
    if (isSplineLoaded()) {
      setReady(true);
      return;
    }
    const timer = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* Gradient fallback - always present to prevent black flash */}
      <div 
        className="fixed inset-0 -z-20 transition-opacity duration-500"
        style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)",
          opacity: shouldShow ? 1 : 0,
        }}
      />
      
      {/* Global Spline iframe - stays mounted, visibility controlled by opacity */}
      <iframe 
        src={SPLINE_BLOB_URL}
        frameBorder="0" 
        className="fixed inset-0 w-full h-full -z-10 transition-opacity duration-300"
        style={{ 
          opacity: shouldShow && ready ? 1 : 0,
          pointerEvents: shouldShow ? "auto" : "none",
        }}
        title="Global Background"
        loading="eager"
      />
      
      {/* White radial vignette mask - white edges fading to transparent center */}
      <div 
        className="fixed inset-0 -z-5 pointer-events-none transition-opacity duration-300"
        style={{
          background: "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 0%, transparent 40%, rgba(255,255,255,0.3) 70%, rgba(255,255,255,0.7) 90%, rgba(255,255,255,0.85) 100%)",
          opacity: shouldShow ? 1 : 0,
        }}
      />
      
      {/* White sparkle particles */}
      {shouldShow && (
        <div className="fixed inset-0 -z-5 overflow-hidden pointer-events-none">
          {sparkles.map((p) => (
            <SparkleParticle key={p.id} {...p} />
          ))}
        </div>
      )}
    </>
  );
}
