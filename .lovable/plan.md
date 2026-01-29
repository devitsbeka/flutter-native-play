
# გეგმა: მულტიპლეერში კითხვების სინქრონიზაციის გამოსწორება

## პრობლემა

ორი სხვადასხვა მოთამაშე ხედავს სხვადასხვა კითხვებს ან რაუნდებს. ეს ხდება რამდენიმე მიზეზით:

1. **Race Condition - კითხვები სხვადასხვა წყაროდან**: ჰოსტი აწყობს ახალ რაუნდს, წერს `room_questions`-ში, მაგრამ non-host-ი კვლავ ხედავს ძველ კითხვებს ან სხვა კატეგორიას
2. **არ არის უნიკალური round identifier**: `current_game_id` იცვლება ყოველ რაუნდზე, მაგრამ non-host-ი არ ამოწმებს რომ ახალი კითხვები ეკუთვნის ამ `game_id`-ს
3. **`room_questions`-ში `created_at` არ გამოიყენება ვალიდაციისთვის**: non-host-ი მხოლოდ ამოწმებს არის თუ არა კითხვები, მაგრამ არ ამოწმებს რომ ეს **ახალი** კითხვებია

---

## ძირეული მიზეზი

**MultiplayerContextV2.tsx ხაზი 258-321** - non-host subscription handler:

```typescript
// არსებული კოდი - პრობლემატური
if (updated.status === "playing" && (currentPhase === "lobby" || currentPhase === "results")) {
  if (!currentIsHost) {
    // Clear local questions first
    setState(prev => ({ ...prev, questions: [] }));
    
    // Wait 300ms and fetch
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Fetch questions - BUT NO VALIDATION!
    const { data } = await supabase
      .from("room_questions")
      .select("*")
      .eq("room_id", roomId)
      .order("question_index", { ascending: true });
    
    // Uses these questions WITHOUT checking if they're fresh
  }
}
```

**პრობლემა:**
- არ ამოწმებს `current_game_id`-ს რომ დარწმუნდეს ეს სწორი რაუნდია
- 300ms delay შეიძლება არ იყოს საკმარისი
- თუ ძველი კითხვები კვლავ DB-შია (deletion არ მოხდა დროზე), ძველს დააბრუნებს

---

## გადაწყვეტა: Game ID Validation + Freshness Check

### ძირითადი პრინციპი

1. **Host უგზავნის `current_game_id`-ს DB-ს** ყოველ რაუნდზე (უკვე ხდება)
2. **Non-host ამოწმებს** რომ `room_questions`-ის `created_at` შეესაბამება ახალ თამაშს
3. **Retry logic გაძლიერება** - მეტი attempts, უფრო გრძელი delays

### ცვლილება 1: room_questions-ში game_id-ის დამატება

**Database Migration:**
```sql
ALTER TABLE room_questions ADD COLUMN IF NOT EXISTS game_id uuid REFERENCES room_games(id);
```

### ცვლილება 2: ჰოსტის მხარეს - game_id-ის ჩაწერა

**saveQuestionsAndStartGame** და ყველა სხვა ადგილი სადაც `room_questions` იწერება:
```typescript
await Promise.all(questions.map((q, index) => 
  supabase.from("room_questions").insert({
    room_id: roomId,
    question_index: index,
    question_text: q.question,
    // ... სხვა ველები
    game_id: game?.id, // ← ახალი ველი
  })
));
```

### ცვლილება 3: Non-host subscription handler-ის გაძლიერება

**MultiplayerContextV2.tsx ხაზი 258-321:**

```typescript
if (updated.status === "playing" && (currentPhase === "lobby" || currentPhase === "results")) {
  if (!currentIsHost) {
    // 1. Clear local state immediately
    setState(prev => ({
      ...prev,
      questions: [],
      currentQuestionIndex: 0,
      myScore: 0,
      opponentAnswers: {},
      currentRoom: updated,
    }));
    
    // 2. Get expected game_id from room update
    const expectedGameId = updated.current_game_id;
    const expectedStartedAt = updated.started_at;
    
    // 3. Retry loop with validation
    let attempts = 0;
    const MAX_ATTEMPTS = 5;
    const RETRY_DELAY = 400;
    
    while (attempts < MAX_ATTEMPTS) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      
      const { data: roomQuestions } = await supabase
        .from("room_questions")
        .select("*")
        .eq("room_id", roomId)
        .order("question_index", { ascending: true });
      
      // VALIDATION: Check questions are fresh
      if (roomQuestions && roomQuestions.length > 0) {
        // Method 1 (preferred): Check game_id matches
        const firstQuestion = roomQuestions[0];
        if (expectedGameId && firstQuestion.game_id === expectedGameId) {
          // Questions match current game - proceed
          break;
        }
        
        // Method 2 (fallback): Check created_at is recent (within 10s of game start)
        if (expectedStartedAt) {
          const startedAtTime = new Date(expectedStartedAt).getTime();
          const questionCreatedAt = new Date(firstQuestion.created_at).getTime();
          const timeDiff = Math.abs(questionCreatedAt - startedAtTime);
          
          if (timeDiff < 10000) { // 10 second window
            break; // Questions are fresh
          }
        }
      }
      
      attempts++;
      console.log(`[MP] Waiting for fresh questions (attempt ${attempts}/${MAX_ATTEMPTS})`);
    }
    
    // 4. Final fetch and set
    // ... existing question mapping code
  }
}
```

