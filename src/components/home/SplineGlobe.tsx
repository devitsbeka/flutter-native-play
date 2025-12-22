import { Suspense, lazy, useState } from "react";
import { motion } from "framer-motion";

const Spline = lazy(() => import("@splinetool/react-spline"));

interface SplineGlobeProps {
  className?: string;
}

export function SplineGlobe({ className }: SplineGlobeProps) {
  const [isLoaded, setIsLoaded] = useState(false);

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

      {/* Spline 3D Globe */}
      <Suspense fallback={null}>
        <Spline
          scene="https://prod.spline.design/Goo2QUw1KNNhKIrp/scene.splinecode"
          onLoad={() => setIsLoaded(true)}
          className="w-full h-full"
        />
      </Suspense>

      {/* Bottom gradient overlay for smooth transition */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </div>
  );
}
