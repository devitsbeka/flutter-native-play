# Interactive World Map

Data-driven, procedurally assembled 2.5D world that replaces the static
homepage map. React Three Fiber renders environment only; all text, labels
and controls are DOM.

The world is **one continuous landmass**, not a set of floating islands: a
single ribbon of terrain runs from the start (z +62) to the summit (z -112),
changing biome along its length. `procedural/terrain.ts` is the one
definition of where the ground is — every level disc, tree, rock, landmark
and path ribbon samples `terrainHeight(x, z)` from it, so nothing floats or
sinks. A "region" is an AREA on that landmass rather than an island; it
carries the nodes and dressing for its stretch of the route.

## Architecture

```
WorldMap.tsx            public entry: WebGL detection, loading veil, fallback,
                        node selection + details panel state
components/
  WorldMapCanvas.tsx    lazy <Canvas> (three.js loads only here), quality/DPR
  WorldScene.tsx        lighting, fog, water, region/path/node composition
  materials.ts          shared stylized material + color tokens
camera/CameraRig.tsx    fixed-axis cinematic camera: damped pan/zoom/focus,
                        pointer parallax, reduced-motion snap; no orbit
regions/                Terrain (the continuous landmass), Vegetation
                        (instanced trees/rocks), Landmarks (tower, castle,
                        shrine, ruin, mountains), Clouds (instanced, drifting)
paths/Paths.tsx         Catmull-Rom sandstone ribbons + state variants
nodes/NodeMarkers.tsx   3D pedestals + DOM pill overlays (hover/focus/keyboard)
nodes/NodePanel.tsx     details card anchored above the clicked node
procedural/             seeded PRNG, terrain height/biome, deterministic
                        world assembly
state/worldStore.ts     zustand: progression / selection / camera goals / quality
schemas/                typed WorldDefinition -> GeneratedWorld contracts
data/adventureWorld.ts  "სამყარო ალფა" — the live route definition
data/sampleWorld.ts     older compact definition, kept for the generator tests
selectors.ts            current quest / route progress derived from a world
```

Rendering consumes `generateWorld(definition)` output only. Identical seeds
produce identical worlds (see `__tests__/generation.test.ts`; run `npm test`).

## Defining a new world

1. Create a `WorldDefinition` (copy `data/sampleWorld.ts`).
2. Give it a unique `seed`; regions position islands, `nodes` use local
   coordinates on the plateau, `paths.through` lists node ids in route order,
   `bridges` join nodes across regions.
3. Pass it to `<WorldMapCanvas definition={...}>` (today `WorldMap.tsx`
   imports `sampleWorld`; swap per active world id).

## Adding a node type

1. Extend `NodeType` in `schemas/worldDefinition.ts`.
2. Add visuals in `NodeMarkers.tsx` (pedestal/pill variant) and, if needed,
   an action mapping in `WorldMap.tsx` `runAction`.

## Replacing placeholder geometry with GLB assets

Each renderer isolates its geometry: swap the primitive builders in
`Landmarks.tsx` / `Vegetation.tsx` for `useGLTF` loads keyed by an asset
registry, keeping the same group transforms. Anything placed on the ground
must keep sampling `terrainHeight` for its y. Generated placement
data (positions/scale/rotation) is asset-agnostic, so no game logic changes.

### Asset production spec (for 3D artists)

- Format: glTF-Binary (.glb), Meshopt-compressed, KTX2/Basis textures.
- Coordinate system: Y-up, -Z forward, meters; 1 unit = 1 world unit
  (a tree ≈ 2.5 u tall, tower ≈ 7 u).
- Pivot at ground center of the object footprint.
- Triangles: props ≤ 800, landmarks ≤ 5 000, terrain chunks ≤ 8 000.
- Textures ≤ 512² for props, ≤ 1024² for landmarks; ≤ 2 materials per asset;
  no metalness maps (stylized matte look).
- LODs: suffix `_LOD0/_LOD1`; collision meshes prefix `COL_`;
  attachment sockets prefix `SOCKET_` (e.g. `SOCKET_flag`).
- Shadows: single-sided geometry, no double-sided foliage cards.

## Behavior notes

- Quality tiers (`low/medium/high`) adapt DPR, shadows, vegetation density and
  cloud count (`utils/deviceQuality.ts`).
- WebGL missing or scene crash → static painted map + DOM pins render instead.
- `prefers-reduced-motion` disables camera damping, drift, pulse and parallax.
- Dev diagnostics: append `?worldstats` to the URL in dev builds.
