import { useEffect, useRef, memo } from "react";
import * as THREE from "three";

// Vanta effects - we'll load both clouds and birds
let CLOUDS: any;
let BIRDS: any;

export const VantaBackground = memo(function VantaBackground() {
  const cloudsRef = useRef<HTMLDivElement>(null);
  const birdsRef = useRef<HTMLDivElement>(null);
  const cloudsEffectRef = useRef<any>(null);
  const birdsEffectRef = useRef<any>(null);

  useEffect(() => {
    // Make THREE available globally for Vanta
    (window as any).THREE = THREE;

    // Dynamically import Vanta effects
    const loadVanta = async () => {
      try {
        // Import clouds
        const cloudsModule = await import("vanta/dist/vanta.clouds.min");
        CLOUDS = cloudsModule.default;
        
        // Import birds
        const birdsModule = await import("vanta/dist/vanta.birds.min");
        BIRDS = birdsModule.default;

        // Initialize clouds effect
        if (cloudsRef.current && CLOUDS && !cloudsEffectRef.current) {
          cloudsEffectRef.current = CLOUDS({
            el: cloudsRef.current,
            THREE: THREE,
            mouseControls: false,
            touchControls: false,
            gyroControls: false,
            minHeight: 200,
            minWidth: 200,
            backgroundColor: 0x87ceeb, // Sky blue
            skyColor: 0x68b8d7,
            cloudColor: 0xffffff,
            cloudShadowColor: 0x4a90a4,
            sunColor: 0xff9919,
            sunGlareColor: 0xff6633,
            sunlightColor: 0xff9933,
            speed: 0.8,
          });
        }

        // Initialize birds effect
        if (birdsRef.current && BIRDS && !birdsEffectRef.current) {
          birdsEffectRef.current = BIRDS({
            el: birdsRef.current,
            THREE: THREE,
            mouseControls: false,
            touchControls: false,
            gyroControls: false,
            minHeight: 200,
            minWidth: 200,
            backgroundColor: 0x000000, // Transparent (we'll overlay)
            backgroundAlpha: 0,
            color1: 0x1a1a1a,
            color2: 0x2a2a2a,
            colorMode: "lerp",
            birdSize: 1.2,
            wingSpan: 25,
            speedLimit: 4,
            separation: 30,
            alignment: 35,
            cohesion: 25,
            quantity: 3,
          });
        }
      } catch (error) {
        console.error("Failed to load Vanta effects:", error);
      }
    };

    loadVanta();

    // Cleanup on unmount
    return () => {
      if (cloudsEffectRef.current) {
        cloudsEffectRef.current.destroy();
        cloudsEffectRef.current = null;
      }
      if (birdsEffectRef.current) {
        birdsEffectRef.current.destroy();
        birdsEffectRef.current = null;
      }
    };
  }, []);

  return (
    <>
      {/* Clouds layer - below birds */}
      <div 
        ref={cloudsRef}
        className="absolute inset-0 z-[3] pointer-events-none"
        style={{ 
          opacity: 0.6,
          mixBlendMode: 'screen',
        }}
      />
      {/* Birds layer - above clouds */}
      <div 
        ref={birdsRef}
        className="absolute inset-0 z-[7] pointer-events-none"
        style={{ 
          opacity: 0.8,
          mixBlendMode: 'multiply',
        }}
      />
    </>
  );
});
