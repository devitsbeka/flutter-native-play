
# Mix Explore Feed Content by Creator - Prevent Same-Creator Clustering

## Problem

On the Explore page (mobile), when sorted by date, items from the same creator appear consecutively if they published multiple trivias/collections at similar times. The user sees:

```
beka - trivia 1 (21 days ago)
beka - trivia 2 (21 days ago)  
beka - collection (21 days ago)
...
```

## Solution

Implement a **creator-diversified sorting algorithm** that:
1. Still respects date ordering as the primary factor
2. Spaces out items from the same creator to ensure variety
3. Shows mixed content from different creators

## Algorithm Approach

**Round-robin interleaving with date priority:**

```text
Input (sorted by date):
  [beka-1, beka-2, beka-3, john-1, mary-1, mary-2]

Step 1: Group by creator
  beka: [beka-1, beka-2, beka-3]
  john: [john-1]
  mary: [mary-1, mary-2]

Step 2: Interleave (round-robin, take one from each)
  [beka-1, john-1, mary-1, beka-2, mary-2, beka-3]

Result: Mixed content, still roughly date-ordered
```

---

## Technical Changes

### File: `src/hooks/usePlayerFeedItems.ts`

Add a helper function to interleave items from different creators:

```tsx
// After sorting by date, interleave items from different creators
function interleaveByCreator(items: PlayerFeedItem[]): PlayerFeedItem[] {
  // Group items by creator
  const byCreator = new Map<string, PlayerFeedItem[]>();
  items.forEach(item => {
    const userId = item.player.user_id;
    if (!byCreator.has(userId)) {
      byCreator.set(userId, []);
    }
    byCreator.get(userId)!.push(item);
  });

  // Round-robin interleave
  const result: PlayerFeedItem[] = [];
  const queues = Array.from(byCreator.values());
  
  while (queues.some(q => q.length > 0)) {
    for (const queue of queues) {
      if (queue.length > 0) {
        result.push(queue.shift()!);
      }
    }
  }
  
  return result;
}
```

Then, after applying the date sort (for "recent" mode), apply this interleaving:

```tsx
// After line 288 (date sort)
case "recent":
default:
  filteredItems.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  // Interleave to prevent same-creator clustering
  filteredItems = interleaveByCreator(filteredItems);
  break;
```

---

## Visual Result

| Before | After |
|--------|-------|
| beka - მუსიკა | beka - მუსიკა |
| beka - სპორტი | john - ისტორია |
| beka - კოლექცია | mary - გეოგრაფია |
| john - ისტორია | beka - სპორტი |
| mary - გეოგრაფია | anna - ხელოვნება |
| mary - კინო | mary - კინო |

Content from different creators is now mixed, providing variety in the feed.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/usePlayerFeedItems.ts` | Add interleaving function, apply after date sort |

---

## Edge Cases Handled

- Single creator with many items: Will be spaced out across the feed
- Single item per creator: No change in behavior
- Empty feed: Returns empty array
- Only one creator exists: Falls back to date order (no interleaving possible)
