
# გეგმა: RoomIconPickerModal-ის გაუმჯობესება

## პრობლემები

1. **ბილინგვური ძებნა არ მუშაობს "zvigeni"-სთვის** - თუ ქართულად ვწერთ "ზვიგენი" - მუშაობს, მაგრამ ლათინურად "zvigeni" - არა
2. **ბევრი შემოთავაზებული** - ახლა 8 აიკონია (2 რიგი), საჭიროა 4 (1 რიგი)
3. **Search და Refresh ღილაკი არ არის sticky** - სქროლზე იმალება
4. **აიკონები "ხტიან" refresh-ზე** - ვიზუალური glitch

---

## გადაწყვეტა

### 1. ბილინგვური ძებნის გაუმჯობესება (Edge Function)

**ფაილი:** `supabase/functions/smart-icon-search/index.ts`

პრობლემა: ლათინური ტრანსლიტერაცია "zvigeni" არ იპოვნის "shark"-ს, რადგან:
- კოდი ამოწმებს `ENGLISH_SYNONYMS["zvigeni"]` - არ არსებობს
- კოდი ამოწმებს `ENGLISH_TO_GEORGIAN["zvigeni"]` - არ არსებობს

**გადაწყვეტა:** დავამატოთ ლოგიკა, რომელიც ლათინურ input-ს გარდაქმნის ქართულად და შემდეგ ეძებს შესაბამისობას:

```typescript
// NEW: Latin-to-Georgian transliteration + semantic lookup
// For "zvigeni" -> try to match Georgian words in GEORGIAN_TO_ENGLISH
const latinToGeorgian: Record<string, string> = {
  'a': 'ა', 'b': 'ბ', 'g': 'გ', 'd': 'დ', 'e': 'ე', 'v': 'ვ', 'z': 'ზ',
  't': 'თ', 'i': 'ი', 'k': 'კ', 'l': 'ლ', 'm': 'მ', 'n': 'ნ', 'o': 'ო',
  'p': 'პ', 'r': 'რ', 's': 'ს', 'u': 'უ', 'f': 'ფ', 'q': 'ყ', 'j': 'ჯ', 'h': 'ჰ'
};

// When query is Latin (not Georgian), try reverse transliteration
if (!isGeorgian(query)) {
  const potentialGeorgian = transliterateLatin(queryLower);
  // Now look for this in GEORGIAN_TO_ENGLISH
  for (const [geoWord, translations] of Object.entries(GEORGIAN_TO_ENGLISH)) {
    if (potentialGeorgian.includes(geoWord) || geoWord.includes(potentialGeorgian)) {
      translations.forEach(t => searchTerms.add(t));
    }
  }
}
```

### 2. მაქსიმუმ 4 შემოთავაზება (1 რიგი)

**ფაილი:** `src/components/team/RoomIconPickerModal.tsx`

ცვლილება ხაზზე ~170:
```typescript
// მანამდე:
setSuggestedIcons(shuffled.slice(0, 12) as IconItem[]);

// შემდეგ:
setSuggestedIcons(shuffled.slice(0, 4) as IconItem[]);
```

### 3. Sticky Header Search-ისა და Refresh ღილაკისთვის

**ფაილი:** `src/components/team/RoomIconPickerModal.tsx`

ახლანდელი სტრუქტურა:
```
Fixed Header (back + title)
Scrollable Content:
  - Preview + Name Input
  - Search Input          ← ეს უნდა გახდეს sticky
  - Category filters
  - Recent icons
  - Suggested header + refresh  ← refresh ღილაკი აქაა
  - Icons grid
Fixed Footer (button)
```

**ახალი სტრუქტურა:**
```
Fixed Header (back + title)
Sticky Search Section:     ← ახალი sticky კონტეინერი
  - Search Input
  - Category filters (optional)
Scrollable Content:
  - Preview + Name Input
  - Recent icons
  - Suggested header + refresh
  - Icons grid
Fixed Footer (button)
```

