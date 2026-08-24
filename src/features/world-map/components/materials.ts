import * as THREE from "three";

/**
 * Centralized stylized material tokens. All world meshes share these
 * instances — do not clone per object; per-instance variation comes from
 * instance colors, not new materials.
 */
export const worldColors = {
  // Saturated, high-value greens. The previous pastels sat within a few
  // percent of the lavender sky in both hue and lightness, so the islands
  // read as a wash rather than as objects — the "too blended" problem.
  grassLight: "#66cc38",
  grassDark: "#4faf37",
  grassAlpine: "#96de55",
  // Cliffs go warm terracotta rather than purple-grey. The sky is purple, so
  // purple rock had nothing to contrast against; a warm complement makes each
  // plateau pop off the background without touching the brand sky colour.
  cliffWarm: "#dda06a",
  cliffCool: "#c9885a",
  cliffShade: "#a86f47",
  cliffTop: "#f0cb9c",
  cliffMid: "#d69a68",
  cliffBase: "#a9714a",
  sandCap: "#f7dc93",
  dryEarth: "#e3aa4e",
  riverWater: "#3fc9f0",
  pathCream: "#fff6dc",
  bronze: "#e0a13c",
  pitDark: "#7a5334",
  fogPink: "#e9dcf5",
  snow: "#ffffff",
  mountain: "#d5e4fa",
  water: "#4fd0e8",
  waterDeep: "#2196c4",
  road: "#f9e3ad",
  roadLocked: "#c6bed4",
  stoneWarm: "#eccfa0",
  stoneCool: "#b9b4cc",
  wood: "#a86a3c",
  roofWarm: "#f2703c",
  goldAccent: "#ffc93c",
  purpleMagic: "#b04dff",
  cloud: "#ffffff",
  treeTrunk: "#8a5a34",
  sky: "#ddc2f9",
} as const;

function standard(color: string, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, ...opts });
}

export const worldMaterials = {
  grassTop: standard(worldColors.grassLight, { vertexColors: false }),
  grassAlpine: standard(worldColors.grassAlpine),
  cliffWarm: standard(worldColors.cliffWarm),
  cliffCool: standard(worldColors.cliffCool),
  cliffShade: standard(worldColors.cliffShade),
  snow: standard(worldColors.snow, { roughness: 0.75 }),
  mountain: standard(worldColors.mountain),
  water: new THREE.MeshStandardMaterial({
    color: worldColors.riverWater,
    roughness: 0.35,
    metalness: 0,
    transparent: true,
    opacity: 0.94,
  }),
  road: standard(worldColors.pathCream, { roughness: 0.95 }),
  roadLocked: standard(worldColors.roadLocked, { roughness: 0.95, transparent: true, opacity: 0.7 }),
  stoneWarm: standard(worldColors.stoneWarm),
  stoneCool: standard(worldColors.stoneCool),
  wood: standard(worldColors.wood),
  roof: standard(worldColors.roofWarm, { roughness: 0.8 }),
  gold: standard(worldColors.goldAccent, { roughness: 0.4, metalness: 0.15, emissive: "#8a6414", emissiveIntensity: 0.15 }),
  purple: standard(worldColors.purpleMagic, {
    roughness: 0.35,
    emissive: worldColors.purpleMagic,
    emissiveIntensity: 0.35,
  }),
  // Clouds read as grey-purple rather than white for two reasons: the
  // hemisphere light's ground colour is purple, so it tints every underside,
  // and at 0.92 opacity the purple backdrop shows straight through. The
  // emissive term lifts the shadowed side back to white without flattening
  // the form the way an unlit material would, and the higher opacity stops
  // the sky bleeding through the body.
  cloud: new THREE.MeshStandardMaterial({
    color: worldColors.cloud,
    roughness: 1,
    metalness: 0,
    emissive: "#ffffff",
    emissiveIntensity: 0.55,
    transparent: true,
    opacity: 0.98,
  }),
  // Vertex-colored terrain: white base, colors baked per vertex.
  capBlend: new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9, metalness: 0, vertexColors: true }),
  cliffFaceted: new THREE.MeshStandardMaterial({
    color: "#ffffff",
    roughness: 0.92,
    metalness: 0,
    vertexColors: true,
    flatShading: true,
  }),
  bronze: standard(worldColors.bronze, { roughness: 0.6, emissive: "#3a2408", emissiveIntensity: 0.15 }),
  pit: standard(worldColors.pitDark, { roughness: 1 }),
  mist: new THREE.MeshStandardMaterial({
    color: "#ffffff",
    roughness: 1,
    transparent: true,
    opacity: 0.15,
    depthWrite: false,
  }),
  // Instanced materials stay white: per-instance colors carry the palette.
  foliage: standard("#ffffff", { flatShading: true }),
  trunk: standard("#ffffff"),
  rockInstanced: standard("#ffffff"),
} as const;
