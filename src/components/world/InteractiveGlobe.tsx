import { useRef, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, Html } from "@react-three/drei";
import * as THREE from "three";
import { motion } from "framer-motion";
import { continents, Continent } from "@/data/worldData";
import { cn } from "@/lib/utils";

interface GlobeProps {
  onContinentClick: (continent: Continent) => void;
  unlockedContinents: string[];
  continentProgress: Record<string, { completed: number; total: number }>;
}

// Approximate continent center positions on a sphere (lat, lon)
const continentPositions: Record<string, { lat: number; lon: number }> = {
  asia: { lat: 35, lon: 100 },
  europe: { lat: 50, lon: 10 },
  north_america: { lat: 40, lon: -100 },
  south_america: { lat: -15, lon: -60 },
  africa: { lat: 0, lon: 20 },
  oceania: { lat: -25, lon: 135 },
};

// Convert lat/lon to 3D position on sphere
function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  
  return new THREE.Vector3(x, y, z);
}

function RotatingGlobe({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.1;
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

function ContinentMarker({
  continent,
  position,
  isUnlocked,
  progress,
  onClick,
}: {
  continent: Continent;
  position: THREE.Vector3;
  isUnlocked: boolean;
  progress: { completed: number; total: number };
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Html
      position={[position.x, position.y, position.z]}
      center
      distanceFactor={8}
      occlude={false}
      style={{ pointerEvents: "auto" }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        className={cn(
          "cursor-pointer select-none transition-all",
          !isUnlocked && "opacity-50"
        )}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          if (isUnlocked) onClick();
        }}
      >
        <div
          className={cn(
            "flex flex-col items-center gap-1 p-3 rounded-2xl backdrop-blur-md transition-all",
            isUnlocked
              ? "bg-card/90 border-2 border-primary shadow-lg"
              : "bg-muted/80 border border-border"
          )}
        >
          <span className="text-2xl">{continent.emoji}</span>
          <span className="text-xs font-bold text-foreground whitespace-nowrap">
            {continent.name}
          </span>
          {isUnlocked ? (
            <span className="text-[10px] text-muted-foreground">
              {progress.completed}/{progress.total}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground">🔒</span>
          )}
        </div>
      </motion.div>
    </Html>
  );
}

function GlobeMesh({
  onContinentClick,
  unlockedContinents,
  continentProgress,
}: GlobeProps) {
  return (
    <RotatingGlobe>
      {/* Main globe sphere */}
      <Sphere args={[2, 64, 64]}>
        <meshPhongMaterial
          color="#6366f1"
          transparent
          opacity={0.6}
          shininess={50}
        />
      </Sphere>
      
      {/* Inner glow sphere */}
      <Sphere args={[1.95, 32, 32]}>
        <meshBasicMaterial color="#a855f7" transparent opacity={0.3} />
      </Sphere>
      
      {/* Wireframe overlay */}
      <Sphere args={[2.01, 24, 24]}>
        <meshBasicMaterial color="#c4b5fd" wireframe transparent opacity={0.2} />
      </Sphere>

      {/* Continent markers */}
      {continents.map((continent) => {
        const pos = continentPositions[continent.id];
        if (!pos) return null;
        
        const position = latLonToVector3(pos.lat, pos.lon, 2.3);
        const isUnlocked = unlockedContinents.includes(continent.id);
        const progress = continentProgress[continent.id] || { completed: 0, total: continent.countries.length };

        return (
          <ContinentMarker
            key={continent.id}
            continent={continent}
            position={position}
            isUnlocked={isUnlocked}
            progress={progress}
            onClick={() => onContinentClick(continent)}
          />
        );
      })}
    </RotatingGlobe>
  );
}

export function InteractiveGlobe({
  onContinentClick,
  unlockedContinents,
  continentProgress,
}: GlobeProps) {
  return (
    <div className="w-full h-full min-h-[400px]">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#a855f7" />
        
        <Suspense fallback={null}>
          <GlobeMesh
            onContinentClick={onContinentClick}
            unlockedContinents={unlockedContinents}
            continentProgress={continentProgress}
          />
        </Suspense>
        
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={4}
          maxDistance={10}
          autoRotate={false}
        />
      </Canvas>
    </div>
  );
}
