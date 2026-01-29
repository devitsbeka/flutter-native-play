

# გეგმა: Search Bar Border/Stroke Clipping Fix

## პრობლემა

სკრინშოტზე ჩანს, რომ search input-ის მარცხენა border ჭრილია (cropped). ეს ხდება იმიტომ, რომ:

1. გარე div-ს აქვს `overflow-hidden`
2. შიდა div-საც აქვს `overflow-hidden`  
3. Input-ის border და focus ring იჭრება

## გადაწყვეტა

`overflow-hidden`-ის მოხსნა გარე კონტეინერიდან და Input-ისთვის მცირე padding-ის დამატება, რომ border-ს ჰქონდეს "breathing room".

## ცვლილებები

### ფაილი 1: `src/components/team/RoomFiltersBar.tsx`

**ხაზი 59:** `overflow-hidden` → `overflow-visible`

```diff
- <div className="px-4 py-2 w-full max-w-[100vw] overflow-hidden box-border">
+ <div className="px-4 py-2 w-full max-w-[100vw] overflow-visible box-border">
```

**ხაზი 60:** შიდა div-დანაც მოვხსნათ `overflow-hidden`

```diff
- <div className="flex items-center gap-1.5 w-full max-w-full overflow-hidden">
+ <div className="flex items-center gap-1.5 w-full max-w-full">
```

---

### ფაილი 2: `src/components/team/UnifiedFiltersBar.tsx`

**ხაზი 55:** `overflow-hidden` → `overflow-visible`

```diff
- <div className="px-4 py-2 w-full max-w-full overflow-hidden box-border">
+ <div className="px-4 py-2 w-full max-w-full overflow-visible box-border">
```

**ხაზი 56:** შიდა div-დანაც მოვხსნათ `overflow-hidden`

```diff
- <div className="flex items-center gap-1.5 w-full max-w-full overflow-hidden">
+ <div className="flex items-center gap-1.5 w-full max-w-full">
```

---

## შედეგი

| მანამდე | შემდეგ |
|---------|--------|
| Border მარცხნიდან ჭრილია | Border სრულად ჩანს |
| Focus ring-იც იჭრება | Focus ring სწორად ჩანს |

