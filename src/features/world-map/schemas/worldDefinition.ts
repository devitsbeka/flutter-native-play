export type Vec3 = [number, number, number];

export type BiomeType = "meadow" | "alpine" | "shore";

export type TerrainPreset = "plateau" | "highland" | "atoll";

export type NodeType =
  | "trivia"
  | "reward"
  | "checkpoint"
  | "boss"
  | "portal"
  | "story"
  | "challenge";

export type NodeState = "locked" | "available" | "active" | "completed" | "claimed";

export type LandmarkKind =
  | "triviaTower"
  | "castle"
  | "rewardShrine"
  | "ruin"
  | "house"
  | "windmill"
  | "temple";

export interface CameraDefinition {
  /** Initial look-at point in world units. */
  target: Vec3;
  /** Distance from target along the fixed cinematic axis. */
  distance: number;
  /** Zoom clamp expressed as multipliers of `distance`. */
  zoomRange: [number, number];
  /** Pan clamp around `target`, in world units on the ground plane. */
  panLimits: { x: number; z: number };
}

export interface RewardDefinition {
  kind: "coins" | "gems" | "chest";
  amount: number;
}

export interface MapNodeDefinition {
  id: string;
  type: NodeType;
  state: NodeState;
  /** Position relative to the owning region's origin. */
  position: Vec3;
  label: string;
  reward?: RewardDefinition;
  prerequisiteIds?: string[];
  /** Route target when the node is actioned from the details panel. */
  action?: { kind: "missions" | "discover" | "play" };
}

export interface LandmarkDefinition {
  id: string;
  kind: LandmarkKind;
  position: Vec3;
  rotationY?: number;
  scale?: number;
}

export interface PathDefinition {
  id: string;
  /** Node ids the path travels through, in order. */
  through: string[];
  state: "completed" | "main" | "locked";
}

export interface RegionDefinition {
  id: string;
  name: string;
  position: Vec3;
  rotationY?: number;
  scale?: number;
  /** Height of the walkable plateau surface above water level. */
  elevation: number;
  /** Footprint radius of the island in world units. */
  radius: number;
  terrainPreset: TerrainPreset;
  biome: BiomeType;
  nodes: MapNodeDefinition[];
  paths: PathDefinition[];
  landmarks: LandmarkDefinition[];
  /** Density multipliers for scattered decoration. */
  density?: { trees?: number; rocks?: number };
  /** Adds a snow-capped mountain cluster at this local position. */
  mountains?: { position: Vec3; count: number; height: number };
}

export interface WorldDefinition {
  id: string;
  seed: number;
  name: string;
  biome: BiomeType;
  camera: CameraDefinition;
  regions: RegionDefinition[];
  /** Bridges connect the last node of one region to the first of the next. */
  bridges: Array<{ from: string; to: string }>;
}

/* Generated, render-ready data ------------------------------------------- */

export interface ScatterInstance {
  position: Vec3;
  scale: number;
  rotationY: number;
  /** 0..1 palette variation for instance colors. */
  tint: number;
}

export interface GeneratedRegion {
  def: RegionDefinition;
  /** Closed 2D outline of the island footprint (local x/z pairs). */
  outline: Array<[number, number]>;
  trees: ScatterInstance[];
  rocks: ScatterInstance[];
  /** World-space plateau surface height (y) for this region. */
  surfaceY: number;
}

export interface GeneratedPath {
  id: string;
  state: PathDefinition["state"];
  /** World-space points the ribbon passes through. */
  points: Vec3[];
}

export interface GeneratedWorld {
  def: WorldDefinition;
  regions: GeneratedRegion[];
  paths: GeneratedPath[];
  clouds: ScatterInstance[];
  /** World-space node positions keyed by node id. */
  nodeWorldPositions: Record<string, Vec3>;
}
