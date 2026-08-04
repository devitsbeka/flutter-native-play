import * as THREE from "three";

/**
 * Centralized stylized material tokens. All world meshes share these
 * instances — do not clone per object; per-instance variation comes from
 * instance colors, not new materials.
 */
export const worldColors = {
  grassLight: "#b8e6a3",
  grassDark: "#8fd487",
  grassAlpine: "#cdeec2",
  cliffWarm: "#c9b3a4",
  cliffCool: "#a8a4c0",
  cliffShade: "#8f87ad",
  cliffTop: "#d9d4e8",
  cliffMid: "#b9b3cc",
  cliffBase: "#948cb0",
  sandCap: "#ead9b8",
  dryEarth: "#d9c39a",
  riverWater: "#7fd4ea",
  pathCream: "#f2ead9",
  bronze: "#c9974f",
  pitDark: "#544d73",
  fogPink: "#e6cff5",
  snow: "#f4f8ff",
  mountain: "#dfe7f5",
  water: "#8fdbe8",
  waterDeep: "#5db8d6",
  road: "#e8d5b0",
  roadLocked: "#cfc8da",
  stoneWarm: "#d9c6a8",
  stoneCool: "#b9b4cc",
  wood: "#b08a62",
  roofWarm: "#d98d5f",
  goldAccent: "#f5c04e",
  purpleMagic: "#a855f7",
  cloud: "#ffffff",
  treeTrunk: "#9a7350",
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
  cloud: new THREE.MeshStandardMaterial({
    color: worldColors.cloud,
    roughness: 1,
    transparent: true,
    opacity: 0.92,
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
  foliage: standard("#ffffff"),
  trunk: standard("#ffffff"),
  rockInstanced: standard("#ffffff"),
} as const;
