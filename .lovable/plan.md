
# Fix: White Screen for Players When Playing Host-Created Trivia

## Problem Summary

When a host suggests their own user-created trivia and players vote for it:
- **Host sees**: Observer screen ("შენი კატეგორიაა!") - working correctly
- **Other players see**: White/blank screen - **BUG**

The screenshot shows the host's working observer view, but the other device shows a completely white page.

## Root Cause

The `finalizePollAndStartGame` function in `useTVPoll.ts` stores questions to the database **without the required `options` array**.

```text
Current question structure in database:
{
  id: "user-q-0",
  question_text: "...",
  correct_answer: "Nintendo",
  incorrect_answers: ["Sony", "Microsoft", "Sega"],  // Stored separately
  difficulty: "medium"
}

Expected question structure for ControllerQuestion:
{
  id: "user-q-0",
  question_text: "...",
  correct_answer: "Nintendo",
  options: ["Nintendo", "Sega", "Sony", "Microsoft"]  // MISSING! Shuffled array required
}
```

When players' devices fetch questions via `TVGameContext.refetchSessionData`, the `options` field is undefined, causing `currentQuestion.options.map()` to crash, resulting in a white screen.

## Solution

Update `finalizePollAndStartGame` to create and store the `options` array by shuffling `correct_answer` with `incorrect_answers` - matching the format used in `TVGameContext.tsx`.

---

## Implementation

### File: `src/hooks/useTVPoll.ts`

**Change 1: Add shuffle utility (at top of file or inline)**

```typescript
// Shuffle array utility (Fisher-Yates)
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};
```

**Change 2: Update question format for user trivia (lines 712-721)**

Before:
```typescript
questions = (postData.questions as any[]).map((q: any, idx: number) => ({
  id: `user-q-${idx}`,
  question_text: q.question_text || q.question || '',
  correct_answer: q.correct_answer || '',
  incorrect_answers: q.incorrect_answers || [],
  difficulty: 'medium',
  icon_slug: q.icon_slug || null,
}));
```

After:
```typescript
questions = (postData.questions as any[]).map((q: any, idx: number) => {
  const incorrectAnswers = Array.isArray(q.incorrect_answers) ? q.incorrect_answers : [];
  const allAnswers = shuffleArray([q.correct_answer || '', ...incorrectAnswers]);
  return {
    id: `user-q-${idx}`,
    question_text: q.question_text || q.question || '',
    correct_answer: q.correct_answer || '',
    options: allAnswers,  // ADD THIS - shuffled array for UI
    difficulty: 'medium',
    icon_slug: q.icon_slug || null,
  };
});
```

**Change 3: Update question format for category questions (lines 700-702)**

Before:
```typescript
if (questionsData && questionsData.length > 0) {
  questions = questionsData.sort(() => Math.random() - 0.5).slice(0, 10);
}
```

After:
```typescript
if (questionsData && questionsData.length > 0) {
  questions = questionsData.sort(() => Math.random() - 0.5).slice(0, 10).map(q => {
    const incorrectAnswers = Array.isArray(q.incorrect_answers) ? q.incorrect_answers : [];
    const allAnswers = shuffleArray([q.correct_answer, ...incorrectAnswers]);
    return {
      ...q,
      options: allAnswers,  // ADD shuffled options array
    };
  });
}
```

**Change 4: Update type definition (lines 673-680)**

Before:
```typescript
let questions: Array<{
  id: string;
  question_text: string;
  correct_answer: string;
  incorrect_answers: any;
  difficulty: string;
  icon_slug: string | null;
}> | null = null;
```

After:
```typescript
let questions: Array<{
  id: string;
  question_text: string;
  correct_answer: string;
  options: string[];           // ADD THIS
  difficulty: string;
  icon_slug: string | null;
}> | null = null;
```

---

## Technical Summary

| File | Change |
|------|--------|
| `src/hooks/useTVPoll.ts` | Add `shuffleArray` utility, create `options` array for both category and user trivia questions |

## What Gets Fixed

| Before | After |
|--------|-------|
| Questions stored without `options` | Questions stored with shuffled `options` array |
| `currentQuestion.options` is undefined | `currentQuestion.options` is properly populated |
| Players see white screen (crash on `.map()`) | Players see answer buttons correctly |
| Only host sees the game | All players can play host-created trivia |

## Data Flow After Fix

```text
1. Host creates trivia with questions
2. Poll votes for host's trivia
3. finalizePollAndStartGame:
   - Fetches questions from user_quiz_posts
   - Creates shuffled `options` array
   - Stores questions WITH options to tv_sessions
4. Player devices fetch via realtime/refetch
5. ControllerQuestion reads `options` array
6. Answer buttons render correctly
```
