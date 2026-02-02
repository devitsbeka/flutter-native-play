

# Plan: Update Room Filtering for Real Active Players

## Overview

Two changes are needed:
1. Update "აქტიური" (active) filter to show rooms with at least one player active in the last 10 minutes
2. Remove the "დალაგება" (sort) section from the filter dropdown - always sort by last activity

---

## Technical Changes

### File 1: `src/hooks/useMyRooms.ts`

**1. Add 10-minute activity tracking for each room**

Currently, presence data is fetched with a 2-minute threshold. We need to:
- Add a new field `has_recent_activity` to track if any participant was active in the last 10 minutes
- Update the "active" filter logic to use this field

```typescript
// Around line 207-222: Change presence fetch to use 10 minutes for activity tracking
const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
const { data: recentPresenceData } = await supabase
  .from("user_presence")
  .select("user_id, status, last_seen, current_page")
  .in("user_id", allParticipantUserIds)
  .gte("last_seen", tenMinutesAgo);
```

**2. Add `has_recent_activity` field to MyRoom interface**

```typescript
// Add to MyRoom interface (around line 8-54)
has_recent_activity: boolean;  // At least one participant was active in last 10 min
```

**3. Calculate `has_recent_activity` for each room**

```typescript
// Inside the room mapping (around line 272-336)
// Calculate which participants were active in last 10 minutes
const recentActiveUserIds = new Set<string>();
recentPresenceData?.forEach(p => {
  recentActiveUserIds.add(p.user_id);
});

// Check if any participant (excluding self) was recently active
const hasRecentActivity = participants.some(
  p => p.user_id !== user.id && recentActiveUserIds.has(p.user_id)
);
```

**4. Update "active" filter logic**

```typescript
// Around line 432-435: Change the filter condition
case "active":
  result = result.filter((room) => room.has_recent_activity);
  break;
```

**5. Remove sort option from hook**

The `sort` option will be removed from the hook options since we always sort by "recent" (last_activity_at).

---

### File 2: `src/components/team/RoomFiltersBar.tsx`

**1. Remove `sort` props completely**

```typescript
// Remove these from props:
// sort: RoomSort;
// onSortChange: (sort: RoomSort) => void;

interface RoomFiltersBarProps {
  filter: RoomFilter;
  onFilterChange: (filter: RoomFilter) => void;
  // sort and onSortChange REMOVED
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onAddClick?: () => void;
  addButtonText?: string;
}
```

**2. Remove sortOptions array and related code**

```typescript
// DELETE these lines (38-41):
// const sortOptions: { value: RoomSort; label: string }[] = [
//   { value: "recent", label: "ბოლო აქტივობით" },
//   { value: "created_date", label: "თარიღით" },
// ];
```

**3. Remove "დალაგება" section from dropdown menu**

```typescript
// DELETE lines 130-144 (the sort section):
// <DropdownMenuSeparator />
// <DropdownMenuLabel className="text-xs text-muted-foreground">დალაგება</DropdownMenuLabel>
// {sortOptions.map((option) => (...))}
```

---

### File 3: `src/pages/TeamV2.tsx` (or wherever RoomFiltersBar is used)

**1. Remove sort state and handlers**

```typescript
// Remove:
// const [sort, setSort] = useState<RoomSort>("recent");

// Remove from RoomFiltersBar props:
// sort={sort}
// onSortChange={setSort}
```

---

## Data Flow

```text
Before (active filter):
┌─────────────────────────────────────────────────┐
│ Room with status = "waiting" or "playing"       │
│ → Shown in "აქტიური" filter                      │
│ (Even if no one was online for days)            │
└─────────────────────────────────────────────────┘

After (active filter):
┌─────────────────────────────────────────────────┐
│ Room where at least 1 participant               │
│ has last_seen within last 10 minutes            │
│ → Shown in "აქტიური" filter                      │
│ (Reflects actual real-time activity)            │
└─────────────────────────────────────────────────┘
```

---

## Summary

| File | Change |
|------|--------|
| `useMyRooms.ts` | Add `has_recent_activity` field, update filter logic to use 10-min window |
| `RoomFiltersBar.tsx` | Remove sort props, remove "დალაგება" section from dropdown |
| `TeamV2.tsx` | Remove sort state and props |
| Type exports | Remove `RoomSort` type export (optional cleanup) |

---

## Visual Comparison

**Before:**
```
┌──────────────────────────┐
│ ფილტრი                    │
│   ✓ ყველა                 │
│   ჩემი შექმნილი           │
│   მეგობრების              │
│   აქტიური                 │
│   დასრულებული             │
├──────────────────────────┤
│ დალაგება                  │  ← REMOVE
│   ✓ ბოლო აქტივობით       │  ← REMOVE
│   თარიღით                │  ← REMOVE
└──────────────────────────┘
```

**After:**
```
┌──────────────────────────┐
│ ფილტრი                    │
│   ✓ ყველა                 │
│   ჩემი შექმნილი           │
│   მეგობრების              │
│   აქტიური                 │
│   დასრულებული             │
└──────────────────────────┘
```

