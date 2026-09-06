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
 * The art was reframed rather than re-cropped in CSS. The source renders are
 * 397x334 with the character filling the frame, and every placement in the
 * app is a circle with `object-cover` — which squares them, losing the sides,
 * then masks the corners. Crowns and hat brims were being sliced off. They
 * are 512x512 now with the character at 80% and its own background, blurred,
 * filling the rest, so what the circle shows is the whole character.
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
