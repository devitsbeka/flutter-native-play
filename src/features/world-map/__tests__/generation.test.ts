import { describe, expect, it } from "vitest";
import { generateWorld } from "../procedural/generateWorld";
import { createRng } from "../procedural/seededRandom";
import { sampleWorld } from "../data/sampleWorld";
import { useProgressionStore } from "../state/worldStore";

describe("seeded randomness", () => {
  it("produces identical sequences for identical seeds", () => {
    const a = createRng(1234);
    const b = createRng(1234);
    for (let i = 0; i < 50; i++) expect(a()).toBe(b());
  });

  it("produces different sequences for different seeds", () => {
    const a = createRng(1);
    const b = createRng(2);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });
});

describe("deterministic world generation", () => {
  it("identical seeds generate identical placement data", () => {
    const first = generateWorld(sampleWorld);
    const second = generateWorld(sampleWorld);
    expect(JSON.stringify(first.regions.map((r) => r.outline))).toBe(
      JSON.stringify(second.regions.map((r) => r.outline)),
    );
    expect(first.groundCover).toEqual(second.groundCover);
    expect(first.clouds).toEqual(second.clouds);
    expect(first.nodeWorldPositions).toEqual(second.nodeWorldPositions);
  });

  it("a different seed changes scattered placement", () => {
    const other = generateWorld({ ...sampleWorld, seed: sampleWorld.seed + 1 });
    const base = generateWorld(sampleWorld);
    // Scatter moved from per-region circles to one pass across the whole
    // landmass when the world became continuous; groundCover is where it lives.
    expect(JSON.stringify(other.groundCover.trees)).not.toBe(
      JSON.stringify(base.groundCover.trees),
    );
  });

  it("covers the whole landmass, not just the areas", () => {
    const world = generateWorld(sampleWorld);
    expect(world.groundCover.trees.length).toBeGreaterThan(50);
    const zs = world.groundCover.trees.map((t) => t.position[2]);
    // Spanning far more than one area's diameter is what distinguishes
    // terrain-wide cover from the per-area rings it replaced.
    expect(Math.max(...zs) - Math.min(...zs)).toBeGreaterThan(80);
  });

  it("keeps scattered decoration clear of node positions", () => {
    const world = generateWorld(sampleWorld);
    for (const [, pos] of Object.entries(world.nodeWorldPositions)) {
      for (const tree of world.groundCover.trees) {
        const d = Math.hypot(tree.position[0] - pos[0], tree.position[2] - pos[2]);
        expect(d).toBeGreaterThan(2);
      }
    }
  });

  it("builds paths for every region route and bridge", () => {
    const world = generateWorld(sampleWorld);
    const regionRoutes = sampleWorld.regions.reduce((n, r) => n + r.paths.length, 0);
    expect(world.paths.length).toBe(regionRoutes + sampleWorld.bridges.length);
  });
});

describe("progression state transitions", () => {
  it("completing a node unlocks its dependents", () => {
    useProgressionStore.setState({ nodeStates: { "meadow-2": "available", "meadow-3": "locked" } });
    useProgressionStore.getState().completeNode("meadow-2", ["meadow-3"]);
    const states = useProgressionStore.getState().nodeStates;
    expect(states["meadow-2"]).toBe("completed");
    expect(states["meadow-3"]).toBe("available");
  });

  it("does not regress already-completed dependents", () => {
    useProgressionStore.setState({ nodeStates: { a: "available", b: "completed" } });
    useProgressionStore.getState().completeNode("a", ["b"]);
    expect(useProgressionStore.getState().nodeStates["b"]).toBe("completed");
  });
});
