
# Fix: Suggester Observer Experience During Reveal Phase

## Problem Summary

When a host suggests their own trivia (user-created content) and players vote for it, the host correctly sees the observer UI during the question phase. However, during the reveal phase, they see "დრო ამოიწურა!" (Time expired!) which is confusing - it implies they failed to answer when in reality they were intentionally blocked from answering.

The screenshots show:
1. Observer screen during questions: "შენი კატეგორიაა!" (Your category!)
2. Reveal screen showing: "დრო ამოიწურა!" (Time expired!) - this is the bug

## Root Cause

The reveal phase handlers in both `TVHostController.tsx` and `ControllerReveal.tsx` do not check if the player is a suggester. When `myAnswer === null` (because the suggester was blocked from answering), the UI defaults to showing "Time expired!" instead of a proper observer reveal screen.

## Solution

Add suggester-aware handling to the reveal phase in both:
1. `TVHostController.tsx` - for hosts
2. `ControllerReveal.tsx` - for guest players who might be suggesters

The observer reveal screen should:
- Show a star icon (consistent with observer theme)
- Display "შენი კატეგორიაა!" (Your category!)
- Show the correct answer so they can see what was asked
- Display their current score
- Indicate they're waiting for the next question

---

## Implementation

### 1. Update TVHostController.tsx (Host Reveal)

Add `isSuggester` check before the reveal phase UI (around line 639):

```typescript
// Reveal phase - SUGGESTER sees observer reveal, others see answer result
if (localPhase === 'reveal') {
  // CRITICAL FIX: Suggester sees observer reveal, not "Time expired"
  if (isSuggester) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6 flex flex-col items-center justify-center">
        <Star className="w-16 h-16 text-yellow-400 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">შენი კატეგორიაა!</h2>
        <p className="text-purple-300 mb-4">ამ რაუნდში აკვირდები</p>
        
        {currentQuestion && (
          <div className="bg-white/10 rounded-xl p-4 mb-4 max-w-sm">
            <p className="text-purple-300 text-sm mb-1">სწორი პასუხი:</p>
            <p className="text-white font-semibold">{currentQuestion.correct_answer}</p>
          </div>
        )}
        
        <div className="bg-white/10 rounded-xl px-6 py-3 mb-4">
          <span className="text-purple-300">შენი ქულა: </span>
          <span className="text-white text-2xl font-bold">{myScore}</span>
        </div>
        
        <p className="text-purple-300/60">შემდეგი კითხვა მალე...</p>
      </div>
    );
  }
  
  // Regular reveal for non-suggesters (existing code continues)
  const isCorrect = myAnswer && currentQuestion ...
```

### 2. Update ControllerReveal.tsx (Guest Reveal)

Add the same suggester check for guests (around line 70):

```typescript
export const ControllerReveal: React.FC = () => {
  const navigate = useNavigate();
  const { 
    questions, currentQuestionIndex, myAnswer, myScore, players, 
    myPlayerId, leaveSession, phase, currentRoundSuggesterId 
  } = useTVGame();
  
  // Check if current player is the suggester
  const isSuggester = myPlayerId && currentRoundSuggesterId && 
                      myPlayerId === currentRoundSuggesterId;
  
  // ... existing captured answer logic ...
  
  const currentQuestion = questions[currentQuestionIndex];
  
  // CRITICAL FIX: Suggester sees observer reveal UI
  if (isSuggester && currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6 flex flex-col items-center justify-center">
        <Star className="w-16 h-16 text-yellow-400 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">შენი კატეგორიაა!</h2>
        <p className="text-purple-300 mb-4">ამ რაუნდში აკვირდები</p>
        
        <div className="bg-white/10 rounded-xl p-4 mb-4 max-w-sm">
          <p className="text-purple-300 text-sm mb-1">სწორი პასუხი:</p>
          <p className="text-white font-semibold text-center">{currentQuestion.correct_answer}</p>
        </div>
        
        <div className="bg-white/10 rounded-xl px-6 py-3 mb-4">
          <span className="text-purple-300">შენი ქულა: </span>
          <span className="text-white text-2xl font-bold">{myScore}</span>
        </div>
        
        <p className="text-purple-300/60">შემდეგი კითხვა მალე...</p>
      </div>
    );
  }
  
  // ... rest of existing reveal logic ...
```

---

## Technical Summary

| File | Change |
|------|--------|
| `src/pages/TVHostController.tsx` | Add `isSuggester` check at start of reveal phase (line ~639) to show observer reveal UI |
| `src/components/controller/ControllerReveal.tsx` | Import `currentRoundSuggesterId`, add `isSuggester` check to show observer reveal UI |

## Expected Result

After this fix:
1. Suggester sees consistent "Your category!" observer experience throughout both question AND reveal phases
2. They can see the correct answer during reveal (so they learn too)
3. Their score is displayed (accumulated from previous rounds)
4. No more confusing "Time expired!" message for intentional observers
