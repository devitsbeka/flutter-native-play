
# გეგმა: Lobby ღილაკის ლოგიკის გასწორება

## პრობლემა

ამჟამად ღილაკის ლოგიკა ასეთია (ხაზი 885-910):

```typescript
const hasContent = queue.length > 0 || currentRoom.category_id || currentRoom.user_trivia_id;
const showPickerButton = justReturnedFromResults && !hasContent;
```

ეს ნიშნავს:
- "გააგრძელე თამაში" ჩანს მხოლოდ თუ `justReturnedFromResults === true` **და** კატეგორია არ არის არჩეული
- სხვა შემთხვევაში ყოველთვის "თამაშის დაწყება" ჩანს - მაშინაც კი, როცა არაფერია არჩეული!

**მომხმარებლის მოთხოვნა:**
| სცენარი | ღილაკის ტექსტი | მოქმედება |
|---------|----------------|-----------|
| არაფერია არჩეული | "გააგრძელე" | იხსნება category picker |
| რაუნდი არჩეულია | "თამაშის დაწყება" | იწყება თამაში |

---

## გადაწყვეტა

`justReturnedFromResults`-ის მოხსნა და ღილაკის ლოგიკის გამარტივება - მხოლოდ `hasContent`-ის მიხედვით:

### ფაილი: `src/components/team/RoomLobbyV2.tsx`

**ხაზები 885-910:** ახალი ლოგიკა

```diff
  {isHost ? (
-   // Show "Continue Playing" only if returned from results AND no content selected
-   // Content is selected if: queue has items OR room has category/trivia selected
    (() => {
+     // Content is selected if: queue has items OR room has category/trivia selected
      const hasContent = queue.length > 0 || currentRoom.category_id || currentRoom.user_trivia_id;
-     const showPickerButton = justReturnedFromResults && !hasContent;
      
-     return showPickerButton ? (
+     // No content selected → show picker button with "გააგრძელე"
+     // Content selected → show start button with "თამაშის დაწყება"
+     return !hasContent ? (
        <ChunkyButton
          variant="white"
          size="xl"
          className="w-full"
          onClick={() => setShowCategoryPicker(true)}
          icon={<Plus className="w-5 h-5" />}
        >
-         გააგრძელე თამაში
+         გააგრძელე
        </ChunkyButton>
      ) : (
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
      );
    })()
  ) : (
```

---

## ლოგიკის ნაკადი

```text
┌─────────────────────────────────────┐
│   Host-ი lobby-შია                 │
└────────────────┬────────────────────┘
                 ▼
        hasContent?
       (queue || category_id 
        || user_trivia_id)
                 │
      ┌──────────┴──────────┐
      │                     │
   false                  true
      │                     │
      ▼                     ▼
 "გააგრძელე"          "თამაშის დაწყება"
 → opens picker       → starts game
```

---

## შედეგი

| მდგომარეობა | მანამდე | შემდეგ |
|-------------|---------|--------|
| არაფერი არჩეული + NOT justReturned | "თამაშის დაწყება" (შეცდომა!) | "გააგრძელე" ✓ |
| არაფერი არჩეული + justReturned | "გააგრძელე თამაში" | "გააგრძელე" ✓ |
| რაუნდი არჩეული | "თამაშის დაწყება" | "თამაშის დაწყება" ✓ |

---

## ტექნიკური დეტალები

**შესაცვლელი ფაილი:** `src/components/team/RoomLobbyV2.tsx`

**ცვლილებები:**
- ხაზი 887: `showPickerButton` ცვლადის მოხსნა
- ხაზი 889: კონდიცია `showPickerButton` → `!hasContent`
- ხაზი 897: ტექსტი "გააგრძელე თამაში" → "გააგრძელე"
