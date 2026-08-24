import {
  GeneratedPath,
  GeneratedRegion,
  GeneratedWorld,
  RegionDefinition,
  ScatterInstance,
  Vec3,
  WorldDefinition,
} from "../schemas/worldDefinition";
import { childSeed, createRng, range, Rng } from "./seededRandom";
import { terrainHeight } from "./terrain";

const OUTLINE_SEGMENTS = 22;

/** Exclusion radius kept clear around nodes, landmarks and path points. */
const NODE_CLEARANCE = 3.2;
const LANDMARK_CLEARANCE = 4.5;
const PATH_CLEARANCE = 2.1;
const MIN_SCATTER_SPACING = 1.6;

function toWorld(region: RegionDefinition, local: Vec3): Vec3 {
  const s = region.scale ?? 1;
  const rot = region.rotationY ?? 0;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const x = local[0] * s;
  const z = local[2] * s;
  return [
    region.position[0] + x * cos - z * sin,
    region.position[1] + local[1] * s,
    region.position[2] + x * sin + z * cos,
  ];
}

/** Wobbly rounded island footprint, deterministic per region. */
function generateOutline(region: RegionDefinition, rng: Rng): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const wobble = region.terrainPreset === "highland" ? 0.3 : 0.22;
  // Pre-roll per-vertex radii so outline is independent of later rng use.
  for (let i = 0; i < OUTLINE_SEGMENTS; i++) {
    const angle = (i / OUTLINE_SEGMENTS) * Math.PI * 2;
    const radius = region.radius * (1 - wobble / 2 + wobble * rng());
    const squash = region.terrainPreset === "atoll" ? 0.8 : 0.94;
    points.push([Math.cos(angle) * radius, Math.sin(angle) * radius * squash]);
  }
  return points;
}

function insideOutline(outline: Array<[number, number]>, x: number, z: number, margin: number): boolean {
  // Radial containment test against the wobbled outline: cheap and stable.
  const angle = Math.atan2(z, x);
  const idx = ((angle / (Math.PI * 2)) * OUTLINE_SEGMENTS + OUTLINE_SEGMENTS) % OUTLINE_SEGMENTS;
  const a = outline[Math.floor(idx) % OUTLINE_SEGMENTS];
  const b = outline[Math.ceil(idx) % OUTLINE_SEGMENTS];
  const t = idx - Math.floor(idx);
  const rim = Math.hypot(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t);
  return Math.hypot(x, z) < rim - margin;
}

interface Obstacle {
  x: number;
  z: number;
  r: number;
}

function scatter(
  rng: Rng,
  outline: Array<[number, number]>,
  radius: number,
  count: number,
  obstacles: Obstacle[],
  scaleRange: [number, number],
): ScatterInstance[] {
  const placed: ScatterInstance[] = [];
  let attempts = 0;
  const maxAttempts = count * 14;
  while (placed.length < count && attempts < maxAttempts) {
    attempts++;
    const x = range(rng, -radius, radius);
    const z = range(rng, -radius, radius);
    if (!insideOutline(outline, x, z, 1.4)) continue;
    if (obstacles.some((o) => Math.hypot(x - o.x, z - o.z) < o.r)) continue;
    if (placed.some((p) => Math.hypot(x - p.position[0], z - p.position[2]) < MIN_SCATTER_SPACING)) continue;
    placed.push({
      position: [x, 0, z],
      scale: range(rng, scaleRange[0], scaleRange[1]),
      rotationY: range(rng, 0, Math.PI * 2),
      tint: rng(),
    });
  }
  return placed;
}

