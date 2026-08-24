import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ScatterInstance } from "../schemas/worldDefinition";
import { worldMaterials } from "../components/materials";

// One merged "puff cluster" geometry shared by every cloud instance.
const cloudGeometry = (() => {
  const puffs: THREE.BufferGeometry[] = [];
  // Nine puffs instead of five, and rounder (0.78 vertical squash rather than
  // 0.62): five flattened lozenges read as a smear, and the silhouette is
  // what makes a cloud look like a cloud. A couple of small puffs ride on top
  // so the crown is lumpy instead of a smooth arc.
  const spec: Array<[number, number, number, number]> = [
    [0, 0, 0, 1.15],
    [1.25, -0.08, 0.18, 0.86],
    [-1.25, -0.12, -0.08, 0.8],
    [0.45, 0.06, -0.72, 0.66],
    [-0.55, 0.04, 0.7, 0.62],
    [2.15, -0.22, -0.1, 0.52],
    [-2.1, -0.26, 0.12, 0.48],
    [0.35, 0.52, 0.05, 0.6],
    [-0.6, 0.46, -0.15, 0.5],
  ];
  for (const [x, y, z, r] of spec) {
    const s = new THREE.SphereGeometry(r, 12, 9);
    s.scale(1.28, 0.78, 1.05);
    s.translate(x, y, z);
    puffs.push(s);
  }
  return mergeGeometries(puffs, false);
})();

const tmpMatrix = new THREE.Matrix4();
const tmpPos = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const tmpScale = new THREE.Vector3();
const yAxis = new THREE.Vector3(0, 1, 0);

/**
 * Instanced drifting cloud layer. Drift is applied by mutating instance
 * matrices in the frame loop — no React state is touched per frame.
 */
export function Clouds({
  clouds,
  count,
  animate,
  occluderRef,
}: {
  clouds: ScatterInstance[];
  count: number;
  animate: boolean;
  /** Receives the instanced mesh so DOM markers can occlude against it. */
  occluderRef?: React.MutableRefObject<THREE.Object3D | null>;
}) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const visible = useMemo(() => clouds.slice(0, count), [clouds, count]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    visible.forEach((cloud, i) => {
      tmpPos.set(cloud.position[0], cloud.position[1], cloud.position[2]);
      tmpQuat.setFromAxisAngle(yAxis, cloud.rotationY);
      tmpScale.setScalar(cloud.scale);
      tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);
      mesh.setMatrixAt(i, tmpMatrix);
    });
    mesh.count = visible.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [visible]);

  useFrame((state) => {
    if (!animate || !ref.current) return;
    const t = state.clock.elapsedTime;
    visible.forEach((cloud, i) => {
      // Slow horizontal drift, wrapped over the world span.
      const drift = ((cloud.position[0] + t * (0.35 + cloud.tint * 0.4) + 80) % 160) - 80;
      tmpPos.set(drift, cloud.position[1], cloud.position[2]);
      tmpQuat.setFromAxisAngle(yAxis, cloud.rotationY);
      tmpScale.setScalar(cloud.scale);
      tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);
      ref.current.setMatrixAt(i, tmpMatrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={(mesh) => {
        ref.current = mesh as THREE.InstancedMesh;
        if (occluderRef) occluderRef.current = mesh;
      }}
      args={[cloudGeometry, worldMaterials.cloud, Math.max(1, visible.length)]}
      frustumCulled={false}
    />
  );
}
