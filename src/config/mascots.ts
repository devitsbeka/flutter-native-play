/**
 * The mascots, and the home-screen scene each one brings with it.
 *
 * The home screen used to be backed by a scene generated from the player's
 * own photo. That is gone: the player now picks one of these mascots in the
 * avatar studio, and the mascot's scene is what the home screen paints. The
 * circle avatar — the selfie, the upload, the generated portrait — is a
 * separate choice and is what every OTHER profile placement shows.
 *
 * A player who has not picked yet sees what they always did: the Trivia
 * King idle loop, which the home screen plays on its own (see Index). The
 * King is not one of the choices here — this list is the animals.
 *
 * The scenes are 9:16 renders (1080 x 1920 here, from 1152 x 2048), made
 * for a phone screen: the phone paints one full-bleed behind everything,
 * the way a wallpaper sits.
 *
 * Adding a mascot means: an id here, a scene and a face thumb under
 * `src/assets/mascots`, a name in every locale's `avatar.mascotNames`, and
 * the id in the `profiles.home_mascot` CHECK (a new migration that recreates
 * the constraint, as the dolphin's did) — the database refuses ids it does
 * not know.
 */
import owlScene from "@/assets/mascots/owl.webp";
import owlThumb from "@/assets/mascots/thumbs/owl.webp";
import pandaScene from "@/assets/mascots/panda.webp";
import pandaThumb from "@/assets/mascots/thumbs/panda.webp";
import wolfScene from "@/assets/mascots/wolf.webp";
import wolfThumb from "@/assets/mascots/thumbs/wolf.webp";
import tigerScene from "@/assets/mascots/tiger.webp";
import tigerThumb from "@/assets/mascots/thumbs/tiger.webp";
import monkeyScene from "@/assets/mascots/monkey.webp";
import monkeyThumb from "@/assets/mascots/thumbs/monkey.webp";
import elephantScene from "@/assets/mascots/elephant.webp";
import elephantThumb from "@/assets/mascots/thumbs/elephant.webp";
import giraffeScene from "@/assets/mascots/giraffe.webp";
import giraffeThumb from "@/assets/mascots/thumbs/giraffe.webp";
import dolphinScene from "@/assets/mascots/dolphin.webp";
import dolphinThumb from "@/assets/mascots/thumbs/dolphin.webp";
import bullScene from "@/assets/mascots/bull.webp";
import bullThumb from "@/assets/mascots/thumbs/bull.webp";
import penguinScene from "@/assets/mascots/penguin.webp";
import penguinThumb from "@/assets/mascots/thumbs/penguin.webp";

export const MASCOT_IDS = [
  "owl",
  "panda",
  "wolf",
  "tiger",
  "monkey",
  "elephant",
  "giraffe",
  "dolphin",
  "bull",
  "penguin",
] as const;

export type MascotId = (typeof MASCOT_IDS)[number];

export interface Mascot {
  id: MascotId;
  /** Square face crop — the tile in the studio. */
  thumb: string;
  /** 9:16 scene — the phone home screen's wallpaper, painted full-bleed. */
  scene: string;
}

export const MASCOTS: readonly Mascot[] = [
  { id: "owl", thumb: owlThumb, scene: owlScene },
  { id: "panda", thumb: pandaThumb, scene: pandaScene },
  { id: "wolf", thumb: wolfThumb, scene: wolfScene },
  { id: "tiger", thumb: tigerThumb, scene: tigerScene },
  { id: "monkey", thumb: monkeyThumb, scene: monkeyScene },
  { id: "elephant", thumb: elephantThumb, scene: elephantScene },
  { id: "giraffe", thumb: giraffeThumb, scene: giraffeScene },
  { id: "dolphin", thumb: dolphinThumb, scene: dolphinScene },
  { id: "bull", thumb: bullThumb, scene: bullScene },
  { id: "penguin", thumb: penguinThumb, scene: penguinScene },
];

export const isMascotId = (value: unknown): value is MascotId =>
  typeof value === "string" && (MASCOT_IDS as readonly string[]).includes(value);

/** A stored value read back as a mascot, or null when it is not one. */
export const parseMascotId = (value: unknown): MascotId | null =>
  isMascotId(value) ? value : null;

/** The mascot for a stored id; null when nothing (valid) was chosen. */
export function mascotById(id: MascotId | null | undefined): Mascot | null {
  return MASCOTS.find((m) => m.id === id) ?? null;
}
