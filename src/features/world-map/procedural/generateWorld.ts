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
  const treeCount = Math.round(26 * (region.density?.trees ?? 1));
  const rockCount = Math.round(10 * (region.density?.rocks ?? 1));

  return {
    def: region,
    outline,
    trees: scatter(treeRng, outline, region.radius, treeCount, obstacles, [0.75, 1.35]),
    rocks: scatter(rockRng, outline, region.radius, rockCount, obstacles, [0.5, 1.2]),
    surfaceY: region.position[1] + region.elevation,
  };
}

function generatePaths(def: WorldDefinition, nodeWorld: Record<string, Vec3>): GeneratedPath[] {
  const paths: GeneratedPath[] = [];
  for (const region of def.regions) {
    for (const path of region.paths) {
      const points = path.through.map((id) => nodeWorld[id]).filter(Boolean);
      if (points.length >= 2) paths.push({ id: path.id, state: path.state, points });
    }
  }
  for (const bridge of def.bridges) {
    const a = nodeWorld[bridge.from];
    const b = nodeWorld[bridge.to];
    if (!a || !b) continue;
    // Sag the bridge midpoint slightly below the endpoints for a rope-bridge feel.
    const mid: Vec3 = [(a[0] + b[0]) / 2, Math.min(a[1], b[1]) - 1.2, (a[2] + b[2]) / 2];
    paths.push({ id: `bridge-${bridge.from}-${bridge.to}`, state: "main", points: [a, mid, b] });
  }
  return paths;
}

function generateClouds(def: WorldDefinition): ScatterInstance[] {
  const rng = createRng(childSeed(def.seed, "clouds"));
  const clouds: ScatterInstance[] = [];
  for (let i = 0; i < 14; i++) {
    clouds.push({
      position: [range(rng, -55, 58), range(rng, 8, 24), range(rng, -14, 38)],
      scale: range(rng, 2, 4.6),
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
      nodeWorldPositions[node.id] = [w[0], region.position[1] + region.elevation, w[2]];
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
