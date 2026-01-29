

# გეგმა: Host-Observer პოლისის აუდიტი და გასწორება

## პრობლემის აღწერა

მომხმარებელმა შენიშნა, რომ "შენ იცი პასუხები!" გაფრთხილება ჩნდება მაშინაც კი, როდესაც ბიბლიოთეკიდან აირჩევენ კატეგორიას. ეს არასწორია - ბიბლიოთეკის კატეგორიებზე ჰოსტი ყოველთვის უნდა თამაშობდეს.

## სწორი პოლისი (როგორც უნდა მუშაობდეს)

| ტრივიის ტიპი | პირობა | ჰოსტის სტატუსი |
|-------------|--------|----------------|
| ბიბლიოთეკა | - | ყოველთვის თამაშობს |
| შემთხვევითი | - | ყოველთვის თამაშობს |
| ღია ტრივია | ჰოსტის შექმნილი | გამოტოვებს (Observer) |
| დახურული ტრივია | არასდროს ითამაშა (plays_count = 0) | თამაშობს |
| დახურული ტრივია | უკვე ითამაშა (plays_count > 0) | გამოტოვებს (Observer) |

## კოდბაზის ანალიზი

აუდიტმა აჩვენა, რომ ძირითადი ლოგიკა სწორია, მაგრამ პრობლემა შეიძლება იყოს:

### 1. სტალ Suggester მონაცემები
თუ წინა რაუნდში ჰოსტი იყო observer, და შემდეგ ბიბლიოთეკის კატეგორია აირჩიეს, `currentRoundSuggesterId` შეიძლება არ განულდეს.

### 2. რეალურდროული სინქრონიზაციის პრობლემა
React state-ში `currentRoundSuggesterId` შეიძლება stale იყოს DB-ის მონაცემებთან შედარებით.

---

## შესაცვლელი ფაილები და ცვლილებები

### 1. `src/hooks/useTVSessionQueue.ts`
**პრობლემა**: `addCategoryToQueue` არ ასუფთავებს suggester-ს - ეს სწორია.

**დამატება**: კომენტარი გარკვევისთვის, რომ library categories-ზე suggester არ უნდა დაისეტოს.

### 2. `src/contexts/TVGameContext.tsx`
**პრობლემა**: `startNextRoundFromQueueIfAny`-ში არსებული დაცვა (lines 1040-1045) სწორია, მაგრამ უნდა დავრწმუნდეთ რომ state-იც სწორად განახლდეს.

**ცვლილება**: დავამატოთ explicit logging და defensive null-setting ლოკალურ state-ში.

```typescript
// startNextRoundFromQueueIfAny - around line 1154
setState(prev => ({
  ...prev,
  roundNumber: newRoundNumber,
  // CRITICAL: Sync suggester state locally (DB already updated)
  currentRoundSuggesterId: suggesterUserId,
  currentRoundSuggesterNickname: suggesterNickname,
  currentRoundSuggesterAvatarUrl: suggesterAvatarUrl,
}));
```

### 3. `src/components/team/RoomLobbyV2.tsx`
**პრობლემა**: `handleStartGame` მხოლოდ ამოწმებს `user_trivia_id`-ს, მაგრამ არ ითვალისწინებს ბიბლიოთეკის კატეგორიის case-ს explicit-ად.

**ცვლილება**: გავაძლიეროთ პირობა და დავამატოთ კომენტარი:

```typescript
// handleStartGame - around line 223
const handleStartGame = async () => {
  // CRITICAL: Library categories and random selection should NEVER trigger observer mode
  // Only check for user-owned trivias
  if (currentRoom?.user_trivia_id && user?.id) {
    // ... existing logic for user trivias
  }
  
  // If NOT a user trivia, proceed directly without warning
  // This covers: library categories, random selection
  await proceedWithStartGame(false);
};
```

### 4. `src/pages/TVHostController.tsx`
**პრობლემა**: `isSuggester` ითვლება state-დან, რომელიც შეიძლება stale იყოს.

**ცვლილება**: დავამატოთ defensive check:

```typescript
// line 76 - enhance with source type awareness
const isSuggester = useMemo(() => {
  // Never show observer UI for library categories
  // The suggester should only be set for user trivias
  return myPlayerId && currentRoundSuggesterId && myPlayerId === currentRoundSuggesterId;
}, [myPlayerId, currentRoundSuggesterId]);
```

### 5. Realtime Sync გაუმჯობესება
**პრობლემა**: Realtime subscription-ში `currentRoundSuggesterId` უნდა პირდაპირ მიიღოს DB-დან.

**ცვლილება**: `TVGameContext.tsx`-ში realtime handler-ში:

```typescript
// Existing realtime handler - ensure explicit null handling
currentRoundSuggesterId: 'current_round_suggester_id' in (newData as any) 
  ? (newData as any).current_round_suggester_id  // null or valid ID
  : prev.currentRoundSuggesterId,
```

---

## ტექნიკური დეტალები

### სწორი ლოგიკის ნაკადი

```text
┌─────────────────────────────────────────────────────────────┐
│                    TRIVIA SELECTION                          │
├──────────────────┬──────────────────────────────────────────┤
│ Library/Random   │ → suggester = null → Host PLAYS          │
├──────────────────┼──────────────────────────────────────────┤
│ ღია (Open)       │ → suggester = owner → Owner OBSERVES     │
├──────────────────┼──────────────────────────────────────────┤
│ დახურული (Blind) │                                          │
│  plays_count=0   │ → suggester = null → Owner PLAYS         │
│  plays_count>0   │ → suggester = owner → Owner OBSERVES     │
└──────────────────┴──────────────────────────────────────────┘
```

### შემოწმების ადგილები

1. **Queue Item Creation** - `addCategoryToQueue`, `addToQueue`
2. **Game Start** - `startGame`, `finalizePollAndStartGame`
3. **Next Round** - `startNextRoundFromQueueIfAny`
4. **UI Display** - `isSuggester` calculation in TVHostController

---

## იმპლემენტაციის თანმიმდევრობა

1. **TVGameContext.tsx** - დავამატოთ explicit state sync `startNextRoundFromQueueIfAny`-ში
2. **TVHostController.tsx** - defensive logging დავამატოთ
3. **RoomLobbyV2.tsx** - კომენტარები გარკვევისთვის
4. **useTVSessionQueue.ts** - კომენტარები

---

## დებაგ ლოგინგი

ყველა ცვლილებას თან დაყვება console.log რომ debug-ში დაგვეხმაროს:

```typescript
console.log('[HostObserver] Source type check:', {
  isLibraryCategory,
  suggesterId: suggesterUserId?.slice(0, 8) || 'null',
  willObserve: !!suggesterUserId && suggesterUserId === myPlayerId,
});
```

---

## ტესტირების სცენარები

1. ბიბლიოთეკიდან კატეგორიის არჩევა → ჰოსტი თამაშობს ✓
2. შემთხვევითი კატეგორია → ჰოსტი თამაშობს ✓  
3. ჰოსტის ღია ტრივია → ჰოსტი აკვირდება ✓
4. ჰოსტის დახურული ტრივია (არ ითამაშა) → ჰოსტი თამაშობს ✓
5. ჰოსტის დახურული ტრივია (უკვე ითამაშა) → ჰოსტი აკვირდება ✓
6. სხვისი ტრივია → ჰოსტი თამაშობს ✓

