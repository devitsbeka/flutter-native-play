

# გასწორება: ბიბლიოთეკის/შემთხვევითი კატეგორიებისთვის Observer-ად არასწორი ჩვენება

## პრობლემა

როდესაც ჰოსტი ირჩევს ბიბლიოთეკის კატეგორიას ან შემთხვევით კატეგორიას (არა თავისი შექმნილი blind trivia-ს 0 plays-ით), მაინც ეჩვენება Observer-ის ეკრანი და ვერ თამაშობს. ეს ხდება მხოლოდ ჰოსტის მოწყობილობაზე.

---

## პრობლემის მიზეზი

`startGame` ფუნქციაში (TVGameContext.tsx):

1. ბიბლიოთეკის კატეგორიებისთვის `firstRoundSuggesterId` სწორად არის `null`
2. მონაცემთა ბაზა სწორად განახლდება: `current_round_suggester_id: null`
3. **პრობლემა**: ლოკალური state-ის განახლება (`setState`) **არ აახლებს** `currentRoundSuggesterId` ველს - ის რჩება წინა თამაშის მონაცემებით

შედეგად, `isSuggester` შემოწმება იყენებს ძველ მონაცემებს და ჰოსტს Observer-ად აჩვენებს.

---

## გადაწყვეტა

`startGame` ფუნქციაში, ლოკალური state-ის განახლებას უნდა დავამატოთ suggester-ის ველები:

```typescript
// სტრიქონები 2527-2532
setState(prev => ({
  ...prev,
  roundNumber: 1,
  totalRounds: totalRoundsCount,
  // დამატება: Suggester-ის ინფორმაციის სინქრონიზაცია
  currentRoundSuggesterId: firstRoundSuggesterId,
  currentRoundSuggesterNickname: firstRoundSuggesterNickname,
  currentRoundSuggesterAvatarUrl: firstRoundSuggesterAvatarUrl,
}));
```

---

## ტექნიკური ცვლილება

### ფაილი: `src/contexts/TVGameContext.tsx`

**ადგილი**: სტრიქონები 2527-2532

**ამჟამინდელი კოდი**:
```typescript
setState(prev => ({
  ...prev,
  roundNumber: 1,
  totalRounds: totalRoundsCount,
}));
```

**ახალი კოდი**:
```typescript
setState(prev => ({
  ...prev,
  roundNumber: 1,
  totalRounds: totalRoundsCount,
  // CRITICAL: Sync suggester state locally to prevent stale isSuggester checks
  currentRoundSuggesterId: firstRoundSuggesterId,
  currentRoundSuggesterNickname: firstRoundSuggesterNickname,
  currentRoundSuggesterAvatarUrl: firstRoundSuggesterAvatarUrl,
}));
```

---

## შედეგი

| სცენარი | მანამდე | შემდეგ |
|---------|---------|--------|
| ბიბლიოთეკის კატეგორია | Observer ეკრანი | მოთამაშე ეკრანი |
| შემთხვევითი კატეგორია | Observer ეკრანი | მოთამაშე ეკრანი |
| ჩემი Trivia (blind, 0 plays) | მოთამაშე ეკრანი | მოთამაშე ეკრანი |
| ჩემი Trivia (non-blind ან plays>0) | Observer ეკრანი | Observer ეკრანი |

---

## შესაცვლელი ფაილები

| ფაილი | ცვლილება |
|-------|----------|
| `src/contexts/TVGameContext.tsx` | setState-ში suggester ველების დამატება |

