import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { generateWorld } from "../procedural/generateWorld";
import { MapNodeDefinition, WorldDefinition } from "../schemas/worldDefinition";
import { NodePanelData } from "../nodes/NodePanel";
import { FriendOnMap } from "../nodes/NodeMarkers";
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
  friendsByNode?: Record<string, FriendOnMap[]>;
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
  friendsByNode,
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
        // Subtle purple field with soft purple blobs rather than a hard
        // top-to-bottom ramp. The ramp got heavy enough at the bottom
        // (#8f7ed4) to compete with the islands for attention; large, very
        // low-contrast radial blobs give the backdrop depth and movement
        // while staying quiet behind the route.
        // Soft purple field with pastel blobs, per the reference. This lives
        // BEHIND the canvas rather than in the scene: the world is drawn with
        // alpha, so the backdrop shows through the sky and can never wash over
        // the terrain. Orbs modelled as 3D geometry did exactly that — being
        // above the ground, they sat between the camera and the land and
        // painted lilac discs across the whole map.
        background: [
          "radial-gradient(38% 26% at 14% 16%, rgba(201,168,242,0.55) 0%, rgba(201,168,242,0) 70%)",
          "radial-gradient(34% 24% at 84% 26%, rgba(217,168,232,0.5) 0%, rgba(217,168,232,0) 72%)",
          "radial-gradient(30% 20% at 62% 8%, rgba(179,166,238,0.45) 0%, rgba(179,166,238,0) 70%)",
          "radial-gradient(42% 30% at 26% 88%, rgba(240,185,216,0.4) 0%, rgba(240,185,216,0) 74%)",
          "radial-gradient(36% 26% at 90% 74%, rgba(166,227,208,0.32) 0%, rgba(166,227,208,0) 72%)",
          "linear-gradient(180deg, #cec0ee 0%, #ddd0f4 28%, #e9dcf5 56%, #f2e6f3 80%, #f8eff4 100%)",
        ].join(", "),
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
          friendsByNode={friendsByNode}
        />
        {import.meta.env.DEV && <DevDiagnostics />}
      </Canvas>
    </div>
  );
}
