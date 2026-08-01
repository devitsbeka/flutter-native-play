import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { generateWorld } from "../procedural/generateWorld";
import { MapNodeDefinition, WorldDefinition } from "../schemas/worldDefinition";
import { NodePanelData } from "../nodes/NodePanel";
import { detectQualityTier, prefersReducedMotion, qualityProfiles } from "../utils/deviceQuality";
import { useQualityStore } from "../state/worldStore";
import { WorldScene } from "./WorldScene";
import { DevDiagnostics } from "../utils/DevDiagnostics";
import { worldColors } from "./materials";

interface WorldMapCanvasProps {
  definition: WorldDefinition;
  /** Extra multiplier so a CSS-scaled stage still renders crisply. */
  resolutionBoost?: number;
  onNodeClick: (node: MapNodeDefinition) => void;
  onReady?: () => void;
  panel: NodePanelData | null;
}

/**
 * The isolated WebGL canvas. Everything DOM (labels, panels, app shell)
 * lives outside or in Html overlays; the canvas renders environment only.
 */
export default function WorldMapCanvas({
  definition,
  resolutionBoost = 1,
  onNodeClick,
  onReady,
  panel,
}: WorldMapCanvasProps) {
  const [ready, setReady] = useState(false);
  const setTier = useQualityStore((s) => s.setTier);
  const tier = useQualityStore((s) => s.tier);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);
  const world = useMemo(() => generateWorld(definition), [definition]);

  useEffect(() => {
    setTier(detectQualityTier());
  }, [setTier]);

  const dpr = Math.min(
    qualityProfiles[tier].dprCeiling * resolutionBoost,
    (typeof window !== "undefined" ? window.devicePixelRatio : 1) * resolutionBoost,
    2.5,
  );

  return (
    <div
      className="absolute inset-0 transition-opacity duration-700"
      style={{
        opacity: ready ? 1 : 0,
        // Sky-to-sea backdrop matching the scene horizon, so the world's
        // background always fills the viewport even past the water mesh.
        background: "linear-gradient(180deg, #ddc2f9 0%, #cfd0ee 38%, #a5d6e4 78%, #93d4e2 100%)",
      }}
      data-testid="world-map-canvas"
    >
      <Canvas
        shadows={qualityProfiles[tier].shadows}
        dpr={dpr}
        camera={{ fov: 32, near: 1, far: 400, position: [20, 80, 70] }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.setClearColor(worldColors.sky, 0);
          // First frame is about to paint: fade the world in.
          requestAnimationFrame(() => {
            setReady(true);
            onReady?.();
          });
        }}
      >
        <WorldScene world={world} reducedMotion={reducedMotion} onNodeClick={onNodeClick} panel={panel} />
        {import.meta.env.DEV && <DevDiagnostics />}
      </Canvas>
    </div>
  );
}
