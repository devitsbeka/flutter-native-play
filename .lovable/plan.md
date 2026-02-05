
# Plan: Optimize TV Lobby Layout for Single Viewport

## Issues Identified (from screenshot)

1. **Duplicate code display** - Code "3177" shown twice: once below room title AND in the right QR section
2. **Rounds wrap to second line** - Causes players grid to move down and get cropped
3. **Players/Logo cropped** - Content extends beyond visible viewport

## Changes

### File: `src/components/tv/TVLobbyScreenV2.tsx`

#### 1. Remove Duplicate Code Below Header
**Lines 409-415** - Delete the entire game code block:
```tsx
{/* Game Code - Below header */}
<div className="mb-3">
  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 ...">
    ...
  </div>
</div>
```

#### 2. Rounds Queue: Single Line with Abbreviations
**Lines 418-443** - Update the queue container to:
- Use `overflow-x-auto` with `flex-nowrap` (no wrap)
- Truncate category names or use abbreviations
- Limit max-width per pill

```tsx
{hasMultiRound ? (
  // Multi-round queue display - single line, scrollable if needed
  <div className="flex items-center gap-2 py-2 overflow-x-auto scrollbar-hide pr-60">
    {queue.map((item, index) => {
      // Abbreviate long names: "მეცნიერება" → "მეცნ."
      const displayName = item.category_name 
        ? (item.category_name.length > 12 
            ? item.category_name.slice(0, 8) + '...' 
            : item.category_name)
        : 'რაუნდი';
      
      return (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-purple-400/50 shrink-0"
          style={{
            background: 'linear-gradient(180deg, rgba(168,85,247,0.3) 0%, rgba(139,92,246,0.3) 100%)',
          }}
        >
          <span className="text-xs text-purple-200/80">{index + 1}.</span>
          <span className="text-white text-sm font-medium whitespace-nowrap">
            {displayName}
          </span>
        </motion.div>
      );
    })}
  </div>
) : (
  // Single category display - kept as is but smaller padding
  ...
)}
```

#### 3. Reduce Vertical Spacing
- Header: `mb-3` → `mb-2`
- Category section: `mb-4` → `mb-2`
- Bottom button area: `mt-3` → `mt-2`
- Players section: Remove label to save vertical space

#### 4. Compact Players Grid
- Remove "მოთამაშეები" (Players) label header to save space
- Reduce gap from `gap-1.5` → `gap-1`
- Reduce avatar container size slightly

---

## Visual Result

| Before | After |
|--------|-------|
| Code shown twice | Code only in QR section |
| Rounds wrap to 2 lines | Single line with abbreviated names |
| Players cropped at bottom | All 8 slots visible |
| Logo cropped | Logo fully visible |

---

## Summary

| Change | Purpose |
|--------|---------|
| Remove code block (lines 409-415) | Eliminate duplicate, save vertical space |
| `flex-nowrap` on queue | Prevent wrapping to second line |
| Abbreviate names > 12 chars | Fit more rounds in single line |
| Reduce margins/padding | Fit everything in viewport |
| Remove players label | Save ~24px vertical space |