კოდის ცვლილება:
- Search Input-ს გავიტანთ scrollable content-იდან ცალკე div-ში
- დავამატებთ `sticky top-[60px]` კლასს (60px = header-ის სიმაღლე)

### 4. აიკონების "ხტომის" გამოსწორება

**ფაილი:** `src/components/team/RoomIconPickerModal.tsx`

პრობლემა: `AnimatePresence mode="popLayout"` იწვევს layout shift-ს

**გადაწყვეტა:** 
1. შევცვალოთ `mode="popLayout"` → `mode="wait"` ან მოვხსნათ
2. დავამატოთ `min-height` გრიდს რომ არ იცვლებოდეს ზომა
3. skeleton-ების რაოდენობა გავუტოლოთ რეალური აიკონების რაოდენობას

```typescript
// მანამდე:
<AnimatePresence mode="popLayout">

// შემდეგ:
<AnimatePresence mode="sync">
```

ან:
```typescript
// გრიდს დავამატებთ მინიმალურ სიმაღლეს
<div className="grid grid-cols-4 gap-3 min-h-[300px]">
```

---

## შესაცვლელი ფაილები

| ფაილი | ცვლილება |
|-------|----------|
| `supabase/functions/smart-icon-search/index.ts` | Latin→Georgian reverse transliteration + GEORGIAN_TO_ENGLISH lookup |
| `src/components/team/RoomIconPickerModal.tsx` | - შემოთავაზებული: 12 → 4<br>- Search Input sticky<br>- AnimatePresence mode fix<br>- Grid min-height |

---

## ვიზუალური შედარება

### მანამდე
```
┌─────────────────────────┐
│ ← შეცვალე აიკონი       │ ← Fixed header
├─────────────────────────┤
│ [icon] სახელი          │
│ 🔍 მოძებნე...          │ ← სქროლდება!
│ ყველა│ცხოველები│საჭმელი│
│ ბოლოს გამოყენებული     │
│ ○ ○ ○ ○                │
│ შემოთავაზებული [↻]     │
│ ○ ○ ○ ○                │
│ ○ ○ ○ ○  ← 8 აიკონი   │
│ ...                    │
└─────────────────────────┘
```

### შემდეგ
```
┌─────────────────────────┐
│ ← შეცვალე აიკონი       │ ← Fixed header
├─────────────────────────┤
│ 🔍 მოძებნე...          │ ← Sticky!
│ ყველა│ცხოველები│საჭმელი│ ← Sticky!
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┤
│ [icon] სახელი          │ ← სქროლდება
│ ბოლოს გამოყენებული     │
│ ○ ○ ○ ○                │
│ შემოთავაზებული [↻]     │
│ ○ ○ ○ ○  ← 4 აიკონი   │
│ ბიბლიოთეკა [↻]         │
│ ...                    │
└─────────────────────────┘
```

---

## ტექნიკური დეტალები

### Bilingual Search Flow (შემდეგ):

```
User types: "zvigeni"
         ↓
isGeorgian? → NO (Latin chars)
         ↓
transliterateLatin("zvigeni") → "ზვიგენი"
         ↓
Lookup GEORGIAN_TO_ENGLISH["ზვიგენი"] → ["shark", "fish"]
         ↓
searchTerms: ["zvigeni", "shark", "fish"]
         ↓
Search icons for "shark" → ✓ Found!
```

### Sticky Implementation:

```tsx
{/* Fixed Search Section - After header */}
<div className="fixed top-[60px] left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/20 safe-top">
  <div className="max-w-[700px] md:max-w-[520px] mx-auto w-full px-4 py-3 space-y-3">
    {/* Search Input */}
    <div className="relative">...</div>
    
    {/* Category filters */}
    {!searchQuery.trim() && <div className="flex gap-2 overflow-x-auto ...">...</div>}
  </div>
</div>

{/* Scrollable Content - Adjust top padding */}
<div className="h-full overflow-y-auto pt-[140px] pb-24 safe-top">
  ...
</div>
```
