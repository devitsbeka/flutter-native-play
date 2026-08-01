import { useEffect, useRef } from "react";
import { Html } from "@react-three/drei";
import { MapNodeDefinition, NodeState, Vec3 } from "../schemas/worldDefinition";

export interface NodePanelData {
  node: MapNodeDefinition;
  state: NodeState;
  stateText: string;
  prerequisiteLabel: string;
  rewardText: string;
  locked: boolean;
  onAction: () => void;
  onClose: () => void;
}

/**
 * Details card anchored in world space above the clicked node, so it opens
 * on top of the building the player tapped. Content is pure DOM: crisp text,
 * real buttons, managed focus.
 */
export function NodePanel({ data, position }: { data: NodePanelData; position: Vec3 }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("button")?.focus();
  }, [data.node.id]);

  return (
    <Html center position={[position[0], position[1] + 2.6, position[2]]} zIndexRange={[60, 40]} wrapperClass="wm-node-html">
      <div
        ref={ref}
        className="wm-panel wm-panel-anchored"
        role="dialog"
        aria-label={data.node.label}
      >
        <h3>{data.node.label}</h3>
        <p>
          {data.stateText}
          {data.locked && data.prerequisiteLabel ? ` — ჯერ გაიარე: ${data.prerequisiteLabel}` : ""}
          {data.rewardText}
        </p>
        <div className="wm-panel-actions">
          {!data.locked && (
            <button type="button" className="wm-panel-play" onClick={data.onAction}>
              დაწყება
            </button>
          )}
          <button type="button" className="wm-panel-close" onClick={data.onClose}>
            დახურვა
          </button>
        </div>
      </div>
    </Html>
  );
}
