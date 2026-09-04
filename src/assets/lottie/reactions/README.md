# Match reactions

The six animations a spectator can send the player on the spot, in the arena
(`src/components/team-battle/ReactionBar.tsx`).

They are Google's **Noto Animated Emoji**, taken from
`https://fonts.gstatic.com/s/e/notoemoji/latest/<codepoint>/lottie.json` and
vendored here so the arena does not fetch them mid-match:

| file                | emoji | codepoint |
| ------------------- | ----- | --------- |
| `clap.json`         | 👏    | `1f44f`   |
| `laugh.json`        | 😂    | `1f602`   |
| `love.json`         | 😍    | `1f60d`   |
| `angry.json`        | 😠    | `1f620`   |
| `disappointed.json` | 😞    | `1f61e`   |
| `genius.json`       | 🤓    | `1f913`   |

Licensed **CC BY 4.0** (https://creativecommons.org/licenses/by/4.0/) by
Google, as published at https://googlefonts.github.io/noto-emoji-animation/.
The licence asks for attribution; this file is it. Keep it here if the
animations stay.

Swapping in your own art is a one-line change per row in
`src/components/team-battle/reactions.ts` — the key that goes in the database
(`room_reactions.icon`) is the row's `key`, not the file.
