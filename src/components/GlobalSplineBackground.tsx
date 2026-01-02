import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";

// Pages where the background should be visible
const BACKGROUND_PAGES = ["/", "/game", "/discover", "/leaderboards", "/team", "/profile", "/category"];

// Pages where particles should be disabled for performance
const NO_PARTICLES_PAGES = ["/", "/discover", "/game", "/leaderboards", "/team"];

// White sparkle particle with glow effect
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

// Floating orb particle - larger, slower moving
const FloatingOrb = ({ delay, x, y, size, duration }: { delay: number; x: number; y: number; size: number; duration: number }) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{
      left: `${x}%`,
      top: `${y}%`,
      width: size,
      height: size,
      background: "radial-gradient(circle, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 50%, transparent 70%)",
      filter: "blur(1px)",
    }}
    animate={{
      y: [0, -30, 0, 20, 0],
      x: [0, 15, 0, -15, 0],
      scale: [1, 1.1, 1, 0.95, 1],
      opacity: [0.3, 0.5, 0.3, 0.4, 0.3],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);

export function GlobalSplineBackground() {
  const location = useLocation();
  
  // Check if current page should show background
  const shouldShow = BACKGROUND_PAGES.some(page => location.pathname.startsWith(page) || location.pathname === page);
  
  // Check if particles should be disabled for performance
  const shouldShowParticles = shouldShow && !NO_PARTICLES_PAGES.includes(location.pathname);
  
  // Generate sparkle particles - 80 particles for dense effect
  const sparkles = useMemo(() => 
    Array.from({ length: 80 }, (_, i) => ({
      id: i,
      delay: Math.random() * 15,
      x: Math.random() * 100,
      size: 3 + Math.random() * 8,
      duration: 5 + Math.random() * 7,
    })), []
  );
  
  // Generate floating orbs - larger ambient particles
  const orbs = useMemo(() => 
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      delay: Math.random() * 5,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 40 + Math.random() * 80,
      duration: 8 + Math.random() * 6,
    })), []
  );

  return (
    <>
      {/* Video background */}
      <div 
        className="fixed inset-0 pointer-events-none transition-opacity duration-500"
        style={{
          opacity: shouldShow ? 1 : 0,
          zIndex: -30,
        }}
      >
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "blur(8px)" }}
        >
          <source src="/videos/floating-blob.mp4" type="video/mp4" />
        </video>
      </div>
      
      {/* White radial mask - transparent center, white edges */}
      {shouldShow && (
        <div 
          className="fixed inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 0%, transparent 40%, rgba(255,255,255,0.3) 60%, rgba(255,255,255,0.6) 80%, rgba(255,255,255,1) 100%)",
            zIndex: -25,
          }}
        />
      )}
      
      {/* Floating orb particles - ambient background movement */}
      {shouldShowParticles && (
        <div 
          className="fixed inset-0 overflow-hidden pointer-events-none"
          style={{ zIndex: -15 }}
        >
          {orbs.map((orb) => (
            <FloatingOrb key={orb.id} {...orb} />
          ))}
        </div>
      )}
      
      {/* White sparkle particles - rising effect */}
      {shouldShowParticles && (
        <div 
          className="fixed inset-0 overflow-hidden pointer-events-none"
          style={{ zIndex: -5 }}
        >
          {sparkles.map((p) => (
            <SparkleParticle key={p.id} {...p} />
          ))}
        </div>
      )}
    </>
  );
}
