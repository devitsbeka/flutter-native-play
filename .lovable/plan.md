

## Fix: Show Challenge Share Modal Only After First Round

### Problem
The "Challenge Friends" modal auto-opens after every round in a multiplayer game. This is annoying for users playing multiple rounds in the same room.

### Cause
The `hasAutoOpenedChallenge` ref in `GameResultsScreenV2` resets every time the component remounts (which happens after each round ends). So the modal pops up again and again.

### Solution
Use `sessionStorage` keyed by the room ID to track whether the modal has already been shown. This way it only auto-opens once per room session, but the user can still manually open it via the share button.

### Technical Details

**File: `src/components/team/GameResultsScreenV2.tsx`**

- In the auto-open `useEffect` (~line 215), before opening the modal, check `sessionStorage` for a key like `challenge_shown_{roomId}`.
- If the key exists, skip auto-opening.
- If not, set the key and proceed to auto-open.
- Keep the `useRef` guard as well (prevents double-fire within same mount).
- The manual "Share" button (~line 611) remains unaffected -- users can always open it manually.

