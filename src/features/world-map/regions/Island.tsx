import { useMemo } from "react";
import * as THREE from "three";
import { GeneratedRegion } from "../schemas/worldDefinition";
import { worldColors, worldMaterials } from "../components/materials";
import { childSeed, createRng, range, Rng } from "../procedural/seededRandom";

/** All plateau cliffs plunge to the same depth, well below the water line. */
const CLIFF_BOTTOM_WORLD = -16;

const colGrass = new THREE.Color(worldColors.grassLight);
const colGrassAlpine = new THREE.Color(worldColors.grassAlpine);
const colSand = new THREE.Color(worldColors.sandCap);
const colEarth = new THREE.Color(worldColors.dryEarth);
const colRim = new THREE.Color(worldColors.pathCream);
const strataColors = [
  new THREE.Color(worldColors.cliffTop),
  new THREE.Color(worldColors.cliffMid),
  new THREE.Color(worldColors.cliffBase),
];

/** Rim radius of the wobbled outline at a given angle (matches generator). */
function rimAt(outline: Array<[number, number]>, angle: number): number {
  const n = outline.length;
  const idx = ((angle / (Math.PI * 2)) * n + n) % n;
  const a = outline[Math.floor(idx) % n];
  const b = outline[Math.ceil(idx) % n];
  const t = idx - Math.floor(idx);
  return Math.hypot(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t);
}

function outlineToShape(outline: Array<[number, number]>, scale: number): THREE.Shape {
  const shape = new THREE.Shape();
  const pts = outline.map(([x, z]) => new THREE.Vector2(x * scale, z * scale));
  shape.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i <= pts.length; i++) {
    const current = pts[i % pts.length];
    const prev = pts[i - 1];
    const mid = prev.clone().add(current).multiplyScalar(0.5);
    shape.quadraticCurveTo(prev.x, prev.y, mid.x, mid.y);
  }
  return shape;
}

/**
 * Grass/sand cap with vertex-color blending: seeded dry patches fade in via
 * smooth falloff (heavier on low southern plateaus), and a thin cream rim
 * follows the cliff edge like the painted highlight in the reference.
 */
function buildCap(region: GeneratedRegion, rng: Rng): THREE.BufferGeometry {
  const { def } = region;
  const geo = new THREE.ExtrudeGeometry(outlineToShape(region.outline, 1), {
    depth: 1.2,
    bevelEnabled: true,
    bevelThickness: 0.5,
    bevelSize: 0.6,
    bevelSegments: 2,
    curveSegments: 6,
  });
  geo.rotateX(Math.PI / 2);

  const sandiness = def.biome === "shore" ? 0.8 : def.position[2] > 6 ? 0.32 : 0.12;
  const patches = Array.from({ length: 3 }, () => ({
    x: range(rng, -def.radius * 0.6, def.radius * 0.6),
    z: range(rng, -def.radius * 0.6, def.radius * 0.6),
    r: range(rng, def.radius * 0.28, def.radius * 0.5),
    earthy: rng() > 0.5,
  }));

  const base = def.biome === "alpine" ? colGrassAlpine : colGrass;
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    c.copy(base);
    // Dry patches with smooth falloff — never a hard seam.
    for (const patch of patches) {
      const d = Math.hypot(x - patch.x, z - patch.z);
      const t = THREE.MathUtils.smoothstep(1 - d / patch.r, 0, 1) * sandiness;
      if (t > 0) c.lerp(patch.earthy ? colEarth : colSand, Math.min(1, t));
    }
    // Cream rim where the cap meets the cliff edge. The smoothed cap sits
    // inside the raw outline, so shrink the reference rim before banding.
    const rim = rimAt(region.outline, Math.atan2(z, x)) * 0.94;
    const edge = rim - Math.hypot(x, z);
    if (edge < 0.9) c.lerp(colRim, THREE.MathUtils.clamp(1 - edge / 0.9, 0, 1) * 0.7);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geo;
}

/**
 * Tall faceted cliff wall: columns follow the outline with angular radial
 * jitter, three strata bands carry cliffTop/cliffMid/cliffBase vertex colors,
 * and non-indexed triangles keep every face flat-shaded fractured rock.
 */
