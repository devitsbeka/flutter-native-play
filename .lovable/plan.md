

# Fix Multiple Page Transitions When Clicking Live TV Room

## Problem

When clicking on a LIVE room card with an active TV session, the app goes through multiple rapid page transitions (1→2→3→4) before finally showing the poll/game screen. This creates a jarring visual experience with rapid scaling/sliding animations.

**Current Navigation Flow:**
```text
TeamV2 (Rooms List)
    ↓ click on LIVE room
RoomLobbyV2 (lobby phase set by enterRoom)
    ↓ useEffect detects TV session
TVHostController (final destination)
```

Each step triggers framer-motion page transition animations, causing the "1,2,3,4 pages in one second" effect.

## Solution

Detect the active TV session **before navigation** and skip directly to the appropriate TV mode page. The `MyRoom` data already contains `tv_session_id`, `tv_status`, and `is_host` - we just need to use them.

**Optimized Navigation Flow:**
```text
TeamV2 (Rooms List)
    ↓ click on LIVE room (detect TV session + role)
TVHostController or TVJoin (single navigation step)
```

---

## Technical Changes

### File: `src/components/team/MyRoomsSection.tsx`

#### 1. Add useNavigate import (line 4)

Add `useNavigate` to existing imports from react-router-dom.

#### 2. Add navigation hook in component (around line 58)

```tsx
const navigate = useNavigate();
```

#### 3. Update handleJoin function (lines 91-135)

Change the `handleJoin` function to detect active TV sessions and navigate directly:

**Current:**
```tsx
const handleJoin = async (room: MyRoom) => {
  // Clear unread flag...
  // Reset room if completed...
  enterRoom(room.room_code);
};
```

**New:**
```tsx
const handleJoin = async (room: MyRoom) => {
  // Clear the unread flag
  if (room.has_unread_activity) {
    await supabase
      .from("game_rooms")
      .update({ has_unread_activity: false })
      .eq("id", room.id);
  }
  
  // If room is completed, reset it to waiting for rematch
  if (room.status === "completed") {
    // ... existing reset logic (unchanged)
  }
  
  // OPTIMIZATION: Skip RoomLobbyV2 for active TV sessions
  // Navigate directly to TV mode instead of going through enterRoom
  if (room.tv_session_id && isActiveTVSession(room.tv_status)) {
    if (room.is_host) {
      // Host goes directly to TV host controller
      navigate(`/tv/host/${room.tv_session_id}`);
    } else {
      // Guest goes directly to TV join flow
      navigate(`/join/session/${room.tv_session_id}`);
    }
    return;
  }
  
  // Standard room join for non-TV rooms
  enterRoom(room.room_code);
};
```

---

## Summary

| Before | After |
|--------|-------|
| Click → enterRoom → RoomLobbyV2 → useEffect detects TV → navigate to TVHostController | Click → detect TV session → navigate directly to TVHostController |
| 3+ animated page transitions | 1 navigation step |
| Jarring rapid animations | Smooth single transition |

## Expected Result

- Clicking a LIVE room card navigates instantly to the appropriate TV mode screen
- Only 1 page transition instead of 3-4 rapid transitions
- Smooth user experience for TV mode rooms
- Non-TV rooms continue to work normally through the standard `enterRoom` flow

