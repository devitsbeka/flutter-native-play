import { useMemo } from "react";
import * as THREE from "three";
import { worldMaterials } from "../components/materials";
import {
  TERRAIN_Z_END,
  TERRAIN_Z_START,
  cliffTint,
  terrainColorAt,
  terrainHalfWidth,
  terrainHeight,
} from "../procedural/terrain";

/**
 * The single continuous landmass.
 *
 * Built as a parametric grid rather than a displaced plane: for each step
 * along z the row spans the land's own half-width at that point, so the
 * silhouette wanders instead of running as a straight corridor. A plane could
 * not do that — its edge would always be a straight line, and cutting a
 * wobbly border out of it would mean re-triangulating anyway.
 *
 * The outer fifth of each row falls away sharply, which is what makes the
 * border read as a cliff edge rather than the map simply ending. Vertex
 * colours carry the biome bands and darken into that fall, so no texture and
 * no second material are needed.
 */

/** Rows along the route. ~1.3 world units apart at the current length. */
const SEG_Z = 132;
/** Columns across the land. */
const SEG_U = 44;
/** Where the border starts dropping, as a fraction of the half-width. */
const EDGE_START = 0.72;
/** How far the border falls, in world units. */
const EDGE_DROP = 20;

function buildTerrain(): THREE.BufferGeometry {
  const cols = SEG_U + 1;
  const rows = SEG_Z + 1;
  const positions = new Float32Array(cols * rows * 3);
  const colors = new Float32Array(cols * rows * 3);
  const indices: number[] = [];

  const zoneColor = new THREE.Color();
  const vertexColor = new THREE.Color();

  for (let iz = 0; iz < rows; iz++) {
    const tz = iz / SEG_Z;
    const z = THREE.MathUtils.lerp(TERRAIN_Z_START, TERRAIN_Z_END, tz);
    const halfWidth = terrainHalfWidth(z);
    terrainColorAt(z, zoneColor);

    for (let iu = 0; iu < cols; iu++) {
      const u = -1 + (2 * iu) / SEG_U;
      const x = u * halfWidth;
      // Squared falloff so the lip stays flat and the drop accelerates.
      const edge = THREE.MathUtils.smoothstep(Math.abs(u), EDGE_START, 1);
      const y = terrainHeight(x, z) - edge * edge * EDGE_DROP;

      const i = (iz * cols + iu) * 3;
      positions[i] = x;
      positions[i + 1] = y;
      positions[i + 2] = z;

      vertexColor.copy(zoneColor).lerp(cliffTint, Math.min(1, edge * 1.35));
      colors[i] = vertexColor.r;
      colors[i + 1] = vertexColor.g;
      colors[i + 2] = vertexColor.b;
    }
  }

  for (let iz = 0; iz < SEG_Z; iz++) {
    for (let iu = 0; iu < SEG_U; iu++) {
      const a = iz * cols + iu;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      // Rows advance along -Z (start is at +Z), which flips the handedness of
      // the grid: the obvious winding produces clockwise front faces and the
      // whole landmass gets back-face culled, leaving trees and roads
      // apparently floating on the empty backdrop.
      indices.push(a, b, c, b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function Terrain() {
  const geometry = useMemo(buildTerrain, []);
  return <mesh geometry={geometry} material={worldMaterials.capBlend} receiveShadow castShadow />;
}

export default Terrain;
