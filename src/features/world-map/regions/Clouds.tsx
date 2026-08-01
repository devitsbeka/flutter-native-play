import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ScatterInstance } from "../schemas/worldDefinition";
import { worldMaterials } from "../components/materials";

// One merged "puff cluster" geometry shared by every cloud instance.
const cloudGeometry = (() => {
  const puffs: THREE.BufferGeometry[] = [];
  const spec: Array<[number, number, number, number]> = [
    [0, 0, 0, 1.1],
    [1.2, -0.1, 0.2, 0.8],
    [-1.2, -0.15, -0.1, 0.75],
    [0.4, 0.1, -0.7, 0.6],
    [-0.5, 0.05, 0.7, 0.55],
  ];
  for (const [x, y, z, r] of spec) {
    const s = new THREE.SphereGeometry(r, 10, 8);
    s.scale(1.35, 0.62, 1);
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
export function Clouds({ clouds, count, animate }: { clouds: ScatterInstance[]; count: number; animate: boolean }) {
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

  return <instancedMesh ref={ref} args={[cloudGeometry, worldMaterials.cloud, Math.max(1, visible.length)]} frustumCulled={false} />;
}
