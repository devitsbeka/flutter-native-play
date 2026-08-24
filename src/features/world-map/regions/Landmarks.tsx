import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GeneratedRegion, LandmarkDefinition } from "../schemas/worldDefinition";
import { worldMaterials } from "../components/materials";
import { childSeed, createRng, range } from "../procedural/seededRandom";
import { terrainHeight } from "../procedural/terrain";

/** Trivia tower: stone drums under two tiered bronze roofs and a thin spire. */
function TriviaTower() {
  return (
    <group>
      <mesh material={worldMaterials.stoneWarm} position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[1.15, 1.45, 2.8, 10]} />
      </mesh>
      <mesh material={worldMaterials.bronze} position={[0, 3.05, 0]} castShadow>
        <coneGeometry args={[1.7, 0.8, 10]} />
      </mesh>
      <mesh material={worldMaterials.stoneCool} position={[0, 3.8, 0]} castShadow>
        <cylinderGeometry args={[0.85, 1, 1.4, 10]} />
      </mesh>
      <mesh material={worldMaterials.bronze} position={[0, 4.9, 0]} castShadow>
        <coneGeometry args={[1.25, 1.1, 10]} />
      </mesh>
      <mesh material={worldMaterials.bronze} position={[0, 6, 0]}>
        <cylinderGeometry args={[0.06, 0.1, 1.4, 6]} />
      </mesh>
      <mesh material={worldMaterials.gold} position={[0, 6.8, 0]}>
        <sphereGeometry args={[0.2, 10, 8]} />
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
      <mesh material={worldMaterials.bronze} position={[0, 2.9, 0]} castShadow>
        <boxGeometry args={[3.7, 0.55, 2.9]} />
      </mesh>
      <mesh material={worldMaterials.bronze} position={[0, 3.45, 0]} castShadow>
        <boxGeometry args={[2.9, 0.5, 2.2]} />
      </mesh>
      {[-1.6, 1.6].map((x) => (
        <group key={x} position={[x, 0, 1.1]}>
          <mesh material={worldMaterials.stoneWarm} position={[0, 1.8, 0]} castShadow>
            <cylinderGeometry args={[0.55, 0.65, 3.6, 8]} />
          </mesh>
          <mesh material={worldMaterials.bronze} position={[0, 3.95, 0]} castShadow>
            <coneGeometry args={[0.78, 1.1, 8]} />
          </mesh>
          <mesh material={worldMaterials.bronze} position={[0, 4.9, 0]}>
            <cylinderGeometry args={[0.045, 0.08, 0.9, 6]} />
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
      <mesh material={worldMaterials.bronze} position={[0, 0.9, 0]}>
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

/** Cozy cottage: plastered walls, pitched roof, chimney and a door. */
function House() {
  return (
    <group>
      <mesh material={worldMaterials.stoneWarm} position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[2.2, 1.7, 1.8]} />
      </mesh>
      <mesh material={worldMaterials.bronze} position={[0, 1.95, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.95, 0.7, 4]} />
      </mesh>
      <mesh material={worldMaterials.bronze} position={[0, 2.5, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.25, 0.75, 4]} />
      </mesh>
      <mesh material={worldMaterials.wood} position={[0, 0.55, 0.92]}>
        <boxGeometry args={[0.5, 1.1, 0.08]} />
      </mesh>
      <mesh material={worldMaterials.stoneCool} position={[0.7, 2.35, -0.4]} castShadow>
        <boxGeometry args={[0.3, 0.9, 0.3]} />
      </mesh>
    </group>
  );
}

/** Windmill with slowly turning blades. */
function Windmill() {
  const bladesRef = useRef<THREE.Group>(null!);
  useFrame((state) => {
    if (bladesRef.current) bladesRef.current.rotation.z = state.clock.elapsedTime * 0.5;
  });
  return (
    <group>
      <mesh material={worldMaterials.stoneWarm} position={[0, 1.7, 0]} castShadow>
        <cylinderGeometry args={[0.95, 1.35, 3.4, 8]} />
      </mesh>
      <mesh material={worldMaterials.bronze} position={[0, 3.65, 0]} castShadow>
        <coneGeometry args={[1.2, 0.7, 8]} />
      </mesh>
      <mesh material={worldMaterials.bronze} position={[0, 4.25, 0]} castShadow>
        <coneGeometry args={[0.7, 0.7, 8]} />
      </mesh>
      <group ref={bladesRef} position={[0, 3.1, 1.05]}>
        {[0, Math.PI / 2].map((angle) => (
          <mesh key={angle} material={worldMaterials.wood} rotation={[0, 0, angle]} castShadow>
            <boxGeometry args={[4.2, 0.35, 0.08]} />
          </mesh>
        ))}
        <mesh material={worldMaterials.gold} position={[0, 0, 0.06]}>
          <sphereGeometry args={[0.18, 8, 8]} />
        </mesh>
      </group>
    </group>
  );
}

/** Small columned temple with a pediment roof. */
function Temple() {
  return (
    <group>
      <mesh material={worldMaterials.stoneCool} position={[0, 0.25, 0]} receiveShadow>
        <boxGeometry args={[3.6, 0.5, 2.8]} />
      </mesh>
      {[-1.3, 1.3].map((x) =>
        [-0.95, 0.95].map((z) => (
          <mesh key={`${x}${z}`} material={worldMaterials.stoneWarm} position={[x, 1.35, z]} castShadow>
            <cylinderGeometry args={[0.22, 0.26, 1.8, 8]} />
          </mesh>
        )),
      )}
      <mesh material={worldMaterials.stoneCool} position={[0, 2.45, 0]} castShadow>
        <boxGeometry args={[3.8, 0.4, 3]} />
      </mesh>
      <mesh material={worldMaterials.bronze} position={[0, 2.75, 0]} castShadow>
        <sphereGeometry args={[1.15, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh material={worldMaterials.bronze} position={[0, 3.9, 0]}>
        <cylinderGeometry args={[0.05, 0.09, 0.8, 6]} />
      </mesh>
      <mesh material={worldMaterials.gold} position={[0, 4.35, 0]}>
        <sphereGeometry args={[0.14, 8, 6]} />
      </mesh>
      <mesh material={worldMaterials.purple} position={[0, 1.1, 0]}>
        <octahedronGeometry args={[0.4, 0]} />
      </mesh>
    </group>
  );
}

const landmarkComponents: Record<LandmarkDefinition["kind"], () => JSX.Element> = {
  triviaTower: TriviaTower,
  castle: Castle,
  rewardShrine: RewardShrine,
  ruin: Ruin,
  house: House,
  windmill: Windmill,
  temple: Temple,
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
  // Landmarks are positioned in world space and sample the ground themselves.
  // Under the old floating islands a single per-region elevation was correct;
  // on continuous, undulating land it sinks or floats every building.
  return (
    <group>
      {def.landmarks.map((landmark) => {
        const Component = landmarkComponents[landmark.kind];
        const wx = def.position[0] + landmark.position[0];
        const wz = def.position[2] + landmark.position[2];
        return (
          <group
            key={landmark.id}
            position={[wx, terrainHeight(wx, wz), wz]}
            rotation={[0, (def.rotationY ?? 0) + (landmark.rotationY ?? 0), 0]}
            scale={(landmark.scale ?? 1) * (def.scale ?? 1)}
          >
            <Component />
          </group>
        );
      })}
      {def.mountains && (
        <group
          position={[
            def.position[0],
            terrainHeight(def.position[0], def.position[2]),
            def.position[2],
          ]}
        >
          <Mountains region={region} />
        </group>
      )}
    </group>
  );
}
