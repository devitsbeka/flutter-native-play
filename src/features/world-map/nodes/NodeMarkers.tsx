import { useMemo, useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Lock } from "lucide-react";
import gemNew from "@/assets/figma-home/gem-new.png";
import {
  GeneratedWorld,
  MapNodeDefinition,
  NodeState,
} from "../schemas/worldDefinition";
import { worldMaterials } from "../components/materials";
import { useProgressionStore, useSelectionStore } from "../state/worldStore";

function nodeStateOf(node: MapNodeDefinition, overrides: Record<string, NodeState>): NodeState {
  return overrides[node.id] ?? node.state;
}

/** Stone pedestal under each progression marker, pulsing softly when available. */
function Pedestal({ state, animate }: { state: NodeState; animate: boolean }) {
  const ringRef = useRef<THREE.Mesh>(null!);
  const available = state === "available" || state === "active";
  useFrame((frameState) => {
    if (!ringRef.current) return;
    const pulse = available && animate ? 1 + Math.sin(frameState.clock.elapsedTime * 2.2) * 0.08 : 1;
    ringRef.current.scale.setScalar(pulse);
  });
  return (
    <group>
      <mesh material={worldMaterials.stoneWarm} position={[0, 0.18, 0]} receiveShadow>
        <cylinderGeometry args={[1.05, 1.2, 0.36, 12]} />
      </mesh>
      <mesh
        ref={ringRef}
        material={available ? worldMaterials.purple : worldMaterials.stoneCool}
        position={[0, 0.42, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[0.95, 0.09, 8, 24]} />
      </mesh>
    </group>
  );
}

interface NodeMarkersProps {
  world: GeneratedWorld;
  animate: boolean;
  onNodeClick: (node: MapNodeDefinition) => void;
}

/**
 * 3D pedestals + crisp DOM pill overlays (Georgian text stays HTML, never a
 * WebGL texture). The pills are real buttons: hover, focus, keyboard and
 * touch all work natively, and screen readers get name + state.
 */
export function NodeMarkers({ world, animate, onNodeClick }: NodeMarkersProps) {
  const overrides = useProgressionStore((s) => s.nodeStates);
  const hover = useSelectionStore((s) => s.hover);
  const hoveredNodeId = useSelectionStore((s) => s.hoveredNodeId);
  const selectedNodeId = useSelectionStore((s) => s.selectedNodeId);

  const nodes = useMemo(
    () => world.def.regions.flatMap((region) => region.nodes),
    [world.def.regions],
  );

  return (
    <group>
      {nodes.map((node) => {
        const position = world.nodeWorldPositions[node.id];
        const state = nodeStateOf(node, overrides);
        const locked = state === "locked";
        const done = state === "completed" || state === "claimed";
        const hovered = hoveredNodeId === node.id;
        const selected = selectedNodeId === node.id;
        return (
          <group key={node.id} position={position}>
            <group position={[0, hovered && !locked ? 0.25 : 0, 0]}>
              <Pedestal state={state} animate={animate} />
            </group>
            <Html
              center
              position={[0, 1.7, 0]}
              zIndexRange={[30, 10]}
              // DOM pill: state is communicated by icon + text, not color only.
              wrapperClass="wm-node-html"
            >
              <button
                type="button"
                aria-label={locked ? `${node.label} — ჩაკეტილია` : `${node.label} — ${done ? "დასრულებულია" : "ხელმისაწვდომია"}`}
                aria-disabled={locked}
                data-state={state}
                onMouseEnter={() => hover(node.id)}
                onMouseLeave={() => hover(null)}
                onFocus={() => hover(node.id)}
                onBlur={() => hover(null)}
                onClick={() => onNodeClick(node)}
                className={`wm-pill group ${locked ? "wm-pill-locked" : ""} ${selected ? "wm-pill-selected" : ""} ${
                  done ? "wm-pill-done" : ""
                }`}
              >
                {locked ? (
                  <Lock className="size-[18px] shrink-0" fill="#fbbf24" stroke="#d97706" strokeWidth={1.5} />
                ) : (
                  <span className="wm-pill-gem">
                    <img alt="" src={gemNew} />
                  </span>
                )}
                <span className={`wm-pill-label ${hovered || selected ? "wm-pill-label-open" : ""}`}>
                  {node.label}
                  {done ? " ✓" : ""}
                </span>
              </button>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
