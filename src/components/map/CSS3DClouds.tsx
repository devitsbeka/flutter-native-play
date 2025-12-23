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

    // Create 6 cloud clusters
    for (let i = 0; i < 6; i++) {
      const cloudX = 256 - Math.random() * 512;
      const cloudY = 256 - Math.random() * 512;
      const cloudZ = 256 - Math.random() * 512;

      const layers: CloudLayer[] = [];
      const layerCount = 5 + Math.round(Math.random() * 5);

      for (let j = 0; j < layerCount; j++) {
        const layer: CloudLayer = {
          id: i * 100 + j,
          x: (256 - Math.random() * 512) * 0.2,
          y: (256 - Math.random() * 512) * 0.2,
          z: 100 - Math.random() * 200,
          rotation: Math.random() * 360,
          scale: 0.25 + Math.random(),
          speed: 0.05 + Math.random() * 0.1,
          texture: textures[Math.floor(Math.random() * textures.length)],
          opacity: 0.6 + Math.random() * 0.3,
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
      worldRotation += 0.02;

      // Update layer rotations
      layersRef.current.forEach((layer) => {
        layer.rotation += layer.speed;
      });

      // Apply gentle world rotation
      if (worldRef.current) {
        const worldXAngle = Math.sin(worldRotation * 0.5) * 3;
        const worldYAngle = Math.cos(worldRotation * 0.3) * 5;
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
        perspective: '1000px',
        perspectiveOrigin: '50% 50%',
        opacity: isLoaded ? 1 : 0,
        transition: 'opacity 1s ease-out',
      }}
    >
      <div
        ref={worldRef}
        className="absolute"
        style={{
          left: '50%',
          top: '50%',
          width: '512px',
          height: '512px',
          marginLeft: '-256px',
          marginTop: '-256px',
          transformStyle: 'preserve-3d',
        }}
      >
        {clouds.map((cloud) => (
          <div
            key={cloud.id}
            className="absolute"
            style={{
              left: '256px',
              top: '256px',
              width: '20px',
              height: '20px',
              marginLeft: '-10px',
              marginTop: '-10px',
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
                  left: '50%',
                  top: '50%',
                  width: '256px',
                  height: '256px',
                  marginLeft: '-128px',
                  marginTop: '-128px',
                  opacity: layer.opacity,
                  transform: `translateX(${layer.x}px) translateY(${layer.y}px) translateZ(${layer.z}px) rotateZ(${layer.rotation}deg) scale(${layer.scale})`,
                  transition: 'opacity 0.5s ease-out',
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
