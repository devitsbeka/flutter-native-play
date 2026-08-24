import {
  Component,
  ErrorInfo,
  ReactNode,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { adventureWorld } from "./data/adventureWorld";
import { CurrentQuest, selectCurrentQuest } from "./selectors";

/**
 * Camera target for a quest: the chapter's x so the whole plateau is framed,
 * the node's z so the player's position sets the scroll offset. Using the
 * node's x instead pushed edge nodes to the screen border and clipped the
 * discs beside them.
 */
function questFraming(quest: CurrentQuest, pos: [number, number, number]): [number, number, number] {
  return [quest.region.position[0], pos[1], pos[2] + 6];
}
import { NodePanelData } from "./nodes/NodePanel";
import { MapNodeDefinition, NodeState } from "./schemas/worldDefinition";
import { generateWorld } from "./procedural/generateWorld";
import { useCameraStore, useProgressionStore, useSelectionStore } from "./state/worldStore";
import { webglAvailable } from "./utils/deviceQuality";
import "./styles/world-map.css";

// three.js loads only when the world actually renders — the app shell and
// the rest of the homepage never pay for it.
const WorldMapCanvas = lazy(() => import("./components/WorldMapCanvas"));

export interface WorldMapActions {
  onMissions: () => void;
  onDiscover: () => void;
  onPlay: () => void;
}

interface WorldMapProps extends WorldMapActions {
  /** Rendered when WebGL is unavailable or scene init fails. */
  fallback: ReactNode;
  /** Extra canvas resolution multiplier for CSS-scaled stages. */
  resolutionBoost?: number;
  /** Travel the route by vertical drag instead of free pan (phones). */
  verticalScroll?: boolean;
  /** Player avatar, drawn as the "you are here" pin on the current node. */
  avatarUrl?: string | null;
}

class SceneErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("[world-map] scene initialization failed, using static fallback", error, info);
    }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function stateLabel(state: NodeState): string {
  switch (state) {
    case "locked":
      return "ჩაკეტილია";
    case "completed":
      return "დასრულებულია";
    case "claimed":
      return "მიღებულია";
    case "active":
      return "მიმდინარე";
    default:
      return "ხელმისაწვდომია";
  }
}

/**
 * Public entry for the interactive world. Owns WebGL detection, the loading
 * veil, the DOM node-details panel and the static fallback.
 */
export function WorldMap({
  fallback,
  resolutionBoost,
  verticalScroll,
  avatarUrl,
  onMissions,
  onDiscover,
  onPlay,
}: WorldMapProps) {
  const [supported] = useState(() => webglAvailable());
  const [ready, setReady] = useState(false);
  const [panelNode, setPanelNode] = useState<MapNodeDefinition | null>(null);
  const nodeStates = useProgressionStore((s) => s.nodeStates);
  const select = useSelectionStore((s) => s.select);

  const world = useMemo(() => generateWorld(adventureWorld), []);
  const currentQuest = useMemo(() => selectCurrentQuest(adventureWorld, nodeStates), [nodeStates]);

  // Land on the node the player is actually up to, not the middle of the
  // route — on a long vertical map the default framing can open on scenery
  // the player finished days ago. Runs once: re-centring on every progression
  // change would yank the camera while they are looking around.
  // Waits for `ready`: the canvas is lazy + Suspense, so CameraRig mounts
  // after this component and its own init effect writes definition.target
  // into the store. Centring before that gets silently overwritten, which is
  // what left the camera parked away from the player's node.
  const centred = useRef(false);
  useEffect(() => {
    if (!ready || centred.current) return;
    const pos = currentQuest && world.nodeWorldPositions[currentQuest.node.id];
    if (!pos) return;
    centred.current = true;
    useCameraStore.getState().resetCamera(questFraming(currentQuest, pos));
  }, [ready, currentQuest, world]);

  const closePanel = useCallback(() => {
    setPanelNode(null);
    select(null);
    const quest = selectCurrentQuest(adventureWorld, useProgressionStore.getState().nodeStates);
    const pos = quest && world.nodeWorldPositions[quest.node.id];
    useCameraStore
      .getState()
      .resetCamera(quest && pos ? questFraming(quest, pos) : adventureWorld.camera.target);
  }, [select, world]);

  const handleNodeClick = useCallback(
    (node: MapNodeDefinition) => {
      select(node.id);
      setPanelNode(node);
      const pos = world.nodeWorldPositions[node.id];
      if (pos) useCameraStore.getState().focusNode(pos);
    },
    [select, world],
  );

  // Escape closes the panel (the panel itself manages focus on open).
  useEffect(() => {
    if (!panelNode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelNode, closePanel]);

  if (!supported) return <>{fallback}</>;

  const panelState: NodeState | null = panelNode ? nodeStates[panelNode.id] ?? panelNode.state : null;
  const panelLocked = panelState === "locked";
  const prerequisiteLabel =
    panelNode?.prerequisiteIds
      ?.map((id) => adventureWorld.regions.flatMap((r) => r.nodes).find((n) => n.id === id)?.label)
      .filter(Boolean)
      .join(", ") ?? "";

  const runAction = () => {
    if (!panelNode || panelLocked) return;
    const kind = panelNode.action?.kind ?? "play";
    if (kind === "missions") onMissions();
    else if (kind === "discover") onDiscover();
    else onPlay();
  };

  const panel: NodePanelData | null =
    panelNode && panelState
      ? {
          node: panelNode,
          state: panelState,
          stateText: stateLabel(panelState),
          prerequisiteLabel,
          rewardText: panelNode.reward
            ? ` · ჯილდო: ${panelNode.reward.amount} ${panelNode.reward.kind === "gems" ? "ალმასი" : panelNode.reward.kind === "chest" ? "ზარდახშა" : "ქულა"}`
            : "",
          locked: panelLocked,
          onAction: runAction,
          onClose: closePanel,
        }
      : null;

  return (
    <SceneErrorBoundary fallback={fallback}>
      <div className="absolute inset-0">
        {!ready && (
          <div className="wm-loading" aria-hidden>
            <div className="wm-loading-dot" />
          </div>
        )}
        <Suspense fallback={null}>
          <WorldMapCanvas
            definition={adventureWorld}
            resolutionBoost={resolutionBoost}
            verticalScroll={verticalScroll}
            currentNodeId={currentQuest?.node.id ?? null}
            avatarUrl={avatarUrl}
            onNodeClick={handleNodeClick}
            onReady={() => setReady(true)}
            panel={panel}
          />
        </Suspense>
      </div>
    </SceneErrorBoundary>
  );
}

export default WorldMap;
