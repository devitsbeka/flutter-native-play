

# გეგმა: Observer-ის სამართლიანი ქულების სისტემა

## პრობლემის აღწერა

მიმდინარე სცენარი (სკრინშოტიდან):
- **Test (მოთამაშე):** 194 ქულა (1 სწორი + 1 არასწორი პასუხი)
- **შენ (Observer/ჰოსტი):** 100 ქულა

2 კითხვაზე: 1 სწორი, 1 არასწორი - შედეგი უნდა იყოს თითქმის ფრე, მაგრამ ახლა 94 ქულით განსხვავდება.

## მიმდინარე ფორმულები

| ტიპი | ფორმულა | დიაპაზონი |
|------|---------|-----------|
| სწორი პასუხი | `100 + (დარჩენილი_წამი × 5)` | 100-175 ქულა |
| არასწორი პასუხი | 0 | 0 ქულა |
| Observer ბონუსი | 100 (ფლატ) | 100 ქულა |

**პრობლემა:** Observer-ის ბონუსი (100) ნაკლებია ვიდრე მოთამაშის მაქსიმალური სარგებელი (175).

## სამართლიანი გადაწყვეტა

### ახალი ლოგიკა

Observer-მა უნდა მიიღოს **საპირისპირო** ქულები - რაც უფრო ნელა უპასუხა მოთამაშემ არასწორად, მით მეტი მიიღოს Observer-მა.

```
Observer ბონუსი = BASE_POINTS + (QUESTION_TIME - timeWhenAnswered) × TIME_BONUS_MULTIPLIER
```

ანუ თუ მოთამაშემ არასწორად უპასუხა:
- სწრაფად (14 წამი დარჩა) → Observer იღებს: 100 + (15-14)×5 = 105
- ნელა (2 წამი დარჩა) → Observer იღებს: 100 + (15-2)×5 = 165
- Timeout (0 წამი) → Observer იღებს: 100 + 15×5 = 175 (მაქსიმუმი)

### ახალი ფორმულის უპირატესობები

1. **სამართლიანობა:** Observer-ის მაქსიმალური ბონუსი = მოთამაშის მაქსიმალური ქულა
2. **ბალანსი:** თუ მოთამაშე 1 კითხვას სწრაფად უპასუხებს სწორად (175) და 1-ს timeout-ზე (0), Observer მიიღებს 175-ს timeout-ზე = ფრე
3. **ინცენტივი:** ნელი არასწორი პასუხები Observer-ს მეტს აძლევს

---

## შესაცვლელი ფაილები

### 1. `src/utils/tvScoring.ts`
ახალი ფუნქციის დამატება:

```typescript
/**
 * Calculate observer bonus when a player answers incorrectly or times out
 * The bonus is inversely proportional to how quickly the player failed
 * 
 * @param timeWhenAnswered - Seconds remaining when wrong answer was given (0 for timeout)
 * @returns Bonus points for observer (100-175 range)
 */
export const calculateObserverBonus = (timeWhenAnswered: number): number => {
  // If player answered wrong quickly, observer gets less
  // If player timed out or answered wrong slowly, observer gets more
  const timeUsed = QUESTION_TIME_SECONDS - Math.max(0, Math.min(timeWhenAnswered, QUESTION_TIME_SECONDS));
  return BASE_POINTS + (timeUsed * TIME_BONUS_MULTIPLIER);
};
```

### 2. `src/contexts/TVGameContext.tsx`
`advanceToReveal` ფუნქციაში ცვლილება (lines ~296-305):

```typescript
// ძველი:
let observerBonus = 0;
if (totalActive <= 2) {
  observerBonus = 100 * incorrectCount;
} else if (incorrectCount / totalActive >= 0.5) {
  observerBonus = 100;
}

// ახალი:
import { calculateObserverBonus } from '@/utils/tvScoring';

let observerBonus = 0;
if (totalActive <= 2) {
  // Calculate time-based bonus for each incorrect answer
  const incorrectPlayers = activePlayers.filter(p => 
    !p.hasAnswered || p.lastAnswerCorrect === false
  );
  for (const player of incorrectPlayers) {
    // Use player's answer time if available, otherwise assume timeout (0)
    const timeRemaining = player.answeredAt 
      ? calculateTimeRemaining(questionStartedAtRef.current, QUESTION_TIME)
      : 0;
    observerBonus += calculateObserverBonus(timeRemaining);
  }
} else if (incorrectCount / totalActive >= 0.5) {
  // For larger games, use average of incorrect times
  observerBonus = calculateObserverBonus(0); // Use timeout value for simplicity
}
```

