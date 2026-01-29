

# გეგმა: სურათიანი კითხვების გამარტივება და პასუხების სივრცის გაზრდა

## რას შევცვლით

1. **სურათიანი კითხვები** - კითხვის ტექსტის დამალვა, მხოლოდ სურათი და პასუხები
2. **ყველა კითხვის ტიპი** - პასუხებს შორის უფრო მეტი სივრცე

---

## ცვლილება 1: QuizQuestionCard - კითხვის ტექსტის დამალვა სურათისთვის

**ფაილი:** `src/components/ui/quiz-question-card.tsx`

ახალი prop დაემატება `hideQuestionText` რომელიც ავტომატურად `true` იქნება როცა სურათია:

```diff
interface QuizQuestionCardProps {
  ...
+ /**
+  * Hide question text - useful for image-only trivia where image speaks for itself
+  */
+ hideQuestionText?: boolean;
}
```

კითხვის ტექსტის სექცია:
```diff
- {/* Question Text */}
- <div className={cn(...)}>
-   {isLoading ? (...) : (
-     <p className="...">{questionText}</p>
-   )}
- </div>
+ {/* Question Text - hide for image-only mode */}
+ {!hideQuestionText && (
+   <div className={cn(...)}>
+     {isLoading ? (...) : (
+       <p className="...">{questionText}</p>
+     )}
+   </div>
+ )}
```

---

## ცვლილება 2: QuizGameScreenProd - სურათისთვის hideQuestionText + gap გაზრდა

**ფაილი:** `src/components/game/QuizGameScreenProd.tsx`

სურათიანი კითხვისთვის:
```diff
<QuizQuestionCard
  questionText={currentQuestion.question}
  imageUrl={currentQuestion.imageUrl}
+ hideQuestionText={!!currentQuestion.imageUrl}
  ...
/>
```

პასუხებს შორის სივრცე (ხაზი 436):
```diff
- <div className="flex-1 px-4 mt-0 flex flex-col gap-3 [@media(max-height:700px)]:gap-2 overflow-visible min-h-0 pb-2">
+ <div className="flex-1 px-4 mt-0 flex flex-col gap-4 [@media(max-height:700px)]:gap-2.5 overflow-visible min-h-0 pb-2">
```

---

## ცვლილება 3: MultiplayerGameScreenV2 - იგივე ლოგიკა

**ფაილი:** `src/components/team/MultiplayerGameScreenV2.tsx`

სურათისთვის hideQuestionText:
```diff
<QuizQuestionCard
  questionText={currentQuestion.question}
  imageUrl={currentQuestion.imageUrl}
+ hideQuestionText={!!currentQuestion.imageUrl}
  ...
/>
```

პასუხებს შორის სივრცე (ხაზი 364):
```diff
- <div className="flex-1 px-4 flex flex-col gap-1.5 overflow-hidden min-h-0">
+ <div className="flex-1 px-4 flex flex-col gap-3 [@media(max-height:700px)]:gap-2 overflow-hidden min-h-0">
```

---

## ვიზუალური შედარება

### სურათიანი კითხვა

| მანამდე | შემდეგ |
|---------|--------|
| სურათი | სურათი |
| "ვინ/რა არის ეს?" | ~~(წაშლილი)~~ |
| პროგრეს ბარი | პროგრეს ბარი |
| პასუხები (gap-3) | პასუხები (gap-4) |

### კლასიკური კითხვა

| მანამდე | შემდეგ |
|---------|--------|
| აიკონი | აიკონი |
| კითხვის ტექსტი | კითხვის ტექსტი |
| პასუხები (gap-1.5) | პასუხები (gap-3) |

---

## ტექნიკური დეტალები

| ფაილი | ცვლილება |
|-------|----------|
| `quiz-question-card.tsx` | `hideQuestionText` prop + conditional rendering |
| `QuizGameScreenProd.tsx` | `hideQuestionText` for images + gap `3→4` |
| `MultiplayerGameScreenV2.tsx` | `hideQuestionText` for images + gap `1.5→3` |

