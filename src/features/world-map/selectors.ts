import {
  MapNodeDefinition,
  NodeState,
  NodeType,
  RegionDefinition,
  WorldDefinition,
} from "./schemas/worldDefinition";

export interface CurrentQuest {
  node: MapNodeDefinition;
  /** Region the node belongs to, for the chapter caption. */
  chapter: string;
  /**
   * The owning region. The camera frames the chapter horizontally and the
   * node vertically: centring on the node itself puts an edge node half off
   * screen and clips its neighbours.
   */
  region: RegionDefinition;
  /** Georgian caption for the node's role, e.g. "გამოწვევა". */
  kindLabel: string;
}

const KIND_LABELS: Record<NodeType, string> = {
  trivia: "დონე",
  reward: "ჯილდო",
  checkpoint: "საკონტროლო წერტილი",
  boss: "ბოსი",
  portal: "პორტალი",
  story: "ისტორია",
  challenge: "გამოწვევა",
};

export function kindLabelOf(type: NodeType): string {
  return KIND_LABELS[type];
}

/**
 * The node the player should tackle next.
 *
 * Regions and nodes are declared in route order, so a straight scan finds it:
 * an explicitly `active` node wins, otherwise the first `available` one. The
 * progression store's overrides take precedence over the declared state so a
 * node completed this session does not keep being offered.
 *
 * Returns null once everything reachable is finished — callers should treat
 * that as "nothing to do right now" rather than falling back to a fake quest.
 */
export function selectCurrentQuest(
  definition: WorldDefinition,
  overrides: Record<string, NodeState> = {},
): CurrentQuest | null {
  let firstAvailable: CurrentQuest | null = null;

  for (const region of definition.regions) {
    for (const node of region.nodes) {
      const state = overrides[node.id] ?? node.state;
      const entry: CurrentQuest = {
        node,
        chapter: region.name,
        region,
        kindLabel: KIND_LABELS[node.type],
      };
      if (state === "active") return entry;
      if (state === "available" && !firstAvailable) firstAvailable = entry;
    }
  }

  return firstAvailable;
}

/** Completed-vs-total across the whole route, for the chapter progress bar. */
export function selectRouteProgress(
  definition: WorldDefinition,
  overrides: Record<string, NodeState> = {},
): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const region of definition.regions) {
    for (const node of region.nodes) {
      total += 1;
      const state = overrides[node.id] ?? node.state;
      if (state === "completed" || state === "claimed") done += 1;
    }
  }
  return { done, total };
}
