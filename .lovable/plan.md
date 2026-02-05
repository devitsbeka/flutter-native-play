

# Plan: Update TV Screens Showcase

## Overview
The TV Screens Showcase (`/tv-showcase`) is a developer tool for previewing and testing all TV screen components. It currently shows 8 screens but is missing several important screens that have been added since. This update will add all missing screens and ensure the mock context provides all required data.

---

## Current State

### Screens Currently in Showcase (8 total):
1. **Pairing** - `TVPairingScreenV3`
2. **Lobby** - `TVLobbyScreenV2`
3. **Poll** - `TVPollScreen`
4. **Round Intro** - `TVRoundIntroScreen`
5. **Countdown** - `TVCountdownScreenV2`
6. **Question** - `TVQuestionScreenV4`
7. **Reveal** - `TVQuestionScreenV4` (with isReveal)
8. **Results** - `TVResultsScreen`

### Missing Screens:
1. **Poll Results** - `TVPollResultsScreen` (shows winning categories after voting)
2. **Final Results V2** - `TVResultsScreenV2` (podium with leaderboard)
3. **Scoreboard** - `TVScoreboardScreen` (final scoreboard with podium)
4. **Game Over** - `TVGameOverScreen` (round/game end with options)
5. **Idle** - `TVIdleScreen` (between rounds waiting state)

---

## Implementation Plan

### Step 1: Update SCREENS Array
Add the missing screens to the showcase navigation.

```typescript
const SCREENS = [
  { id: 'pairing', name: 'Pairing', phase: 'pairing' },
  { id: 'lobby', name: 'Lobby', phase: 'lobby' },
  { id: 'poll', name: 'Poll', phase: 'poll-suggest' },
  { id: 'poll-results', name: 'Poll Results', phase: 'poll-results' },  // NEW
  { id: 'round-intro', name: 'Round Intro', phase: 'round_intro' },
  { id: 'countdown', name: 'Countdown', phase: 'countdown' },
  { id: 'question', name: 'Question', phase: 'playing' },
  { id: 'question-reveal', name: 'Reveal', phase: 'reveal' },
  { id: 'results', name: 'Results', phase: 'results' },
  { id: 'results-v2', name: 'Results V2', phase: 'results' },          // NEW
  { id: 'scoreboard', name: 'Scoreboard', phase: 'completed' },        // NEW
  { id: 'game-over', name: 'Game Over', phase: 'completed' },          // NEW
  { id: 'idle', name: 'Idle', phase: 'idle' },                         // NEW
];
```

### Step 2: Add New Component Imports

```typescript
import { TVPollResultsScreen } from '@/components/tv/TVPollResultsScreen';
import { TVResultsScreenV2 } from '@/components/tv/TVResultsScreenV2';
import { TVScoreboardScreen } from '@/components/tv/TVScoreboardScreen';
import { TVGameOverScreen } from '@/components/tv/TVGameOverScreen';
import { TVIdleScreen } from '@/components/tv/TVIdleScreen';
```

### Step 3: Update ScreenRenderer Component
Add cases for new screens:

```typescript
case 'poll-results':
  return <TVPollResultsScreen />;
case 'results-v2':
  return <TVResultsScreenV2 />;
case 'scoreboard':
  return <TVScoreboardScreen />;
case 'game-over':
  return <TVGameOverScreen 
    players={mockValue.players} 
    isHost={true} 
    hasMoreRounds={false}
    onPlayAgain={() => {}}
    onExit={() => {}}
  />;
case 'idle':
  return <TVIdleScreen />;
```

### Step 4: Update TVMockContext
Add missing properties that some screens require:

```typescript
// Add to TVMockContextType interface
totalRoundsPlayed: number;
accumulatedScores: Record<string, number>;

// Add to provider state
const [totalRoundsPlayed, setTotalRoundsPlayed] = useState(2);
const accumulatedScores = useMemo(() => {
  const scores: Record<string, number> = {};
  players.forEach(p => {
    scores[p.id] = p.score + Math.floor(Math.random() * 200);
  });
  return scores;
}, [players]);
```

### Step 5: Update Mock Context Bridge
Add missing properties to the TVGameContext mock value:

```typescript
const createMockTVGameValue = (mockCtx) => ({
  // ... existing properties ...
  totalRoundsPlayed: mockCtx.totalRoundsPlayed || 2,
  accumulatedScores: mockCtx.accumulatedScores || {},
  startNextRound: async () => {},
  refetchSessionData: async () => {},
  isMirror: false,
});
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/TVScreensShowcase.tsx` | Add new screen imports, update SCREENS array, update ScreenRenderer, update mock bridge |
| `src/contexts/TVMockContext.tsx` | Add `totalRoundsPlayed` and `accumulatedScores` properties |

---

## Visual Result

The showcase will display **13 screens** in the navigation tabs:
`Pairing → Lobby → Poll → Poll Results → Round Intro → Countdown → Question → Reveal → Results → Results V2 → Scoreboard → Game Over → Idle`

Each screen will render with mock data and can be interacted with using the existing controls bar.

