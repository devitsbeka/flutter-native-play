
# Limit Visible Rooms (10 on Mobile, 15 on Desktop/Tablet)

## Problem
The `useMyRooms` hook accepts a `limit` parameter but never applies it to the final returned results. The filtered/sorted rooms array is returned in full, causing unlimited scrolling.

## Solution
Apply `.slice(0, limit)` to the returned `filteredRooms` in the `useMyRooms` hook, so only the requested number of rooms is shown.

## Technical Details

### File: `src/hooks/useMyRooms.ts` (line ~498)

Change the return statement to slice the results:

```typescript
return {
  rooms: filteredRooms.slice(0, limit),
  loading,
  refreshRooms: () => queryClient.invalidateQueries({ queryKey: [MY_ROOMS_KEY] }),
  filter,
};
```

This single change ensures:
- Mobile shows max 10 rooms (already set in `MyRoomsSection.tsx` line 61)
- Desktop/tablet shows max 15 rooms (already set in `MyRoomsSection.tsx` line 61)
- Search results remain unaffected (search uses its own limit of 200)
- All other consumers of `useMyRooms` respect their passed `limit` value
