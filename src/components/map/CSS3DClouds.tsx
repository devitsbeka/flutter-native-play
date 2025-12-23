import React, { useEffect, useRef, useState } from 'react';
import cloudWhite from '@/assets/clouds/cloud-white.png';
import cloudWispy from '@/assets/clouds/cloud-wispy.png';

interface CloudLayer {
  id: number;
  x: number;
  y: number;
  z: number;
  rotation: number;
  scale: number;
  speed: number;
  texture: string;
  opacity: number;
}

interface Cloud {
  id: number;
  x: number;
  y: number;
  z: number;
  layers: CloudLayer[];
}

interface CSS3DCloudsProps {
  className?: string;
}

const CSS3DClouds: React.FC<CSS3DCloudsProps> = ({ className = '' }) => {
  const worldRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const layersRef = useRef<CloudLayer[]>([]);
  const [clouds, setClouds] = useState<Cloud[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Generate clouds on mount
  useEffect(() => {
    const textures = [cloudWhite, cloudWispy];
    const generatedClouds: Cloud[] = [];
    const allLayers: CloudLayer[] = [];

    // Create 8 cloud clusters spread across the viewport
    for (let i = 0; i < 8; i++) {
      // Spread clouds across the full viewport
      const cloudX = (Math.random() - 0.5) * window.innerWidth * 1.5;
      const cloudY = (Math.random() - 0.5) * window.innerHeight * 0.8 - 100; // Bias toward top
      const cloudZ = -200 + Math.random() * 400;

      const layers: CloudLayer[] = [];
      const layerCount = 4 + Math.round(Math.random() * 4);

      for (let j = 0; j < layerCount; j++) {
        const layer: CloudLayer = {
          id: i * 100 + j,
          x: (Math.random() - 0.5) * 100,
          y: (Math.random() - 0.5) * 100,
          z: (Math.random() - 0.5) * 150,
          rotation: Math.random() * 360,
          scale: 0.5 + Math.random() * 1,
          speed: 0.02 + Math.random() * 0.05,
          texture: textures[Math.floor(Math.random() * textures.length)],
          opacity: 0.4 + Math.random() * 0.4,
        };
        layers.push(layer);
        allLayers.push(layer);
      }

      generatedClouds.push({
        id: i,
        x: cloudX,
        y: cloudY,
        z: cloudZ,
        layers,
      });
    }

    setClouds(generatedClouds);
    layersRef.current = allLayers;
    
    // Fade in after a short delay
    setTimeout(() => setIsLoaded(true), 100);
  }, []);

  // Animation loop
  useEffect(() => {
    let worldRotation = 0;

    const animate = () => {
      worldRotation += 0.005;

      // Update layer rotations
      layersRef.current.forEach((layer) => {
        layer.rotation += layer.speed;
      });

      // Apply very gentle world rotation
      if (worldRef.current) {
        const worldXAngle = Math.sin(worldRotation * 0.3) * 2;
        const worldYAngle = Math.cos(worldRotation * 0.2) * 3;
        worldRef.current.style.transform = `translateZ(0px) rotateX(${worldXAngle}deg) rotateY(${worldYAngle}deg)`;
      }

      // Force re-render for layer animations
      setClouds((prev) => [...prev]);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{
        perspective: '800px',
        perspectiveOrigin: '50% 50%',
        opacity: isLoaded ? 1 : 0,
        transition: 'opacity 1.5s ease-out',
      }}
    >
      <div
        ref={worldRef}
        className="absolute"
        style={{
          left: '50%',
          top: '40%',
          width: '100%',
          height: '100%',
          marginLeft: '-50%',
          marginTop: '-40%',
          transformStyle: 'preserve-3d',
        }}
      >
        {clouds.map((cloud) => (
          <div
            key={cloud.id}
            className="absolute"
            style={{
              left: '50%',
              top: '50%',
              transformStyle: 'preserve-3d',
              transform: `translateX(${cloud.x}px) translateY(${cloud.y}px) translateZ(${cloud.z}px)`,
            }}
          >
            {cloud.layers.map((layer) => (
              <img
                key={layer.id}
                src={layer.texture}
                alt=""
                className="absolute"
                style={{
                  width: '300px',
                  height: '300px',
                  marginLeft: '-150px',
                  marginTop: '-150px',
                  opacity: layer.opacity,
                  mixBlendMode: 'screen',
                  filter: 'blur(1px)',
                  transform: `translateX(${layer.x}px) translateY(${layer.y}px) translateZ(${layer.z}px) rotateZ(${layer.rotation}deg) scale(${layer.scale})`,
                  willChange: 'transform',
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CSS3DClouds;
