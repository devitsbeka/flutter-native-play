import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { GeneratedRegion } from "../schemas/worldDefinition";
import { worldMaterials } from "../components/materials";
import { childSeed, createRng, range } from "../procedural/seededRandom";

const shardGeometry = (() => {
  const g = new THREE.IcosahedronGeometry(0.7, 0);
  g.scale(1, 1.5, 0.8);
  return g;
})();

const tmpMatrix = new THREE.Matrix4();
const tmpPos = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const tmpScale = new THREE.Vector3();
const tmpEuler = new THREE.Euler();
const tmpColor = new THREE.Color();
const greyA = new THREE.Color("#c5c0d8");
const greyB = new THREE.Color("#8f88a8");

interface Shard {
  x: number;
  y: number;
  z: number;
  scale: number;
  rot: [number, number, number];
  tint: number;
}

function rimAt(outline: Array<[number, number]>, angle: number): number {
  const n = outline.length;
  const idx = ((angle / (Math.PI * 2)) * n + n) % n;
  const a = outline[Math.floor(idx) % n];
  const b = outline[Math.ceil(idx) % n];
  const t = idx - Math.floor(idx);
  return Math.hypot(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t);
}

/**
 * Static rock shards hugging each cliff base plus a few small fragments
 * floating just off the plateau edges — one instanced draw call per region,
 * grey per-instance colors on the shared white material.
 */
export function Shards({ region, density }: { region: GeneratedRegion; density: number }) {
  const ref = useRef<THREE.InstancedMesh>(null!);

  const shards = useMemo<Shard[]>(() => {
    const { def } = region;
    const rng = createRng(childSeed(def.radius * 104729, `${def.id}:shards`));
    const list: Shard[] = [];
    const baseCount = Math.round(def.radius * 0.9 * density);
    // Cliff-base shards, scattered around the waterline.
    for (let i = 0; i < baseCount; i++) {
      const angle = range(rng, 0, Math.PI * 2);
      const rim = rimAt(region.outline, angle);
      const dist = rim + range(rng, 0.4, 2.6);
      list.push({
        x: def.position[0] + Math.cos(angle) * dist,
        y: -8 + range(rng, -0.6, 1.1),
        z: def.position[2] + Math.sin(angle) * dist,
        scale: range(rng, 0.5, 1.6),
        rot: [range(rng, 0, Math.PI), range(rng, 0, Math.PI * 2), range(rng, 0, Math.PI)],
        tint: rng(),
      });
    }
    // Small floating fragments just off the main edges.
    const floaters = Math.max(0, Math.round(3 * density));
    for (let i = 0; i < floaters; i++) {
      const angle = range(rng, 0, Math.PI * 2);
      const rim = rimAt(region.outline, angle);
      list.push({
        x: def.position[0] + Math.cos(angle) * (rim + range(rng, 2.5, 5.5)),
        y: def.position[1] + def.elevation - range(rng, 2, 8),
        z: def.position[2] + Math.sin(angle) * (rim + range(rng, 2.5, 5.5)),
        scale: range(rng, 0.6, 1.3),
        rot: [range(rng, 0, Math.PI), range(rng, 0, Math.PI * 2), range(rng, 0, Math.PI)],
        tint: rng(),
      });
    }
    return list;
  }, [region, density]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    shards.forEach((shard, i) => {
      tmpPos.set(shard.x, shard.y, shard.z);
      tmpQuat.setFromEuler(tmpEuler.set(shard.rot[0], shard.rot[1], shard.rot[2]));
      tmpScale.setScalar(shard.scale);
      tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);
      mesh.setMatrixAt(i, tmpMatrix);
      tmpColor.copy(greyA).lerp(greyB, shard.tint);
      mesh.setColorAt(i, tmpColor);
    });
    mesh.count = shards.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [shards]);

  if (shards.length === 0) return null;
  return <instancedMesh ref={ref} args={[shardGeometry, worldMaterials.rockInstanced, shards.length]} />;
}
