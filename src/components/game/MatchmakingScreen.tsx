import { useEffect, useRef } from "react";

export function MatchmakingScreen() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Auto-click the iframe periodically to trigger hourglass rotation
  useEffect(() => {
    const triggerClick = () => {
      if (iframeRef.current) {
        // Create and dispatch a click event on the iframe
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
        });
        iframeRef.current.dispatchEvent(clickEvent);
      }
    };

    // Initial click after iframe loads
    const initialTimeout = setTimeout(triggerClick, 1000);
    
    // Click every 2 seconds for continuous rotation
    const interval = setInterval(triggerClick, 2000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="h-full w-full relative overflow-hidden">
      {/* Interactive Hourglass Background */}
      <iframe
        ref={iframeRef}
        src="https://my.spline.design/interactivehourglass-C5OKzkXWhesjwl8ajjoHgflj/"
        frameBorder="0"
        className="absolute inset-0 w-full h-full"
        title="Finding Opponent"
        style={{ pointerEvents: 'auto' }}
      />
    </div>
  );
}
