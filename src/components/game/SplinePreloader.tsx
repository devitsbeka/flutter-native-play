import { useEffect, useState, useRef } from "react";

// Blob background used in matchmaking and VS screens
export const SPLINE_BLOB_URL = "https://my.spline.design/floatingblob-fNd2CwqSRe1QdyRbYBDFvR22/";

// Global state to track if Spline is ready
let splineLoaded = false;
const splineLoadedCallbacks: (() => void)[] = [];

export function isSplineLoaded() {
  return splineLoaded;
}

export function onSplineLoaded(callback: () => void) {
  if (splineLoaded) {
    callback();
  } else {
    splineLoadedCallbacks.push(callback);
  }
}

export function SplinePreloader() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(splineLoaded);

  useEffect(() => {
    if (splineLoaded) {
      setLoaded(true);
      return;
    }

    const handleLoad = () => {
      splineLoaded = true;
      setLoaded(true);
      splineLoadedCallbacks.forEach(cb => cb());
      splineLoadedCallbacks.length = 0;
    };

    const iframe = iframeRef.current;
    if (iframe) {
      iframe.addEventListener('load', handleLoad);
      
      // Fallback: mark as loaded after timeout even if load event doesn't fire
      const timer = setTimeout(() => {
        if (!splineLoaded) {
          handleLoad();
        }
      }, 5000);

      return () => {
        iframe.removeEventListener('load', handleLoad);
        clearTimeout(timer);
      };
    }
  }, []);

  // Render a full-size iframe in a fixed container for aggressive caching
  // The iframe is positioned offscreen but fully rendered
  return (
    <div 
      className="fixed pointer-events-none"
      style={{ 
        opacity: 0,
        position: 'fixed',
        left: '-200vw',
        top: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      <iframe
        ref={iframeRef}
        src={SPLINE_BLOB_URL}
        title="Preload Background"
        style={{ width: '100%', height: '100%', border: 'none' }}
        loading="eager"
      />
    </div>
  );
}
