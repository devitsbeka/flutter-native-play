
# Plan: Fair Observer Scoring Based on Player Count

## Problem

The current scoring system gives hosts 100 points per incorrect player, which creates unfair advantages:

- **2 players (1 host + 1 guest)**: 1 mistake = 100 points (fair)
- **10 players (1 host + 9 guests)**: 9 mistakes = 900 points (unfair advantage)

## New Scoring Formula

### Rules:
1. **Small games (2-3 total participants)**: Keep current behavior - 100 points per incorrect player
2. **Larger games (4+ participants)**: Award 100 points only if **50%+ of players** answered incorrectly or didn't answer

### Logic:
```typescript
const calculateObserverBonus = (
  incorrectCount: number, 
  totalPlayers: number  // excludes host
): number => {
  // Small games: 1-2 players (host + 1-2 others)
  if (totalPlayers <= 2) {
    return incorrectCount * 100;
  }
  
  // Larger games: Only award if 50%+ got it wrong
  const incorrectPercentage = incorrectCount / totalPlayers;
  if (incorrectPercentage >= 0.5) {
    return 100; // Fixed bonus regardless of how many were wrong
  }
  
  return 0; // No bonus if majority got it right
};
```

### Examples:
| Players | Incorrect | Percentage | Bonus |
|---------|-----------|------------|-------|
| 1 | 1 | 100% | 100 |
| 2 | 1 | 50% | 100 |
| 2 | 2 | 100% | 200 |
| 5 | 2 | 40% | 0 |
| 5 | 3 | 60% | 100 |
| 10 | 4 | 40% | 0 |
| 10 | 6 | 60% | 100 |

---

## Files to Modify

### 1. MultiplayerObserverScreen.tsx (Mobile)

**Location**: Lines 62-71

**Current code:**
```typescript
const incorrectAnswerCount = Object.values(opponentAnswers).filter(ans => !ans.is_correct).length;
const didNotAnswerCount = players.length - answeredCount;
const totalIncorrect = incorrectAnswerCount + didNotAnswerCount;

if (totalIncorrect > 0) {
  const bonus = totalIncorrect * 100;
  setBonusEarnedThisQuestion(bonus);
  awardObserverBonus(totalIncorrect);
}
```

**Updated code:**
```typescript
const incorrectAnswerCount = Object.values(opponentAnswers).filter(ans => !ans.is_correct).length;
const didNotAnswerCount = players.length - answeredCount;
const totalIncorrect = incorrectAnswerCount + didNotAnswerCount;
const totalPlayers = players.length;

if (totalIncorrect > 0) {
  // Fair scoring: Small games (1-2 players) = 100 per incorrect
  // Larger games (3+) = 100 only if 50%+ got it wrong
  let bonus = 0;
  if (totalPlayers <= 2) {
    bonus = totalIncorrect * 100;
  } else if (totalIncorrect / totalPlayers >= 0.5) {
    bonus = 100; // Fixed bonus for majority wrong
  }
  
  if (bonus > 0) {
    setBonusEarnedThisQuestion(bonus);
    // Pass the actual bonus amount, not count
    awardObserverBonus(bonus, true); // true = bonus is pre-calculated
  }
}
```

### 2. MultiplayerContextV2.tsx

**Location**: Lines 1663-1685 (awardObserverBonus function)

**Current code:**
```typescript
const awardObserverBonus = useCallback(async (incorrectCount: number) => {
  if (!state.currentRoom || !user || !state.hostIsObserver) return;
  
  const bonus = incorrectCount * 100; // 100 points per incorrect answer
  // ...
}, [...]);
```

**Updated code:**
```typescript
const awardObserverBonus = useCallback(async (bonusAmount: number) => {
  if (!state.currentRoom || !user || !state.hostIsObserver) return;
  if (bonusAmount <= 0) return;
  
  const newScore = state.myScore + bonusAmount;
  const newBonusTotal = state.observerBonusThisRound + bonusAmount;
  
  // Update participant score in database
  await supabase
    .from("room_participants")
    .update({ score: newScore })
    .eq("room_id", state.currentRoom.id)
    .eq("user_id", user.id);
  
  setState(prev => ({
    ...prev,
    myScore: newScore,
    observerBonusThisRound: newBonusTotal,
  }));
}, [state.currentRoom, state.hostIsObserver, state.myScore, state.observerBonusThisRound, user]);
```

Also update the interface at line 110:
```typescript
awardObserverBonus: (bonusAmount: number) => Promise<void>;
```

### 3. TVGameContext.tsx (TV Mode)

**Location**: Lines 288-298

**Current code:**
```typescript
const totalActive = activePlayers.length;
if (totalActive > 0 && incorrectCount > 0) {
  // Observer earns 100 points per incorrect player, proportional to total
  const observerBonus = Math.round(100 * incorrectCount);
```

**Updated code:**
```typescript
const totalActive = activePlayers.length;
if (totalActive > 0 && incorrectCount > 0) {
  // Fair scoring based on player count
  // Small games (1-2 players): 100 per incorrect
  // Larger games (3+): 100 only if 50%+ incorrect
  let observerBonus = 0;
  if (totalActive <= 2) {
    observerBonus = 100 * incorrectCount;
  } else if (incorrectCount / totalActive >= 0.5) {
    observerBonus = 100; // Fixed bonus for majority wrong
  }
  
  if (observerBonus > 0) {
    // ... existing bonus award logic
  }
}
```

---

## Summary

| File | Change |
|------|--------|
| `MultiplayerObserverScreen.tsx` | Calculate fair bonus before calling awardObserverBonus |
| `MultiplayerContextV2.tsx` | Accept pre-calculated bonus amount instead of incorrect count |
| `TVGameContext.tsx` | Apply same fair scoring formula for TV mode |

This ensures **consistent fair play** across all game modes:
- Small games remain engaging for hosts with per-mistake rewards
- Large games prevent unfair point accumulation while still rewarding hosts when the question was genuinely difficult
