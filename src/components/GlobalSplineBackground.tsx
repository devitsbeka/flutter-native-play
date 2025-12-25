import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SPLINE_BLOB_URL, isSplineLoaded } from "@/components/game/SplinePreloader";

// Pages where the Spline background should be visible
const SPLINE_PAGES = ["/", "/game"];

export function GlobalSplineBackground() {
  const location = useLocation();
  const [ready, setReady] = useState(isSplineLoaded());
  
  // Check if current page should show Spline
  const shouldShow = SPLINE_PAGES.includes(location.pathname);
  
  useEffect(() => {
    if (isSplineLoaded()) {
      setReady(true);
      return;
    }
    // Small delay to allow iframe to initialize
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
    </>
  );
}
