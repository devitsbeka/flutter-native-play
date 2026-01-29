
# გეგმა: ორი კრიტიკული პრობლემის გადაწყვეტა

## პრობლემები

### პრობლემა 1: ლობიში ჩანს პირველი რაუნდის სათაური "თამაშის დაწყება" ღილაკით

თამაშის დასრულების შემდეგ ლობი აჩვენებს:
- ძველი კატეგორიის სახელი (მაგ. "ბროლის ორაკული") 
- "თამაშის დაწყება" ღილაკი

**მოსალოდნელი ქცევა:**
- "უკვე ითამაშე" ინდიკატორი ძველ კატეგორიაზე
- "გააგრძელე თამაში" ღილაკი რომელიც ხსნის კატეგორიის არჩევის მოდალს

### პრობლემა 2: მეორე მოთამაშე თამაშობს ძველ კითხვებს

როდესაც ჰოსტი ირჩევს ახალ კატეგორიას და იწყებს თამაშს:
- ჰოსტი ხედავს ახალ კითხვებს
- მეორე მოთამაშე ჯერ კიდევ ხედავს ძველ კითხვებს!

**მიზეზი:** `room_questions` ცხრილი განახლდება, მაგრამ მეორე მოთამაშის ლოკალური `questions` state არ იცლება.

---

## გადაწყვეტა

### 1. "უკვე ითამაშე" ინდიკატორი + "გააგრძელე" ღილაკი

**ფაილები:**
- `src/components/team/CategoryPickerSection.tsx` - ახალი prop `isAlreadyPlayed`
- `src/components/team/RoomLobbyV2.tsx` - ლოგიკა და ღილაკის ცვლილება

**ცვლილებები:**

```typescript
// CategoryPickerSection.tsx - ახალი prop
interface CategoryPickerSectionProps {
  // ... არსებული props
  isAlreadyPlayed?: boolean; // true = ეს კატეგორია უკვე ითამაშა
}

// Main category display-ში:
{isAlreadyPlayed && (
  <span className="ml-2 px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 text-xs font-medium">
    უკვე ითამაშე
  </span>
)}

<p className="text-white/60 text-[14px] leading-snug">
  {isAlreadyPlayed 
    ? "აირჩიე ახალი კატეგორია" 
    : hasCategory 
      ? "მიმდინარე კატეგორია" 
      : "დააჭირე არჩევისთვის"}
</p>
```

```typescript
// RoomLobbyV2.tsx - ღილაკის ლოგიკა
// State-ში დავამატოთ:
const [lastPlayedTriviaId, setLastPlayedTriviaId] = useState<string | null>(null);

// თამაშის დასრულების შემდეგ შევინახოთ
// (ან context-იდან გამოვიყენოთ currentRoom.user_trivia_id რომელიც ითამაშეს)

// ღილაკი:
const isAlreadyPlayed = !!currentRoom?.user_trivia_id && queue.length === 0;

{isHost ? (
  isAlreadyPlayed ? (
    // "უკვე ითამაშე" - აჩვენოს "გააგრძელე" რომელიც ხსნის picker-ს
    <ChunkyButton
      variant="white"
      size="xl"
      className="w-full"
      onClick={() => setShowCategoryPicker(true)}
      icon={<Plus className="w-5 h-5" />}
    >
      გააგრძელე თამაში
    </ChunkyButton>
  ) : (
    // ნორმალური "თამაშის დაწყება"
    <ChunkyButton
      variant="white"
      size="xl"
      className="w-full"
      onClick={handleStartGame}
      disabled={!canStartGame || isStarting || loading}
      icon={<Play className="w-5 h-5" />}
    >
      {isStarting ? "იწყება..." : canStartGame ? "თამაშის დაწყება" : `ველოდებით ${(currentRoom.min_players || 2) - participants.length} მოთამაშეს`}
    </ChunkyButton>
  )
) : (...)}
```

### 2. მეორე მოთამაშის კითხვების სინქრონიზაცია

**ფაილი:** `src/contexts/MultiplayerContextV2.tsx`

