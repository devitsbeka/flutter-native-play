

## "ითამაშე TV-ზე" -- Redirect to Create Room + TV Icon Glow Hint

### What Changes

**1. Change "ითამაშე TV-ზე" navigation path**
In `BetaGiftModal.tsx`, change the path for the TV feature clue from `/tv` to `/team?tvHint=true`. This way, tapping "ითამაშე TV-ზე" opens the room creation flow on the mobile phone instead of showing the TV pairing screen (which is meant for actual TV displays).

**2. Add TV icon glow animation in Room Lobby**
In `RoomLobbyV2.tsx`, read the `tvHint` query parameter. When it's present and the user lands in the lobby, trigger a subtle glow/pulse animation on the TV mode toggle section (the card with the retro TV icon) that repeats 2-3 times, drawing the user's attention to enable TV mode.

### Files to Change

| File | Change |
|------|--------|
| `src/components/shared/BetaGiftModal.tsx` | Change TV feature path from `/tv` to `/team?tvHint=true` |
| `src/components/team/RoomLobbyV2.tsx` | Read `tvHint` from URL search params; when present, apply a pulsing glow animation (2-3 pulses) to the TV mode card using framer-motion |

### Technical Details

**BetaGiftModal.tsx (line 34)**
```
- { icon: retroTvIcon, text: "ითამაშე TV-ზე", path: "/tv" },
+ { icon: retroTvIcon, text: "ითამაშე TV-ზე", path: "/team?tvHint=true" },
```

**RoomLobbyV2.tsx -- TV mode card (line 881-903)**
- Use `useSearchParams` or `useLocation` to detect `tvHint=true`
- Wrap the TV mode card's `motion.div` with a glow animation that pulses 2-3 times using framer-motion's `animate` with a finite repeat:
  ```
  boxShadow: ["0 0 0px rgba(139,92,246,0)", "0 0 20px rgba(139,92,246,0.6)", "0 0 0px rgba(139,92,246,0)"]
  ```
  with `transition: { repeat: 2, duration: 1 }`
- After animation completes, clear the `tvHint` param from the URL to prevent re-triggering