---

## დეტალური ცვლილებები

### ფაილი 1: Database Migration

```sql
-- Add game_id to room_questions for round validation
ALTER TABLE room_questions 
ADD COLUMN IF NOT EXISTS game_id uuid REFERENCES room_games(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_room_questions_game_id ON room_questions(game_id);
```

### ფაილი 2: MultiplayerContextV2.tsx

| ადგილი | ცვლილება |
|--------|----------|
| ხაზი ~258-321 | Subscription handler: game_id/freshness validation |
| ხაზი ~995-1006 | `saveQuestionsAndStartGame`: game_id ჩაწერა |
| ხაზი ~855-866 | User trivia questions: game_id ჩაწერა |
| ხაზი ~1472-1483 | `startNextFromQueue` trivia: game_id ჩაწერა |
| ხაზი ~1593-1604 | `startNextFromQueue` category: game_id ჩაწერა |
| ხაზი ~1316-1327 | `startNewRound`: game_id ჩაწერა |
| ხაზი ~744-749 | `startGame` custom questions: game_id update |

---

## ვალიდაციის Flow

```text
Host clicks "Start Game"
    │
    ├─► Deletes old room_questions
    ├─► Creates new room_games record → gets game_id
    ├─► Inserts new room_questions WITH game_id
    └─► Updates game_rooms.status = "playing", current_game_id = game_id
          │
          │ (Realtime subscription)
          ▼
Non-Host receives room UPDATE
    │
    ├─► Sees status = "playing"
    ├─► Reads updated.current_game_id (expected)
    │
    ├─► Retry loop (up to 5 attempts)
    │     │
    │     ├─► Fetches room_questions
    │     └─► Checks: questions[0].game_id === expected?
    │           │
    │           ├─ YES → Break loop, use these questions
    │           └─ NO  → Wait 400ms, retry
    │
    └─► Sets questions in state, transitions to "playing"
```

---

## ტექნიკური შეჯამება

| კომპონენტი | ცვლილება |
|------------|----------|
| Database | `game_id` column + migration |
| `saveQuestionsAndStartGame` | Pass game_id to inserts |
| `startGame` (all branches) | Include game_id when inserting |
| `startNewRound` | Include game_id when inserting |
| `startNextFromQueue` | Include game_id when inserting |
| Subscription handler | Validate questions match current_game_id |

---

## მოსალოდნელი შედეგი

| სცენარი | მანამდე | შემდეგ |
|---------|---------|--------|
| ჰოსტი იწყებს ახალ რაუნდს | Non-host-ს შეიძლება ძველი კითხვები ჰქონდეს | ყველა ხედავს ერთნაირ, ახალ კითხვებს |
| სწრაფად 2 რაუნდი ზედიზედ | Race condition, შერეული კითხვები | game_id validation უზრუნველყოფს სწორ კითხვებს |
| მომხმარებელი გვიან შემოვა | შეიძლება არასწორი რაუნდი დაინახოს | სწორ კითხვებს ნახავს (validated by game_id) |

---

## Alternative Approach (თუ migration არ გსურთ)

თუ DB schema ცვლილება არ არის სასურველი, შეგვიძლია მხოლოდ `created_at` validation:

```typescript
// In subscription handler:
const expectedStartedAt = updated.started_at;
const startedAtTime = new Date(expectedStartedAt).getTime();

// Validate questions were created within 10s of game start
const firstQuestionCreatedAt = new Date(roomQuestions[0].created_at).getTime();
const timeDiff = Math.abs(firstQuestionCreatedAt - startedAtTime);

if (timeDiff > 10000) {
  // Questions are stale - keep retrying
  continue;
}
```

ეს ნაკლებად მტკიცეა, მაგრამ არ საჭიროებს DB ცვლილებას.
