import * as THREE from "three";
import { worldColors } from "../components/materials";

/**
 * The continuous landmass the route runs across.
 *
 * The world used to be separate floating plateaus with voids between them,
 * which made the journey read as a set of disconnected stages. This replaces
 * them with one unbroken ribbon of land that changes biome along its length,
 * so scrolling feels like travelling through a country rather than hopping
 * between islands.
 *
 * Everything that has to sit on the ground — level discs, trees, rocks,
 * landmarks, path ribbons — samples `terrainHeight` from here, so there is a
 * single definition of "where the ground is" and nothing floats or sinks.
 */

/** Near (start) and far (summit) ends of the ribbon, in world z. */
export const TERRAIN_Z_START = 62;
export const TERRAIN_Z_END = -112;

/**
 * Half-width of the land at a given z. Two out-of-phase sine terms give the
 * borders an organic wander rather than a ruler-straight corridor.
 */
export function terrainHalfWidth(z: number): number {
  // Wide enough that the border sits outside the frame at the camera's pan
  // limits. At 21 the cliff edge cut across the screen mid-map, which read as
  // the world running out rather than as continuous country.
  return 32 + 6 * Math.sin(z * 0.052) + 3.5 * Math.sin(z * 0.127 + 2.1);
}

/**
 * How much hill relief applies at a given x. The middle of the map is kept
 * nearly flat: the route runs there, and a level disc perched on a hillside
 * reads as broken rather than scenic.
 */
function corridorDamp(x: number): number {
  const t = THREE.MathUtils.smoothstep(Math.abs(x), 9, 26);
  return 0.12 + t * 0.88;
}

/** Ground rises steadily toward the summit end so the route climbs. */
function baseElevation(z: number): number {
  const t = THREE.MathUtils.smoothstep(z, TERRAIN_Z_END, TERRAIN_Z_START);
  // t is 1 at the start and 0 at the summit; invert so the far end is high.
  return (1 - t) * 13;
}

/** Ground height at any point on the landmass. */
export function terrainHeight(x: number, z: number): number {
  const hills =
    1.5 * Math.sin(x * 0.11 + z * 0.047) +
    1.1 * Math.sin(z * 0.085 - x * 0.06) +
    0.7 * Math.sin(x * 0.21 + z * 0.13);
  return baseElevation(z) + hills * corridorDamp(x);
}

/**
 * Biome bands along the route. Each stop is the z where that biome is at full
 * strength; colours cross-fade between neighbours, so there are no seams.
 */
const ZONES: Array<{ z: number; color: THREE.Color }> = [
  { z: 58, color: new THREE.Color(worldColors.sandCap) },
  { z: 30, color: new THREE.Color(worldColors.grassLight) },
  { z: -4, color: new THREE.Color(worldColors.grassDark) },
  { z: -38, color: new THREE.Color(worldColors.grassAlpine) },
  { z: -72, color: new THREE.Color(worldColors.mountain) },
  { z: -105, color: new THREE.Color(worldColors.snow) },
];

const zoneTmp = new THREE.Color();

/** Ground colour at a given z, cross-faded between biome bands. */
export function terrainColorAt(z: number, out: THREE.Color): THREE.Color {
  if (z >= ZONES[0].z) return out.copy(ZONES[0].color);
  const last = ZONES[ZONES.length - 1];
  if (z <= last.z) return out.copy(last.color);
  for (let i = 0; i < ZONES.length - 1; i++) {
    const a = ZONES[i];
    const b = ZONES[i + 1];
    if (z <= a.z && z >= b.z) {
      const t = (a.z - z) / (a.z - b.z);
      return out.copy(a.color).lerp(b.color, THREE.MathUtils.smoothstep(t, 0, 1));
    }
  }
  return out.copy(last.color);
}

/** Cliff face colour, used where the land falls away at the borders. */
export const cliffTint = new THREE.Color(worldColors.cliffMid);

export { zoneTmp };
