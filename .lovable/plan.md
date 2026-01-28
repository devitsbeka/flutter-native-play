
# Plan: Sync TV Display with Poll Results Screen

## Problem Summary
When players and the host are on the "Poll Results" screen on their phones (showing vote results and round count selector), the TV displays the lobby screen instead of matching the poll results view.

## Root Cause
The `TVDisplay.tsx` file is missing the `poll-results` phase handling in its switch statement. While `TVLobby.tsx` correctly shows `TVPollResultsScreen` for the `poll-results` phase (line 99-100), `TVDisplay.tsx` doesn't have this case, causing it to fall through to the default case which shows the lobby screen.

**Current `TVDisplay.tsx` switch statement (lines 156-178):**
```text
switch (normalizedPhase) {
  case 'pairing':
  case 'waiting':
  case 'lobby':
    return showLobby ? <TVLobbyScreenV2 /> : <TVPairingScreenV3 />;
  case 'countdown':
    return <TVCountdownScreenV2 />;
  case 'question':
  case 'playing':
    return <TVQuestionScreenV4 />;
  case 'reveal':
    return <TVQuestionScreenV4 />;
  case 'round-intro':
    return <TVRoundIntroScreen isController={false} />;
  case 'poll-suggest':
  case 'poll-voting':
    return <TVPollScreen />;
  // MISSING: case 'poll-results'  <-- BUG!
  case 'results':
  case 'completed':
    return <TVResultsScreen />;
  default:
    return showLobby ? <TVLobbyScreenV2 /> : <TVPairingScreenV3 />;
}
```

The `poll-results` phase falls through to the default case, displaying the lobby screen.

---

## Solution

### Technical Changes

**File: `src/pages/TVDisplay.tsx`**

1. **Add import for `TVPollResultsScreen`** (around line 11):
```typescript
import { TVPollResultsScreen } from '@/components/tv/TVPollResultsScreen';
```

2. **Add `poll-results` case to switch statement** (between `poll-voting` and `results` cases, around line 172):
```typescript
case 'poll-suggest':
case 'poll-voting':
  return <TVPollScreen />;
case 'poll-results':
  return <TVPollResultsScreen />;
case 'results':
case 'completed':
  return <TVResultsScreen />;
```

---

## Summary

| File | Change |
|------|--------|
| `src/pages/TVDisplay.tsx` | Add import for `TVPollResultsScreen` and add `poll-results` case to the phase switch statement |

This is a simple one-line addition that aligns `TVDisplay.tsx` with `TVLobby.tsx` behavior, ensuring the TV shows the poll results screen when the session is in the `poll-results` phase.
