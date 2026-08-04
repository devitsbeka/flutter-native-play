import { useMemo } from "react";
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
}

export function WorldScene({ world, reducedMotion, onNodeClick, panel }: WorldSceneProps) {
  const tier = useQualityStore((s) => s.tier);
  const profile = qualityProfiles[tier];

  const fog = useMemo(() => new THREE.Fog(worldColors.fogPink, 135, 260), []);

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
      <hemisphereLight args={["#fdf3ff", "#b39fd6", 0.95]} />
      <directionalLight
        position={[-30, 48, 22]}
        intensity={1.25}
        color="#fff4e0"
        castShadow={profile.shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
        shadow-bias={-0.0004}
      />
      <CameraRig definition={world.def.camera} reducedMotion={reducedMotion} />
      {world.regions.map((region) => (
        <group key={region.def.id}>
          <Island region={region} />
          <Vegetation region={region} density={profile.treeDensity} />
          <Landmarks region={region} />
        </group>
      ))}
      <Paths paths={world.paths} />
      <Clouds clouds={world.clouds} count={profile.cloudCount} animate={!reducedMotion} />
      {profile.lowCloudCount > 0 && (
        <Clouds clouds={lowClouds} count={profile.lowCloudCount} animate={!reducedMotion} />
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
      <NodeMarkers world={world} animate={!reducedMotion} onNodeClick={onNodeClick} />
      {panel && <NodePanel data={panel} position={world.nodeWorldPositions[panel.node.id]} />}
    </>
  );
}
