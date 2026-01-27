
# Fix TV Session Rejoining for "category-select" Status

## Problem

When the host exits a TV game room that's in `category-select` status (direct category selection phase), they cannot rejoin:
- Room shows "მოლოდინი" (waiting) instead of "LIVE" badge
- Entering the 4-digit code (e.g., 2089) fails to find the session
- Host is stuck and cannot continue the game

## Root Cause

The `category-select` status is a valid TV session status (set when `startDirectSelection()` is called), but it's **missing from all `activeStatuses` arrays** in the codebase:

| File | Line | Issue |
|------|------|-------|
| `TVGameContext.tsx` | 1353-1355 | `joinSession` can't find sessions |
| `useMyRooms.ts` | 44 | Room shows waiting, not LIVE |
| `RoomLobbyV2.tsx` | 92 | Host auto-redirect doesn't trigger |
| `TVDisplay.tsx` | 48 | TV can't mirror session |

## Solution

Add `category-select` to all `activeStatuses` arrays to ensure consistent behavior.

---

## Technical Changes

### 1. File: `src/contexts/TVGameContext.tsx` (Line 1353-1355)

Add `category-select` to the activeStatuses in `joinSession`:

```tsx
// Before
const activeStatuses = [
  'waiting', 'paired', 'lobby', 'countdown', 'playing', 'reveal', 'completed',
  'round-intro', 'poll-suggest', 'poll-voting', 'poll-results'
];

// After
const activeStatuses = [
  'waiting', 'paired', 'lobby', 'countdown', 'playing', 'reveal', 'completed',
  'round-intro', 'poll-suggest', 'poll-voting', 'poll-results', 'category-select'
];
```

### 2. File: `src/hooks/useMyRooms.ts` (Line 44)

Add `category-select` to `ACTIVE_TV_STATUSES`:

```tsx
// Before
const ACTIVE_TV_STATUSES = ['waiting', 'paired', 'lobby', 'countdown', 'question', 'playing', 'reveal', 'round-intro', 'poll-suggest', 'poll-voting', 'poll-results'];

// After  
const ACTIVE_TV_STATUSES = ['waiting', 'paired', 'lobby', 'countdown', 'question', 'playing', 'reveal', 'round-intro', 'poll-suggest', 'poll-voting', 'poll-results', 'category-select'];
```

### 3. File: `src/components/team/RoomLobbyV2.tsx` (Line 92)

Add `category-select` to host redirect check:

```tsx
// Before
const activeStatuses = ['waiting', 'paired', 'lobby', 'countdown', 'question', 'playing', 'reveal', 'round-intro', 'poll-suggest', 'poll-voting', 'poll-results'];

// After
const activeStatuses = ['waiting', 'paired', 'lobby', 'countdown', 'question', 'playing', 'reveal', 'round-intro', 'poll-suggest', 'poll-voting', 'poll-results', 'category-select'];
```

### 4. File: `src/pages/TVDisplay.tsx` (Line 48)

Add `category-select` to TV display connection:

```tsx
// Before
const activeStatuses = ['waiting', 'paired', 'lobby', 'countdown', 'playing', 'reveal', 'completed', 'poll-suggest', 'poll-voting', 'poll-results', 'round-intro', 'results'];

// After
const activeStatuses = ['waiting', 'paired', 'lobby', 'countdown', 'playing', 'reveal', 'completed', 'poll-suggest', 'poll-voting', 'poll-results', 'round-intro', 'results', 'category-select'];
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/contexts/TVGameContext.tsx` | Add `category-select` to line 1355 |
| `src/hooks/useMyRooms.ts` | Add `category-select` to line 44 |
| `src/components/team/RoomLobbyV2.tsx` | Add `category-select` to line 92 |
| `src/pages/TVDisplay.tsx` | Add `category-select` to line 48 |

---

## Expected Result

- Room shows "LIVE" badge when session is in `category-select` status
- Host can rejoin using the 4-digit TV code
- Clicking room card takes host directly to TV controller
- TV display can mirror sessions in category selection phase
