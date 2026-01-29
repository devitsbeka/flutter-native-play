
# გეგმა: ლობის ღილაკის ლოგიკის გამოსწორება

## პრობლემა

1. **ახლა**: თუ კატეგორია არ არის არჩეული, ჩანს "გააგრძელე" ღილაკი
2. **საჭირო**: ყოველთვის უნდა ჩანდეს "თამაშის დაწყება" ღილაკი

## ახალი ლოგიკა

```text
"თამაშის დაწყება" ღილაკზე დაჭერა:
├── თუ კონტენტი არჩეულია (queue > 0 ან category ან trivia)
│   └── დაიწყოს თამაში
└── თუ კონტენტი არ არის არჩეული
    └── გაიხსნას CategoryPicker 
        └── როცა მომხმარებელი აირჩევს → ავტომატურად დაიწყოს თამაში
```

## ვიზუალური ცვლილება

**მანამდე:**
| სიტუაცია | ღილაკი |
|----------|--------|
| კატეგორია არ არის | გააგრძელე (პიკერი) |
| კატეგორია არის | თამაშის დაწყება |

**შემდეგ:**
| სიტუაცია | ღილაკი | მოქმედება |
|----------|--------|-----------|
| ყველა შემთხვევაში | თამაშის დაწყება | თუ არ არის კატეგორია → პიკერი → თამაშის დაწყება |

---

## ტექნიკური ცვლილებები

### 1. ფაილი: `src/components/team/RoomLobbyV2.tsx`

#### ახალი state - "start after pick" flag
```typescript
const [startAfterPick, setStartAfterPick] = useState(false);
```

#### ღილაკის ლოგიკა (ხაზი ~882-911)

**მანამდე:**
```typescript
return !hasContent ? (
  <ChunkyButton onClick={() => setShowCategoryPicker(true)}>
    გააგრძელე
  </ChunkyButton>
) : (
  <ChunkyButton onClick={handleStartGame}>
    თამაშის დაწყება
  </ChunkyButton>
);
```

**შემდეგ:**
```typescript
// ყოველთვის "თამაშის დაწყება" ღილაკი
const handleStartOrPick = () => {
  const hasContent = queue.length > 0 || currentRoom.category_id || currentRoom.user_trivia_id;
  
  if (hasContent) {
    // კონტენტი არის - დაიწყოს თამაში
    handleStartGame();
  } else {
    // კონტენტი არ არის - გახსენი პიკერი და დაიმახსოვრე რომ შემდეგ დაიწყოს
    setStartAfterPick(true);
    setShowCategoryPicker(true);
  }
};

return (
  <ChunkyButton
    onClick={handleStartOrPick}
    disabled={!canStartGame || isStarting || loading}
    icon={<Play className="w-5 h-5" />}
  >
    {isStarting ? "იწყება..." : canStartGame ? "თამაშის დაწყება" : `ველოდებით ${min - count} მოთამაშეს`}
  </ChunkyButton>
);
```

#### კატეგორიის არჩევის handler-ები

**handleSelectCategory-ში:**
```typescript
const handleSelectCategory = async (category) => {
  // არსებული ლოგიკა...
  
  // თუ startAfterPick = true, დახურე პიკერი და დაიწყე თამაში
  if (startAfterPick) {
    setStartAfterPick(false);
    setShowCategoryPicker(false);
    setTimeout(() => handleStartGame(), 100); // დაელოდე state-ის განახლებას
  }
};
```

იგივე ლოგიკა დაემატება:
- `handleSelectRandom`
- `handleSelectTrivia`

---

## ალტერნატიული მიდგომა

CategoryPickerModal-ს შეიძლება გადაეცეს `onSelectAndStart` callback, რომელიც:
1. აირჩევს კატეგორიას/ტრივიას
2. ავტომატურად იწყებს თამაშს

ეს უფრო სუფთა იქნება:

```typescript
<CategoryPickerModal
  isOpen={showCategoryPicker}
  onClose={() => {
    setShowCategoryPicker(false);
    setStartAfterPick(false);
  }}
  // ... სხვა props
  autoStartAfterSelect={startAfterPick} // ← ახალი prop
  onAutoStart={() => {
    setStartAfterPick(false);
    handleStartGame();
  }}
/>
```

---

## საბოლოო სტრუქტურა

| ფაილი | ცვლილება |
|-------|----------|
| `RoomLobbyV2.tsx` | - ახალი `startAfterPick` state<br>- ერთიანი `handleStartOrPick` ფუნქცია<br>- ღილაკი ყოველთვის "თამაშის დაწყება"<br>- კატეგორიის არჩევის შემდეგ ავტო-დაწყება |

---

## მოსალოდნელი შედეგი

**მომხმარებლის flow:**

1. ✅ თამაშის შემდეგ ბრუნდება ლობიში
2. ✅ ხედავს "თამაშის დაწყება" ღილაკს (არა "გააგრძელე")
3. ✅ დაჭერისას იხსნება კატეგორიის პიკერი
4. ✅ კატეგორიის არჩევის შემდეგ ავტომატურად იწყება თამაში
