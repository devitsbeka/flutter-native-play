/**
 * The Expo word-wheel levels.
 *
 * Each level is one set of letters (the wheel) and the words the board asks
 * for. Every board word, and every bonus word, must be spellable from the
 * wheel — `src/__tests__/expoLevels.test.ts` checks that, along with the
 * layout, so a typo here fails the test rather than a player.
 *
 * Levels come in packs of three, one pack per scene. Finishing a pack adds
 * its photo to the player's scrapbook.
 */

import mountain from "@/assets/expo/mountain.webp";
import snow from "@/assets/expo/snow.webp";
import lake from "@/assets/expo/lake.webp";
import desert from "@/assets/expo/desert.webp";
import garden from "@/assets/expo/garden.webp";
import clouds from "@/assets/expo/clouds.webp";
import forest from "@/assets/expo/forest.webp";
import night from "@/assets/expo/night.webp";

export interface Scene {
  id: string;
  name: string;
  image: string;
  /** The tile and pill colour for this scene. */
  accent: string;
  /** A darker version, for the pressed state and the tile's shadow. */
  accentDark: string;
  /** Unfilled board tiles and the wheel's disc. */
  tile: string;
}

export const SCENES: Scene[] = [
  { id: "mountain", name: "Mountain", image: mountain, accent: "#E63946", accentDark: "#B5202C", tile: "rgba(22, 40, 68, 0.88)" },
  { id: "snow", name: "Snow", image: snow, accent: "#E5399B", accentDark: "#B81F78", tile: "rgba(46, 38, 60, 0.88)" },
  { id: "lake", name: "Lake", image: lake, accent: "#2E86DE", accentDark: "#1F5FA3", tile: "rgba(18, 36, 66, 0.88)" },
  { id: "desert", name: "Desert", image: desert, accent: "#F2711C", accentDark: "#C25712", tile: "rgba(60, 34, 22, 0.88)" },
  { id: "garden", name: "Garden", image: garden, accent: "#8E44AD", accentDark: "#6A2F84", tile: "rgba(44, 24, 60, 0.88)" },
  { id: "clouds", name: "Clouds", image: clouds, accent: "#EA5C8A", accentDark: "#BE3F6B", tile: "rgba(30, 30, 46, 0.88)" },
  { id: "forest", name: "Forest", image: forest, accent: "#2FB86A", accentDark: "#1F8A4E", tile: "rgba(20, 44, 30, 0.88)" },
  { id: "night", name: "Night", image: night, accent: "#5B6CF0", accentDark: "#3E4CC0", tile: "rgba(18, 22, 48, 0.88)" },
];

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

