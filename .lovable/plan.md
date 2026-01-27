
# Remove Confetti from Game Over Screen

## Problem
The TV Game Over screen ("თამაში დასრულდა!") displays continuous confetti animation which the user wants removed.

## Solution
Remove the confetti effect from `TVGameOverScreen.tsx` by removing the useEffect hook that triggers confetti for top 3 players.

---

## Implementation

### File: `src/components/tv/TVGameOverScreen.tsx`

**Change 1: Remove confetti import (line 5)**
```typescript
// Remove this line:
import confetti from 'canvas-confetti';
```

**Change 2: Remove showConfetti state (line 42)**
```typescript
// Remove this line:
const [showConfetti, setShowConfetti] = useState(false);
```

**Change 3: Remove the entire confetti useEffect (lines 49-84)**
```typescript
// Remove this entire block:
useEffect(() => {
  // Trigger confetti for top 3
  if (currentPlayerRank <= 3 && currentPlayerRank > 0) {
    setShowConfetti(true);
    const duration = 3000;
    const end = Date.now() + duration;

    const colors = currentPlayerRank === 1 
      ? ['#FFD700', '#FFA500', '#FFEC8B'] 
      : currentPlayerRank === 2 
      ? ['#C0C0C0', '#E8E8E8', '#A8A8A8']
      : ['#CD7F32', '#D2691E', '#8B4513'];

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }
}, [currentPlayerRank]);
```

---

## Summary

| Item | Action |
|------|--------|
| `confetti` import | Remove |
| `showConfetti` state | Remove |
| Confetti useEffect hook | Remove entirely |

After this change, the game over screen will display cleanly without the confetti animation overlay.
