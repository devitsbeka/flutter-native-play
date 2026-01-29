
# გეგმა: ნათამაშები ტრივიის ხელახლა არჩევის აღკვეთა

## პრობლემის აღწერა

მომხმარებელი ჩივის რომ:
1. თამაშის შემდეგ "კატეგორიის დამატება"-ზე ჯერ კიდევ ჩანს ძველი კატეგორია
2. შეუძლიათ იგივე ტრივიის ხელახლა არჩევა - რაც არასწორია რადგან უკვე იციან პასუხები

**მთავარი პრინციპი:** "ჩვენ გვინდა ახალი რაუნდები ახალი კითხვებით, არა იგივე კითხვები რაც ახლახან ვუპასუხეთ"

---

## გადაწყვეტა

### 1. ნათამაშები ტრივიების ფილტრაცია პიკერში

**ფაილი:** `src/components/team/CategoryPickerModal.tsx`

ჩემი ტრივიების სიაში არ ჩანდეს ის ტრივია, რომელიც ახლახანს ითამაშეს (room-ში არსებული `user_trivia_id`).

```typescript
// CategoryPickerModal.tsx - props-ში დავამატოთ:
interface CategoryPickerModalProps {
  // ... არსებული props
  excludeTriviaId?: string | null; // ტრივია რომელიც ახლახანს ითამაშეს
}

// filteredTrivias-ში დავამატოთ ფილტრი:
const filteredTrivias = useMemo(() => {
  let result = myTrivias;
  
  // Exclude the trivia that was just played
  if (excludeTriviaId) {
    result = result.filter(t => t.id !== excludeTriviaId);
  }
  
  if (!search.trim()) return result;
  const searchLower = search.toLowerCase();
  return result.filter((t) =>
    t.title.toLowerCase().includes(searchLower)
  );
}, [myTrivias, search, excludeTriviaId]);
```

### 2. RoomLobbyV2-დან გადაცემა

**ფაილი:** `src/components/team/RoomLobbyV2.tsx`

```typescript
<CategoryPickerModal
  isOpen={showCategoryPicker}
  onClose={() => setShowCategoryPicker(false)}
  onSelectCategory={handleSelectCategory}
  onSelectRandom={handleSelectRandom}
  onSelectTrivia={handleSelectTrivia}
  onAddToQueue={handleAddToQueue}
  showQueueOption={true}
  roomGradient={roomGradient}
  excludeTriviaId={currentRoom?.user_trivia_id} // ახლახანს ნათამაშები
/>
```

---

## ალტერნატიული ვარიანტი: უკვე ნათამაშები კატეგორიების მთლიანი ისტორია

თუ გვინდა მთელი სესიის განმავლობაში ნათამაშები ტრივიების გამორიცხვა:

### Room-ის ცხრილში ახალი სვეტი

```sql
ALTER TABLE game_rooms ADD COLUMN played_trivia_ids UUID[] DEFAULT '{}';
```

### ლოგიკა

თამაშის დასრულებისას დავამატოთ `user_trivia_id` მასივში:

```typescript
// continueInRoom-ში:
if (state.currentRoom.user_trivia_id) {
  await supabase
    .from("game_rooms")
    .update({ 
      played_trivia_ids: [...(state.currentRoom.played_trivia_ids || []), state.currentRoom.user_trivia_id]
    })
    .eq("id", roomId);
}
```

---

## რეკომენდებული მიდგომა: უბრალო გადაწყვეტა

პირველ ეტაპზე უფრო მარტივი გზით:
- **მხოლოდ ბოლო ნათამაშები ტრივიის ფილტრაცია** (`excludeTriviaId`)
- მომავალში, თუ საჭირო იქნება, შეგვიძლია `played_trivia_ids` მასივის დამატება

---

## შესაცვლელი ფაილები

| ფაილი | ცვლილება |
|-------|----------|
| `src/components/team/CategoryPickerModal.tsx` | `excludeTriviaId` prop-ის დამატება და ფილტრაცია |
| `src/components/team/RoomLobbyV2.tsx` | `excludeTriviaId={currentRoom?.user_trivia_id}` გადაცემა |

---

## მოსალოდნელი შედეგი

| სცენარი | მანამდე | შემდეგ |
|---------|---------|--------|
| ნათამაშები ტრივია სიაში | ✓ ჩანს | ✗ არ ჩანს |
| სხვა ტრივიები | ✓ ჩანს | ✓ ჩანს |
| ბიბლიოთეკის კატეგორიები | ✓ ჩანს | ✓ ჩანს |

---

## ბონუსი: ვიზუალური მინიშნება

ალტერნატიულად, შეგვიძლია ტრივია აჩვენოთ მაგრამ disabled სტილით "ახლახანს ითამაშე" ბეჯით:

```typescript
const wasJustPlayed = trivia.id === excludeTriviaId;

<motion.button
  disabled={wasJustPlayed}
  className={`... ${wasJustPlayed ? 'opacity-50 cursor-not-allowed' : ''}`}
>
  {wasJustPlayed && (
    <span className="absolute top-2 right-2 text-xs bg-orange-500/80 px-2 py-0.5 rounded-full">
      ახლახანს ითამაშე
    </span>
  )}
</motion.button>
```

ეს უკეთესი UX-ია რადგან მომხმარებელი ხედავს **რატომ** ვერ ირჩევს, ვიდრე უბრალოდ გაქრება სიიდან.
