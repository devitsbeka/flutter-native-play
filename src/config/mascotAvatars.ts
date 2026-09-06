/**
 * MyTrivia's own characters, worn as the profile picture.
 *
 * These are the app's mascots — the round, hatted ones — not the animals in
 * `config/mascots.ts`. The animals are home-screen SCENES; they were briefly
 * offered as profile pictures too, and a cropped animal face in a 64px circle
 * read as a stock illustration rather than as anything of ours.
 *
 * The blue King is deliberately not among them. He is the home screen's own
 * mascot — the loop a player sees before picking anything — so wearing him as
 * a picture makes every such player look like the app's furniture. He stays
 * in the file (bots and the no-avatar fallback are a separate question, and
 * `mascot-avatar-1.png` is still a valid stored value for anyone already
 * wearing him) but he is not offered.
 *
 * Stored as the canonical `/src/assets/...` path, never as the bundled URL:
 * that URL carries Vite's content hash and stops resolving after the next
 * build. `resolveAvatarUrl` maps the path back to the import at runtime.
 *
 * The art is the original 397x334 renders, untouched.
 *
 * They were reframed once — 512x512, the character at 80% of it, its own
 * background cover-scaled and blurred to fill the rest — to stop the circle's
 * `object-cover` from slicing crowns and hat brims. The owner's answer on
 * seeing it was that the result looked wrong: the blurred ring reads as a
 * smudge around the character rather than as a background, and a face pulled
 * that far back stops being a face at 64px. The tight crop is the look, so
 * these are the files as drawn, and if the framing is revisited it wants new
 * art rather than a filter over the old.
 */
import mascotAvatar1 from "@/assets/avatars/mascot-avatar-1.png";
import mascotAvatar2 from "@/assets/avatars/mascot-avatar-2.png";
import mascotAvatar3 from "@/assets/avatars/mascot-avatar-3.png";
import mascotAvatar4 from "@/assets/avatars/mascot-avatar-4.png";
import mascotAvatar5 from "@/assets/avatars/mascot-avatar-5.png";
import mascotAvatar6 from "@/assets/avatars/mascot-avatar-6.png";
import mascotAvatar7 from "@/assets/avatars/mascot-avatar-7.png";
import mascotAvatar8 from "@/assets/avatars/mascot-avatar-8.png";

export interface MascotAvatar {
  /** `mascot-avatar-3`, stable across builds — the id a surface keys on. */
  id: string;
  /** What goes in `profiles.avatar_url`. */
  path: string;
  /** The bundled URL, for rendering it here and now. */
  url: string;
}

/** Every face in the set, the King included. Ordered by file number. */
export const ALL_MASCOT_AVATARS: readonly MascotAvatar[] = [
  mascotAvatar1,
  mascotAvatar2,
  mascotAvatar3,
  mascotAvatar4,
  mascotAvatar5,
  mascotAvatar6,
  mascotAvatar7,
  mascotAvatar8,
].map((url, i) => ({
  id: `mascot-avatar-${i + 1}`,
  path: `/src/assets/avatars/mascot-avatar-${i + 1}.png`,
  url,
}));

/** The King's file. Not offered as a picture — see the note above. */
export const SCENE_MASCOT_AVATAR_ID = "mascot-avatar-1";

/** The faces a player may actually choose. */
export const MASCOT_AVATARS: readonly MascotAvatar[] = ALL_MASCOT_AVATARS.filter(
  (a) => a.id !== SCENE_MASCOT_AVATAR_ID,
);

/** The one stored at this path, or null when the path names something else. */
export function mascotAvatarByPath(path: string | null | undefined): MascotAvatar | null {
  if (!path) return null;
  const file = path.split("/").pop();
  return ALL_MASCOT_AVATARS.find((a) => `${a.id}.png` === file) ?? null;
}
