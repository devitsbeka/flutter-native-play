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
  /** Travel the route by vertical drag instead of free pan (phones). */
  verticalScroll?: boolean;
  currentNodeId?: string | null;
  avatarUrl?: string | null;
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
  verticalScroll,
  currentNodeId,
  avatarUrl,
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
        // Without this the browser claims a vertical drag for page scrolling
        // and cancels the pointer stream after the first move, so the route
        // could be panned with a mouse and a wheel but not with a finger —
        // i.e. it worked everywhere except the device it is built for.
        touchAction: "none",
        // Sky-to-sea backdrop matching the scene horizon, so the world's
        // background always fills the viewport even past the water mesh.
        // Deeper toward the horizon so the saturated plateaus have something
        // to sit against; a near-uniform pastel field gave them no separation.
        background: "linear-gradient(180deg, #f0dcff 0%, #d9bdf6 38%, #b79ae8 72%, #8f7ed4 100%)",
      }}
      data-testid="world-map-canvas"
    >
      <Canvas
        shadows={qualityProfiles[tier].shadows}
        dpr={dpr}
        // The canvas lives inside a CSS-scaled stage; measure by layout size
        // (offsetWidth/Height), not the transformed bounding rect, or the
        // canvas under-fills the stage whenever the scale drops below 1.
        resize={{ offsetSize: true }}
        camera={{ fov: definition.camera.fov ?? 32, near: 1, far: 700, position: [20, 80, 70] }}
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
        <WorldScene
          world={world}
          reducedMotion={reducedMotion}
          onNodeClick={onNodeClick}
          panel={panel}
          verticalScroll={verticalScroll}
          currentNodeId={currentNodeId}
          avatarUrl={avatarUrl}
        />
        {import.meta.env.DEV && <DevDiagnostics />}
      </Canvas>
    </div>
  );
}
