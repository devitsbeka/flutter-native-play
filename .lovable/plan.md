
# გეგმა: ტრივიის აიქონების თანმიმდევრულობის გაუმჯობესება

## პრობლემა

როცა მომხმარებლის მიერ შექმნილ ტრივიაში ზოგიერთ კითხვას არ აქვს `icon_slug` მინიჭებული:

1. **თამაშისას** - სხვადასხვა მოთამაშე ხედავს სხვადასხვა აიქონს (fallback random icons)
2. **ტრივიის არჩევისას** - ჰოსტმა არ იცის რომელ ტრივიას აქვს არასრული აიქონები

## გადაწყვეტა

### ნაწილი 1: თამაშის ეკრანზე - აიქონის დამალვა თუ არ არის მინიჭებული

**პრინციპი**: თუ კითხვას არ აქვს პირდაპირ `iconSlug` მინიჭებული, **არ** ვაჩვენოთ აიქონი (უკეთესია რომ არ იყოს ვიდრე სხვადასხვა მოთამაშეს სხვადასხვა ვაჩვენოთ).

**შესაცვლელი ფაილები:**

| ფაილი | ცვლილება |
|-------|----------|
| `QuizGameScreenProd.tsx` | თუ `iconSlug` null-ია, არ გადავცეთ `categoryId` (რაც fallback-ს იწვევს) |
| `MultiplayerGameScreenV2.tsx` | იგივე ლოგიკა |
| `ControllerQuestion.tsx` | იგივე ლოგიკა (თუ აქვს აიქონის ჩვენება) |

**ლოგიკის ცვლილება:**

```text
მანამდე:
<DynamicIcon 
  slug={currentQuestion.iconSlug}
  categoryId={currentQuestion.categoryId}  ← fallback-ს იწვევს
  hideIfEmpty={true}
/>

შემდეგ:
<DynamicIcon 
  slug={currentQuestion.iconSlug || undefined}
  categoryId={currentQuestion.iconSlug ? currentQuestion.categoryId : undefined}  ← არ აძლევს fallback-ის საშუალებას
  hideIfEmpty={true}
/>
```

### ნაწილი 2: ტრივიის სიაში - გაფრთხილების ინდიკატორი

**პრინციპი**: როცა ჰოსტი ირჩევს ტრივიას, ვაჩვენოთ რამდენ კითხვას აკლია აიქონი.

**ვიზუალური დიზაინი:**

```text
┌──────────────────────────────────────┐
│ [cover]  ოფისი: ტრივია              │
│          5 კითხვა • 3 თამაში         │
│          ⚠️ 5 კითხვას აკლია აიქონი   │  ← ახალი ინდიკატორი
└──────────────────────────────────────┘
```

**შესაცვლელი ფაილები:**

| ფაილი | ცვლილება |
|-------|----------|
| `CategoryPickerModal.tsx` | კითხვების სიაში დაამატე `questions` field-ის წაკითხვა და missing icons count |
| `MyTriviasPickerModal.tsx` | კითხვების სიაში დაამატე `questions` field-ის წაკითხვა და missing icons count |

**ახალი Trivia ინტერფეისი:**

```typescript
interface Trivia {
  id: string;
  title: string;
  cover_image: string | null;
  plays_count: number;
  likes_count: number;
  is_public: boolean;
  is_blind: boolean;
  subject?: string;
  questions: { icon_slug: string | null }[] | null;  // ← ახალი
}
```

**Missing Icon Count ლოგიკა:**

```typescript
const missingIconCount = Array.isArray(trivia.questions)
  ? trivia.questions.filter(q => !q.icon_slug).length
  : 0;
```

**UI კომპონენტი:**

```typescript
{missingIconCount > 0 && (
  <span className="text-xs text-amber-400 flex items-center gap-1 mt-0.5">
    <AlertTriangle className="w-3 h-3" />
    {missingIconCount} კითხვას აკლია აიქონი
  </span>
)}
```

---

## დეტალური ცვლილებები

### 1. CategoryPickerModal.tsx

**ხაზი ~95-107** - დაამატე `questions` select-ში (უკვე არის, მაგრამ interface-ში არ არის აღწერილი)

Query უკვე აქვს `questions` field:
```typescript
.select("id, title, cover_image, cover_gradient, plays_count, questions, is_blind, user_id")
```

**ხაზი ~388-441** - დაამატე missing icons warning:

```typescript
const missingIconCount = Array.isArray(trivia.questions)
  ? trivia.questions.filter((q: any) => !q.icon_slug).length
  : 0;

// UI-ში:
{missingIconCount > 0 && (
  <span className="text-xs text-amber-400 flex items-center gap-1">
    <AlertTriangle className="w-3 h-3" />
    {missingIconCount} კითხვას აკლია აიქონი
  </span>
)}
```

### 2. MyTriviasPickerModal.tsx

**ხაზი ~61-78** - დაამატე `questions` select-ში:

```typescript
.select("id, title, cover_image, plays_count, likes_count, is_public, is_blind, subject, questions")
```

**ხაზი ~220-274** - დაამატე missing icons warning

### 3. QuizGameScreenProd.tsx

**ხაზი ~366-374** - შეცვალე DynamicIcon props:

```typescript
<DynamicIcon 
  slug={currentQuestion.questionIconSlug || aiData?.slugs?.[0] || currentQuestion.categoryIconSlug}
  // Only use categoryId for fallback if we have an explicit icon slug
  categoryId={(currentQuestion.questionIconSlug || aiData?.slugs?.[0]) ? currentQuestion.categoryId : undefined}
  questionId={currentQuestion.id}
  size={opponent ? 80 : 64}
  className="drop-shadow-lg"
  hideIfEmpty={true}
/>
```

### 4. MultiplayerGameScreenV2.tsx

**ხაზი ~300-311** - შეცვალე DynamicIcon props:

```typescript
<DynamicIcon 
  slug={currentQuestion.iconSlug || undefined}
  // Only use categoryId if we have an explicit iconSlug
  categoryId={currentQuestion.iconSlug ? currentRoom?.category_id : undefined}
  questionId={currentQuestion.id}
  size={112}
  className="drop-shadow-lg"
  hideIfEmpty={true}
/>
```

---

## შედეგი

| სცენარი | მანამდე | შემდეგ |
|---------|---------|--------|
| კითხვას აქვს icon_slug | ✅ აიქონი ჩანს | ✅ აიქონი ჩანს |
| კითხვას არ აქვს icon_slug | ❌ სხვადასხვა random აიქონი | ✅ აიქონი არ ჩანს |
| ტრივიის არჩევისას | ❓ ჰოსტმა არ იცის | ✅ გაფრთხილება ჩანს |

---

## ტექნიკური შეჯამება

| ფაილი | ცვლილების ტიპი |
|-------|----------------|
| `QuizGameScreenProd.tsx` | DynamicIcon categoryId logic |
| `MultiplayerGameScreenV2.tsx` | DynamicIcon categoryId logic |
| `CategoryPickerModal.tsx` | Warning indicator + import AlertTriangle |
| `MyTriviasPickerModal.tsx` | Query update + warning indicator + import AlertTriangle |
