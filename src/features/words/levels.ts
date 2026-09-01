/**
 * The Words levels.
 *
 * Each level is one set of letters (the wheel) and the words the board asks
 * for. The bank itself is generated from the most common English words
 * (levels.generated.ts); every board word and bonus word is checked against
 * the wheel and the layout by `src/__tests__/wordsLevels.test.ts`.
 *
 * Levels come in packs of three, one pack per scene. Finishing a pack adds
 * its photo to the player's scrapbook.
 *
 * There is a bank for each of the app's seven languages, built by
 * scripts/words-levels from that language's most common words as validated
 * by its dictionary (and, for Georgian, as used in MyTrivia's own questions).
 */

import mountain from "@/assets/words/mountain.webp";
import snow from "@/assets/words/snow.webp";
import lake from "@/assets/words/lake.webp";
import desert from "@/assets/words/desert.webp";
import garden from "@/assets/words/garden.webp";
import clouds from "@/assets/words/clouds.webp";
import forest from "@/assets/words/forest.webp";
import night from "@/assets/words/night.webp";

export interface Scene {
  id: string;
  /** Locale key for the scene's name. */
  nameKey: string;
  image: string;
  /** The tile and pill colour for this scene. */
  accent: string;
  /** A darker version, for the pressed state and the tile's shadow. */
  accentDark: string;
  /** Unfilled board tiles and the wheel's disc. */
  tile: string;
}

export const SCENES: Scene[] = [
  { id: "mountain", nameKey: "words.sceneMountain", image: mountain, accent: "#8858d5", accentDark: "#6A3FB8", tile: "rgba(64, 38, 102, 0.82)" },
  { id: "snow", nameKey: "words.sceneSnow", image: snow, accent: "#E5399B", accentDark: "#B81F78", tile: "rgba(64, 38, 102, 0.82)" },
  { id: "lake", nameKey: "words.sceneLake", image: lake, accent: "#3B82F6", accentDark: "#1F5FA3", tile: "rgba(64, 38, 102, 0.82)" },
  { id: "desert", nameKey: "words.sceneDesert", image: desert, accent: "#FF9A3D", accentDark: "#C25712", tile: "rgba(64, 38, 102, 0.82)" },
  { id: "garden", nameKey: "words.sceneGarden", image: garden, accent: "#F25CA2", accentDark: "#D6427F", tile: "rgba(64, 38, 102, 0.82)" },
  { id: "clouds", nameKey: "words.sceneClouds", image: clouds, accent: "#10B981", accentDark: "#047857", tile: "rgba(64, 38, 102, 0.82)" },
  { id: "forest", nameKey: "words.sceneForest", image: forest, accent: "#2FB86A", accentDark: "#1F8A4E", tile: "rgba(64, 38, 102, 0.82)" },
  { id: "night", nameKey: "words.sceneNight", image: night, accent: "#7C3AED", accentDark: "#5B21B6", tile: "rgba(40, 24, 72, 0.86)" },
];

export interface RawLevel {
  letters: string;
  words: string[];
  bonus: string[];
}

export interface Level {
  /** 1-based, what the player sees. */
  number: number;
  sceneId: string;
  /** The wheel. Order is the wheel's initial clockwise order. */
  letters: string;
  /** Words on the board. */
  words: string[];
  /** Valid words that are not on the board; each earns a little. */
  bonus: string[];
}

export const LEVELS_PER_SCENE = 3;

/** The languages with a bank of their own — the app's seven. */
export const WORDS_LANGUAGES = ["en", "ka", "es", "fr", "de", "it", "pt"] as const;
export type WordsLanguage = (typeof WORDS_LANGUAGES)[number];

export const isWordsLanguage = (v: unknown): v is WordsLanguage =>
  typeof v === "string" && (WORDS_LANGUAGES as readonly string[]).includes(v);

/** Any app language maps onto a bank; an unknown one plays in English. */
export const bankLanguage = (lang: string | null | undefined): WordsLanguage =>
  isWordsLanguage(lang) ? lang : "en";

export function buildLevels(raw: RawLevel[]): Level[] {
  return raw.map((level, i) => ({
    ...level,
    number: i + 1,
    sceneId: SCENES[Math.floor(i / LEVELS_PER_SCENE) % SCENES.length].id,
  }));
}

/**
 * The banks are generated per language (scripts/words-levels) and each is
 * its own chunk: a player loads the one they play in, ~100 KB, not seven.
 */
const loaders: Record<WordsLanguage, () => Promise<{ RAW_LEVELS: RawLevel[] }>> = {
  en: () => import("./levels.en.generated"),
  ka: () => import("./levels.ka.generated"),
  es: () => import("./levels.es.generated"),
  fr: () => import("./levels.fr.generated"),
  de: () => import("./levels.de.generated"),
  it: () => import("./levels.it.generated"),
  pt: () => import("./levels.pt.generated"),
};

const cache = new Map<WordsLanguage, Level[]>();

export async function loadLevels(lang: WordsLanguage): Promise<Level[]> {
  const hit = cache.get(lang);
  if (hit) return hit;
  const { RAW_LEVELS } = await loaders[lang]();
  const built = buildLevels(RAW_LEVELS);
  cache.set(lang, built);
  return built;
}

export const sceneOf = (level: Level): Scene =>
  SCENES.find((s) => s.id === level.sceneId) ?? SCENES[0];

/**
 * "Solved by 86.17% Players" — a stable, believable figure per level rather
 * than a live stat. It only decorates the level-complete card; nothing
 * depends on it, so it would be wrong to spend a network round-trip on it.
 */
export function solvedByPercent(level: Level): string {
  let h = 2166136261;
  for (const ch of level.letters) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const frac = ((h >>> 0) % 10000) / 10000;
  const pct = 72 + frac * 24 - Math.min(level.number, 24) * 0.35;
  return pct.toFixed(2);
}
