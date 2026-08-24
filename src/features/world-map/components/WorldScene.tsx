import { useMemo, useRef } from "react";
import * as THREE from "three";
import { GeneratedWorld, MapNodeDefinition } from "../schemas/worldDefinition";
import { worldColors } from "./materials";
import { qualityProfiles } from "../utils/deviceQuality";
import { useQualityStore } from "../state/worldStore";
import { Island } from "../regions/Island";
import { Shards } from "../regions/Shards";
import { Vegetation } from "../regions/Vegetation";
import { Landmarks } from "../regions/Landmarks";
import { Clouds } from "../regions/Clouds";
import { Orbs } from "../regions/Orbs";
import { Paths } from "../paths/Paths";
import { NodeMarkers } from "../nodes/NodeMarkers";
import { NodePanel, NodePanelData } from "../nodes/NodePanel";
import { CameraRig } from "../camera/CameraRig";
import { worldMaterials } from "./materials";
import { childSeed, createRng, range } from "../procedural/seededRandom";
import { ScatterInstance } from "../schemas/worldDefinition";

interface WorldSceneProps {
  world: GeneratedWorld;
  reducedMotion: boolean;
  onNodeClick: (node: MapNodeDefinition) => void;
  panel: NodePanelData | null;
  /** Travel the route by vertical drag instead of free pan (phones). */
  verticalScroll?: boolean;
  currentNodeId?: string | null;
  avatarUrl?: string | null;
}

export function WorldScene({
  world,
  reducedMotion,
  onNodeClick,
  panel,
  verticalScroll,
  currentNodeId,
  avatarUrl,
}: WorldSceneProps) {
  const highCloudsRef = useRef<THREE.Object3D | null>(null);
  const lowCloudsRef = useRef<THREE.Object3D | null>(null);
  const tier = useQualityStore((s) => s.tier);
  const profile = qualityProfiles[tier];

  // Fog used to start at 135 units — inside the play area — which drained
  // saturation from anything past the middle plateau and was a large part of
  // why the world looked washed out. Pushed well beyond the far islands so it
  // only softens the true horizon.
  const fog = useMemo(() => new THREE.Fog(worldColors.fogPink, 260, 460), []);

  // Route extent, so the orb field spans the whole journey rather than
  // clustering around the origin.
  const orbZRange = useMemo<[number, number]>(() => {
    const zs = world.def.regions.map((r) => r.position[2]);
    return [Math.max(...zs), Math.min(...zs)];
  }, [world.def.regions]);

  // Low cloud puffs hugging cliff bases and drifting through the channels.
  const lowClouds = useMemo<ScatterInstance[]>(() => {
    const rng = createRng(childSeed(world.def.seed, "low-clouds"));
    return Array.from({ length: 8 }, () => ({
      position: [range(rng, -45, 50), range(rng, -7, -2), range(rng, -25, 28)] as [number, number, number],
      scale: range(rng, 0.9, 1.8),
      rotationY: range(rng, 0, Math.PI * 2),
      tint: rng(),
    }));
  }, [world.def.seed]);

  return (
    <>
      <fog attach="fog" args={[fog.color, fog.near, fog.far]} />
      {/* Ambient fill dropped and the key light raised: the old 0.95 hemisphere
          lit the shadow side almost as brightly as the lit side, which flattens
          chunky stylised geometry. The wider gap is what gives the plateaus
          their solid, readable form. */}
      <hemisphereLight args={["#fff6ff", "#9a86c4", 0.52]} />
      <directionalLight
        position={[-30, 48, 22]}
        intensity={1.75}
        color="#fff2d2"
        castShadow={profile.shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-120}
        shadow-camera-right={120}
        shadow-camera-top={120}
        shadow-camera-bottom={-120}
        shadow-bias={-0.0004}
      />
      <CameraRig definition={world.def.camera} reducedMotion={reducedMotion} verticalScroll={verticalScroll} />
      <Orbs seed={world.def.seed} count={profile.orbCount} zRange={orbZRange} animate={!reducedMotion} />
      {world.regions.map((region) => (
        <group key={region.def.id}>
          <Island region={region} />
          <Vegetation region={region} density={profile.treeDensity} />
          <Landmarks region={region} />
        </group>
      ))}
      <Paths paths={world.paths} />
      <Clouds clouds={world.clouds} count={profile.cloudCount} animate={!reducedMotion} occluderRef={highCloudsRef} />
      {profile.lowCloudCount > 0 && (
        <Clouds clouds={lowClouds} count={profile.lowCloudCount} animate={!reducedMotion} occluderRef={lowCloudsRef} />
      )}
      {profile.shardDensity > 0 &&
        world.regions.map((region) => <Shards key={`${region.def.id}-shards`} region={region} density={profile.shardDensity} />)}
      {profile.mist && (
        <group>
          {[
            [-20, -12.5, 10, 90],
            [25, -13.5, -8, 110],
            [0, -14.5, 30, 100],
          ].map(([x, y, z, size], i) => (
            <mesh key={i} material={worldMaterials.mist} rotation={[-Math.PI / 2, 0, 0]} position={[x, y, z]}>
              <planeGeometry args={[size, size * 0.7]} />
            </mesh>
          ))}
        </group>
      )}
      <NodeMarkers
        world={world}
        animate={!reducedMotion}
        onNodeClick={onNodeClick}
        occluders={[highCloudsRef, lowCloudsRef]}
        currentNodeId={currentNodeId}
        avatarUrl={avatarUrl}
      />
      {panel && <NodePanel data={panel} position={world.nodeWorldPositions[panel.node.id]} />}
    </>
  );
}
