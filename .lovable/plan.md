
# გეგმა: TV რეჟიმში რაუნდების სინქრონიზაციის გამოსწორება

## პრობლემა

TV რეჟიმში მეორე რაუნდის დაწყებისას მოთამაშეები (ან TV ეკრანი) კვლავ ხედავენ წინა რაუნდის კითხვებს ("ვამპირები"), მიუხედავად იმისა რომ ახალი რაუნდი აირჩია.

## ძირეული მიზეზი

**subscription handler-ში (ხაზი 2033)** არის ეს ლოგიკა:

```typescript
questions: questions.length > 0 ? questions : prev.questions,
```

**პრობლემა:** თუ `newData.questions` არ მოვიდა realtime update-ში (Supabase ზოგჯერ არ აგზავნის JSONB ველებს განახლებისას), მაშინ `questions.length === 0` და ძველი კითხვები რჩება!

**სცენარი:**
```text
1. Round 1: ვამპირები (კითხვები state-ში)
2. Host clicks "Next Round" → startNextRoundFromQueueIfAny()
3. DB updates: questions = [new questions], status = 'round-intro'
4. Realtime subscription triggers, BUT newData.questions is undefined/null
5. questions.length === 0 → prev.questions KEPT (ვამპირების კითხვები!)
6. Players see old questions despite new round
```

**რატომ ხდება ეს:**
- Supabase Realtime არ აბრუნებს ყველა ველს UPDATE-ზე - მხოლოდ შეცვლილებს
- JSONB ველები (როგორიც არის `questions`) ზოგჯერ არ იგზავნება
- ეს განსაკუთრებით ხშირია როცა სხვა ველებიც იცვლება (status, category_name და ა.შ.)

---

## გადაწყვეტა: Fresh Questions Fetch

### მიდგომა 1: Force refetch on round transition (რეკომენდირებული)

როცა `round_number` იცვლება ან `status` გადადის `round-intro`/`countdown`-ზე, **აუცილებლად** უნდა მოხდეს fresh fetch:

```typescript
// subscription handler-ში
const isNewRound = newData.round_number !== prev.roundNumber;
const isRoundTransition = ['round-intro', 'countdown'].includes(newData.status) && 
                          !['round-intro', 'countdown'].includes(prev.phase);

if (isNewRound || isRoundTransition) {
  // Questions in realtime update might be stale - trigger refetch
  console.log('[Subscription] 🔄 Round transition detected - scheduling refetch');
  setTimeout(() => {
    refetchSessionData(sessionId);
  }, 200);
}
```

### მიდგომა 2: Explicit questions validation

შევამოწმოთ რომ კითხვები შეესაბამება ახალ რაუნდს:

```typescript
// subscription handler-ში, questions parsing-ის შემდეგ
if (questions.length > 0) {
  // Validate questions match new category
  const firstQuestionId = questions[0]?.id || '';
  const expectedPrefix = newData.category_name ? '' : 'ut-'; // user trivia prefix
  
  // If questions don't seem fresh (e.g., IDs don't match pattern), force refetch
  // This is a heuristic but catches most cases
}
```

### მიდგომა 3: Host-side local state sync (სწრაფი fix)

Host-მა `startNextRoundFromQueueIfAny`-ში უკვე აქვს ახალი კითხვები - მან უნდა დაასინქროს ლოკალური state:

```typescript
// startNextRoundFromQueueIfAny-ში, DB update-ის შემდეგ
setState(prev => ({
  ...prev,
  roundNumber: newRoundNumber,
  questions: formattedQuestions, // ← დამატება!
  currentQuestionIndex: 0,       // ← დამატება!
  categoryName: nextCategoryName,
  categoryIcon: nextCategoryIcon,
  // ... existing suggester fields
}));
```

---

## შესასრულებელი ცვლილებები

### ფაილი: `src/contexts/TVGameContext.tsx`

#### ცვლილება 1: `startNextRoundFromQueueIfAny` - Host-ის local state sync (ხაზი ~1170)

**მანამდე:**
```typescript
setState(prev => ({
  ...prev,
  roundNumber: newRoundNumber,
  currentRoundSuggesterId: suggesterUserId,
  currentRoundSuggesterNickname: suggesterNickname,
  currentRoundSuggesterAvatarUrl: suggesterAvatarUrl,
}));
```

