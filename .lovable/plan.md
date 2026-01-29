
# გეგმა: მულტიპლეერში რაუნდების სინქრონიზაციის სრული გამოსწორება

## ძირეული პრობლემა

კატეგორიის არჩევისას ხდება **race condition**:

```
1. მომხმარებელი ირჩევს "Geography"
2. handleSelectCategory ანახლებს DB-ს (category_id = "geography")
3. 100ms შემდეგ startAfterPick triggers handleStartGame()
4. startGame კითხულობს state.currentRoom.category_id ← ჯერ ძველია!
5. კითხვები იტვირთება ძველი კატეგორიიდან
```

**Realtime subscription** არ ასწრებს `currentRoom` state-ს განახლებას 100ms-ში.

---

## გადაწყვეტა

### ძირითადი მიდგომა: Fresh Room Data Fetch

`startGame` ფუნქციამ უნდა **თავად მოითხოვოს ახალი room data** ნაცვლად იმისა, რომ დაეყრდნოს stale state-ს.

### ცვლილება 1: `startGame`-ში Fresh Fetch

**ფაილი:** `src/contexts/MultiplayerContextV2.tsx`

```typescript
// მანამდე (ხაზი ~762-764):
const roomId = state.currentRoom.id;
const questionCount = state.currentRoom.total_questions || 5;
const usedIds = state.currentRoom.used_question_ids || [];

// შემდეგ:
const roomId = state.currentRoom.id;

// CRITICAL: Re-fetch fresh room data to avoid stale category after selection
const { data: freshRoom } = await supabase
  .from("game_rooms")
  .select("*")
  .eq("id", roomId)
  .single();

if (!freshRoom) {
  toast.error("ოთახი ვერ მოიძებნა");
  return;
}

const questionCount = freshRoom.total_questions || 5;
const usedIds = freshRoom.used_question_ids || [];
```

### ცვლილება 2: Category-based branch-ში fresh data

```typescript
// მანამდე (ხაზი ~1000-1002):
const result = await getQuestions({
  mode: 'vs',
  categorySlug: state.currentRoom.category_id || undefined, // ← STALE!
  ...
});

// შემდეგ:
const result = await getQuestions({
  mode: 'vs',
  categorySlug: freshRoom.category_id || undefined, // ← FRESH!
  ...
});
```

### ცვლილება 3: Category name mapping

```typescript
// მანამდე (ხაზი ~1020):
category: state.currentRoom!.category_name || q.category || "General",

// შემდეგ:
category: freshRoom.category_name || q.category || "General",
```

### ცვლილება 4: Trivia branch-ში fresh data check

```typescript
// მანამდე (ხაზი ~776):
if (!state.currentRoom.category_id) {

// შემდეგ:
if (!freshRoom.category_id) {
```

და ყველა `state.currentRoom` reference ამ ფუნქციაში შეიცვალოს `freshRoom`-ით.

---

## სხვა Fix-ები იმავე პრობლემის მოსაგვარებლად

### Fix 5: `startNewRound`-ში fresh fetch

```typescript
// startNewRound-ის დასაწყისში (ხაზი ~1246):
const roomId = state.currentRoom.id;

// დავამატოთ:
const { data: freshRoom } = await supabase
  .from("game_rooms")
  .select("*")
  .eq("id", roomId)
  .single();

if (!freshRoom) return;
```

### Fix 6: Lobby subscription handler-ის გაძლიერება

Non-host-ისთვის კითხვების validation გაუმჯობესებულია (უკვე გაკეთდა), მაგრამ დავამატოთ ლოგი დებაგისთვის:

```typescript
// ხაზი ~344:
console.log(`[MP] Non-host loaded ${questions.length} validated questions for category: ${updated.category_name}`);
```

---

## ალტერნატიული მიდგომა (უფრო სუფთა)

### Option A: Pass fresh room to startGame

`handleSelectCategory`-ში refresh room და გადაეცი:

