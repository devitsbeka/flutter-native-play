import { WorldDefinition } from "../schemas/worldDefinition";

/**
 * "სამყარო ალფა" — one continuous vertical route.
 *
 * The world is a single unbroken landmass (see procedural/terrain.ts) running
 * from z +62 at the start to z -112 at the summit, changing biome along its
 * length: shore, meadow, fields, highland, alpine, snow. It used to be six
 * floating plateaus with voids between them, which read as disconnected
 * stages rather than a journey.
 *
 * A "region" here is no longer an island — it is an AREA on that landmass. It
 * carries the nodes, landmarks and scatter density for its stretch of the
 * route, and its `position` places it on the ground. `elevation` is kept
 * because the schema requires it, but nothing reads it any more: everything
 * samples terrainHeight at its own x/z, because the ground undulates.
 *
 * ---------------------------------------------------------------------------
 * Spacing — the rule that matters most here
 * ---------------------------------------------------------------------------
 * At the configured camera (distance 215, fov 18) roughly 12.4 screen px map
 * to one world unit, and a level disc is 54 px wide. Nodes need ~10 world
 * units between them or the discs overlap and the route becomes an
 * unreadable pile — the first pass used ~6 and measured a 26 px centre
 * distance between neighbouring 60 px discs, i.e. literally stacked.
 *
 * So:
 * - Main areas carry three nodes on a diagonal at local x -8 / 0 / +8 and
 *   z +5.5 / 0 / -5.5, which is ~9.7 units (~120 px) apart.
 * - Areas step 26 units along -Z and alternate x, giving the zig-zag that
 *   makes the route read as a path rather than a column.
 * - Side quests sit in their own clearing offset to one side of the main
 *   line. They stay within x +/-15: the land's half-width wanders around 21
 *   and its outer fifth falls away as cliff, so anything beyond that is on
 *   the slope or off the map.
 *
 * If you add nodes, re-measure. Overlap is the failure mode.
 *
 * Node roles:
 *   trivia     ordinary level on the main line
 *   challenge  optional detour in a side clearing
 *   story      narrative beat, no quiz
 *   reward     coin pickup / treasure chest
 *   checkpoint area gate
 *   boss       area finale
 *   portal     jump elsewhere in the app
 */
