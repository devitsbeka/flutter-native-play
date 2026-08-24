import { useMemo, useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  GeneratedWorld,
  MapNodeDefinition,
  NodeState,
} from "../schemas/worldDefinition";
import { worldMaterials } from "../components/materials";
import { lockIcon, resolveCategoryIcon, starIcon } from "../assets/categoryIcons";
import { useProgressionStore, useSelectionStore } from "../state/worldStore";

function nodeStateOf(node: MapNodeDefinition, overrides: Record<string, NodeState>): NodeState {
  return overrides[node.id] ?? node.state;
}

/** Stone pedestal under each marker, pulsing softly when available. */
function Pedestal({ state, animate, highlight }: { state: NodeState; animate: boolean; highlight: boolean }) {
  const ringRef = useRef<THREE.Mesh>(null!);
  const available = highlight;
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

/** Star badge sized like the Figma spec: 1 star 30px, 2 stars 24px, 3 stars 19px. */
function StarBadge({ stars }: { stars: number }) {
  const size = stars >= 3 ? 19 : stars === 2 ? 24 : 30;
  return (
    <span className="wm-badge" aria-hidden>
      {Array.from({ length: Math.min(3, stars) }, (_, i) => (
        <img key={i} alt="" src={starIcon} style={{ width: size, height: size }} />
      ))}
    </span>
  );
}

interface NodeMarkersProps {
  world: GeneratedWorld;
  animate: boolean;
  onNodeClick: (node: MapNodeDefinition) => void;
  /** Node the player is up to — gets the ring and the "you are here" pin. */
  currentNodeId?: string | null;
  /** Player avatar for the pin; falls back to a plain marker when absent. */
  avatarUrl?: string | null;
  /** Cloud meshes that should hide markers drifting behind them. */
  occluders: React.MutableRefObject<THREE.Object3D | null>[];
}

/**
 * Category markers: rendered 3D icons from the Thiings registry (resolved by
 * label keywords — nothing hardcoded per node) with the Figma badge pill
 * floating above: earned stars, or a lock for gated nodes. All text and
 * controls are DOM: crisp Georgian labels, keyboard, screen readers.
 */
export function NodeMarkers({ world, animate, onNodeClick, occluders, currentNodeId, avatarUrl }: NodeMarkersProps) {
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
      {nodes.map((node, index) => {
        const position = world.nodeWorldPositions[node.id];
        const state = nodeStateOf(node, overrides);
        const locked = state === "locked";
        const done = state === "completed" || state === "claimed";
        const hovered = hoveredNodeId === node.id;
        const selected = selectedNodeId === node.id;
        const stars = Math.min(3, node.stars ?? 0);
        // Only the single node the player is up to gets the attention ring.
        // Lighting up every available node at once is what made the old map
        // read as noise — nothing stood out as "do this next".
        const isCurrent = currentNodeId === node.id;
        const icon = resolveCategoryIcon(node.label, node.icon);
        return (
          <group key={node.id} position={position}>
            <Pedestal state={state} animate={animate} highlight={isCurrent} />
            <Html center position={[0, 2.9, 0]} zIndexRange={[15, 5]} occlude={occluders} wrapperClass="wm-node-html">
              <div
                className={`wm-marker ${animate ? "wm-marker-enter" : ""}`}
                style={{ animationDelay: `${index * 70}ms` }}
              >
                {isCurrent && avatarUrl && (
                  <span className="wm-you" aria-hidden>
                    <img alt="" className="wm-you-bubble" src={avatarUrl} draggable={false} />
                    <span className="wm-you-tip" />
                  </span>
                )}
                {locked ? (
                  <span className="wm-badge" aria-hidden>
                    <img alt="" src={lockIcon} style={{ width: 30, height: 30 }} />
                  </span>
                ) : stars > 0 ? (
                  <StarBadge stars={stars} />
                ) : null}
                <button
                  type="button"
                  aria-label={
                    locked
                      ? `${node.label} — ჩაკეტილია`
                      : `${node.label} — ${done ? `დასრულებულია, ${stars} ვარსკვლავი` : "ხელმისაწვდომია"}`
                  }
                  aria-disabled={locked}
                  data-state={state}
                  data-type={node.type}
                  onMouseEnter={() => hover(node.id)}
                  onMouseLeave={() => hover(null)}
                  onFocus={() => hover(node.id)}
                  onBlur={() => hover(null)}
                  onClick={() => onNodeClick(node)}
                  className={`wm-icon-btn ${locked ? "wm-icon-locked" : ""} ${selected ? "wm-icon-selected" : ""} ${
                    isCurrent && animate ? "wm-icon-available" : ""
                  }`}
                >
                  <img alt="" className="wm-cat-icon" src={icon} draggable={false} />
                </button>
                <span className={`wm-marker-label ${hovered || selected ? "wm-marker-label-open" : ""}`}>
                  {node.label}
                </span>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
