import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { childSeed, createRng, range } from "../procedural/seededRandom";

/**
 * Floating pastel orbs — the ambient layer behind the route.
 *
 * The backdrop used to be a flat CSS ramp, which read as a blank wall behind
 * the islands. These are real geometry rather than a painted gradient so they
 * parallax as the player scrolls the route, which is what makes the world feel
 * like it has air in it rather than a sky-box.
 *
 * Two rules keep them ambient instead of noisy:
 *
 * - They live in the empty air ABOVE and BELOW the islands, never in the band
 *   the plateaus occupy. Separating them sideways does not work: at fov 18 the
 *   camera only sees about +/-15 units of x, so orbs pushed out of the
 *   corridor were simply off screen. Vertical separation keeps them visible
 *   through the gaps between islands while never sitting behind a level disc.
 * - `depthWrite` is off and opacity is low. They read as haze, and they cannot
 *   punch a hole in an island that happens to be behind them.
 *
 * Colours come from instance colours on one shared material, matching the
 * repo's convention (see Vegetation) — no per-orb material clones.
 */

/**
 * The islands occupy roughly y -16 (cliff bottoms) to y +16 (highest plateau).
 * Orbs are placed clear of that band, in the open air above and in the void
 * the plateaus float over.
 */
const BAND_BELOW: [number, number] = [-40, -21];
const BAND_ABOVE: [number, number] = [21, 38];

/** Pastel family: lilac, orchid, periwinkle, mint, blush. */
const ORB_COLORS = ["#c9a8f2", "#d9a8e8", "#b3a6ee", "#a6e3d0", "#f0b9d8", "#cbb6f5"];

const orbGeometry = new THREE.SphereGeometry(1, 24, 18);

const orbMaterial = new THREE.MeshStandardMaterial({
  color: "#ffffff",
  roughness: 0.28,
  metalness: 0,
  // Lit alone they came out grey — the scene's key light is warm and its
  // ambient fill is deliberately low, which is right for the chunky terrain
  // and wrong for something meant to glow. A soft lilac emissive lifts them
  // back to luminous pastel. It is uniform rather than per-instance because
  // emissive is a material uniform; the per-orb hue comes from instanceColor.
  emissive: "#c7b0f0",
  emissiveIntensity: 0.42,
  transparent: true,
  opacity: 0.5,
  // Ambient haze must never occlude the route behind it.
  depthWrite: false,
});

interface Orb {
  position: [number, number, number];
  scale: number;
  color: THREE.Color;
  /** Phase offset so the bob is not synchronised across the field. */
  phase: number;
  /** Per-orb bob amplitude, in world units. */
  bob: number;
}

const tmpMatrix = new THREE.Matrix4();
const tmpPos = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const tmpScale = new THREE.Vector3();

export function Orbs({
  seed,
  count,
  zRange,
  animate,
}: {
  seed: number;
  count: number;
  /** [nearest, farthest] z of the route, so orbs span its whole length. */
  zRange: [number, number];
  animate: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null!);

  const orbs = useMemo<Orb[]>(() => {
    const rng = createRng(childSeed(seed, "orbs"));
    const [zNear, zFar] = zRange;
    return Array.from({ length: count }, () => {
      // Two thirds below, so most of the field reads through the void the
      // islands float over — that is where the eye has room for it.
      const band = rng() > 0.34 ? BAND_BELOW : BAND_ABOVE;
      return {
        position: [
          range(rng, -30, 30),
          range(rng, band[0], band[1]),
          range(rng, zFar - 20, zNear + 20),
        ] as [number, number, number],
        scale: range(rng, 2.2, 8.5),
        color: new THREE.Color(ORB_COLORS[Math.floor(rng() * ORB_COLORS.length)]),
        phase: range(rng, 0, Math.PI * 2),
        bob: range(rng, 0.6, 2.4),
      };
    });
  }, [seed, count, zRange]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    orbs.forEach((orb, i) => {
      tmpPos.set(...orb.position);
      tmpScale.setScalar(orb.scale);
      tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);
      mesh.setMatrixAt(i, tmpMatrix);
      mesh.setColorAt(i, orb.color);
    });
    mesh.count = orbs.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [orbs]);

  useFrame((state) => {
    if (!animate || !ref.current) return;
    const t = state.clock.elapsedTime;
    orbs.forEach((orb, i) => {
      tmpPos.set(
        orb.position[0],
        orb.position[1] + Math.sin(t * 0.22 + orb.phase) * orb.bob,
        orb.position[2],
      );
      tmpScale.setScalar(orb.scale);
      tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);
      ref.current.setMatrixAt(i, tmpMatrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={ref}
      args={[orbGeometry, orbMaterial, Math.max(1, orbs.length)]}
      frustumCulled={false}
    />
  );
}

export default Orbs;
