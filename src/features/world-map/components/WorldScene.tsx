import { useMemo, useRef } from "react";
import * as THREE from "three";
import { GeneratedWorld, MapNodeDefinition } from "../schemas/worldDefinition";
import { worldColors } from "./materials";
import { qualityProfiles } from "../utils/deviceQuality";
import { useQualityStore } from "../state/worldStore";
import { Terrain } from "../regions/Terrain";
import { GroundCover } from "../regions/GroundCover";
import { Landmarks } from "../regions/Landmarks";
import { Clouds } from "../regions/Clouds";
import { Paths } from "../paths/Paths";
import { FriendOnMap, NodeMarkers } from "../nodes/NodeMarkers";
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
  friendsByNode?: Record<string, FriendOnMap[]>;
}

export function WorldScene({
  world,
  reducedMotion,
  onNodeClick,
  panel,
  verticalScroll,
  currentNodeId,
  avatarUrl,
  friendsByNode,
}: WorldSceneProps) {
  const highCloudsRef = useRef<THREE.Object3D | null>(null);
  const tier = useQualityStore((s) => s.tier);
  const profile = qualityProfiles[tier];

  // Fog used to start at 135 units — inside the play area — which drained
  // saturation from anything past the middle plateau and was a large part of
  // why the world looked washed out. Pushed well beyond the far islands so it
  // only softens the true horizon.
  const fog = useMemo(() => new THREE.Fog(worldColors.fogPink, 260, 460), []);

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
      {/* One landmass, one cover pass across all of it, then area landmarks. */}
      <Terrain />
      <GroundCover
        trees={world.groundCover.trees}
        rocks={world.groundCover.rocks}
        density={profile.treeDensity}
      />
      {world.regions.map((region) => (
        <Landmarks key={region.def.id} region={region} />
      ))}
      <Paths paths={world.paths} />
      <Clouds clouds={world.clouds} count={profile.cloudCount} animate={!reducedMotion} occluderRef={highCloudsRef} />

      <NodeMarkers
        world={world}
        animate={!reducedMotion}
        onNodeClick={onNodeClick}
        // Only the high cloud layer exists now. Passing a ref that never gets
        // a mesh makes drei's <Html occlude> dereference null every frame.
        occluders={[highCloudsRef]}
        currentNodeId={currentNodeId}
        avatarUrl={avatarUrl}
        friendsByNode={friendsByNode}
      />
      {panel && <NodePanel data={panel} position={world.nodeWorldPositions[panel.node.id]} />}
    </>
  );
}