```typescript
// RoomLobbyV2.tsx - handleSelectCategory
if (startAfterPick) {
  setStartAfterPick(false);
  setShowCategoryPicker(false);
  
  // Wait for DB update to propagate, then fetch fresh
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Manually refresh room state before starting
  const { data: fresh } = await supabase
    .from("game_rooms")
    .select("*")
    .eq("id", currentRoom.id)
    .single();
    
  if (fresh) {
    // Trigger context update
    await handleStartGame();
  }
}
```

**მაგრამ:** ეს გაართულებს lobby კოდს და შეიძლება კვლავ ჰქონდეს race condition.

### Option B (Recommended): startGame fetches fresh data

უბრალოდ `startGame` თავად იღებს fresh data-ს - ეს ყველაზე მტკიცე გადაწყვეტაა.

---

## შესაცვლელი ფაილები

| ფაილი | ცვლილება |
|-------|----------|
| `MultiplayerContextV2.tsx` | `startGame`: Fresh room fetch at start, use `freshRoom` everywhere |
| `MultiplayerContextV2.tsx` | `startNewRound`: Fresh room fetch at start |
| `MultiplayerContextV2.tsx` | Update all `state.currentRoom` references to `freshRoom` in these functions |

---

## მოსალოდნელი Flow შემდეგ

```
1. მომხმარებელი ირჩევს "Geography"
2. handleSelectCategory ანახლებს DB-ს ← ✓
3. 100ms შემდეგ startGame გამოიძახება
4. startGame: const { data: freshRoom } = await supabase.from("game_rooms").select("*")...
5. freshRoom.category_id === "geography" ← სწორი!
6. კითხვები იტვირთება Geography კატეგორიიდან ← ✓
7. Non-host validation-ით იღებს სწორ კითხვებს ← ✓
```

---

## ტექნიკური დეტალები

### startGame ფუნქციის სრული ცვლილება

```typescript
const startGame = useCallback(async (hostShouldObserve: boolean = false) => {
  if (!state.currentRoom || !isHost) return;
  
  const roomId = state.currentRoom.id;
  
  // ✅ CRITICAL FIX: Fetch fresh room data to avoid stale category
  const { data: freshRoom, error: roomError } = await supabase
    .from("game_rooms")
    .select("*")
    .eq("id", roomId)
    .single();
    
  if (roomError || !freshRoom) {
    console.error("[startGame] Failed to fetch fresh room:", roomError);
    toast.error("ოთახის მონაცემები ვერ მოიძებნა");
    return;
  }
  
  console.log(`[startGame] Using fresh room data - category: ${freshRoom.category_name}, id: ${freshRoom.category_id}`);
  
  const questionCount = freshRoom.total_questions || 5;
  const usedIds = freshRoom.used_question_ids || [];
  
  // Set host_is_observer in database
  if (hostShouldObserve) {
    await supabase
      .from("game_rooms")
      .update({ host_is_observer: true })
      .eq("id", roomId);
  }
  
  try {
    // CHECK: For custom MyTrivia rooms (no category_id), use existing custom questions
    if (!freshRoom.category_id) {
      // ... existing custom trivia logic, but use freshRoom instead of state.currentRoom
    }
    
    // Standard category-based room: fetch from database
    const result = await getQuestions({
      mode: 'vs',
      categorySlug: freshRoom.category_id || undefined, // ✅ FRESH
      count: questionCount,
      excludeIds: usedIds,
    });
    
    // ... rest of function with freshRoom references
  }
}, [state.currentRoom, isHost]);
```

---

## სადიაგნოსტიკო ლოგები

დავამატოთ debug logs რომ გავიგოთ რა ხდება:

```typescript
// startGame დასაწყისში:
console.log('[startGame] State room category:', state.currentRoom.category_id, state.currentRoom.category_name);
console.log('[startGame] Fresh room category:', freshRoom.category_id, freshRoom.category_name);

// handleSelectCategory-ში:
console.log('[handleSelectCategory] Updated DB with:', category.id, category.name);

// startAfterPick trigger-ზე:
console.log('[startAfterPick] Starting game 100ms after category selection');
```

ეს დაგვეხმარება გავიგოთ არის თუ არა სხვა პრობლემები.