### 3. `src/components/team/MultiplayerObserverScreen.tsx`
იგივე ლოგიკა multiplayer-ისთვის (lines ~94-108):

```typescript
import { calculateObserverBonus, calculateTimeRemaining } from '@/utils/tvScoring';

// ახალი:
let bonus = 0;
if (totalPlayers <= 2) {
  // Calculate fair bonus based on when incorrect answers were given
  for (const [playerId, answer] of Object.entries(opponentAnswers)) {
    if (!answer.is_correct) {
      // Use answer timestamp if available
      const timeRemaining = answer.answered_at 
        ? calculateTimeRemaining(/* question start */, 15) 
        : 0;
      bonus += calculateObserverBonus(timeRemaining);
    }
  }
  // Add timeout bonus for players who didn't answer
  bonus += didNotAnswerCount * calculateObserverBonus(0);
} else if (totalIncorrect / totalPlayers >= 0.5) {
  bonus = calculateObserverBonus(0);
}
```

---

## ქულების შედარება

### ძველი სისტემა (2 კითხვა, 1 სწორი/1 არასწორი)

| მოთამაშე | კითხვა 1 (სწორი, 12წმ) | კითხვა 2 (არასწორი) | სულ |
|----------|-------------------------|---------------------|------|
| Test | 100 + 12×5 = 160 | 0 | **160** |
| Observer | 0 | 100 | **100** |

**სხვაობა:** 60 ქულა

### ახალი სისტემა (2 კითხვა, 1 სწორი/1 არასწორი)

| მოთამაშე | კითხვა 1 (სწორი, 12წმ) | კითხვა 2 (არასწორი, 5წმ) | სულ |
|----------|-------------------------|---------------------------|------|
| Test | 100 + 12×5 = 160 | 0 | **160** |
| Observer | 0 | 100 + 10×5 = 150 | **150** |

**სხვაობა:** 10 ქულა ✅ უფრო სამართლიანი!

### Timeout-ის შემთხვევა

| მოთამაშე | კითხვა 1 (სწორი, 15წმ) | კითხვა 2 (timeout) | სულ |
|----------|-------------------------|---------------------|------|
| Test | 100 + 15×5 = 175 | 0 | **175** |
| Observer | 0 | 100 + 15×5 = 175 | **175** |

**სხვაობა:** 0 ქულა = ფრე ✅

---

## ტექნიკური დეტალები

### Player State-ში საჭირო ინფორმაცია

TV Game-ში `player.answeredQuestionIndex` და presence state-ში არის დრო. მაგრამ უნდა დავამატოთ:

```typescript
// TVGameContext player presence state-ში
answeredTimeRemaining?: number; // დრო რომელიც დარჩა პასუხის გაცემისას
```

### შესაცვლელი ფაილების სია

| ფაილი | ცვლილება |
|-------|----------|
| `src/utils/tvScoring.ts` | `calculateObserverBonus` ფუნქციის დამატება |
| `src/contexts/TVGameContext.tsx` | Observer bonus ლოგიკის განახლება |
| `src/components/team/MultiplayerObserverScreen.tsx` | Multiplayer observer ლოგიკის განახლება |

---

## შეჯამება

ახალი სისტემა უზრუნველყოფს:
1. **სამართლიან ბალანსს** - Observer-ის მაქსიმალური ბონუსი = მოთამაშის მაქსიმალური ქულა
2. **დინამიურ ქულებს** - დრო ითვალისწინება ორივე მხარისთვის
3. **ფრეს შესაძლებლობას** - თუ 50/50, შედეგი ახლოს იქნება ფრესთან

