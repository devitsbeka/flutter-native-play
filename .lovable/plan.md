
# Plan: Fix Room Activity Tracking & Invite UX Improvements

## Issues Identified

Based on the user's feedback and code analysis:

1. **Room Activity Tracking** - Need to distinguish between "active" rooms (recent activity) vs "inactive" rooms (3+ hours old)
2. **Online Player Indicator** - Show green stroke/ring on player avatars when they're online in the ოთახები (Rooms) page
3. **Button Text Change** - Change "თავიდან" (Again) to "მოიწვიე" (Invite) for inactive rooms where the player is online
4. **Feedback After Invite** - Show "გაიგზავნა" (Sent) and "ველოდებით" (Waiting) text after clicking invite button
5. **Delete Button Not Working** - The X button to remove invited participants appears to not be functioning

---

## Technical Changes

### 1. Add Room Inactivity Detection

**File: `src/hooks/useMyRooms.ts`**

Add a helper function and computed property to determine if a room is "stale" (3+ hours since last activity):

```typescript
// Add new helper function
export function isRoomActive(lastActivityAt: string | null, createdAt: string): boolean {
  const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
  const activityTime = new Date(lastActivityAt || createdAt).getTime();
  return activityTime > threeHoursAgo;
}
```

Add `is_active` computed property to `MyRoom` interface and calculation in the mapping.

### 2. Add Online Player Indicators with Green Stroke on Avatars

**File: `src/components/team/MyRoomsSection.tsx`**

In the `RoomCardGrid` component avatar section, add online detection:

```typescript
// Check if any participant (excluding self) is online
const onlineParticipantIds = new Set(room.online_participants.map(p => p.user_id));

// In the avatar render:
<div 
  className={`w-8 h-8 rounded-full overflow-hidden flex-shrink-0 shadow-md ${
    onlineParticipantIds.has(p.user_id) 
      ? "ring-2 ring-green-500 ring-offset-1 ring-offset-transparent" 
      : "border-2 border-white/40"
  }`}
>
```

### 3. Change Button Logic for Inactive Rooms

**File: `src/components/team/RoomScoreboard.tsx`**

Modify the invite button logic for invited players:
- Add `isRoomActive` prop to component
- When room is inactive (3+ hours old) and player is online: Show "მოიწვიე" (Invite) button instead of "თავიდან" (Again)
- Add state to track if invite was sent, then show "გაიგზავნა" (Sent) and "ველოდებით" (Waiting)

```typescript
interface RoomScoreboardProps {
  // ... existing props
  isRoomActive?: boolean;  // Add this
}

// In the component, add state for tracking sent invites
const [sentInvites, setSentInvites] = useState<Set<string>>(new Set());

// Modify the resend button logic:
{isHost && (
  sentInvites.has(player.user_id) ? (
    <div className="flex flex-col items-center">
      <span className="text-xs text-green-400 font-medium">გაიგზავნა</span>
      <motion.p 
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="text-xs text-white/50"
      >
        ველოდებით
      </motion.p>
    </div>
  ) : (
    <motion.button
      onClick={async () => {
        await onResendInvitation?.(player.user_id);
        setSentInvites(prev => new Set([...prev, player.user_id]));
      }}
      className="px-3 py-1 rounded-full bg-primary/30 hover:bg-primary/40 flex items-center gap-1.5 text-xs text-white"
      whileTap={{ scale: 0.95 }}
    >
      <Send className="w-3 h-3" />
      {isRoomActive ? "თავიდან" : "მოიწვიე"}
    </motion.button>
  )
)}
```

### 4. Fix Delete Button

**File: `src/components/team/RoomScoreboard.tsx`**

The delete button calls `onRemoveParticipant?.(player.id)` but passes `player.id` (the participant row ID). The issue is likely that:
1. The click event might be propagating
2. The `onRemoveParticipant` prop isn't being passed correctly

Add `e.stopPropagation()` to prevent click bubbling:

```typescript
<motion.button
  onClick={(e) => {
    e.stopPropagation();
    onRemoveParticipant?.(player.id);
  }}
  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center border-2 border-background z-20"
  whileTap={{ scale: 0.9 }}
>
  <X className="w-3 h-3 text-white" />
</motion.button>
```

### 5. Pass Props from RoomLobbyV2

**File: `src/components/team/RoomLobbyV2.tsx`**

Update the RoomScoreboard usage to pass the new `isRoomActive` prop:

```typescript
<RoomScoreboard
  participants={participants as any}
  matches={matches}
  currentUserId={user?.id}
  showHostCrown={true}
  maxPlayers={currentRoom.max_players || 10}
  isHost={isHost}
  isRoomActive={isRoomActive(currentRoom.last_activity_at, currentRoom.created_at)}
  onInviteFriends={() => setShowInviteModal(true)}
  onRemoveParticipant={handleRemoveParticipant}
  onResendInvitation={handleResendInvitation}
/>
```

---

## Summary

| File | Change |
|------|--------|
| `useMyRooms.ts` | Add `isRoomActive()` helper function |
| `MyRoomsSection.tsx` | Add green ring indicator on avatars for online participants |
| `RoomScoreboard.tsx` | 1. Add `isRoomActive` prop 2. Track sent invites with state 3. Show "მოიწვიე" for inactive rooms 4. Show "გაიგზავნა" + "ველოდებით" after sending 5. Fix delete button with stopPropagation |
| `RoomLobbyV2.tsx` | Pass `isRoomActive` prop to RoomScoreboard |

## Visual Result

**Inactive room with online player:**
```
┌─────────────────────────────────────┐
│ 🟢 Player Avatar (green ring)       │
│ "მოწვეული..."                        │
│ [მოიწვიე] button (not "თავიდან")     │
└─────────────────────────────────────┘
```

**After clicking invite:**
```
┌─────────────────────────────────────┐
│ 🟢 Player Avatar                    │
│ "გაიგზავნა"                          │
│ "ველოდებით..." (pulsing)            │
└─────────────────────────────────────┘
```
