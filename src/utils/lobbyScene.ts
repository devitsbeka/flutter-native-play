// The Guess scene, under the filename the retired Random card left behind:
// the mascot in a shower of question marks.
import featuredGuess from "@/assets/play-chooser/featured-random.webp";
import featuredQuick from "@/assets/play-chooser/featured-quick.webp";
import featuredKing from "@/assets/play-chooser/featured-king.webp";
import featuredBattle from "@/assets/play-chooser/featured-battle.webp";
import featuredWords from "@/assets/play-chooser/featured-words.webp";
import featuredLibrary from "@/assets/play-chooser/featured-library.webp";
import featuredMyTrivias from "@/assets/play-chooser/featured-mytrivias.webp";

/**
 * Which card a room was opened from, so the lobby can grow out of that
 * card's render. The create screen remembers the tap for the session; a
 * room reached any other way (a link, the rooms list, a refresh) is read
 * off what it plays.
 */
export type LobbySceneKey = "guess" | "quick" | "king" | "battle" | "words" | "library" | "mytrivias";

const KEY = "mt.lobbyScene";

export const LOBBY_SCENES: Record<LobbySceneKey, string> = {
  guess: featuredGuess,
  quick: featuredQuick,
  king: featuredKing,
  battle: featuredBattle,
  words: featuredWords,
  library: featuredLibrary,
  mytrivias: featuredMyTrivias,
};

export function rememberLobbyScene(key: LobbySceneKey) {
  try {
    sessionStorage.setItem(KEY, key);
  } catch {
    /* private mode: the lobby falls back to the room's own content */
  }
}

function remembered(): LobbySceneKey | null {
  try {
    const v = sessionStorage.getItem(KEY);
    return v && v in LOBBY_SCENES ? (v as LobbySceneKey) : null;
  } catch {
    return null;
  }
}

/** The scene for a classic room: the remembered tap, else what it plays. */
export function classicLobbyScene(room: { user_trivia_id?: string | null; category_id?: string | null }): string {
  const key = remembered();
  if (key === "guess" || key === "library" || key === "mytrivias") return LOBBY_SCENES[key];
  if (room.user_trivia_id) return featuredMyTrivias;
  if (room.category_id) return featuredLibrary;
  return featuredGuess;
}
