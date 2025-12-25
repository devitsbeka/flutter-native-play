import { useEffect, useState } from "react";

// List of all Spline URLs used in the game
const SPLINE_URLS = [
  "https://my.spline.design/interactivehourglass-C5OKzkXWhesjwl8ajjoHgflj/?v=2",
  "https://my.spline.design/floatingblob-fNd2CwqSRe1QdyRbYBDFvR22/",
];

export function SplinePreloader() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Mark as loaded after iframes have had time to load
    const timer = setTimeout(() => setLoaded(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Render hidden iframes to preload Spline scenes
  return (
    <div 
      className="fixed pointer-events-none"
      style={{ 
        opacity: 0,
        position: 'fixed',
        left: '-9999px',
        top: '-9999px',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      {SPLINE_URLS.map((url) => (
        <iframe
          key={url}
          src={url}
          title="Preload"
          style={{ width: 1, height: 1 }}
        />
      ))}
    </div>
  );
}