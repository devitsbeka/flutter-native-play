import { motion } from "framer-motion";
import { useRef, useCallback } from "react";

// Import tab icons
import allIcon from "@/assets/tabs/puzzle-sphere.png";
import favIcon from "@/assets/tabs/fav.png";
import classicIcon from "@/assets/tabs/classic.png";
import funIcon from "@/assets/tabs/fun.png";
import eduIcon from "@/assets/tabs/edu.png";
import popularIcon from "@/assets/tabs/puzzle-cube.png";
import recentlyViewedIcon from "@/assets/tabs/recently-viewed.png";
import freeIcon from "@/assets/icons/gift-box.png";
import premiumIcon from "@/assets/icons/icon-vip-crown.webp";

interface IconTab {
  id: string;
  label: string;
  icon: string;
}

const iconMap: Record<string, string> = {
  free: freeIcon,
  premium: premiumIcon,
  all: allIcon,
  favorites: favIcon,
  recently_viewed: recentlyViewedIcon,
  popular: popularIcon,
  classic: classicIcon,
  fun: funIcon,
  educational: eduIcon,
};

interface IconTabBarProps {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  compact?: boolean;
}

export function IconTabBar({ tabs, activeTab, onTabChange, compact = false }: IconTabBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const velocityRef = useRef(0);
  const lastTouchRef = useRef(0);
  const lastTimeRef = useRef(0);
  const animationRef = useRef<number>();
  const isDraggingRef = useRef(false);

  // Momentum animation
  const animateMomentum = useCallback(() => {
    const slider = containerRef.current;
    if (!slider) return;

    if (Math.abs(velocityRef.current) > 0.5) {
      slider.scrollLeft += velocityRef.current;
      velocityRef.current *= 0.92; // Friction
      animationRef.current = requestAnimationFrame(animateMomentum);
    }
  }, []);

  // Touch handlers for mobile momentum
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    isDraggingRef.current = false;
    velocityRef.current = 0;
    lastTouchRef.current = e.touches[0].clientX;
    lastTimeRef.current = Date.now();
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0].clientX;
    const time = Date.now();
    const deltaX = lastTouchRef.current - touch;
    const deltaTime = time - lastTimeRef.current;

    if (Math.abs(deltaX) > 5) {
      isDraggingRef.current = true;
    }

    if (deltaTime > 0) {
      velocityRef.current = deltaX / deltaTime * 15;
    }

    lastTouchRef.current = touch;
    lastTimeRef.current = time;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (Math.abs(velocityRef.current) > 1) {
      animationRef.current = requestAnimationFrame(animateMomentum);
    }
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 50);
  }, [animateMomentum]);

  // Mouse drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const slider = containerRef.current;
    if (!slider) return;
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    isDraggingRef.current = false;
    let startX = e.pageX - slider.offsetLeft;
    let scrollLeft = slider.scrollLeft;
    let lastX = e.pageX;
    let lastTime = Date.now();
    
    const onMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX) * 1.5;
      
      if (Math.abs(walk) > 5) {
        isDraggingRef.current = true;
      }
      
      slider.scrollLeft = scrollLeft - walk;
      
      const time = Date.now();
      const deltaTime = time - lastTime;
      if (deltaTime > 0) {
        velocityRef.current = (lastX - e.pageX) / deltaTime * 15;
      }
      lastX = e.pageX;
      lastTime = time;
    };
    
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      
      if (Math.abs(velocityRef.current) > 1) {
        animationRef.current = requestAnimationFrame(animateMomentum);
      }
      
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 50);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [animateMomentum]);

  return (
    <div className="relative -mx-4">
      <div
        ref={containerRef}
        className={`relative flex items-center overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing select-none ${
          compact ? 'gap-2 py-1' : 'gap-2 py-3'
        }`}
        style={{
          paddingLeft: 16,
          paddingRight: 16,
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          // -webkit-overflow-scrolling: touch removed — see the note in
          // CategoryCarousel. It is the same deprecated legacy scrolling path,
          // on the same page, and iOS has not needed it since 13.
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const iconSrc = iconMap[tab.id];
          
          // Horizontal layout: small icon left of label
          return (
            <motion.button
              key={tab.id}
              onClick={(e) => {
                if (isDraggingRef.current) {
                  e.preventDefault();
                  return;
                }
                onTabChange(tab.id);
              }}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-full flex-shrink-0 transition-all ${
                isActive 
                  ? 'bg-purple-100/80' 
                  : 'bg-white/60 hover:bg-white/80'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <img 
                src={iconSrc} 
                alt={tab.label}
                className={`object-contain ${compact ? 'w-5 h-5' : 'w-6 h-6'}`}
              />
              <span 
                className="font-semibold leading-tight whitespace-nowrap uppercase"
                style={{
                  fontFamily: "'Google Sans', sans-serif",
                  fontSize: compact ? '12px' : '13px',
                  letterSpacing: '0',
                  color: isActive ? "#6D28D9" : "#64748b",
                }}
              >
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
      
    </div>
  );
}
