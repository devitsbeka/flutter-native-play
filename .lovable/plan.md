
## Fix: Newly Created Trivia Should Appear Selected in Room

### Problem
When users click "+ შექმენი" from the "ჩემი ტრივია" picker inside the room creation flow, the trivia gets created and saved to the database, but it does not appear as the selected trivia in the room creation UI. The selection mode is set to "create" instead of "my-trivias", so the "ჩემი ტრივია" card doesn't show the newly created trivia as selected.

### Solution
After `handleBlindTriviaReady` saves the trivia, also set `challengeTrivia` with the new trivia's ID and title, and use `selectionMode = "my-trivias"` instead of `"create"`. This way:
- The trivia appears selected in the "ჩემი ტრივია" section visually
- Room creation uses the "my-trivias" path which properly links to the trivia via `user_trivia_id`
- The `createdTriviaId` fallback path (the "create" mode) is no longer needed for this flow

### Changes

#### File: `src/components/team/CreateRoomPage.tsx`

**In `handleBlindTriviaReady` (around lines 550-555):**

Replace:
```typescript
setCreatedTriviaId(newTrivia.id);
setCustomTriviaQuestions(questions);
setCustomTriviaTitle(title);
setCustomTriviaSubject(subject);
setSelectionMode("create");
```

With:
```typescript
setChallengeTrivia({ id: newTrivia.id, title, type: "trivia" });
setSelectionMode("my-trivias");
```

This makes the newly created trivia behave exactly like selecting an existing trivia from the picker -- it shows up as the selected item in the pink "ჩემი ტრივია" card and creates the room using the established "my-trivias" flow which correctly sets `user_trivia_id` and `game_mode`.
