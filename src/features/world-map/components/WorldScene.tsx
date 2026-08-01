import { useMemo } from "react";
import * as THREE from "three";
import { GeneratedWorld, MapNodeDefinition } from "../schemas/worldDefinition";
import { worldColors } from "./materials";
import { qualityProfiles } from "../utils/deviceQuality";
import { useQualityStore } from "../state/worldStore";
import { Island } from "../regions/Island";
import { Water } from "../regions/Water";
import { Vegetation } from "../regions/Vegetation";
import { Landmarks } from "../regions/Landmarks";
import { Clouds } from "../regions/Clouds";
import { Paths } from "../paths/Paths";
import { NodeMarkers } from "../nodes/NodeMarkers";
import { NodePanel, NodePanelData } from "../nodes/NodePanel";
import { CameraRig } from "../camera/CameraRig";

interface WorldSceneProps {
  world: GeneratedWorld;
  reducedMotion: boolean;
  onNodeClick: (node: MapNodeDefinition) => void;
  panel: NodePanelData | null;
}

export function WorldScene({ world, reducedMotion, onNodeClick, panel }: WorldSceneProps) {
  const tier = useQualityStore((s) => s.tier);
  const profile = qualityProfiles[tier];

  const fog = useMemo(() => new THREE.Fog(worldColors.sky, 135, 260), []);

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
      <Water animate={!reducedMotion} />
      {world.regions.map((region) => (
        <group key={region.def.id}>
          <Island region={region} />
          <Vegetation region={region} density={profile.treeDensity} />
          <Landmarks region={region} />
        </group>
      ))}
      <Paths paths={world.paths} />
      <Clouds clouds={world.clouds} count={profile.cloudCount} animate={!reducedMotion} />
      <NodeMarkers world={world} animate={!reducedMotion} onNodeClick={onNodeClick} />
      {panel && <NodePanel data={panel} position={world.nodeWorldPositions[panel.node.id]} />}
    </>
  );
}
