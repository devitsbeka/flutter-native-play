
# გეგმა: "კატეგორიის დამატება" - ნათამაშები რაუნდის წაშლა ლობიდან

## პრობლემის აღწერა

როდესაც მომხმარებელი თამაშის შემდეგ აჭერს "კატეგორიის დამატება"-ს:
- **მოსალოდნელი:** ლობიში უნდა ჩანდეს "აირჩიე კატეგორია" ცარიელი რიგით
- **რეალური:** ჩანს ნათამაშები კატეგორია ("1 ტიქტოკი") როგორც მიმდინარე

ეს ხდება იმიტომ, რომ `continueInRoom()` ფუნქცია არ ასუფთავებს `category_id`/`category_name` მნიშვნელობებს `game_rooms` ცხრილიდან.

## გადაწყვეტა

### შესაცვლელი ფაილი

`src/contexts/MultiplayerContextV2.tsx`

### ცვლილება

`continueInRoom` ფუნქციაში (lines 1101-1120), დავამატოთ:
1. რიგის შემოწმება - არის თუ არა ახალი კატეგორიები
2. თუ რიგი ცარიელია, გავასუფთაოთ `category_id`, `category_name`, და `user_trivia_id`

```typescript
// Continue in room after results (go back to lobby)
const continueInRoom = useCallback(async () => {
  if (!state.currentRoom) return;
  
  const roomId = state.currentRoom.id;
  
  // Check if queue is empty - if so, clear current category to prompt new selection
  const { data: queueItems } = await supabase
    .from("room_category_queue")
    .select("id")
    .eq("room_id", roomId)
    .limit(1);
  
  const hasQueueItems = queueItems && queueItems.length > 0;
  
  // Reset room status to waiting
  // If queue is empty, clear category so lobby shows "აირჩიე კატეგორია"
  await supabase
    .from("game_rooms")
    .update({ 
      status: "waiting",
      // Clear category data only if queue is empty (forces new selection)
      ...(hasQueueItems ? {} : {
        category_id: null,
        category_name: null,
        user_trivia_id: null,
      }),
    })
    .eq("id", state.currentRoom.id);
  
  setState(prev => ({
    ...prev,
    phase: "lobby",
    questions: [],
    currentQuestionIndex: 0,
    myScore: 0,
    lastQuestionResult: null,
    opponentAnswers: {},
    // Also clear in local state if queue is empty
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

## ლოგიკის ნაკადი

```text
┌─────────────────────────────────────────────────────────────┐
│              GAME ENDS → "კატეგორიის დამატება"              │
├─────────────────────────────────────────────────────────────┤
│ 1. continueInRoom() გამოძახება                              │
│ 2. შემოწმება: არის რიგში კატეგორიები?                       │
│    ├── დიახ → შენახე მიმდინარე კატეგორია (მომავალი რაუნდი) │
│    └── არა → გაასუფთავე category_id/category_name          │
│ 3. ლობის დაბრუნება                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## მოსალოდნელი შედეგი

| სცენარი | მანამდე | შემდეგ |
|---------|---------|--------|
| რიგი ცარიელი | ნათამაშები კატეგორია ჩანს | "აირჩიე კატეგორია" |
| რიგში არის კატეგორიები | შემდეგი კატეგორია ჩანს | იგივე (სწორია) |

---

## ტექნიკური დეტალები

### რატომ ასე?

- თუ რიგში არის კატეგორიები, პირველი ავტომატურად გახდება "მიმდინარე" და ეს სწორია
- თუ რიგი ცარიელია, მომხმარებელმა უნდა აირჩიოს ახალი - ამიტომ ველი უნდა გასუფთავდეს
- ეს ლოგიკა თანმიმდევრულია `startNextFromQueue`-თან, რომელიც რიგიდან იღებს შემდეგს
