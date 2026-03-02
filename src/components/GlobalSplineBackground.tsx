import { useMemo, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useIsBreakpointDown } from "@/hooks/use-breakpoint";
import homeBg from "@/assets/home-bg.jpeg";
import { PingPongVideo } from "@/components/shared/PingPongVideo";
import { MAP_VIDEOS } from "@/config/videoConfig";

// Pages where the background should be visible
const BACKGROUND_PAGES = ["/", "/game", "/discover", "/leaderboards", "/profile", "/auth", "/vip", "/power-ups"];

// Pages where particles should be disabled for performance
const NO_PARTICLES_PAGES = ["/", "/discover", "/game", "/leaderboards", "/power-ups"];

// Pages where the white radial mask should be hidden (they have their own solid background)
const NO_RADIAL_MASK_PAGES = ["/game", "/power-ups"];

// White sparkle particle with glow effect - using CSS animation for better performance
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
  const isMobile = useIsBreakpointDown("md");
  const bgRef = useRef<HTMLDivElement>(null);
  
  const isHomePage = location.pathname === "/";
  
  // Check if current page should show background (include team check here)
  const isTeamRoute = location.pathname.startsWith("/team");
  const shouldShow = !isTeamRoute && BACKGROUND_PAGES.some(page => {
    if (page === "/") return location.pathname === "/";
    return location.pathname.startsWith(page);
  });
  
  // Check if particles should be disabled for performance
  const shouldShowParticles = shouldShow && !NO_PARTICLES_PAGES.includes(location.pathname);
  
  // Check if radial mask should be hidden (game/category pages have their own backgrounds)
  const shouldHideRadialMask = NO_RADIAL_MASK_PAGES.some(page => location.pathname.startsWith(page));
  
  // Reduce particle count on mobile for performance
  const sparkleCount = isMobile ? 20 : 80;
  const orbCount = isMobile ? 5 : 20;
  
  // Generate sparkle particles - reduced on mobile (hooks must be called unconditionally)
  const sparkles = useMemo(() =>
    Array.from({ length: sparkleCount }, (_, i) => ({
      id: i,
      delay: Math.random() * 15,
      x: Math.random() * 100,
      size: 3 + Math.random() * 8,
      duration: 5 + Math.random() * 7,
    })), [sparkleCount]
  );
  
  // Generate floating orbs - reduced on mobile
  const orbs = useMemo(() => 
    Array.from({ length: orbCount }, (_, i) => ({
      id: i,
      delay: Math.random() * 5,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 40 + Math.random() * 80,
      duration: 8 + Math.random() * 6,
    })), [orbCount]
  );

  // Sync background scroll with page scroll (only for home page image)
  useEffect(() => {
    if (!isHomePage) return;
    const handleScroll = () => {
      if (!bgRef.current) return;
      const scrollY = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll <= 0) return;
      const scrollPercent = scrollY / maxScroll;
      const bgElement = bgRef.current.querySelector('img') as HTMLImageElement;
      if (!bgElement) return;
      const extraWidth = bgElement.naturalWidth * (window.innerHeight / bgElement.naturalHeight) - window.innerWidth;
      if (extraWidth > 0) {
        const offset = (extraWidth / 2) - scrollPercent * extraWidth;
        bgElement.style.transform = `translateX(calc(-50% + ${offset}px))`;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHomePage]);

  // Don't render anything if not on allowed pages
  if (!shouldShow) {
    return null;
  }

  return (
    <>
      {/* Home page: Image background */}
      {isHomePage && (
        <div 
          ref={bgRef}
          className="fixed inset-0 pointer-events-none overflow-hidden"
          style={{ zIndex: 0 }}
        >
          <img
            src={homeBg}
            alt=""
            className="h-full w-auto max-w-none absolute left-1/2"
            style={{ minHeight: "100vh", transform: "translateX(-50%)" }}
          />
        </div>
      )}
      
      {/* Other pages: Video blob background */}
      {!isHomePage && (
        <div 
          className="fixed inset-0 pointer-events-none overflow-hidden"
          style={{ zIndex: 0 }}
        >
          <PingPongVideo src={MAP_VIDEOS.default} className="opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background/80" />
        </div>
      )}
      
      {/* White radial mask - TEMPORARILY HIDDEN */}
      
      {/* Floating orb particles - ambient background movement */}
      {shouldShowParticles && (
        <div 
          className="fixed inset-0 overflow-hidden pointer-events-none"
          style={{ zIndex: 2 }}
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
          style={{ zIndex: 3 }}
        >
          {sparkles.map((p) => (
            <SparkleParticle key={p.id} {...p} />
          ))}
        </div>
      )}
    </>
  );
}
