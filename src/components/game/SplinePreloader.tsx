import { useEffect, useState } from "react";

// Blob background used in matchmaking and VS screens
const SPLINE_BLOB_URL = "https://my.spline.design/floatingblob-fNd2CwqSRe1QdyRbYBDFvR22/";

export function SplinePreloader() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Pre-fetch the iframe content immediately
    const preloadIframe = () => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'document';
      link.href = SPLINE_BLOB_URL;
      document.head.appendChild(link);
    };
    
    preloadIframe();
    
    // Mark as loaded after iframe has time to load
    const timer = setTimeout(() => setLoaded(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Render a visible but offscreen iframe for aggressive preloading
  return (
    <div 
      className="fixed pointer-events-none"
      style={{ 
        opacity: 0,
        position: 'fixed',
        left: '-9999px',
        top: '-9999px',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      {/* Full-size hidden iframe for better caching */}
      <iframe
        src={SPLINE_BLOB_URL}
        title="Preload Background"
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    </div>
  );
}