export const adventureWorld: WorldDefinition = {
  id: "world-alpha",
  seed: 20260801,
  name: "სამყარო ალფა",
  biome: "meadow",
  camera: {
    // Pan clamps are symmetric around this point, so it sits at the MIDDLE of
    // the route rather than at the player's chapter. Anchoring it at the start
    // let the camera travel ~100 units past chapter 1 into empty sky. The
    // opening framing comes from WorldMap centring on the current node, not
    // from here.
    target: [0, 2, -21],
    distance: 215,
    fov: 18,
    zoomRange: [0.8, 1.3],
    // Route nodes span z 49.5 (chapter 1) to -91 (chapter 6); half that span
    // is 70, plus a little margin so the end chapters are not jammed against
    // the screen edge. x stays tight — this is a vertical map.
    panLimits: { x: 14, z: 72 },
  },
  bridges: [
    { from: "c1-c", to: "c2-a" },
    { from: "c2-c", to: "c3-a" },
    { from: "c3-c", to: "c4-a" },
    { from: "c4-c", to: "c5-a" },
    { from: "c5-c", to: "c6-a" },
  ],
  regions: [
    /* --------------------------------------------------------- area 1 */
    {
      id: "chapter-1-shore",
      name: "სანაპირო",
      position: [-8, -2, 44],
      elevation: 3,
      radius: 21,
      terrainPreset: "atoll",
      biome: "shore",
      density: { trees: 0.5, rocks: 0.9 },
      nodes: [
        { id: "c1-a", type: "story", state: "completed", position: [-8, 0, 5.5], label: "დასაწყისი", stars: 3 },
        {
          id: "c1-b",
          type: "trivia",
          state: "completed",
          position: [0, 0, 0],
          label: "კინო",
          stars: 3,
          action: { kind: "discover" },
        },
        {
          id: "c1-c",
          type: "reward",
          state: "claimed",
          position: [8, 0, -5.5],
          label: "საჩუქარი",
          reward: { kind: "coins", amount: 500 },
        },
      ],
      paths: [{ id: "c1-route", through: ["c1-a", "c1-b", "c1-c"], state: "completed" }],
      landmarks: [
        { id: "c1-house", kind: "house", position: [-3, 0, -7], rotationY: 0.6 },
        { id: "c1-shrine", kind: "rewardShrine", position: [8, 0, 6], scale: 0.85 },
      ],
    },

    /* --------------------------------------------------------- area 2 */
    {
      id: "chapter-2-meadow",
      name: "მდელო",
      position: [8, -1, 18],
      elevation: 5,
      radius: 21,
      terrainPreset: "plateau",
      biome: "meadow",
      density: { trees: 1.1, rocks: 0.5 },
      nodes: [
        {
          id: "c2-a",
          type: "trivia",
          state: "completed",
          position: [-8, 0, 5.5],
          label: "მუსიკა",
          stars: 2,
          action: { kind: "discover" },
        },
        {
          id: "c2-b",
          type: "trivia",
          state: "completed",
          position: [0, 0, 0],
          label: "დღის მისიები",
          stars: 3,
          action: { kind: "missions" },
        },
        {
          id: "c2-c",
          type: "checkpoint",
          state: "active",
          position: [8, 0, -5.5],
          label: "შუა გზა",
          action: { kind: "play" },
        },
      ],
      paths: [{ id: "c2-route", through: ["c2-a", "c2-b", "c2-c"], state: "completed" }],
      landmarks: [
        { id: "c2-tower", kind: "triviaTower", position: [8, 0, 7], rotationY: 0.4 },
        { id: "c2-house", kind: "house", position: [-7, 0, -6], rotationY: -0.7, scale: 0.9 },
      ],
    },

    /* ------------------------------------------- side quest clearing A */
    {
      id: "side-arts",
      name: "ხელოვნების ჭალა",
      position: [-15, 0, 5],
      elevation: 4,
      radius: 11,
      terrainPreset: "atoll",
      biome: "meadow",
      density: { trees: 0.7, rocks: 0.4 },
      nodes: [
        {
          id: "s1",
          type: "challenge",
          state: "available",
          position: [0, 0, 0],
          label: "ხელოვნება",
          action: { kind: "discover" },
        },
      ],
      paths: [],
      landmarks: [{ id: "s1-ruin", kind: "ruin", position: [3, 0, 3], scale: 0.8 }],
    },

    /* --------------------------------------------------------- area 3 */
    {
      id: "chapter-3-fields",
      name: "ველები",
      position: [-8, 0, -8],
      elevation: 7,
      radius: 21,
      terrainPreset: "plateau",
      biome: "meadow",
      density: { trees: 0.9, rocks: 0.7 },
      nodes: [
        {
          id: "c3-a",
          type: "trivia",
          state: "available",
          position: [-8, 0, 5.5],
          label: "ტექნოლოგიები",
          action: { kind: "discover" },
        },
        { id: "c3-b", type: "story", state: "locked", position: [0, 0, 0], label: "ისტორია" },
        {
          id: "c3-c",
          type: "reward",
          state: "locked",
          position: [8, 0, -5.5],
          label: "ზარდახშა",
          reward: { kind: "chest", amount: 1 },
        },
      ],
      paths: [{ id: "c3-route", through: ["c3-a", "c3-b", "c3-c"], state: "main" }],
      landmarks: [
        { id: "c3-windmill", kind: "windmill", position: [-8, 0, -6], rotationY: -0.4 },
        { id: "c3-ruin", kind: "ruin", position: [8, 0, 6], scale: 0.9 },
      ],
    },

    /* ------------------------------------------- side quest clearing B */
    {
      id: "side-arena",
      name: "არენა",
      position: [15, 0, -20],
      elevation: 6,
      radius: 11,
      terrainPreset: "atoll",
      biome: "meadow",
      density: { trees: 0.4, rocks: 0.9 },
      nodes: [
        { id: "s2", type: "challenge", state: "locked", position: [0, 0, 0], label: "ტურნირი" },
      ],
      paths: [],
      landmarks: [{ id: "s2-tower", kind: "triviaTower", position: [3, 0, 2], scale: 0.8 }],
    },

    /* --------------------------------------------------------- area 4 */
    {
      id: "chapter-4-highland",
      name: "მაღალმთიანეთი",
      position: [8, 1, -34],
      elevation: 10,
      radius: 21,
      terrainPreset: "highland",
      biome: "alpine",
      density: { trees: 0.7, rocks: 1.1 },
      nodes: [
        {
          id: "c4-a",
          type: "trivia",
          state: "locked",
          position: [-8, 0, 5.5],
          label: "გეოგრაფია",
          action: { kind: "discover" },
        },
        { id: "c4-b", type: "trivia", state: "locked", position: [0, 0, 0], label: "სპორტი", action: { kind: "discover" } },
        { id: "c4-c", type: "boss", state: "locked", position: [8, 0, -5.5], label: "მთის მცველი" },
      ],
      paths: [{ id: "c4-route", through: ["c4-a", "c4-b", "c4-c"], state: "locked" }],
      landmarks: [{ id: "c4-temple", kind: "temple", position: [8, 0, 7], rotationY: 0.3 }],
      mountains: { position: [-2, 0, -10], count: 3, height: 12 },
    },

    /* --------------------------------------------------------- area 5 */
    {
      id: "chapter-5-keep",
      name: "ციხე-სიმაგრე",
      position: [-8, 2, -60],
      elevation: 13,
      radius: 21,
      terrainPreset: "highland",
      biome: "alpine",
      density: { trees: 0.4, rocks: 1.2 },
      nodes: [
        {
          id: "c5-a",
          type: "trivia",
          state: "locked",
          position: [-8, 0, 5.5],
          label: "მეცნიერება",
          action: { kind: "discover" },
        },
        {
          id: "c5-b",
          type: "portal",
          state: "locked",
          position: [0, 0, 0],
          label: "პორტალი",
          action: { kind: "discover" },
        },
        {
          id: "c5-c",
          type: "reward",
          state: "locked",
          position: [8, 0, -5.5],
          label: "დიდი ზარდახშა",
          reward: { kind: "chest", amount: 1 },
        },
      ],
      paths: [{ id: "c5-route", through: ["c5-a", "c5-b", "c5-c"], state: "locked" }],
      landmarks: [{ id: "c5-castle", kind: "castle", position: [-8, 0, -6], rotationY: -0.5 }],
      mountains: { position: [8, 0, -10], count: 2, height: 14 },
    },

    /* --------------------------------------------------------- area 6 */
    {
      id: "chapter-6-summit",
      name: "მწვერვალი",
      position: [7, 3, -86],
      elevation: 16,
      radius: 20,
      terrainPreset: "highland",
      biome: "alpine",
      density: { trees: 0.25, rocks: 1 },
      nodes: [
        {
          id: "c6-a",
          type: "trivia",
          state: "locked",
          position: [-8, 0, 5],
          label: "კოსმოსი",
          action: { kind: "discover" },
        },
        { id: "c6-b", type: "boss", state: "locked", position: [4, 0, -5], label: "მწვერვალის მცველი" },
      ],
      paths: [{ id: "c6-route", through: ["c6-a", "c6-b"], state: "locked" }],
      landmarks: [{ id: "c6-temple", kind: "temple", position: [8, 0, 5], rotationY: 0.8 }],
      mountains: { position: [-2, 0, -10], count: 4, height: 17 },
    },
  ],
};

export default adventureWorld;
