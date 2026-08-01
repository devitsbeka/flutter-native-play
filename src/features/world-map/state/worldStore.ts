import { create } from "zustand";
import { NodeState } from "../schemas/worldDefinition";

/**
 * Player progression over the world, kept separate from world configuration.
 * Node state changes update only the affected markers — the scene itself is
 * never rebuilt on progression updates.
 */
interface ProgressionState {
  nodeStates: Record<string, NodeState>;
  setNodeState: (id: string, state: NodeState) => void;
  completeNode: (id: string, unlocks?: string[]) => void;
}

export const useProgressionStore = create<ProgressionState>((set) => ({
  nodeStates: {},
  setNodeState: (id, state) =>
    set((s) => ({ nodeStates: { ...s.nodeStates, [id]: state } })),
  completeNode: (id, unlocks = []) =>
    set((s) => {
      const next = { ...s.nodeStates, [id]: "completed" as NodeState };
      for (const u of unlocks) {
        if (next[u] === "locked" || next[u] === undefined) next[u] = "available";
      }
      return { nodeStates: next };
    }),
}));

/** UI selection state: which node is focused/open. */
interface SelectionState {
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  select: (id: string | null) => void;
  hover: (id: string | null) => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedNodeId: null,
  hoveredNodeId: null,
  select: (id) => set({ selectedNodeId: id }),
  hover: (id) => set({ hoveredNodeId: id }),
}));

/**
 * Camera goals. High-frequency interpolation happens in refs inside the
 * camera rig (never through React state); this store holds only the goals.
 */
interface CameraState {
  target: [number, number, number];
  zoom: number;
  /** Bumped to force an immediate (non-animated) sync, e.g. reduced motion. */
  focusNode: (position: [number, number, number]) => void;
  resetCamera: (target: [number, number, number]) => void;
  setZoom: (zoom: number) => void;
  panBy: (dx: number, dz: number, limits: { x: number; z: number }, home: [number, number, number]) => void;
}

export const useCameraStore = create<CameraState>((set) => ({
  target: [0, 0, 0],
  zoom: 1,
  focusNode: (position) => set({ target: position, zoom: 0.8 }),
  resetCamera: (target) => set({ target, zoom: 1 }),
  setZoom: (zoom) => set({ zoom }),
  panBy: (dx, dz, limits, home) =>
    set((s) => ({
      target: [
        Math.min(home[0] + limits.x, Math.max(home[0] - limits.x, s.target[0] + dx)),
        s.target[1],
        Math.min(home[2] + limits.z, Math.max(home[2] - limits.z, s.target[2] + dz)),
      ],
    })),
}));

export type QualityTier = "low" | "medium" | "high";

interface QualityState {
  tier: QualityTier;
  setTier: (tier: QualityTier) => void;
}

export const useQualityStore = create<QualityState>((set) => ({
  tier: "high",
  setTier: (tier) => set({ tier }),
}));
