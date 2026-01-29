

# Library Category Playability Fix

## პრობლემის Root Cause

როცა მომხმარებელი ოთახში ჯერ ირჩევს "ჩემი ტრივია"-ს და შემდეგ გადაერთვება ბიბლიოთეკის კატეგორიაზე, ძველი მონაცემები რჩება:

```text
┌────────────────────────────────────────────────────────────────┐
│ 1. მომხმარებელი ირჩევს "ჩემი ტრივია"                           │
│    → user_trivia_id = "abc-123"                                │
│    → room_questions ივსება ტრივიის კითხვებით                   │
│    → category_id = null                                        │
└────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────┐
│ 2. მომხმარებელი გადაერთვება ბიბლიოთეკის კატეგორიაზე            │
│    → category_id = "def-456" (განახლდა)                       │
│    → category_name = "გეოგრაფია" (განახლდა)                    │
│    → user_trivia_id = "abc-123" (არ გასუფთავდა!)              │
│    → room_questions = ძველი კითხვები (არ გასუფთავდა!)          │
└────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────┐
│ 3. startGame() ცდილობს ახალი კითხვების ჩამატებას               │
│    → saveQuestionsAndStartGame() calls DELETE + INSERT        │
│    → Postgres error: duplicate key violation!                  │
│      (race condition ან DELETE არ დასრულებულა დროზე)          │
└────────────────────────────────────────────────────────────────┘
```

---

## გადაწყვეტა

`handleSelectCategory` და `handleSelectRandom` ფუნქციებში დაემატება:
1. `user_trivia_id: null` - გასუფთავდეს ძველი ტრივიის ID
2. `room_questions` DELETE - გასუფთავდეს ძველი კითხვები

---

## შესაცვლელი ფაილი

**src/components/team/RoomLobbyV2.tsx**

---

## ტექნიკური ცვლილებები

### 1. handleSelectCategory (ხაზები 373-390)

მანამდე:
```typescript
const handleSelectCategory = async (category: { id: string; name: string; iconSlug?: string | null }) => {
  if (!currentRoom) return;
  
  try {
    await supabase
      .from("game_rooms")
      .update({ 
        category_id: category.id, 
        category_name: category.name 
      })
      .eq("id", currentRoom.id);
    
    toast.success("კატეგორია შეიცვალა");
  } catch (error) {
    console.error("Error updating category:", error);
    toast.error("კატეგორიის შეცვლა ვერ მოხერხდა");
  }
};
```

შემდეგ:
```typescript
const handleSelectCategory = async (category: { id: string; name: string; iconSlug?: string | null }) => {
  if (!currentRoom) return;
  
  try {
    // Clear any existing room_questions from previous trivia selection
    await supabase.from("room_questions").delete().eq("room_id", currentRoom.id);
    
    // Update room with new category and clear user_trivia_id
    await supabase
      .from("game_rooms")
      .update({ 
        category_id: category.id, 
        category_name: category.name,
        user_trivia_id: null, // Clear any previously selected user trivia
      })
      .eq("id", currentRoom.id);
    
    toast.success("კატეგორია შეიცვალა");
  } catch (error) {
    console.error("Error updating category:", error);
    toast.error("კატეგორიის შეცვლა ვერ მოხერხდა");
  }
};
```

### 2. handleSelectRandom (ხაზები 392-408)

მანამდე:
```typescript
const handleSelectRandom = async () => {
  if (!currentRoom) return;
  
  try {
    await supabase
      .from("game_rooms")
      .update({ 
        category_id: null, 
        category_name: "შემთხვევითი" 
      })
      .eq("id", currentRoom.id);
    
    toast.success("შემთხვევითი კატეგორია");
  } catch (error) {
    console.error("Error setting random:", error);
  }
};
```

შემდეგ:
```typescript
const handleSelectRandom = async () => {
  if (!currentRoom) return;
  
  try {
    // Clear any existing room_questions from previous trivia selection
    await supabase.from("room_questions").delete().eq("room_id", currentRoom.id);
    
    // Update room with random category and clear user_trivia_id
    await supabase
      .from("game_rooms")
      .update({ 
        category_id: null, 
        category_name: "შემთხვევითი",
        user_trivia_id: null, // Clear any previously selected user trivia
      })
      .eq("id", currentRoom.id);
    
    toast.success("შემთხვევითი კატეგორია");
  } catch (error) {
    console.error("Error setting random:", error);
  }
};
```

---

## რატომ მუშაობს ეს გადაწყვეტა?

| სცენარი | მანამდე | შემდეგ |
|---------|---------|--------|
| ტრივია → ბიბლიოთეკა | `user_trivia_id` რჩება, `room_questions` კონფლიქტი | სუფთა slate |
| ტრივია → შემთხვევითი | იგივე პრობლემა | სუფთა slate |
| ბიბლიოთეკა → ბიბლიოთეკა | მუშაობს (არ იყო პრობლემა) | მუშაობს |
| ბიბლიოთეკა → ტრივია | მუშაობს | მუშაობს |

---

## დამატებითი უპირატესობა

ეს ცვლილება ასევე აფიქსირებს postgres-ის `duplicate key` შეცდომებს, რომლებიც ლოგებში ჩანდა:

```text
duplicate key value violates unique constraint "room_questions_room_id_question_index_key"
```

