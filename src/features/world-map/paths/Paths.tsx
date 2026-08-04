import { useMemo } from "react";
import * as THREE from "three";
import { GeneratedPath } from "../schemas/worldDefinition";
import { worldMaterials } from "../components/materials";
import { childSeed, createRng, range } from "../procedural/seededRandom";

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 2654435761);
  return h >>> 0;
}

/**
 * Builds a flat sandstone ribbon that follows a Catmull-Rom curve through the
 * given world-space points, hovering just above the terrain surface.
 */
function buildRibbon(points: THREE.Vector3[], width: number, seed: number): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.5);
  const divisions = Math.max(24, points.length * 14);
  const samples = curve.getSpacedPoints(divisions);
  const rng = createRng(seed);
  // Slight per-sample width noise so the cream ribbon reads hand-drawn.
  const widths = samples.map(() => width * range(rng, 0.82, 1.18));
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const tangent = new THREE.Vector3();
  const side = new THREE.Vector3();

  samples.forEach((point, i) => {
    const next = samples[Math.min(i + 1, samples.length - 1)];
    const prev = samples[Math.max(i - 1, 0)];
    tangent.subVectors(next, prev).setY(0).normalize();
    side.crossVectors(up, tangent).normalize().multiplyScalar(widths[i] / 2);
    positions.push(point.x + side.x, point.y, point.z + side.z);
    positions.push(point.x - side.x, point.y, point.z - side.z);
    normals.push(0, 1, 0, 0, 1, 0);
    if (i < samples.length - 1) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  return geometry;
}

export function Paths({ paths }: { paths: GeneratedPath[] }) {
  const built = useMemo(
    () =>
      paths.map((path) => {
        const isBridge = path.id.startsWith("bridge-");
        const pts = path.points.map(
          (p) => new THREE.Vector3(p[0], p[1] + (isBridge ? 0.35 : 0.12), p[2]),
        );
        const endA = path.points[0];
        const endB = path.points[path.points.length - 1];
        const drop = isBridge && Math.abs(endA[1] - endB[1]) > 1 ? (endA[1] < endB[1] ? endA : endB) : null;
        const toward = drop === endA ? endB : endA;
        return {
          id: path.id,
          state: path.state,
          isBridge,
          geometry: buildRibbon(pts, isBridge ? 1.6 : 1.9, childSeed(hashId(path.id), "ribbon")),
          // Stone stair at the lower end of an elevation-crossing bridge.
          stair: drop
            ? {
                position: [drop[0], drop[1], drop[2]] as const,
                rotationY: Math.atan2(toward[0] - drop[0], toward[2] - drop[2]),
              }
            : null,
        };
      }),
    [paths],
  );

  return (
    <group>
      {built.map((path) => (
        <group key={path.id}>
          <mesh
            geometry={path.geometry}
            material={path.state === "locked" ? worldMaterials.roadLocked : worldMaterials.road}
            receiveShadow
          />
          {path.stair && (
            <group position={[path.stair.position[0], path.stair.position[1], path.stair.position[2]]} rotation={[0, path.stair.rotationY, 0]}>
              <Stairs />
            </group>
          )}
        </group>
      ))}
    </group>
  );
}

/** Small stone stair: stacked thin slabs climbing toward the higher plateau. */
function Stairs() {
  return (
    <group>
      {[0, 1, 2, 3].map((step) => (
        <mesh
          key={step}
          material={worldMaterials.stoneCool}
          position={[0, 0.14 + step * 0.28, 0.9 + step * 0.55]}
          receiveShadow
        >
          <boxGeometry args={[2, 0.28, 0.6]} />
        </mesh>
      ))}
    </group>
  );
}
