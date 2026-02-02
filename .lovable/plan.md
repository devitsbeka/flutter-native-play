

# გეგმა: ლოგოს გაერთიანება და ნავიგაციის რესტრუქტურიზაცია

## პრობლემები

### 1. LIVE Badge-ს არ აქვს მრგვალი კიდეები
- `LiveBadge.tsx` იყენებს `rounded` (მცირე რადიუსი)
- `MyTriviaLiveLogo.tsx` იყენებს `rounded-md`
- სკრინშოტზე ჩანს რომ უნდა იყოს `rounded-full` (pill shape)

### 2. ლოგო ორჯერ ჩანს Desktop-ზე (Online Game Page)
- ლოგო ჩანს მარცხენა ნავიგაციაში
- ლოგო ასევე ჩანს TeamV2 header-ში
- უნდა დავტოვოთ მხოლოდ header-ში

### 3. მარცხენა ნავიგაციის რესტრუქტურიზაცია
- ლოგოს ნაცვლად Profile button უნდა იყოს თავზე
- ენა და "მეტი" დარჩეს ბოლოში

---

## გადაწყვეტა

### ფაილი 1: `src/components/social/LiveBadge.tsx`

**ცვლილება:** `rounded` → `rounded-full`

```typescript
// ხაზი 11: rounded → rounded-full
className="relative inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider text-white"
```

### ფაილი 2: `src/components/shared/MyTriviaLiveLogo.tsx`

**ცვლილება:** `rounded-md` → `rounded-full`

```typescript
// ხაზი 47: rounded-md → rounded-full
className={`relative inline-flex items-center ${s.badge} rounded-full font-bold uppercase tracking-wider text-white`}
```

### ფაილი 3: `src/components/layout/UnifiedDesktopNav.tsx`

**ცვლილებები:**

1. **წავშალოთ ლოგო თავიდან** (ხაზები 141-182)
2. **Profile button გადავიტანოთ თავზე** - ახლა ის ლოგოს ქვემოთაა, გავხადოთ პირველი ელემენტი
3. **ენა და მეტი დარჩეს ბოლოში** - უკვე ბოლოშია `mt-auto`-თი

**ახალი სტრუქტურა:**
```
┌─────────────────────┐
│ [Profile Button]    │  ← ახლა თავზე (ლოგოს ნაცვლად)
├─────────────────────┤
│ მთავარი             │
│ აღმოჩენა            │
│ მაღაზია             │
│ რეიტინგი            │
│ ონლაინ თამაში       │
├─────────────────────┤
│ (empty space)       │
├─────────────────────┤
│ 🇬🇪 ქართული         │  ← ბოლოში (mt-auto)
│ ≡ მეტი              │
└─────────────────────┘
```

---

## შედეგი

- **LIVE badge** - pill shape (rounded-full) ყველგან
- **Desktop Online Game Page** - ლოგო მხოლოდ ერთხელ (header-ში)
- **Left Nav** - Profile button თავზე, ენა/მეტი ბოლოში
- **კომპაქტური ნავიგაცია** - უფრო სუფთა UI

