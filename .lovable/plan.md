
# გეგმა: კატეგორიის გვერდის ჩატვირთვის დაყოვნების გადაჭრა

## პრობლემის აღწერა

როდესაც მომხმარებელი Discover-ზე კატეგორიას აჭერს, ხედავს თეთრ ეკრანს skeleton-ებით დაახლოებით 1 წამის განმავლობაში. ეს ხდება იმიტომ, რომ:

1. **CategoryPage არის lazy-loaded** - კოდი იტვირთება მხოლოდ ნავიგაციის დროს
2. **არ ხდება preloading** - განსხვავებით სხვა გვერდებისგან (Leaderboards, PowerUps), CategoryPage არ იტვირთება წინასწარ
3. **PageSkeleton ჩანს** - Suspense-ის fallback არის თეთრი ფონით, რაც იწვევს visual flash-ს

## გადაწყვეტა

### ნაწილი 1: CategoryPage-ის წინასწარი ჩატვირთვა Discover-ზე

Discover გვერდის ჩატვირთვისას დავიწყოთ CategoryPage-ის preloading:

```typescript
// src/pages/Discover.tsx - დავამატოთ useEffect
useEffect(() => {
  // Eagerly preload CategoryPage chunk when Discover mounts
  const timer = setTimeout(() => {
    import("@/pages/CategoryPage");
  }, 500);
  return () => clearTimeout(timer);
}, []);
```

### ნაწილი 2: Category Card-ზე hover/touch-ზე preload

AirbnbCategoryCard-ს დავამატოთ onPointerEnter/onTouchStart:

```typescript
// src/components/discover/AirbnbCategoryCard.tsx
<motion.button
  onClick={onClick}
  onPointerEnter={() => {
    import("@/pages/CategoryPage");
  }}
  // ...
>
```

### ნაწილი 3: PageSkeleton-ის გაუმჯობესება

შევცვალოთ PageSkeleton რომ უფრო invisible იყოს:

```typescript
// src/components/PageSkeleton.tsx
export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-transparent" />
  );
}
```

ან უფრო დახვეწილი: გადავიტანოთ background-ი main app background-ზე რომ არ ჩანდეს flash.

---

## ტექნიკური დეტალები

### შესაცვლელი ფაილები

| ფაილი | ცვლილება |
|-------|----------|
| `src/pages/Discover.tsx` | useEffect-ით CategoryPage preloading |
| `src/components/discover/AirbnbCategoryCard.tsx` | onPointerEnter-ზე preload |
| `src/components/PageSkeleton.tsx` | transparent ან minimal skeleton |

### Discover.tsx - დამატებული კოდი

```typescript
// Import-ების შემდეგ
import { useState, useMemo, useEffect } from "react";

// Component-ის შიგნით, სხვა useEffect-ების გვერდით
useEffect(() => {
  // Preload CategoryPage when user lands on Discover
  // This ensures the chunk is ready before they click any category
  const timer = setTimeout(() => {
    import("@/pages/CategoryPage");
  }, 500);
  return () => clearTimeout(timer);
}, []);
```

### AirbnbCategoryCard.tsx - დამატებული კოდი

```typescript
// motion.button-ს დავამატოთ
<motion.button
  onClick={onClick}
  onPointerEnter={() => {
    // Start preloading CategoryPage on hover
    import("@/pages/CategoryPage");
  }}
  whileHover={{ scale: 1.015 }}
  // ... დანარჩენი props
>
```

### PageSkeleton.tsx - შეცვლილი კოდი

```typescript
export function PageSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent">
      {/* Minimal loading indicator instead of jarring skeleton */}
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );
}
```

---

## მოსალოდნელი შედეგი

| მანამდე | შემდეგ |
|---------|--------|
| თეთრი skeleton ეკრანი ~1წმ | უხილავი ან მინიმალური გადასვლა |
| CategoryPage იტვირთება click-ზე | CategoryPage უკვე ჩატვირთული იქნება |
| Jarring visual flash | Smooth transition |

---

## ალტერნატივა: CategoryPage-ის eager loading

თუ გვსურს სრულად თავიდან ავიცილოთ ეს პრობლემა, შეგვიძლია CategoryPage App.tsx-ში eager-ად ჩავტვირთოთ:

```typescript
// App.tsx - ამოვიღოთ lazy-დან
import CategoryPage from "./pages/CategoryPage"; // Eager load
```

მაგრამ ეს გაზრდის initial bundle size-ს. უკეთესი მიდგომაა preloading-ის გამოყენება.
