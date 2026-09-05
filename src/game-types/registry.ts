import type { NavigateFunction } from "react-router-dom";

// The client half of the game type registry (docs/GAME_TYPES_DESIGN.md §4).
//
// The database's `game_types` table decides liveness/badges/order so a mode
// can be dark-launched without a release; this module decides everything the
// client alone can know — what launching a mode actually does, and which
// translation keys and artwork a card renders with. The two are matched by
// `key`. A DB row with no descriptor here renders nothing (an older client
// can't launch a mode it doesn't know), and while the migration is not yet
// deployed the static statuses below are the fallback — see useGameTypes.

export type GameTypeKey = "classic" | "tv_show" | "team_battle" | "king" | "words";

export type GameTypeStatus = "live" | "coming_soon" | "hidden";

export interface GameTypeDescriptor {
  key: GameTypeKey;
  titleKey: string;
  descKey: string;
  /** lucide-react icon name resolved by the /play page */
  icon: "users" | "tv" | "swords" | "crown" | "spell-check";
  tileBg: string;
  tileShadow: string;
  minPlayers: number;
  maxPlayers: number;
  approxMinutes: number;
  status: GameTypeStatus;
  badge: "new" | "beta" | null;
  sortOrder: number;
  /** Has a global queue (docs/GAME_TYPES_DESIGN.md §5); DB row overrides. */
  supportsMatchmaking: boolean;
  launch?: (navigate: NavigateFunction) => void;
}

/**
 * Modes that exist in the bundle but are not released: nobody sees them
 * until an admin turns developer mode on (DeveloperModeContext), and they
 * stay here until they are explicitly promoted to the public — at which
 * point the key is removed from this set and the DB registry's is_live
 * takes over as usual.
 */
export const DEVELOPER_ONLY_GAME_TYPES: ReadonlySet<GameTypeKey> = new Set<GameTypeKey>([
  "team_battle",
  "king",
]);

/**
 * Applies developer mode to a resolved list of modes.
 *
 * With it OFF a developer-only mode is dropped outright — not a "coming
 * soon" teaser, not a greyed card; it is not shown. With it ON the mode is
 * live for that admin regardless of the DB registry, so it can be played
 * end to end before anyone else can see it.
 */
export function applyDeveloperMode<T extends { key: GameTypeKey; status: GameTypeStatus }>(
  types: readonly T[],
  developerMode: boolean,
): T[] {
  const out: T[] = [];
  for (const gt of types) {
    if (!DEVELOPER_ONLY_GAME_TYPES.has(gt.key)) {
      out.push(gt);
      continue;
    }
    if (developerMode) out.push({ ...gt, status: "live" });
  }
  return out;
}

export const GAME_TYPES: GameTypeDescriptor[] = [
  {
    key: "classic",
    titleKey: "gameTypes.classicTitle",
    descKey: "gameTypes.classicDesc",
    icon: "users",
    tileBg: "linear-gradient(135deg, #A78BFA 0%, #818CF8 45%, #3B82F6 100%)",
    tileShadow: "0 6px 14px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.4)",
    minPlayers: 2,
    maxPlayers: 8,
    approxMinutes: 5,
    status: "live",
    badge: null,
    sortOrder: 10,
    supportsMatchmaking: true,
    launch: (navigate) => navigate("/create-room"),
  },
  {
    key: "tv_show",
    titleKey: "gameTypes.tvTitle",
    descKey: "gameTypes.tvDesc",
    icon: "tv",
    tileBg: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 45%, #F97316 100%)",
    tileShadow: "0 6px 14px rgba(249,115,22,0.35), inset 0 1px 0 rgba(255,255,255,0.4)",
    minPlayers: 2,
    maxPlayers: 12,
    approxMinutes: 15,
    status: "live",
    badge: null,
    sortOrder: 20,
    supportsMatchmaking: false,
    launch: (navigate) => navigate("/tv"),
  },
  {
    key: "team_battle",
    titleKey: "gameTypes.teamBattleTitle",
    descKey: "gameTypes.teamBattleDesc",
    icon: "swords",
    tileBg: "linear-gradient(135deg, #F87171 0%, #EF4444 45%, #DC2626 100%)",
    tileShadow: "0 6px 14px rgba(239,68,68,0.35), inset 0 1px 0 rgba(255,255,255,0.4)",
    minPlayers: 2,
    maxPlayers: 10,
    approxMinutes: 15,
    // Dark-launched: the client flow exists (/team-battle) but stays a
    // teaser until the DB registry flips is_live — the schema has to be
    // deployed through Lovable before anyone can create one of these rooms.
    status: "coming_soon",
    badge: "beta",
    sortOrder: 30,
    supportsMatchmaking: true,
    // Straight into the Team Battle arena lobby (Figma 938:6019) — the page
    // creates the room itself, so there is no entry step.
    launch: (navigate) => navigate("/team-battle"),
  },
  {
    key: "king",
    titleKey: "gameTypes.kingTitle",
    descKey: "gameTypes.kingDesc",
    icon: "crown",
    tileBg: "linear-gradient(135deg, #4ADE80 0%, #34D399 45%, #14B8A6 100%)",
    tileShadow: "0 6px 14px rgba(20,184,166,0.35), inset 0 1px 0 rgba(255,255,255,0.4)",
    minPlayers: 1,
    maxPlayers: 1,
    approxMinutes: 10,
    // Dark-launched like team_battle: /king works once the King migrations
    // are deployed, and the card goes live via the DB registry's is_live.
    status: "coming_soon",
    badge: "beta",
    sortOrder: 40,
    supportsMatchmaking: false,
    // Straight into the Versus King lounge lobby (Figma 940:7474).
    launch: (navigate) => navigate("/king"),
  },
  {
    key: "words",
    titleKey: "gameTypes.wordsTitle",
    descKey: "gameTypes.wordsDesc",
    icon: "spell-check",
    tileBg: "linear-gradient(135deg, #34D399 0%, #10B981 45%, #0EA5E9 100%)",
    tileShadow: "0 6px 14px rgba(16,185,129,0.35), inset 0 1px 0 rgba(255,255,255,0.4)",
    minPlayers: 1,
    maxPlayers: 2,
    approxMinutes: 5,
    // Live from the client side: the mode has no server half to dark-launch
    // (the board and the words ship in the bundle; a friend game rides on a
    // realtime channel), so there is nothing a DB flag would protect.
    status: "live",
    badge: "new",
    sortOrder: 50,
    supportsMatchmaking: false,
    launch: (navigate) => navigate("/words"),
  },
];