**შემდეგ:**
```typescript
setState(prev => ({
  ...prev,
  roundNumber: newRoundNumber,
  questions: formattedQuestions, // ✅ CRITICAL: Sync new questions locally
  currentQuestionIndex: 0,       // ✅ Reset to first question
  categoryName: nextCategoryName,
  categoryIcon: nextCategoryIcon,
  phase: 'round-intro',          // ✅ Sync phase locally
  currentRoundSuggesterId: suggesterUserId,
  currentRoundSuggesterNickname: suggesterNickname,
  currentRoundSuggesterAvatarUrl: suggesterAvatarUrl,
}));
```

#### ცვლილება 2: Subscription handler - refetch on round transition (ხაზი ~1983-2010)

**დასამატებელი ლოგიკა (phase transition logic-ის შემდეგ):**
```typescript
// CRITICAL FIX: Force refetch when round number changes
// Realtime updates may not include JSONB questions field
const prevRoundNumber = prev.roundNumber;
const newRoundNumber = newData.round_number ?? prev.roundNumber;
const isNewRound = newRoundNumber !== prevRoundNumber && newRoundNumber > 0;

if (isNewRound) {
  console.log('[Subscription] 🔄 New round detected:', { from: prevRoundNumber, to: newRoundNumber });
  
  // If questions in update are empty but this is a new round, we MUST refetch
  if (questions.length === 0) {
    console.log('[Subscription] ⚠️ New round but NO questions in update - forcing refetch');
    setTimeout(() => {
      refetchSessionData(sessionId);
    }, 200);
  }
}
```

#### ცვლილება 3: refetchSessionData improvements (ხაზი ~587-657)

დავრწმუნდეთ რომ `refetchSessionData` სწორად ასინქრონებს round-ის მონაცემებს:

```typescript
// refetchSessionData-ში, setState-ში
setState(prev => ({
  ...prev,
  sessionId,
  phase: mapDbStatusToPhase(session.status),
  questions, // ← უკვე არის
  currentQuestionIndex: session.current_question_index || 0,
  categoryName: session.category_name || null,
  categoryIcon: session.category_icon || null,
  roomName: session.room_name || null,
  roundNumber: session.round_number ?? prev.roundNumber, // ← დასამატებელი
  totalRounds: session.total_rounds ?? prev.totalRounds, // ← დასამატებელი
  // ... და suggester fields
}));
```

---

## ვალიდაციის Flow

```text
Host clicks "Next Round" → startNextRoundFromQueueIfAny()
    │
    ├─► Fetches fresh queue item from DB
    ├─► Generates formattedQuestions for new category
    ├─► Updates tv_sessions with new questions, status='round-intro'
    ├─► Local setState with questions, phase, categoryName ← NEW!
    │
    │   (Realtime subscription fires for all clients)
    │
Non-Host/TV receives UPDATE
    │
    ├─► Detects round_number changed
    ├─► Checks: questions in update?
    │     │
    │     ├─ YES → Use them directly
    │     └─ NO  → Force refetch from DB ← NEW!
    │
    └─► All clients see correct new questions
```

---

## ტექნიკური შეჯამება

| ცვლილება | მდებარეობა | მიზანი |
|----------|------------|--------|
| Host local sync | `startNextRoundFromQueueIfAny` ხაზი ~1170 | Host დაუყოვნებლივ ხედავს ახალ კითხვებს |
| Round change detection | Subscription handler ხაზი ~2000 | აღმოაჩინოს რაუნდის ცვლილება |
| Auto-refetch on empty questions | Subscription handler | Fallback თუ realtime-მა არ მოიტანა კითხვები |
| refetchSessionData improvements | ხაზი ~650 | სრული round metadata sync |

---

## მოსალოდნელი შედეგი

| სცენარი | მანამდე | შემდეგ |
|---------|---------|--------|
| Host იწყებს round 2 | Host ხედავს ახალს, non-host ძველს | ყველა ხედავს ახალ კითხვებს |
| Realtime-მა არ მოიტანა questions | ძველი კითხვები რჩება | Auto-refetch ჩატვირთავს სწორ კითხვებს |
| TV ეკრანი round transition-ზე | შეიძლება ძველი კითხვები | სწორი კითხვები (host sync ან refetch) |
