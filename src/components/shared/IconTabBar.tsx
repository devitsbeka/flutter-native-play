import { motion } from "framer-motion";
import { useRef, useCallback } from "react";

// Import tab icons
import allIcon from "@/assets/tabs/all.png";
import favIcon from "@/assets/tabs/fav.png";
import classicIcon from "@/assets/tabs/classic.png";
import funIcon from "@/assets/tabs/fun.png";
import eduIcon from "@/assets/tabs/edu.png";

interface IconTab {
  id: string;
  label: string;
  icon: string;
}

const iconMap: Record<string, string> = {
  all: allIcon,
  favorites: favIcon,
  classic: classicIcon,
  fun: funIcon,
  educational: eduIcon,
};

interface IconTabBarProps {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function IconTabBar({ tabs, activeTab, onTabChange }: IconTabBarProps) {
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
        className="relative flex items-center gap-4 py-3 overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing select-none"
        style={{
          paddingLeft: 16,
          paddingRight: 16,
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const iconSrc = iconMap[tab.id];
          
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
              className="relative flex flex-col items-center gap-1.5 px-2 py-1 flex-shrink-0"
              whileHover={{ scale: 1.08, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              {/* Icon */}
              <div className="relative w-12 h-12 flex items-center justify-center">
                <img 
                  src={iconSrc} 
                  alt={tab.label}
                  className="w-12 h-12 object-contain"
                  style={{
                    filter: isActive ? "drop-shadow(0 4px 8px rgba(139, 92, 246, 0.4))" : "none",
                    transform: isActive ? "scale(1.1)" : "scale(1)",
                    transition: "all 0.2s ease",
                  }}
                />
              </div>
              
              {/* Label - Google Sans, uppercase */}
              <span 
                className="font-semibold leading-tight text-center whitespace-nowrap uppercase"
                style={{
                  fontFamily: "'Google Sans', sans-serif",
                  fontSize: '14px',
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
      
      {/* Separator line */}
      <div className="mx-4 mt-2 h-[2px] rounded-full bg-gradient-to-r from-transparent via-purple-300/60 to-transparent" />
    </div>
  );
}
