import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GeneratedRegion, LandmarkDefinition } from "../schemas/worldDefinition";
import { worldMaterials } from "../components/materials";
import { childSeed, createRng, range } from "../procedural/seededRandom";

/** Trivia tower: stacked stone drums, timber balcony and a conical roof. */
function TriviaTower() {
  return (
    <group>
      <mesh material={worldMaterials.stoneWarm} position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[1.15, 1.45, 2.8, 10]} />
      </mesh>
      <mesh material={worldMaterials.wood} position={[0, 3.0, 0]} castShadow>
        <cylinderGeometry args={[1.35, 1.15, 0.5, 10]} />
      </mesh>
      <mesh material={worldMaterials.stoneWarm} position={[0, 3.9, 0]} castShadow>
        <cylinderGeometry args={[0.9, 1.05, 1.6, 10]} />
      </mesh>
      <mesh material={worldMaterials.roof} position={[0, 5.4, 0]} castShadow>
        <coneGeometry args={[1.35, 1.8, 10]} />
      </mesh>
      <mesh material={worldMaterials.gold} position={[0, 6.5, 0]}>
        <sphereGeometry args={[0.22, 10, 8]} />
      </mesh>
    </group>
  );
}

/** Small keep with two corner towers, echoing the reference castles. */
function Castle() {
  return (
    <group>
      <mesh material={worldMaterials.stoneCool} position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[3.4, 2.4, 2.6]} />
      </mesh>
      <mesh material={worldMaterials.roof} position={[0, 2.9, 0]} castShadow>
        <boxGeometry args={[3.7, 1, 2.9]} />
      </mesh>
      {[-1.6, 1.6].map((x) => (
        <group key={x} position={[x, 0, 1.1]}>
          <mesh material={worldMaterials.stoneWarm} position={[0, 1.8, 0]} castShadow>
            <cylinderGeometry args={[0.55, 0.65, 3.6, 8]} />
          </mesh>
          <mesh material={worldMaterials.roof} position={[0, 4, 0]} castShadow>
            <coneGeometry args={[0.75, 1.2, 8]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Reward shrine: pedestal with a slowly turning magical gem. */
function RewardShrine() {
  const gemRef = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (!gemRef.current) return;
    gemRef.current.rotation.y = state.clock.elapsedTime * 0.6;
    gemRef.current.position.y = 2.05 + Math.sin(state.clock.elapsedTime * 1.4) * 0.12;
  });
  return (
    <group>
      <mesh material={worldMaterials.stoneWarm} position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[1.3, 1.55, 0.7, 12]} />
      </mesh>
      <mesh material={worldMaterials.stoneCool} position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.9, 1.1, 0.5, 12]} />
      </mesh>
      <mesh ref={gemRef} material={worldMaterials.purple} position={[0, 2.05, 0]} castShadow>
        <octahedronGeometry args={[0.65, 0]} />
      </mesh>
    </group>
  );
}

/** Broken columns — quiet decorative ruins. */
function Ruin() {
  return (
    <group>
      {[
        [-0.9, 0.6, 0, 1.2],
        [0.9, 0.45, 0.4, 0.9],
        [0.1, 0.3, -0.8, 0.6],
      ].map(([x, h, z, height], i) => (
        <mesh key={i} material={worldMaterials.stoneWarm} position={[x, h, z]} castShadow>
          <cylinderGeometry args={[0.28, 0.32, height as number, 8]} />
        </mesh>
      ))}
    </group>
  );
}

const landmarkComponents: Record<LandmarkDefinition["kind"], () => JSX.Element> = {
  triviaTower: TriviaTower,
  castle: Castle,
  rewardShrine: RewardShrine,
  ruin: Ruin,
};

/** Deterministic snow-capped mountain cluster behind a region. */
function Mountains({ region }: { region: GeneratedRegion }) {
  const spec = region.def.mountains;
  const peaks = useMemo(() => {
    if (!spec) return [];
    const rng = createRng(childSeed(0, `${region.def.id}:mountains`));
    return Array.from({ length: spec.count }, (_, i) => ({
      x: spec.position[0] + range(rng, -5.5, 5.5),
      z: spec.position[2] + range(rng, -4, 4),
      h: spec.height * range(rng, 0.55, 1),
      r: range(rng, 2.4, 4),
      rot: range(rng, 0, Math.PI),
      key: i,
    }));
  }, [spec, region.def.id]);
  if (!spec) return null;
  return (
    <group>
      {peaks.map((p) => (
        // Cone origin is its center: lift each peak by half its own height so
        // every base sits embedded in the plateau.
        <group key={p.key} position={[p.x, p.h / 2 - 0.5, p.z]} rotation={[0, p.rot, 0]}>
          <mesh material={worldMaterials.mountain} castShadow>
            <coneGeometry args={[p.r, p.h, 6]} />
          </mesh>
          <mesh material={worldMaterials.snow} position={[0, p.h * 0.32, 0]}>
            <coneGeometry args={[p.r * 0.42, p.h * 0.38, 6]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Landmarks({ region }: { region: GeneratedRegion }) {
  const { def } = region;
  const surfaceLocalY = def.elevation;
  return (
    <group position={def.position} rotation={[0, def.rotationY ?? 0, 0]} scale={def.scale ?? 1}>
      {def.landmarks.map((landmark) => {
        const Component = landmarkComponents[landmark.kind];
        return (
          <group
            key={landmark.id}
            position={[landmark.position[0], surfaceLocalY, landmark.position[2]]}
            rotation={[0, landmark.rotationY ?? 0, 0]}
            scale={landmark.scale ?? 1}
          >
            <Component />
          </group>
        );
      })}
      {def.mountains && (
        <group position={[0, surfaceLocalY, 0]}>
          <Mountains region={region} />
        </group>
      )}
    </group>
  );
}
