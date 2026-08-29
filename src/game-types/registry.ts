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

export type GameTypeKey = "classic" | "tv_show" | "team_battle" | "king";

export type GameTypeStatus = "live" | "coming_soon" | "hidden";

export interface GameTypeDescriptor {
  key: GameTypeKey;
  titleKey: string;
  descKey: string;
  /** lucide-react icon name resolved by the /play page */
  icon: "users" | "tv" | "swords" | "crown";
  tileBg: string;
  tileShadow: string;
  minPlayers: number;
  maxPlayers: number;
  approxMinutes: number;
  status: GameTypeStatus;
  badge: "new" | "beta" | null;
  sortOrder: number;
  launch?: (navigate: NavigateFunction) => void;
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
    launch: (navigate) => navigate("/team", { state: { openCreateRoom: true } }),
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
    status: "coming_soon",
    badge: "beta",
    sortOrder: 30,
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
    status: "coming_soon",
    badge: "beta",
    sortOrder: 40,
  },
];
