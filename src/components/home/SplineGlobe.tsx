import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

interface SplineGlobeProps {
  className?: string;
}

export function SplineGlobe({ className }: SplineGlobeProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load Spline viewer script
    const script = document.createElement("script");
    script.type = "module";
    script.src = "https://unpkg.com/@splinetool/viewer@1.12.27/build/spline-viewer.js";
    script.onload = () => {
      // Create spline-viewer element after script loads
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
    <div className={`relative w-full h-[350px] md:h-[400px] ${className}`}>
      {/* Loading fallback */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 blur-xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute w-24 h-24 rounded-full border-2 border-primary/50"
            animate={{ rotate: 360 }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        </div>
      )}

      {/* Spline container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Bottom gradient overlay for smooth transition */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </div>
  );
}
