import { useEffect, useRef } from 'react';
import createGlobe from 'cobe';
import { ActiveUser } from '@/hooks/useActiveUsers';
import { getMarkerLocation } from '@/lib/countryCoordinates';

interface AdminGlobeProps {
  users: ActiveUser[];
}

export function AdminGlobe({ users }: AdminGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef(0);
  const phiRef = useRef(0);

  useEffect(() => {
    let width = 0;
    let currentPhi = 0;
    const doublePi = Math.PI * 2;

    const onResize = () => {
      if (canvasRef.current) {
        width = canvasRef.current.offsetWidth;
      }
    };
    window.addEventListener('resize', onResize);
    onResize();

    // Group users by country to create markers
    const countryGroups = new Map<string, number>();
    users.forEach(user => {
      const code = user.country_code?.toLowerCase() || user.region?.toLowerCase() || 'unknown';
      countryGroups.set(code, (countryGroups.get(code) || 0) + 1);
    });

    // Convert to markers array
    const markers = Array.from(countryGroups.entries()).map(([code, count]) => {
      const [lat, lon] = getMarkerLocation(code);
      return {
        location: [lat, lon] as [number, number],
        size: Math.min(0.12, 0.04 + count * 0.02), // Scale with user count
      };
    });

    const globe = createGlobe(canvasRef.current!, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0.6, // Initial rotation - focus on Georgia region
      theta: 0.3,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 4,
      baseColor: [0.15, 0.15, 0.2],
      markerColor: [0.3, 0.85, 0.6], // Emerald green
      glowColor: [0.25, 0.2, 0.4], // Purple tint
      markers,
      onRender: (state) => {
        // Auto-rotate when not interacting
        if (!pointerInteracting.current) {
          currentPhi += 0.003;
        }
        state.phi = currentPhi + pointerInteractionMovement.current;
        phiRef.current = state.phi;
        state.width = width * 2;
        state.height = width * 2;
      },
    });

    const handlePointerDown = (e: PointerEvent) => {
      pointerInteracting.current = e.clientX - pointerInteractionMovement.current;
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'grabbing';
      }
    };

    const handlePointerUp = () => {
      pointerInteracting.current = null;
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'grab';
      }
    };

    const handlePointerOut = () => {
      pointerInteracting.current = null;
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'grab';
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (pointerInteracting.current !== null) {
        const delta = e.clientX - pointerInteracting.current;
        pointerInteractionMovement.current = delta / 100;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (pointerInteracting.current !== null && e.touches[0]) {
        const delta = e.touches[0].clientX - pointerInteracting.current;
        pointerInteractionMovement.current = delta / 100;
      }
    };

    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'grab';
      canvasRef.current.addEventListener('pointerdown', handlePointerDown);
      canvasRef.current.addEventListener('pointerup', handlePointerUp);
      canvasRef.current.addEventListener('pointerout', handlePointerOut);
      canvasRef.current.addEventListener('pointermove', handlePointerMove);
      canvasRef.current.addEventListener('touchmove', handleTouchMove);
    }

    return () => {
      globe.destroy();
      window.removeEventListener('resize', onResize);
      if (canvasRef.current) {
        canvasRef.current.removeEventListener('pointerdown', handlePointerDown);
        canvasRef.current.removeEventListener('pointerup', handlePointerUp);
        canvasRef.current.removeEventListener('pointerout', handlePointerOut);
        canvasRef.current.removeEventListener('pointermove', handlePointerMove);
        canvasRef.current.removeEventListener('touchmove', handleTouchMove);
      }
    };
  }, [users]);

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="w-full h-full max-w-[400px] max-h-[400px] aspect-square"
        style={{ contain: 'layout paint size' }}
      />
    </div>
  );
}
