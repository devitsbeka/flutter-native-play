
# Fix TVPollScreen Layout for TV Display

## Current Issues (From Screenshot)

1. **Cropped Cards**: Only 4 cards visible in top row, 5th card cropped at bottom
2. **Narrow Cards**: Cards don't utilize the wide TV screen effectively
3. **Large QR Code**: Takes too much space (180px)
4. **Excessive Spacing**: Too much padding and margins
5. **Limited Grid**: Only 4 columns max, should show 4 cards per row with 2 rows (8 max)

## Solution

Optimize the layout for TV's 16:9 aspect ratio:
- Show 2 rows of 4 cards each (8 cards max visible without scrolling)
- Reduce QR code size from 180px to 120px
- Compact the header and reduce margins
- Smaller card padding and icons
- Remove overflow scrolling in favor of a 2x4 grid that fits

---

## Technical Changes

### File: `src/components/tv/TVPollScreen.tsx`

#### 1. Reduce Overall Padding (line 59)
Change from `p-8 pb-4` to `p-6 pb-3`:
```tsx
<div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6 pb-3 flex flex-col">
```

#### 2. Compact Header (line 64)
Reduce margin from `mb-6` to `mb-3`:
```tsx
className="flex items-center justify-between mb-3"
```

#### 3. Compact Title Section (lines 105-117)
Reduce margins, smaller title text, condense description:
```tsx
<div className="mb-3">
  <div className="flex items-center gap-2 mb-1">
    <Vote className="w-6 h-6 text-purple-300" />
    <h1 className="text-2xl font-bold text-white">
      {pollPhase === 'suggest' ? 'რა ვითამაშოთ?' : 'ხმა მიეცით!'}
    </h1>
  </div>
  <p className="text-purple-300 text-sm ml-8">
    {pollPhase === 'voting' 
      ? 'აირჩიეთ რომელი კატეგორიები გსურთ'
      : 'აირჩიე მაქსიმუმ 3 ვარიანტი'}
  </p>
</div>
```

#### 4. Update Grid Columns Function (lines 52-56)
Show up to 4 columns for all screen sizes, and 2 rows:
```tsx
const getGridCols = (count: number) => {
  if (count <= 4) return 'grid-cols-4';
  return 'grid-cols-4'; // Always 4 columns for TV
};
```

#### 5. Update Grid Container (line 138)
Remove scroll, use auto-rows for 2 rows max:
```tsx
<div className={`grid ${getGridCols(suggestions.filter(s => s.category_name && s.category_name.trim()).length)} gap-3 auto-rows-fr`}>
```

#### 6. Reduce QR Code Size (lines 160-162)
Change from 180px to 120px, reduce sidebar width:
```tsx
<motion.div
  initial={{ opacity: 0, x: 20 }}
  animate={{ opacity: 1, x: 0 }}
  className="w-56 flex flex-col items-center"
>
  <div className="bg-white p-3 rounded-xl mb-2">
    <QRCodeSVG value={joinUrl} size={120} level="H" />
  </div>
```

#### 7. Compact Code Display (lines 166-169)
Smaller padding and text:
```tsx
<div className="bg-white/10 px-3 py-1.5 rounded-lg mb-3">
  <span className="text-xl font-mono font-bold text-white tracking-wider">
    {code}
  </span>
</div>
```

#### 8. Compact Player List (lines 172-197)
Reduce padding, smaller avatars:
```tsx
<div className="w-full bg-white/10 rounded-xl p-3 border border-white/20 flex-1 overflow-hidden">
  <div className="flex items-center gap-2 mb-2">
    <Users className="w-4 h-4 text-purple-300" />
    <span className="text-white font-bold text-sm">მოთამაშეები ({activePlayers.length})</span>
  </div>
  <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto pr-1">
    {activePlayers.map((player) => (
      <div 
        key={player.id || player.nickname}
        className="flex items-center gap-2 bg-white/10 rounded-lg px-2 py-1.5"
      >
        <SafeAvatarImage
          avatarUrl={player.avatar_url}
          fallback={player.nickname}
          className="w-7 h-7 rounded-full object-cover"
          containerClassName="w-7 h-7 rounded-full text-xs"
        />
        <span className="text-white text-sm font-medium truncate">{player.nickname}</span>
      </div>
    ))}
```

#### 9. Compact Bottom Hint (lines 201-215)
Reduce margin and text size:
```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ delay: 1 }}
  className="text-center mt-3"
>
  <p className="text-purple-400 text-sm">
```

#### 10. Compact SuggestionCard (lines 255-317)
Smaller padding, smaller icons:
```tsx
className={`relative overflow-visible bg-white/10 backdrop-blur-sm rounded-xl p-4 border-2 transition-all ${...}`}

// Icon container (line 284):
<div className="flex justify-center mb-2">

// Category icon size (lines 286-296):
{suggestion.cover_image ? (
  <img 
    src={suggestion.cover_image} 
    alt={suggestion.category_name}
    className="w-14 h-14 rounded-lg object-cover"
  />
) : suggestion.icon_slug ? (
  <QuizCategoryIcon iconSlug={suggestion.icon_slug} size={56} className="w-14 h-14" />
) : (
  <div className="w-14 h-14 rounded-lg bg-purple-500/30 flex items-center justify-center">
    <Sparkles className="w-7 h-7 text-purple-300" />
  </div>
)}

// Category name (line 301):
<h3 className="text-base font-bold text-white text-center mb-2 line-clamp-1">

// Vote display (lines 306-317):
{showVotes && (
  <motion.div
    animate={{ scale: isAnimating ? 1.2 : 1 }}
    className="flex items-center justify-center gap-1.5 bg-purple-500/30 rounded-lg py-1.5"
  >
    <Vote className="w-4 h-4 text-purple-300" />
    <span className="text-lg font-bold text-white">
      {suggestion.vote_count}
    </span>
    <span className="text-purple-300 text-xs">ხმა</span>
  </motion.div>
)}
```

---

## Summary of Changes

| Element | Before | After |
|---------|--------|-------|
| Main padding | `p-8 pb-4` | `p-6 pb-3` |
| Header margin | `mb-6` | `mb-3` |
| Title size | `text-3xl` | `text-2xl` |
| Title section margin | `mb-6` | `mb-3` |
| Grid gaps | `gap-4` | `gap-3` |
| QR Code size | 180px | 120px |
| Sidebar width | `w-72` | `w-56` |
| Card padding | `p-6` | `p-4` |
| Card icon size | 80px | 56px |
| Card title | `text-xl` | `text-base` |
| Player avatar | `w-10 h-10` | `w-7 h-7` |

---

## Result

After these changes:
- 8 category cards visible (4 per row × 2 rows) without cropping
- Smaller, more proportional QR code
- Compact header and title
- All elements visible on TV screen without scrolling or cropping
- Better utilization of the wide 16:9 TV aspect ratio
