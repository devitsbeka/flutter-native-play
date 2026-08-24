import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ScatterInstance } from "../schemas/worldDefinition";
import { worldColors, worldMaterials } from "../components/materials";
import { terrainHeight } from "../procedural/terrain";

/**
 * Trees and rocks across the whole landmass.
 *
 * Replaces the per-area Vegetation pass. That scattered inside a circle around
 * each area's centre, which was right when an area was an island and the
 * circle was its shoreline — on continuous ground it left bald rings between
 * areas. Placement now comes from `world.groundCover`, generated across the
 * entire ribbon, and this component only draws it.
 *
 * Three draw calls total: foliage, trunks, rocks. Colour varies per instance,
 * with the green cooling toward the snow line so the cover agrees with the
 * biome band it stands on rather than fighting it.
 */

const trunkGeometry = (() => {
  const g = new THREE.CylinderGeometry(0.14, 0.2, 0.8, 6);
  g.translate(0, 0.4, 0);
  return g;
})();

const foliageGeometry = (() => {
  const lower = new THREE.ConeGeometry(0.85, 1.4, 7);
  lower.translate(0, 1.3, 0);
  const upper = new THREE.ConeGeometry(0.58, 1.05, 7);
  upper.translate(0, 2.1, 0);
  return mergeGeometries([lower, upper], false);
})();

const rockGeometry = (() => {
  const g = new THREE.IcosahedronGeometry(0.55, 0);
  g.scale(1, 0.72, 1);
  return g;
})();

const tmpMatrix = new THREE.Matrix4();
const tmpPos = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const tmpScale = new THREE.Vector3();
const tmpColor = new THREE.Color();
const yAxis = new THREE.Vector3(0, 1, 0);

const lowlandFoliage = new THREE.Color("#6fc584");
const lowlandFoliageAlt = new THREE.Color("#3f9e63");
const alpineFoliage = new THREE.Color("#9fd9a8");
const lowlandRock = new THREE.Color("#c5bcd6");
const alpineRock = new THREE.Color("#ced4e6");

/** 0 in the lowlands, 1 above the snow line — drives the cool colour shift. */
function alpineness(z: number): number {
  return THREE.MathUtils.smoothstep(z, -30, -80);
}

function useCover(
  ref: React.RefObject<THREE.InstancedMesh>,
  instances: ScatterInstance[],
  colorFor: (z: number, tint: number, out: THREE.Color) => THREE.Color,
) {
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    instances.forEach((inst, i) => {
      const x = inst.position[0];
      const z = inst.position[2];
      tmpPos.set(x, terrainHeight(x, z), z);
      tmpQuat.setFromAxisAngle(yAxis, inst.rotationY);
      tmpScale.setScalar(inst.scale);
      tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);
      mesh.setMatrixAt(i, tmpMatrix);
      mesh.setColorAt(i, colorFor(z, inst.tint, tmpColor));
    });
    mesh.count = instances.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [ref, instances, colorFor]);
}

export function GroundCover({
  trees,
  rocks,
  density,
}: {
  trees: ScatterInstance[];
  rocks: ScatterInstance[];
  density: number;
}) {
  const foliageRef = useRef<THREE.InstancedMesh>(null!);
  const trunkRef = useRef<THREE.InstancedMesh>(null!);
  const rockRef = useRef<THREE.InstancedMesh>(null!);

  // Quality tiers thin the cover by dropping the tail of the list. The list is
  // seeded, so the same trees disappear every time rather than shimmering.
  const shownTrees = useMemo(
    () => trees.slice(0, Math.round(trees.length * density)),
    [trees, density],
  );
  const shownRocks = useMemo(
    () => rocks.slice(0, Math.round(rocks.length * density)),
    [rocks, density],
  );

  const foliageColor = useMemo(
    () => (z: number, tint: number, out: THREE.Color) =>
      out.copy(lowlandFoliage).lerp(lowlandFoliageAlt, tint * 0.55).lerp(alpineFoliage, alpineness(z)),
    [],
  );
  const trunkColor = useMemo(
    () => (_z: number, tint: number, out: THREE.Color) =>
      out.set(worldColors.treeTrunk).lerp(new THREE.Color("#7a5a40"), tint * 0.55),
    [],
  );
  const rockColor = useMemo(
    () => (z: number, tint: number, out: THREE.Color) =>
      out.copy(lowlandRock).lerp(new THREE.Color("#9c94b8"), tint * 0.55).lerp(alpineRock, alpineness(z)),
    [],
  );

  useCover(foliageRef, shownTrees, foliageColor);
  useCover(trunkRef, shownTrees, trunkColor);
  useCover(rockRef, shownRocks, rockColor);

  return (
    <group>
      <instancedMesh
        ref={foliageRef}
        args={[foliageGeometry, worldMaterials.foliage, Math.max(1, shownTrees.length)]}
        castShadow
      />
      <instancedMesh
        ref={trunkRef}
        args={[trunkGeometry, worldMaterials.trunk, Math.max(1, shownTrees.length)]}
      />
      <instancedMesh
        ref={rockRef}
        args={[rockGeometry, worldMaterials.rockInstanced, Math.max(1, shownRocks.length)]}
        castShadow
      />
    </group>
  );
}

export default GroundCover;
