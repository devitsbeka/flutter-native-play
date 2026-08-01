import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GeneratedRegion, ScatterInstance } from "../schemas/worldDefinition";
import { worldColors, worldMaterials } from "../components/materials";

const tmpMatrix = new THREE.Matrix4();
const tmpPos = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const tmpScale = new THREE.Vector3();
const tmpColor = new THREE.Color();
const yAxis = new THREE.Vector3(0, 1, 0);

// Shared geometries created once per module load.
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

function useInstances(
  ref: React.RefObject<THREE.InstancedMesh>,
  instances: ScatterInstance[],
  origin: [number, number, number],
  surfaceY: number,
  baseColor: string,
  tintColor: string,
) {
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const base = new THREE.Color(baseColor);
    const tint = new THREE.Color(tintColor);
    instances.forEach((inst, i) => {
      tmpPos.set(origin[0] + inst.position[0], surfaceY, origin[2] + inst.position[2]);
      tmpQuat.setFromAxisAngle(yAxis, inst.rotationY);
      tmpScale.setScalar(inst.scale);
      tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);
      mesh.setMatrixAt(i, tmpMatrix);
      tmpColor.copy(base).lerp(tint, inst.tint * 0.55);
      mesh.setColorAt(i, tmpColor);
    });
    mesh.count = instances.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [ref, instances, origin, surfaceY, baseColor, tintColor]);
}

/** Instanced trees + rocks for one region: three draw calls total. */
export function Vegetation({ region, density }: { region: GeneratedRegion; density: number }) {
  const foliageRef = useRef<THREE.InstancedMesh>(null!);
  const trunkRef = useRef<THREE.InstancedMesh>(null!);
  const rockRef = useRef<THREE.InstancedMesh>(null!);

  const trees = useMemo(
    () => region.trees.slice(0, Math.round(region.trees.length * density)),
    [region.trees, density],
  );
  const origin: [number, number, number] = region.def.position;
  const alpine = region.def.biome === "alpine";

  useInstances(foliageRef, trees, origin, region.surfaceY, alpine ? "#9fd9a8" : "#6fc584", "#3f9e63");
  useInstances(trunkRef, trees, origin, region.surfaceY, worldColors.treeTrunk, "#7a5a40");
  useInstances(rockRef, region.rocks, origin, region.surfaceY, alpine ? "#ced4e6" : "#c5bcd6", "#9c94b8");

  return (
    <group>
      <instancedMesh ref={foliageRef} args={[foliageGeometry, worldMaterials.foliage, Math.max(1, trees.length)]} castShadow />
      <instancedMesh ref={trunkRef} args={[trunkGeometry, worldMaterials.trunk, Math.max(1, trees.length)]} />
      <instancedMesh ref={rockRef} args={[rockGeometry, worldMaterials.rockInstanced, Math.max(1, region.rocks.length)]} castShadow />
    </group>
  );
}
