

# პრობლემა: განსხვავებული აიქონები ერთ რაუნდში

## აღმოჩენა

თქვენ და სხვა მოთამაშე ერთსა და იმავე კითხვაზე **განსხვავებულ აიქონებს** ხედავთ. ეს ხდება იმიტომ, რომ:

1. **უმეტესობა კითხვებს არ აქვს `icon_slug` შენახული ბაზაში**
2. როცა `icon_slug` არ არსებობს, `DynamicIcon` კომპონენტი იყენებს **კლიენტ-სპეციფიკურ fallback-ს**
3. ეს fallback (`getRandomIconForCategory`) ირჩევს აიქონს კატეგორიიდან `seed`-ის გამოყენებით
4. **პრობლემა**: თითოეულ კლიენტზე აიქონების ბიბლიოთეკა შეიძლება სხვადასხვა თანმიმდევრობით ჩაიტვირთოს, რაც განსხვავებულ შედეგს იძლევა

## ტექნიკური დეტალები

```text
მომხმარებელი A:              მომხმარებელი B:
iconIndex = [🎮, 🎬, 🎭]     iconIndex = [🎬, 🎭, 🎮]
seed = 5                      seed = 5
5 % 3 = 2 → 🎭               5 % 3 = 2 → 🎮  ← განსხვავებული!
```

`DynamicIcon.tsx` ხაზი 109:
```typescript
const fallbackUrl = getRandomIconForCategory(categoryId || 'general', stableSeed);
```

`useIconLibrary.ts` ხაზი 554-555:
```typescript
const index = Math.abs(seed) % matchingIcons.length;
return getIconUrl(matchingIcons[index].file_name);
```

---

## გადაწყვეტა

**აიქონი უნდა გენერირდეს სერვერზე და შეინახოს `room_questions.icon_slug`-ში** - არა კლიენტზე.

### მიდგომა 1: სერვერ-საიდ აიქონის გენერაცია (რეკომენდებული)

თამაშის დაწყებისას, ჰოსტის კლიენტი:
1. თითოეული კითხვისთვის გამოიანგარიშოს აიქონის slug
2. შეინახოს `room_questions.icon_slug`-ში
3. ყველა მოთამაშე წაიკითხავს ერთსა და იმავე slug-ს

**ცვლილებები:**

| ფაილი | ცვლილება |
|-------|----------|
| `MultiplayerContextV2.tsx` | თამაშის დაწყებისას - თუ კითხვას არ აქვს `iconSlug`, დავაგენერიროთ და შევინახოთ |
| `useIconLibrary.ts` | ახალი ფუნქცია `getStableIconSlugForCategory(categoryId, questionText)` - რომელიც დაბრუნებს იგივე slug-ს ერთი და იგივე input-ისთვის |

### მიდგომა 2: Deterministic Hash (მარტივი fix)

შევცვალოთ `getRandomIconForCategory` რომ იყენებდეს **slug-ების sorted array**-ს და **კითხვის ტექსტის hash**-ს:

```typescript
// ახლანდელი (არასტაბილური):
const index = Math.abs(seed) % matchingIcons.length;

// ახალი (სტაბილური):
const sortedIcons = [...matchingIcons].sort((a, b) => a.slug.localeCompare(b.slug));
const index = Math.abs(seed) % sortedIcons.length;
```

**უპირატესობა**: მინიმალური ცვლილება, იგივე array თანმიმდევრობა ყველა კლიენტზე.

---

## რეკომენდაცია: მიდგომა 2 (Deterministic Hash)

1. **სწრაფი fix**: `useIconLibrary.ts`-ში დავახარისხოთ აიქონები სტაბილური თანმიმდევრობით
2. **Seed-ის გაუმჯობესება**: seed-ისთვის გამოვიყენოთ კითხვის ტექსტის hash (არა მხოლოდ questionId)

### შესაცვლელი ფაილები:

| ფაილი | ცვლილება |
|-------|----------|
| `src/hooks/useIconLibrary.ts` | `getRandomIconForCategory` - დავახარისხოთ icons ალფავიტურად seed-ის გამოყენებამდე |
| `src/components/shared/DynamicIcon.tsx` | stableSeed-ისთვის გამოვიყენოთ questionId + categoryId combo hash |

### კოდის ცვლილება:

**useIconLibrary.ts - getRandomIconForCategory:**
```typescript
const getRandomIconForCategory = useCallback((categoryId: string, seed: number = 0): string | null => {
  if (iconIndex.length === 0) return null;
  
  const categoryKey = categoryId.toLowerCase();
  const categoryKeywords = CATEGORY_ICON_MAP[categoryKey] || [];
  
  if (categoryKeywords.length > 0) {
    const matchingIcons = iconIndex.filter(icon => {
      const slugMatch = categoryKeywords.some(kw => icon.slug.includes(kw));
      const tagMatch = icon.tags.some(tag => 
        categoryKeywords.some(kw => tag.toLowerCase().includes(kw))
      );
      return slugMatch || tagMatch;
    });
    
    if (matchingIcons.length > 0) {
      // SORT ALPHABETICALLY for consistent order across all clients
      const sortedIcons = [...matchingIcons].sort((a, b) => 
        a.slug.localeCompare(b.slug)
      );
      const index = Math.abs(seed) % sortedIcons.length;
      return getIconUrl(sortedIcons[index].file_name);
    }
  }
  
  // Fallback: ALSO sort before picking
  const sortedAll = [...iconIndex].sort((a, b) => a.slug.localeCompare(b.slug));
  const index = Math.abs((seed * 137) % sortedAll.length);
  return getIconUrl(sortedAll[index].file_name);
}, [iconIndex]);
```

---

## შედეგი

| სცენარი | მანამდე | შემდეგ |
|---------|---------|--------|
| კითხვას აქვს icon_slug | ✅ იგივე აიქონი | ✅ იგივე აიქონი |
| კითხვას არ აქვს icon_slug | ❌ სხვადასხვა აიქონი | ✅ იგივე აიქონი |

