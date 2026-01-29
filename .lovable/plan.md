
# გეგმა: ქულების ორი პრობლემის გადაწყვეტა

## გამოვლენილი პრობლემები

### პრობლემა 1: Floating Point ნაშთი (114.99999999994)
**სკრინშოტიდან:** ქულა აჩვენებს `114.99999999999994` ნაცვლად `115`-ის.

**მიზეზი:** 
- ტაიმერის დეკრემენტი `prev - 0.1` (ყოველ 100ms-ში) იწვევს floating-point შეცდომებს
- მაგალითად: `15 - 0.1 - 0.1 ... = 14.999999999994`
- ქულის გამოთვლა: `100 + 14.9999999 * 10 = 249.9999999` ან TV-ში `100 + 14.9999999 * 5 = 174.9999999`

**შესაცვლელი ფაილები:**

1. **`src/utils/tvScoring.ts`** - დავამატოთ `Math.round()`:
```typescript
export const calculatePoints = (isCorrect: boolean, timeRemaining: number): number => {
  if (!isCorrect) return 0;
  const clampedTime = Math.max(0, Math.min(timeRemaining, QUESTION_TIME_SECONDS));
  return Math.round(BASE_POINTS + (clampedTime * TIME_BONUS_MULTIPLIER));
};
```

2. **`src/contexts/MultiplayerContextV2.tsx`** (line ~1060) - დარწმუნდეთ `Math.round()`:
```typescript
const points = isCorrect ? Math.round(100 + timeRemaining * 10) : 0;
```
(უკვე არის, მაგრამ `newScore`-ც უნდა იყოს დარაუნდებული)

3. **UI ფაილებში ტაიმერის დეკრემენტის გასწორება** - ყველა ადგილას სადაც `prev - 0.1`:
- `src/components/team/MultiplayerGameScreenV2.tsx` (line 127)
- `src/components/team/MultiplayerGameScreen.tsx` (line 119)
- `src/components/game/QuestionScreen.tsx` (line 167)
- `src/components/team/MultiplayerObserverScreen.tsx` (line 65)

დავამატოთ `Math.round()` ქულის დისპლეიში:
```typescript
// ყველა ადგილას სადაც myScore ჩანს
{Math.round(myScore)}
```

### პრობლემა 2: ქულა 0 შედეგების ეკრანზე
**სკრინშოტიდან:** მოთამაშემ მიიღო ქულები, მაგრამ შედეგებში ჩანს 0.

**მიზეზი:**
- `GameResultsScreenV2.tsx` ხსნის ქულას `participants[].score`-დან (line 63)
- Realtime subscription-ს შეიძლება არ მოუსწროს მონაცემების განახლება სანამ UI გადავა results-ში
- `myParticipant?.score ?? localMyScore` fallback მუშაობს მხოლოდ თუ `myParticipant` undefined-ია, არა თუ score=0

**გადაწყვეტა:**
1. **`GameResultsScreenV2.tsx`** - შეცვალე fallback ლოგიკა:
```typescript
// ახლანდელი:
const myScore = myParticipant?.score ?? localMyScore;

// გასწორებული - localMyScore-ს პრიორიტეტი თუ ის მეტია:
const myScore = Math.max(myParticipant?.score || 0, localMyScore);
```

2. **`MultiplayerResultScreen.tsx`** - იგივე ცვლილება

3. **ოპტიმიზაცია** - results phase-ში გადასვლამდე დაველოდოთ DB-ს:
```typescript
// MultiplayerContextV2.tsx - nextQuestion ფუნქციაში
if (isLastQuestion) {
  // Wait for score to propagate before transitioning
  await new Promise(resolve => setTimeout(resolve, 200));
  setState(prev => ({ ...prev, phase: "results" }));
}
```

---

## შესაცვლელი ფაილები

| ფაილი | ცვლილება | პრიორიტეტი |
|-------|----------|------------|
| `src/utils/tvScoring.ts` | `Math.round()` calculatePoints-ში | მაღალი |
| `src/components/team/GameResultsScreenV2.tsx` | Score fallback ლოგიკა | მაღალი |
| `src/components/team/MultiplayerResultScreen.tsx` | Score fallback ლოგიკა | მაღალი |
| `src/contexts/MultiplayerContextV2.tsx` | newScore Math.round + phase transition delay | მაღალი |
| `src/components/controller/ControllerReveal.tsx` | `{Math.round(myScore)}` | საშუალო |
| `src/pages/TVHostController.tsx` | `{Math.round(myScore)}` ყველგან | საშუალო |
| `src/components/team/MultiplayerGameScreenV2.tsx` | `{Math.round(p.score)}` leaderboard-ში | დაბალი |

---

## კოდის მაგალითები

### tvScoring.ts - calculatePoints გასწორება
```typescript
export const calculatePoints = (isCorrect: boolean, timeRemaining: number): number => {
  if (!isCorrect) return 0;
  const clampedTime = Math.max(0, Math.min(timeRemaining, QUESTION_TIME_SECONDS));
  // Math.round to prevent floating point precision issues
  return Math.round(BASE_POINTS + (clampedTime * TIME_BONUS_MULTIPLIER));
};
```

### GameResultsScreenV2.tsx - Score fallback fix
```typescript
// Current (problematic):
const myScore = myParticipant?.score ?? localMyScore;

// Fixed - use higher value between DB and local state:
const myScore = Math.round(Math.max(myParticipant?.score || 0, localMyScore));
```

### Score Display - Round everywhere
```typescript
// Before
<span>{myScore}</span>

// After
<span>{Math.round(myScore)}</span>
```

---

## მოსალოდნელი შედეგი

| სცენარი | მანამდე | შემდეგ |
|---------|---------|--------|
| ქულის დისპლეი | 114.99999999994 | 115 |
| შედეგების ეკრანი | ჩემი ქულა: 0 | ჩემი ქულა: 434 |
| Leaderboard | Float ნაშთები | მთელი რიცხვები |
