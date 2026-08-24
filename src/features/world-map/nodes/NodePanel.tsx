import { useEffect, useRef } from "react";
import { Html } from "@react-three/drei";
import { MapNodeDefinition, NodeState, Vec3 } from "../schemas/worldDefinition";
import { lockIcon, resolveCategoryIcon, starIcon } from "../assets/categoryIcons";

export interface NodePanelData {
  node: MapNodeDefinition;
  state: NodeState;
  stateText: string;
  prerequisiteLabel: string;
  rewardText: string;
  locked: boolean;
  /** Georgian caption for the node's role, e.g. "გამოწვევა". */
  kindLabel: string;
  /** Position along the route, 1-based, and route length. */
  ordinal: { index: number; total: number };
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
    <Html center position={[position[0], position[1] + 2.6, position[2]]} zIndexRange={[19, 16]} wrapperClass="wm-node-html">
      <div
        ref={ref}
        className="wm-panel wm-panel-anchored"
        role="dialog"
        aria-label={data.node.label}
      >
        <div className="wm-panel-head">
          <span className="wm-panel-icon" data-state={data.state} data-type={data.node.type}>
            <img alt="" src={resolveCategoryIcon(data.node.label, data.node.icon)} draggable={false} />
            {data.locked && <img className="wm-panel-lock" alt="" src={lockIcon} draggable={false} />}
          </span>
          <span className="wm-panel-title">
            <h3>{data.node.label}</h3>
            <span className="wm-panel-meta">
              {data.kindLabel}
              {data.ordinal.index > 0 && ` · დონე ${data.ordinal.index}/${data.ordinal.total}`}
            </span>
          </span>
        </div>
        {!data.locked && (
          <div className="wm-panel-stars" aria-label={`${data.node.stars ?? 0} ვარსკვლავი 3-დან`}>
            {[0, 1, 2].map((i) => (
              <img
                key={i}
                alt=""
                src={starIcon}
                className={i < (data.node.stars ?? 0) ? "" : "wm-star-empty"}
              />
            ))}
          </div>
        )}
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