function generateRegion(region: RegionDefinition, seed: number): GeneratedRegion {
  const outlineRng = createRng(childSeed(seed, `${region.id}:outline`));
  const outline = generateOutline(region, outlineRng);

  const obstacles: Obstacle[] = [
    ...region.nodes.map((n) => ({ x: n.position[0], z: n.position[2], r: NODE_CLEARANCE })),
    ...region.landmarks.map((l) => ({ x: l.position[0], z: l.position[2], r: LANDMARK_CLEARANCE })),
  ];
  // Keep paths clear by sampling clearance circles between consecutive nodes.
  for (const path of region.paths) {
    const pts = path.through
      .map((id) => region.nodes.find((n) => n.id === id))
      .filter((n): n is NonNullable<typeof n> => Boolean(n));
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i].position;
      const b = pts[i + 1].position;
      const steps = Math.ceil(Math.hypot(b[0] - a[0], b[2] - a[2]) / 2);
      for (let s = 0; s <= steps; s++) {
        const t = s / Math.max(1, steps);
        obstacles.push({ x: a[0] + (b[0] - a[0]) * t, z: a[2] + (b[2] - a[2]) * t, r: PATH_CLEARANCE });
      }
    }
  }
  if (region.mountains) {
    obstacles.push({ x: region.mountains.position[0], z: region.mountains.position[2], r: region.mountains.height * 0.9 });
  }

  const treeRng = createRng(childSeed(seed, `${region.id}:trees`));
  const rockRng = createRng(childSeed(seed, `${region.id}:rocks`));
  // Denser than the island days: an area's scatter now has to cover open
  // country rather than a small plateau, and sparse dressing leaves obvious
  // bald patches between areas.
  const treeCount = Math.round(52 * (region.density?.trees ?? 1));
  const rockCount = Math.round(18 * (region.density?.rocks ?? 1));

  return {
    def: region,
    outline,
    trees: scatter(treeRng, outline, region.radius, treeCount, obstacles, [0.75, 1.35]),
    rocks: scatter(rockRng, outline, region.radius, rockCount, obstacles, [0.5, 1.2]),
    // Kept for callers that want the area's nominal ground level; anything
    // actually placed on the map samples terrainHeight per position instead,
    // because the land is continuous and no longer flat per region.
    surfaceY: terrainHeight(region.position[0], region.position[2]),
  };
}

function generatePaths(def: WorldDefinition, nodeWorld: Record<string, Vec3>): GeneratedPath[] {
  const paths: GeneratedPath[] = [];
  for (const region of def.regions) {
    for (const path of region.paths) {
      const through = path.through.map((id) => nodeWorld[id]).filter(Boolean);
      if (through.length < 2) continue;
      // Resample between nodes so the ribbon follows the terrain instead of
      // cutting a straight chord through it.
      const points: Vec3[] = [];
      for (let i = 0; i < through.length - 1; i++) {
        const a = through[i];
        const b = through[i + 1];
        const steps = Math.max(3, Math.ceil(Math.hypot(b[0] - a[0], b[2] - a[2]) / 2.5));
        for (let s = i === 0 ? 0 : 1; s <= steps; s++) {
          const t = s / steps;
          const x = a[0] + (b[0] - a[0]) * t;
          const z = a[2] + (b[2] - a[2]) * t;
          points.push([x, terrainHeight(x, z), z]);
        }
      }
      paths.push({ id: path.id, state: path.state, points });
    }
  }
  // "Bridges" used to sag across the void between two islands. The land is
  // continuous now, so they are ordinary road segments that follow the ground
  // — sampled along their length so a link never tunnels through a rise.
  for (const bridge of def.bridges) {
    const a = nodeWorld[bridge.from];
    const b = nodeWorld[bridge.to];
    if (!a || !b) continue;
    const steps = 8;
    const points: Vec3[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = a[0] + (b[0] - a[0]) * t;
      const z = a[2] + (b[2] - a[2]) * t;
      points.push([x, terrainHeight(x, z), z]);
    }
    paths.push({ id: `link-${bridge.from}-${bridge.to}`, state: "main", points });
  }
  return paths;
}

function generateClouds(def: WorldDefinition): ScatterInstance[] {
  const rng = createRng(childSeed(def.seed, "clouds"));
  const clouds: ScatterInstance[] = [];
  for (let i = 0; i < 18; i++) {
    const x = range(rng, -46, 46);
    const z = range(rng, -118, 70);
    clouds.push({
      // Height is measured FROM the ground, not from zero. The land climbs
      // ~13 units toward the summit, so a fixed altitude buried the far end
      // of the route in cloud while the near end had clear sky.
      position: [x, terrainHeight(x, z) + range(rng, 20, 38), z],
      scale: range(rng, 2.2, 5.2),
      rotationY: range(rng, 0, Math.PI * 2),
      tint: rng(),
    });
  }
  return clouds;
}

/**
 * Deterministic world assembly. Same definition + seed => identical output.
 * Produces render-ready data only; rendering components consume it as-is.
 */
export function generateWorld(def: WorldDefinition): GeneratedWorld {
  const nodeWorldPositions: Record<string, Vec3> = {};
  for (const region of def.regions) {
    for (const node of region.nodes) {
      const w = toWorld(region, node.position);
      nodeWorldPositions[node.id] = [w[0], terrainHeight(w[0], w[2]), w[2]];
    }
  }
  return {
    def,
    regions: def.regions.map((r) => generateRegion(r, def.seed)),
    paths: generatePaths(def, nodeWorldPositions),
    clouds: generateClouds(def),
    nodeWorldPositions,
  };
}
