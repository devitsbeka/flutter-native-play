import type { TransformedCategory } from "@/hooks/useCategories";
import { POPULAR_IMAGE_CATEGORY_IDS } from "@/config/popularImageCategories";
import { PARTY_CATEGORY_IDS } from "@/config/partyCategories";
import type { IconTint } from "./tint";

import crownIcon from "@/assets/icons/crown-3d.png";
import partyIcon from "@/assets/icons/icon-party.png";
import bookcaseIcon from "@/assets/secret-bookcase.png";
import photoIcon from "@/assets/icons/icon-photo-upload.png";

/**
 * A Path is the reference's "path": a guided run through a whole world of
 * content, one card on the home carousel and one detail page each. For
 * MyTrivia a path is a group of categories, and its counters are the group's
 * categories and the levels they add up to — computed live from whatever
 * `useCategories` returns for the player's language, never hard-coded.
 *
 * Four of them, cut the way the database already cuts categories (`type`),
 * plus the six picture-guess categories that front Discover's Popular row.
 */
export type PathId = "classic" | "fun" | "educational" | "pictures";


export interface PathTheme {
  /** Card gradient, top to bottom. */
  gradient: [string, string];
  /** Text on the white chip. */
  pillInk: string;
  /** The "categories" / "levels" words next to the white numbers. */
  label: string;
  /** The "View →" link at the card's foot, and the path illustration. */
  link: string;
  tint: IconTint;
}

export interface PathDef {
  id: PathId;
  /** The bundled 3D icon, drawn tinted on the card and on the detail page. */
  icon: string;
  theme: PathTheme;
  /** Which categories belong to it. Order is the list's own (`sort_order`). */
  filter: (category: Pick<TransformedCategory, "id" | "type">) => boolean;
}

export const isPictureCategory = (id: string): boolean =>
  (POPULAR_IMAGE_CATEGORY_IDS as readonly string[]).includes(id);

/** Party categories are votes about the room, not solo levels — no path. */
const isPartyCategory = (id: string): boolean => PARTY_CATEGORY_IDS.includes(id);

export const PATHS: PathDef[] = [
  {
    id: "classic",
    icon: crownIcon,
    theme: {
      gradient: ["#b6a7fe", "#2a1d5a"],
      pillInk: "#291c59",
      label: "#9e90e2",
      link: "#b7a8ff",
      tint: { color: "#7565d9", contrast: 1.1, luma: 0.64 },
    },
    filter: (c) => c.type === "classic",
  },
  {
    id: "fun",
    icon: partyIcon,
    theme: {
      gradient: ["#eaaa23", "#3b1f11"],
      pillInk: "#3a1e11",
      label: "#cd9320",
      link: "#ebab23",
      tint: { color: "#d99a2e", contrast: 1.1, luma: 0.8 },
    },
    filter: (c) => c.type === "fun" && !isPictureCategory(c.id) && !isPartyCategory(c.id),
  },
  {
    id: "educational",
    icon: bookcaseIcon,
    theme: {
      gradient: ["#7fdad2", "#0f3538"],
      pillInk: "#0f3538",
      label: "#6fc4bb",
      link: "#8ee6dc",
      tint: { color: "#3faea3", contrast: 1.1, luma: 0.7 },
    },
    filter: (c) => c.type === "educational",
  },
  {
    id: "pictures",
    icon: photoIcon,
    theme: {
      gradient: ["#ff9fb0", "#4a1420"],
      pillInk: "#4d1622",
      label: "#e8909c",
      link: "#ffb3bd",
      tint: { color: "#e06f84", contrast: 1.1, luma: 0.75 },
    },
    filter: (c) => isPictureCategory(c.id),
  },
];

export function findPath(id: string | undefined): PathDef | undefined {
  return PATHS.find((p) => p.id === id);
}

export function pathCategories<T extends Pick<TransformedCategory, "id" | "type">>(
  path: PathDef,
  categories: T[],
): T[] {
  return categories.filter(path.filter);
}

export interface PathStats {
  categories: number;
  levels: number;
}

export function pathStats(
  path: PathDef,
  categories: Array<Pick<TransformedCategory, "id" | "type" | "totalLevels">>,
): PathStats {
  const own = pathCategories(path, categories);
  return {
    categories: own.length,
    levels: own.reduce((sum, c) => sum + (c.totalLevels || 0), 0),
  };
}

/**
 * The home page's category rows, under the paths. The picture categories
 * lead the "start with" band, so the Fun row shows the rest — the same
 * double-card rule Discover applies (see utils/discoverRows.ts).
 */
export type RowId = "classic" | "fun" | "educational";

export const HOME_ROWS: Array<{ id: RowId; path: PathId }> = [
  { id: "classic", path: "classic" },
  { id: "fun", path: "fun" },
  { id: "educational", path: "educational" },
];

export function startWithCategories<T extends Pick<TransformedCategory, "id" | "type">>(
  categories: T[],
): T[] {
  // In the database's order, which is the order Discover's Popular row uses.
  return categories.filter((c) => isPictureCategory(c.id));
}
