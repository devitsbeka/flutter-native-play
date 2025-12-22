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
    script.src = "https://unpkg.com/@splinetool/viewer@1.12.27/build/spline-viewer.js";
    script.onload = () => {
      if (containerRef.current) {
        const viewer = document.createElement("spline-viewer");
        viewer.setAttribute("url", "https://prod.spline.design/cXZCFGvVIr5hMcfK/scene.splinecode");
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
    <div className={`fixed inset-0 w-full h-full ${className}`}>
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background">
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
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