function buildCliff(region: GeneratedRegion, rng: Rng): THREE.BufferGeometry {
  const { def } = region;
  const topY = def.elevation - 0.7;
  const bottomY = CLIFF_BOTTOM_WORLD - def.position[1];
  const height = topY - bottomY;
  // Strata boundaries top->bottom.
  const levels = [topY, topY - height * 0.3, topY - height * 0.62, bottomY];

  const columnCount = region.outline.length * 2;
  const columns: Array<{ dir: THREE.Vector2; radii: number[] }> = [];
  for (let i = 0; i < columnCount; i++) {
    const angle = (i / columnCount) * Math.PI * 2;
    const rim = rimAt(region.outline, angle) - 0.35;
    const jitter = range(rng, -0.9, 0.5);
    const radii = levels.map((_, k) => Math.max(1.5, rim + jitter - k * 0.5 + range(rng, -0.55, 0.55)));
    columns.push({ dir: new THREE.Vector2(Math.cos(angle), Math.sin(angle)), radii });
  }

  const positions: number[] = [];
  const colors: number[] = [];
  const c = new THREE.Color();
  const push = (col: (typeof columns)[0], level: number, tint: number) => {
    positions.push(col.dir.x * col.radii[level], levels[level], col.dir.y * col.radii[level]);
    colors.push(c.r * tint, c.g * tint, c.b * tint);
  };
  for (let i = 0; i < columnCount; i++) {
    const a = columns[i];
    const b = columns[(i + 1) % columnCount];
    for (let k = 0; k < 3; k++) {
      c.copy(strataColors[k]);
      const tint = range(rng, 0.93, 1.05);
      // Two flat triangles per quad, vertices duplicated for faceting.
      push(a, k, tint);
      push(a, k + 1, tint);
      push(b, k, tint);
      push(b, k, tint);
      push(a, k + 1, tint);
      push(b, k + 1, tint);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

interface Sinkhole {
  x: number;
  z: number;
  r: number;
}

/** Seeded sinkholes punched through the cap, clear of nodes and landmarks. */
function placeSinkholes(region: GeneratedRegion, rng: Rng): Sinkhole[] {
  const { def } = region;
  if (def.radius < 8) return [];
  const holes: Sinkhole[] = [];
  const count = def.radius >= 10 ? 2 : 1;
  const keepClear = [...def.nodes.map((n) => n.position), ...def.landmarks.map((l) => l.position)];
  let attempts = 0;
  while (holes.length < count && attempts < 20) {
    attempts++;
    const x = range(rng, -def.radius * 0.5, def.radius * 0.5);
    const z = range(rng, -def.radius * 0.5, def.radius * 0.5);
    const r = range(rng, 1.3, 2.2);
    if (keepClear.some((p) => Math.hypot(x - p[0], z - p[2]) < r + 4.5)) continue;
    if (holes.some((h) => Math.hypot(x - h.x, z - h.z) < r + h.r + 2)) continue;
    holes.push({ x, z, r });
  }
  return holes;
}

/**
 * A fractured floating plateau: blended cap over a tall faceted strata cliff,
 * with seeded sinkholes selling the landmass thickness.
 */
export function Island({ region }: { region: GeneratedRegion }) {
  const { def } = region;

  const { cap, cliff, sinkholes } = useMemo(() => {
    const capRng = createRng(childSeed(def.radius * 7919, `${def.id}:cap`));
    const cliffRng = createRng(childSeed(def.radius * 7919, `${def.id}:cliff`));
    const holeRng = createRng(childSeed(def.radius * 7919, `${def.id}:holes`));
    return {
      cap: buildCap(region, capRng),
      cliff: buildCliff(region, cliffRng),
      sinkholes: placeSinkholes(region, holeRng),
    };
  }, [region, def]);

  return (
    <group position={def.position} rotation={[0, def.rotationY ?? 0, 0]} scale={def.scale ?? 1}>
      <mesh geometry={cap} material={worldMaterials.capBlend} position={[0, def.elevation - 0.5, 0]} receiveShadow />
      <mesh geometry={cliff} material={worldMaterials.cliffFaceted} />
      {sinkholes.map((hole, i) => (
        <group key={i} position={[hole.x, def.elevation, hole.z]}>
          <mesh material={worldMaterials.stoneCool} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
            <torusGeometry args={[hole.r, 0.28, 8, 20]} />
          </mesh>
          <mesh material={worldMaterials.pit} position={[0, -1.4, 0]}>
            <cylinderGeometry args={[hole.r * 0.92, hole.r * 0.8, 3, 16]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
