import { useMemo } from "react";
import * as THREE from "three";
import { GeneratedPath } from "../schemas/worldDefinition";
import { worldMaterials } from "../components/materials";

/**
 * Builds a flat sandstone ribbon that follows a Catmull-Rom curve through the
 * given world-space points, hovering just above the terrain surface.
 */
function buildRibbon(points: THREE.Vector3[], width: number): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.5);
  const divisions = Math.max(24, points.length * 14);
  const samples = curve.getSpacedPoints(divisions);
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
    side.crossVectors(up, tangent).normalize().multiplyScalar(width / 2);
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
        return {
          id: path.id,
          state: path.state,
          isBridge,
          geometry: buildRibbon(pts, isBridge ? 1.6 : 1.9),
        };
      }),
    [paths],
  );

  return (
    <group>
      {built.map((path) => (
        <mesh
          key={path.id}
          geometry={path.geometry}
          material={
            path.isBridge
              ? worldMaterials.wood
              : path.state === "locked"
                ? worldMaterials.roadLocked
                : worldMaterials.road
          }
          receiveShadow
        />
      ))}
    </group>
  );
}
