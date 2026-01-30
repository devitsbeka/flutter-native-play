
# გეგმა: Observer-ის ბონუსის გამოსწორება - გამოტოვებული კითხვების დაჭერა

## პრობლემა

როცა Observer სწრაფად გადადის შემდეგ კითხვაზე (1.5 წამში), მოთამაშის პასუხი აღარ იჭერება:

```text
Timeline:
┌─────────────────────────────────────────────────────────┐
│ 0s    Observer sees Q1                                  │
│ 1.5s  Observer clicks "Next" → currentQuestionIndex = 2 │
│ 5s    Player answers Q1 WRONG                           │
│       ↓                                                 │
│       Subscription receives answer for Q1               │
│       BUT: currentQuestionIndex = 2, so answer ignored! │
│       Observer gets 0 bonus 😢                          │
└─────────────────────────────────────────────────────────┘
```

**კოდის პრობლემა** (MultiplayerContextV2.tsx, line 437):
```typescript
// Only processes answers for CURRENT question
if (answer.question_index === currentQuestionIndexRef.current) {
  // ...
}
```

Observer-მა როცა გადავიდა Q2-ზე, Q1-ის პასუხები უკვე იგნორირდება.

## გადაწყვეტა

შევქმნათ **ცალკე subscription/polling** Observer-ისთვის რომელიც ყველა კითხვის პასუხებს იჭერს და real-time ბონუსს ითვლის.

### მიდგომა 1: Observer-ში Polling (რეკომენდებული)

`MultiplayerObserverScreen`-ში დავამატოთ polling რომელიც:
1. ყოველ 2-3 წამში ამოწმებს `player_answers` ტაბლაში ყველა არასწორ პასუხს
2. თვლის ბონუსს იმ პასუხებზე რაც ჯერ არ დაუთვლია
3. ინახავს "დათვლილი პასუხების" IDs

### ცვლილებები ფაილში: `src/components/team/MultiplayerObserverScreen.tsx`

#### 1. დავამატოთ polling effect:

```typescript
// Poll for ALL incorrect answers across ALL questions (catches skipped ones)
useEffect(() => {
  if (!state.currentRoom || players.length === 0) return;
  
  const pollAnswers = async () => {
    const { data: allAnswers } = await supabase
      .from("player_answers")
      .select("*")
      .eq("room_id", state.currentRoom!.id)
      .eq("is_correct", false); // Only incorrect answers
    
    if (!allAnswers) return;
    
    let newBonus = 0;
    const newProcessedIds = new Set(processedAnswerIds);
    
    for (const answer of allAnswers) {
      const answerId = `${answer.user_id}-${answer.question_index}`;
      if (processedAnswerIds.has(answerId)) continue;
      
      const timeRemaining = answer.time_remaining ?? 0;
      const bonus = calculateObserverBonus(timeRemaining);
      newBonus += bonus;
      newProcessedIds.add(answerId);
    }
    
    if (newBonus > 0) {
      setBonusEarnedThisQuestion(prev => prev + newBonus);
      awardObserverBonus(newBonus);
      setProcessedAnswerIds(newProcessedIds);
    }
  };
  
  // Poll every 2 seconds
  const interval = setInterval(pollAnswers, 2000);
  pollAnswers(); // Initial poll
  
  return () => clearInterval(interval);
}, [state.currentRoom?.id, players.length, processedAnswerIds, awardObserverBonus]);
```

#### 2. შევცვალოთ `processedAnswerIds` key format:

**მანამდე** (ხაზი 85):
```typescript
for (const [odavidwserId, answer] of Object.entries(opponentAnswers)) {
  if (processedAnswerIds.has(odavidwserId)) continue;
```

**შემდეგ**:
```typescript
// Use compound key: {userId}-{questionIndex} to track per-question answers
const answerId = `${answer.user_id}-${answer.question_index}`;
if (processedAnswerIds.has(answerId)) continue;
```

#### 3. წავშალოთ ძველი real-time effect (ხაზები 75-104):

ძველი effect იყენებდა `opponentAnswers`-ს რომელიც არ მუშაობს Observer-ისთვის. ამის ნაცვლად polling-ით ვჭერთ ყველა პასუხს.

## რატომ მუშაობს

| სცენარი | მანამდე | შემდეგ |
|---------|---------|--------|
| Observer Q2-ზეა, Player Q1-ზე პასუხობს | ❌ იგნორირდება | ✅ Polling იჭერს |
| Observer Q5-ზეა, Player Q3-ზე პასუხობს | ❌ იგნორირდება | ✅ Polling იჭერს |
| Player სწორად პასუხობს | ✅ ბონუსი 0 | ✅ ბონუსი 0 |
| Player არასწორად პასუხობს | ❌ 0 (თუ Observer გადავიდა) | ✅ ბონუსი ~100-175 |

## ტექნიკური დეტალები

- **Polling interval**: 2 წამი (საკმარისი real-time ეფექტისთვის)
- **Key format**: `{userId}-{questionIndex}` - უნიკალური თითოეული პასუხისთვის
- **Query**: მხოლოდ `is_correct=false` - ოპტიმიზებული
- **Memory**: `processedAnswerIds` Set შეინახავს დათვლილ პასუხებს

## დამატებით

Import-ებში დაგვჭირდება `supabase`:
```typescript
import { supabase } from "@/integrations/supabase/client";
```

და `useMultiplayerV2`-დან `currentRoom`:
```typescript
const { currentRoom, ... } = useMultiplayerV2();
```