const raw: Array<Omit<Level, "number" | "sceneId">> = [
  // Mountain
  { letters: "SAINT", words: ["SAINT", "SIT", "TAN", "ANT", "TIN"], bonus: ["SIN", "SAT", "ITS", "NIT", "ANTS", "STAIN", "SATIN", "TINS", "TANS"] },
  { letters: "SPORT", words: ["SPORT", "STOP", "SORT", "SPOT", "PORT", "ROT", "TOP"], bonus: ["POT", "OPT", "PRO", "TOPS", "POTS", "OPTS", "PORTS", "ROTS", "STROP"] },
  { letters: "HEAVEN", words: ["HEAVEN", "HEAVE", "EVEN", "HAVE", "EVE", "VANE"], bonus: ["HEN", "HAVEN", "NAVE", "VAN", "EAVE"] },
  // Snow
  { letters: "CROWN", words: ["CROWN", "CROW", "WORN", "CORN", "NOW", "OWN", "ROW"], bonus: ["WON", "NOR", "COW", "CON"] },
  { letters: "FLAKE", words: ["FLAKE", "LAKE", "LEAK", "KALE", "FLEA", "ELF", "ALE"], bonus: ["LEAF", "FAKE", "ELK"] },
  { letters: "WINTER", words: ["WINTER", "WRITE", "TWINE", "WIRE", "TIRE", "WINE", "NET"], bonus: ["WIT", "WET", "TIN", "WIN", "TEN", "TIE", "REIN", "RITE", "TIER", "WREN", "TWIN", "INERT", "WRIT"] },
  // Lake
  { letters: "WATER", words: ["WATER", "WEAR", "TEAR", "RATE", "WART", "ART", "EAT"], bonus: ["TEA", "ATE", "RAW", "WAR", "RAT", "TAR", "WET", "ARE", "EAR", "ERA", "AWE"] },
  { letters: "SHORE", words: ["SHORE", "HORSE", "HOSE", "ROSE", "HERO", "SHOE", "HER"], bonus: ["ORE", "SORE", "HOES", "HERS", "SHE", "HOE", "ROE"] },
  { letters: "STREAM", words: ["STREAM", "MASTER", "STEAM", "SMART", "MATE", "TEAM", "ARM"], bonus: ["RAT", "TAR", "ART", "MAT", "SAT", "SEA", "EAT", "TEA", "MEAT", "TAME", "SEAT", "EAST", "RATE", "TEAR", "STAR", "MART", "TRAM", "MARE", "REAM", "TERM", "STEM", "REST", "TAMER", "TEARS", "STARE", "MATES", "TAMES", "TRAMS", "MARTS"] },
  // Desert
  { letters: "CAMEL", words: ["CAMEL", "LAME", "MALE", "MEAL", "CLAM", "CALM", "ACE"], bonus: ["ELM", "ACME", "MACE", "ALE", "CAM"] },
  { letters: "DUNES", words: ["DUNES", "DUNE", "SEND", "ENDS", "USED", "SUN", "DEN"], bonus: ["END", "USE", "DUE", "DUES", "SUED", "DENS", "SUE"] },
  { letters: "SUNSET", words: ["SUNSET", "UNSET", "NESTS", "NEST", "SENT", "TUNE", "NUTS", "SUN"], bonus: ["TEN", "NET", "NUT", "USE", "SUE", "SET", "TUNES", "STUN", "STUNS", "TENS", "NETS", "SETS", "USES", "SUNS"] },
  // Garden
  { letters: "PETAL", words: ["PETAL", "PLATE", "LEAP", "PALE", "TALE", "LATE", "PEA"], bonus: ["PLEAT", "LEAPT", "PEAL", "PEAT", "TAPE", "PATE", "ALE", "ATE", "EAT", "TEA", "APT", "PAT", "TAP", "LAP", "PAL", "LET", "PET", "PLEA"] },
  { letters: "BLOOM", words: ["BLOOM", "BOOM", "LOOM", "MOB", "LOB"], bonus: ["MOO", "BOO"] },
  { letters: "FLOWER", words: ["FLOWER", "LOWER", "FLOW", "WOLF", "FOWL", "ROLE", "FLEW", "OWL"], bonus: ["LOW", "ROW", "FOR", "FEW", "ELF", "WOE", "OWE", "ORE", "ROE", "LORE", "FORE", "FOE", "WORE", "FLOE"] },
  // Clouds
  { letters: "STORM", words: ["STORM", "MOST", "SORT", "ROT", "TOM"], bonus: ["ROTS", "TOMS"] },
  { letters: "RAINY", words: ["RAINY", "RAIN", "AIRY", "YARN", "ANY", "RAY"], bonus: ["NAY", "AIR", "RAN"] },
  { letters: "CLOUDS", words: ["CLOUDS", "CLOUD", "COLD", "LOUD", "SOUL", "OLD", "DUO"], bonus: ["SOLD", "CLOD", "CLODS", "SCOLD", "DOC", "COD", "CUD", "SOD", "DOS", "COLDS"] },
  // Forest
  { letters: "TRUNK", words: ["TRUNK", "TURN", "RUNT", "RUN", "NUT"], bonus: ["URN", "RUT"] },
  { letters: "BRANCH", words: ["BRANCH", "RANCH", "BARN", "CRAB", "CAB", "RAN"], bonus: ["NAB", "BAN", "ARC", "CAR", "BRA", "CAN", "CHAR", "ARCH", "BRAN", "CARB"] },
  { letters: "LEAVES", words: ["LEAVES", "LEAVE", "EASEL", "SLAVE", "VASE", "SEAL", "SALE", "EVE"], bonus: ["SAVE", "SALVE", "SEE", "SEA", "ALE", "EEL", "EASE", "ELSE", "EAVE", "EAVES", "VALE", "VEAL", "ALES"] },
  // Night
  { letters: "STARS", words: ["STARS", "STAR", "RATS", "ARTS", "SAT", "TAR"], bonus: ["RAT", "ART", "TSAR", "TARS"] },
  { letters: "DREAMS", words: ["DREAMS", "DREAM", "ARMED", "MADE", "READ", "DEAR", "ARM", "SAD"], bonus: ["DAME", "MARS", "RAMS", "ARMS", "DAMS", "MEAD", "DARE", "RAM", "MAD", "DAM", "ERA", "ARE", "EAR", "RED", "SEA", "SAME", "SEAM", "MESA", "MARE", "REAM", "SMEAR", "DAMES", "READS", "DEARS", "DARES"] },
  { letters: "MOONLIT", words: ["MOONLIT", "MOTION", "MOON", "LOOM", "TOIL", "MINT", "LINT", "INTO"], bonus: ["LIMO", "MOOT", "LOOT", "TOOL", "OMIT", "LOIN", "LION", "OIL", "NIT", "TIN", "TON", "NOT", "LOT", "LIT", "MOO", "TOO", "MOLT", "LOTION"] },
];

export const LEVELS_PER_SCENE = 3;

export const LEVELS: Level[] = raw.map((level, i) => ({
  ...level,
  number: i + 1,
  sceneId: SCENES[Math.floor(i / LEVELS_PER_SCENE) % SCENES.length].id,
}));

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
