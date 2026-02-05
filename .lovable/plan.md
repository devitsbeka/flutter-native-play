
# Plan: Show Next Rounds as Expandable List

## Problem

When you add more than one round to the queue while creating a room, the rounds are displayed as a single truncated line:
```
შემდეგი რაუნდები: 1. ცხოველები 2. ...
```

This cuts off after the first item or two, making it impossible to see all queued rounds.

## Solution

Replace the inline truncated text with a vertical list that shows all queued rounds. Each round will be displayed on its own line with its number and name.

## Visual Design

**Current (truncated):**
```
შემდეგი რაუნდები: 1. ცხოველები 2. ...
```

**New (full list):**
```
შემდეგი რაუნდები:
  1. ცხოველები
  2. ისტორია  
  3. მუსიკა
```

## Technical Changes

### File: `src/components/team/CreateRoomPage.tsx`

Replace 3 instances of the inline queue preview (in Random, Library, and My Trivias selection cards) with a proper list component.

**Locations to update:**
- Lines 1033-1040 (Random category selection)
- Lines 1171-1178 (Library category selection)
- Lines 1251-1258 (My Trivias selection)

**Current code pattern:**
```tsx
{queuedRounds.length > 0 && (
  <p className="text-xs text-white/70 mt-1 truncate">
    შემდეგი რაუნდები: {queuedRounds.map((r, i) => 
      `${i + 1}. ${r.category_name || "შემთხვევითი"}`
    ).join(" ")}
  </p>
)}
```

**New code pattern:**
```tsx
{queuedRounds.length > 0 && (
  <div className="mt-2 space-y-0.5">
    <p className="text-xs text-white/60 font-medium">
      შემდეგი რაუნდები:
    </p>
    <div className="flex flex-wrap gap-1.5">
      {queuedRounds.map((r, i) => (
        <span 
          key={r.tmpId}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-xs text-white/90"
        >
          <span className="text-white/50">{i + 1}.</span>
          {r.category_name || "შემთხვევითი"}
        </span>
      ))}
    </div>
  </div>
)}
```

This creates compact pill-style tags that wrap naturally when there are many rounds.

## Benefits

1. All rounds are visible - no truncation
2. Easy to scan the full queue at a glance
3. Consistent with the `PreRoomQueuePreview` component styling
4. Wrapped layout handles any number of rounds
5. Compact design doesn't take too much space

## Summary

| File | Change |
|------|--------|
| `src/components/team/CreateRoomPage.tsx` | Replace 3 truncated inline previews with wrapped pill-style round list |