**პრობლემა:** როდესაც non-host მიიღებს room status → "playing" მოვლენას, ის ფეჩავს `room_questions`-ს მაგრამ ლოკალურ state-ში ძველი `questions` მასივი რჩება თუ ახალი ფეჩი ვერ მოხერხდა.

**გადაწყვეტა:** Subscription handler-ში (lines 252-305) **ჯერ გავასუფთაოთ ლოკალური questions** სანამ ახალს ჩავტვირთავთ:

```typescript
// Line ~252 - room status change handler
if (updated.status === "playing" && (currentPhase === "lobby" || currentPhase === "results")) {
  if (!currentIsHost) {
    // CRITICAL: Clear local questions first to prevent stale data
    setState(prev => ({
      ...prev,
      questions: [], // Clear old questions
      currentQuestionIndex: 0,
      myScore: 0,
      opponentAnswers: {},
    }));
    
    // Wait briefly for questions to be fully committed by host
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Fetch with retry logic...
    // (existing code)
  }
}
```

**დამატებითი გარანტია:** კითხვების ფეჩის შემდეგ შევამოწმოთ რომ მართლაც ახალია:

```typescript
// After successful fetch, verify questions match expected count
if (roomQuestions && roomQuestions.length > 0) {
  // Additional check: if category changed, verify we have fresh questions
  const expectedCategory = updated.category_name;
  
  const questions: TriviaQuestion[] = roomQuestions.map((q: any) => ({
    // ... mapping code
    category: expectedCategory || updated.category_name || "General",
  }));
  
  setState(prev => ({
    ...prev,
    questions,
    currentQuestionIndex: 0,
    myScore: 0, // Reset score for new round
    phase: "playing",
    // Ensure room state is also synced
    currentRoom: updated,
  }));
}
```

### 3. `continueInRoom` - ბოლო ნათამაშები ტრივიის ID-ის შენახვა

რომ ვიცოდეთ რომელი ტრივია ახლახან ითამაშეს და "უკვე ითამაშე" ინდიკატორი ვაჩვენოთ:

```typescript
// MultiplayerContextV2.tsx - state-ში ახალი ველი
interface MultiplayerState {
  // ... არსებული
  lastPlayedTriviaId: string | null; // ID of trivia that was just played
}

// continueInRoom-ში, სანამ გავასუფთავებთ, შევინახოთ:
const continueInRoom = useCallback(async () => {
  if (!state.currentRoom) return;
  
  const roomId = state.currentRoom.id;
  const justPlayedTriviaId = state.currentRoom.user_trivia_id; // Remember what was played
  
  // ... existing queue check logic ...
  
  setState(prev => ({
    ...prev,
    phase: "lobby",
    questions: [],
    // ... other resets
    lastPlayedTriviaId: justPlayedTriviaId || null, // Store for "already played" indicator
    ...(hasQueueItems ? {} : {
      currentRoom: prev.currentRoom ? {
        ...prev.currentRoom,
        category_id: null,
        category_name: null,
        user_trivia_id: null,
      } : null,
    }),
  }));
}, [state.currentRoom]);
```

---

## შესაცვლელი ფაილები

| ფაილი | ცვლილება |
|-------|----------|
| `src/contexts/MultiplayerContextV2.tsx` | კითხვების სინქრონიზაციის ფიქსი + `lastPlayedTriviaId` |
| `src/components/team/CategoryPickerSection.tsx` | `isAlreadyPlayed` prop და ინდიკატორი |
| `src/components/team/RoomLobbyV2.tsx` | "გააგრძელე თამაში" ღილაკი + `isAlreadyPlayed` ლოგიკა |

---

## მოსალოდნელი შედეგი

| სცენარი | მანამდე | შემდეგ |
|---------|---------|--------|
| თამაშის შემდეგ ლობი | ძველი კატეგორია + "თამაშის დაწყება" | "უკვე ითამაშე" + "გააგრძელე თამაში" |
| ახალი კატეგორიის დაწყება | მეორე მოთამაშე ხედავს ძველს | ორივე ხედავს ახალ კითხვებს |
| რიგში კატეგორიები | მუშაობს | იგივე |
