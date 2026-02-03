

# Plan: Observer Screen with Full Game UI and Answer Visibility

## Summary

Transform the observer screen to show the same game layout as regular players (question card, icon, answers), but with the observer-specific feature of seeing which players picked which answer in real-time.

## Current State

**Observer Screen** (`MultiplayerObserverScreen.tsx`):
- Simplified view with a star icon
- Question shown in a small text box
- No answer buttons visible
- Score card with bonus tracking
- Status text showing "Players are answering..."

**Player Game Screen** (`MultiplayerGameScreen.tsx`):
- Full question card with timer
- Player avatars with scores
- Answer buttons with Georgian labels (ა, ბ, გ, დ)
- After reveal: shows opponent avatars on answers they picked

## Proposed Design

The observer will see:
1. Same header (back button, question counter, leaderboard toggle)
2. Question card with timer (showing remaining time for players)
3. Progress dots
4. Answer buttons (disabled - observer can't click)
5. Player avatars overlaid on answers they pick **in real-time** (not just after reveal)
6. Observer info badge showing they're in observer mode + bonus earned

## Technical Changes

### File: `src/components/team/MultiplayerObserverScreen.tsx`

**Change 1: Import Required Components**
```typescript
import { QuizQuestionCard } from "@/components/ui/quiz-question-card";
import { QuizProgressDots } from "@/components/ui/quiz-progress-dots";
import { QuizAnswerButton } from "@/components/ui/quiz-answer-button";
import { QuizCategoryIcon } from "@/components/ui/quiz-category-icon";
import { SafeAvatar } from "@/components/shared/SafeAvatar";
```

**Change 2: Add Timer State**
Track time remaining locally for display purposes.
```typescript
const [timeRemaining, setTimeRemaining] = useState(TIME_PER_QUESTION);

// Reset timer on question change
useEffect(() => {
  setTimeRemaining(TIME_PER_QUESTION);
}, [currentQuestionIndex]);

// Countdown timer (visual only)
useEffect(() => {
  const timer = setInterval(() => {
    setTimeRemaining(prev => Math.max(0, prev - 0.1));
  }, 100);
  return () => clearInterval(timer);
}, [currentQuestionIndex]);
```

**Change 3: Replace Main Content Section**

Replace the current simplified view (star icon, compact question box) with the full game layout:

```tsx
{/* Question Icon - overlapping card */}
<div className="px-4 flex-shrink-0 relative">
  <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-10">
    <QuizCategoryIcon
      iconSlug={currentQuestion?.iconSlug || currentRoom?.category_id}
      categoryId={currentRoom?.category_id}
      size={72}
    />
  </div>
  
  <QuizQuestionCard
    questionText={currentQuestion?.question || ""}
    progressPercent={(timeRemaining / TIME_PER_QUESTION) * 100}
    state="default"
    timerSeconds={Math.ceil(timeRemaining)}
    timerMaxSeconds={TIME_PER_QUESTION}
    reserveTopSpace
  />
</div>

{/* Progress Dots */}
<div className="flex justify-center my-2 flex-shrink-0">
  <QuizProgressDots
    total={questions.length}
    current={currentQuestionIndex}
    results={[]}
  />
</div>

{/* Answer Buttons with Real-time Player Avatars */}
<div className="flex-1 px-4 flex flex-col gap-1.5 overflow-hidden min-h-0">
  {currentQuestion?.allAnswers.map((answer, index) => {
    // Find players who chose this answer (show in real-time for observer)
    const playersWhoChoseThis = Object.entries(opponentAnswers)
      .filter(([_, ans]) => ans.answer === answer)
      .map(([userId]) => participants.find(p => p.user_id === userId))
      .filter(Boolean);
    
    // Determine answer state (show correct after everyone answers)
    const allAnswered = players.every(p => opponentAnswers[p.user_id]);
    const isCorrect = answer === currentQuestion.correctAnswer;
    const answerState = allAnswered && isCorrect ? "correct" : "default";
    
    return (
      <motion.div key={`${currentQuestionIndex}-${index}`} className="relative">
        <QuizAnswerButton
          label={ANSWER_LABELS[index]}
          text={answer}
          state={answerState}
          disabled={true}  // Observer can't click
          showLabel={true}
        />
        
        {/* Player avatars who picked this answer */}
        {playersWhoChoseThis.length > 0 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex -space-x-1.5">
            {playersWhoChoseThis.slice(0, 4).map((p) => (
              <SafeAvatar
                key={p?.id}
                avatarUrl={p?.avatar_url}
                fallback={p?.nickname || "?"}
                className="w-7 h-7 border-2 border-white/50"
                fallbackClassName="bg-purple-500 text-white text-[10px]"
              />
            ))}
            {playersWhoChoseThis.length > 4 && (
              <div className="w-7 h-7 rounded-full bg-white/80 flex items-center justify-center text-[10px]">
                +{playersWhoChoseThis.length - 4}
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  })}
</div>
```

**Change 4: Add Observer Info Banner**

Add a compact banner at the bottom showing observer status and bonus:

```tsx
{/* Observer Status Bar */}
<div className="px-4 pb-4 pt-2 flex-shrink-0">
  <div className="pb-[env(safe-area-inset-bottom)]">
    <div className="bg-white/10 backdrop-blur-sm rounded-xl py-3 px-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
        <span className="text-white/80 text-sm">
          შენი ტრივიაა — აკვირდები
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-white font-bold">{myScore}</span>
        {bonusEarnedThisRound > 0 && (
          <motion.span
            key={bonusEarnedThisRound}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="text-green-400 text-sm font-bold"
          >
            +{bonusEarnedThisRound}
          </motion.span>
        )}
      </div>
    </div>
  </div>
</div>
```

**Change 5: Update Answer Labels Constant**

Add Georgian answer labels at the top:
```typescript
const ANSWER_LABELS = ["ა", "ბ", "გ", "დ"];
```

## Visual Layout Comparison

**Before (Observer):**
```text
┌─────────────────────────┐
│ ←    1/5    [avatars]   │ Header
├─────────────────────────┤
│         ⭐               │ Star Icon
│    შენი ტრივიაა!        │ Title
│  [Question in small box] │ Compact question
│     ┌───────────┐        │
│     │  Score: X │        │ Score card
│     └───────────┘        │
│                          │
│ [Players answering...]   │ Status text
└─────────────────────────┘
```

**After (Observer with full game UI):**
```text
┌─────────────────────────┐
│ ←    1/5    [avatars]   │ Header
├─────────────────────────┤
│        [Icon]           │ Question Icon
│  ┌─────────────────┐    │
│  │ 15  Question?   │    │ Question Card
│  │ ════════════    │    │ with timer
│  └─────────────────┘    │
│      • • • • •          │ Progress dots
│  ┌─────────────────┐    │
│  │ ა │ Answer 1   👤│    │ Answers with
│  │ ბ │ Answer 2    │    │ player avatars
│  │ გ │ Answer 3 👤👤│    │ in real-time
│  │ დ │ Answer 4    │    │
│  └─────────────────┘    │
│ ⭐ შენი ტრივიაა  42 +15 │ Observer bar
└─────────────────────────┘
```

## Key Differences from Player View

| Feature | Player | Observer |
|---------|--------|----------|
| Answer buttons clickable | Yes | No (disabled) |
| See player picks | After reveal only | Real-time |
| Timer controls game | Yes | Visual only |
| Correct answer highlight | After own answer | After all answered |
| Bottom area | "Next Question" button | Score + bonus bar |

## Files Modified

| File | Changes |
|------|---------|
| `src/components/team/MultiplayerObserverScreen.tsx` | Complete UI overhaul to match game screen with observer features |

