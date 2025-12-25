import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

interface SplineGlobeProps {
  className?: string;
}

export function SplineGlobe({ className }: SplineGlobeProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.type = "module";
    script.src = "https://unpkg.com/@splinetool/viewer@1.12.28/build/spline-viewer.js";
    script.onload = () => {
      if (containerRef.current) {
        const viewer = document.createElement("spline-viewer");
        viewer.setAttribute("url", "https://prod.spline.design/Goo2QUw1KNNhKIrp/scene.splinecode");
        viewer.style.width = "100%";
        viewer.style.height = "100%";
        viewer.addEventListener("load", () => setIsLoaded(true));
        containerRef.current.appendChild(viewer);
      }
    };
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return (
    <div className={`absolute inset-x-0 bottom-0 w-full overflow-hidden ${className || ""}`} style={{ height: "60vh" }}>
      {!isLoaded && (
        <div className="absolute inset-0 flex items-end justify-center pb-[-20%]">
          <motion.div
            className="w-[120vw] h-[120vw] rounded-full bg-gradient-to-br from-primary/30 to-accent/30 blur-xl"
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>
      )}
      <div 
        ref={containerRef} 
        className="w-full h-full"
        style={{ 
          transform: "scale(2.5) translateY(35%)",
          transformOrigin: "center center"
        }} 
      />
    </div>
  );
}
