/**
 * The mascots, and the home-screen scene each one brings with it.
 *
 * The home screen used to be backed by a scene generated from the player's
 * own photo. That is gone: the player now picks one of these mascots in the
 * avatar studio, and the mascot's scene is what the home screen paints. The
 * circle avatar — the selfie, the upload, the generated portrait — is a
 * separate choice and is what every OTHER profile placement shows.
 *
 * The Trivia King keeps the idle-loop video the home screen has always
 * played, so a player who never picks stays exactly where they were. The
 * seven animals are stills, cropped so the character sits where the King
 * does on the phone.
 *
 * Adding a mascot means: an id here, a scene and a face thumb under
 * `src/assets/mascots`, a name in every locale's `avatar.mascotNames`, and
 * the id in the `profiles.home_mascot` CHECK (see the migration that added
 * the column) — the database refuses ids it does not know.
 */
import kingThumb from "@/assets/avatars/mascot-avatar-1.png";
import kingScene from "@/assets/figma-home/home-scene.webp";
import kingStill from "@/assets/figma-landing/hero-scene.png";
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

export const MASCOT_IDS = [
  "king",
  "owl",
  "panda",
  "wolf",
  "tiger",
  "monkey",
  "elephant",
  "giraffe",
] as const;

export type MascotId = (typeof MASCOT_IDS)[number];

export interface Mascot {
  id: MascotId;
  /** Square face crop — the tile in the studio. */
  thumb: string;
  /** Portrait scene the phone home screen paints, bottom-anchored. */
  scene: string;
  /**
   * The idle loop, when the mascot has one. The home screen plays it in
   * place of the still, with `still` as the frame that holds until playback
   * starts. Only the King is animated today.
   */
  video?: string;
  /** 16:9 frame for the video's poster and the desktop full-bleed. */
  still?: string;
}

export const DEFAULT_MASCOT_ID: MascotId = "king";

export const MASCOTS: readonly Mascot[] = [
  {
    id: "king",
    thumb: kingThumb,
    scene: kingScene,
    video: "/videos/trivia-king-scene.mp4",
    still: kingStill,
  },
  { id: "owl", thumb: owlThumb, scene: owlScene },
  { id: "panda", thumb: pandaThumb, scene: pandaScene },
  { id: "wolf", thumb: wolfThumb, scene: wolfScene },
  { id: "tiger", thumb: tigerThumb, scene: tigerScene },
  { id: "monkey", thumb: monkeyThumb, scene: monkeyScene },
  { id: "elephant", thumb: elephantThumb, scene: elephantScene },
  { id: "giraffe", thumb: giraffeThumb, scene: giraffeScene },
];

export const isMascotId = (value: unknown): value is MascotId =>
  typeof value === "string" && (MASCOT_IDS as readonly string[]).includes(value);

/** A stored value read back as a mascot, or null when it is not one. */
export const parseMascotId = (value: unknown): MascotId | null =>
  isMascotId(value) ? value : null;

export function mascotById(id: MascotId | null | undefined): Mascot {
  return MASCOTS.find((m) => m.id === id) ?? MASCOTS[0];
}
