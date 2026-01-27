
# Fix TV Host Controller: Back Button and Room Edit Functionality

## Issues Identified

### Issue 1: Back Button Not Working

**Root Cause**: In `TVHostController.tsx` (lines 569-575) and `ControllerPollScreen.tsx` (lines 68-74), the back button uses `window.history.length > 1` as the condition. However, `window.history.length` always returns at least 2 in modern browsers (current page counts as 1), making this check unreliable.

**Current Code** (TVHostController.tsx, lines 569-575):
```tsx
onBack={() => {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    navigate('/team');
  }
}}
```

The condition `window.history.length > 1` is almost always true, but `window.history.back()` may have no effect if the user entered via a direct link (QR code, notification) with no previous navigation within the app.

### Issue 2: Cannot Edit Room Name or Icon

**Root Cause**: The `TVHostController` page does not include room editing functionality. The edit icons (Edit2/Pencil and Palette) seen in the user's screenshot are from `RoomLobbyV2`, which is a different page. When entering a live TV session from the "My Rooms" section, users land on `TVHostController` which lacks these editing capabilities.

---

## Solution

### Fix 1: Improve Back Button Navigation

Update the back button handlers to use a more reliable navigation approach. Instead of checking `window.history.length`, use a combination of `window.history.state` check and always have a fallback:

**Files to update:**
- `src/pages/TVHostController.tsx` (line 569-575)
- `src/components/controller/ControllerDirectSelection.tsx` (no changes needed - it receives `onBack` as prop)
- `src/components/controller/ControllerPollScreen.tsx` (lines 68-74)

**New approach:**
```tsx
const handleBack = () => {
  // Check if we have a meaningful history entry from the same origin
  // window.history.state exists when navigating within React Router
  if (window.history.state && window.history.state.idx > 0) {
    window.history.back();
  } else {
    navigate('/team', { replace: true });
  }
};
```

React Router sets `history.state.idx` to track navigation index. If `idx > 0`, there's a previous page to go back to within the app.

### Fix 2: Add Room Edit Functionality to TVHostController

Add a header section in the lobby phase that allows hosts to edit the room name and icon, similar to `RoomLobbyV2`.

**Changes:**

1. **Add imports** for `Edit2`, `Palette`, and `RoomIconPickerModal`

2. **Add state variables:**
   - `roomName` - current room name
   - `roomIcon` - current room icon URL  
   - `showIconPicker` - modal visibility state

3. **Fetch room data** (already partially done with `roomId`, just add room_name and room_icon)

4. **Add editable header section** in the lobby phase that shows:
   - Room icon (clickable to edit)
   - Room name (with edit button)
   - Palette button for gradient picker (optional)

5. **Add RoomIconPickerModal** component with save handler

**Files to update:**
- `src/pages/TVHostController.tsx`

---

## Technical Implementation Details

### TVHostController.tsx Changes

#### 1. Add imports (top of file)
```tsx
import { Edit2, Palette } from 'lucide-react';
import { RoomIconPickerModal } from '@/components/team/RoomIconPickerModal';
```

#### 2. Add state (after existing state declarations ~line 100)
```tsx
const [roomName, setRoomName] = useState('');
const [roomIcon, setRoomIcon] = useState<string | null>(null);
const [showIconPicker, setShowIconPicker] = useState(false);
```

#### 3. Fetch room data (inside the loadData function, after loading session ~line 206)
```tsx
// Fetch room name and icon from game_rooms if room_id exists
if (sessionData.room_id) {
  const { data: gameRoom } = await supabase
    .from('game_rooms')
    .select('room_name, room_icon')
    .eq('id', sessionData.room_id)
    .maybeSingle();
  
  if (gameRoom) {
    setRoomName(gameRoom.room_name || '');
    setRoomIcon(gameRoom.room_icon || null);
  }
}
```

#### 4. Add save handler (after handleCopyCode ~line 500)
```tsx
const handleSaveRoomDetails = async (newIcon: string | null, newName: string) => {
  if (!roomId) return;
  
  await supabase
    .from('game_rooms')
    .update({ 
      room_name: newName.trim(),
      room_icon: newIcon 
    })
    .eq('id', roomId);
  
  setRoomName(newName.trim());
  setRoomIcon(newIcon);
  toast.success('ოთახი განახლდა!');
};
```

#### 5. Fix back button handler (line 569-575)
```tsx
onBack={() => {
  if (window.history.state && window.history.state.idx > 0) {
    window.history.back();
  } else {
    navigate('/team', { replace: true });
  }
}}
```

#### 6. Update lobby header (in the lobby phase section ~line 823-836)
Replace the current header with an editable version:
```tsx
<motion.div
  initial={{ opacity: 0, y: -20 }}
  animate={{ opacity: 1, y: 0 }}
  className="flex items-center justify-between gap-3 mb-6"
>
  <div className="flex items-center gap-3 flex-1 min-w-0">
    <button onClick={() => navigate('/team')} className="p-2 rounded-full hover:bg-white/10 shrink-0">
      <ArrowLeft className="w-5 h-5 text-purple-200" />
    </button>
    {/* Room icon */}
    {roomIcon ? (
      <img src={roomIcon} alt="Room" className="w-8 h-8 object-contain rounded-lg shrink-0" />
    ) : (
      <img src={retroTvIcon} alt="TV" className="w-7 h-7 object-contain shrink-0" />
    )}
    {/* Room name */}
    <span className="font-bold text-white truncate">{roomName || 'TV თამაში'}</span>
    {/* Edit buttons */}
    <button
      onClick={() => setShowIconPicker(true)}
      className="p-2 rounded-full hover:bg-white/10"
      title="შეცვალე სახელი/აიკონი"
    >
      <Edit2 className="w-4 h-4 text-purple-300" />
    </button>
  </div>
</motion.div>
```

#### 7. Add modal at the end of the component (before closing div)
```tsx
<RoomIconPickerModal
  isOpen={showIconPicker}
  onClose={() => setShowIconPicker(false)}
  currentIconUrl={roomIcon}
  roomName={roomName}
  onConfirm={(newIcon, newName) => {
    handleSaveRoomDetails(newIcon, newName);
    setShowIconPicker(false);
  }}
/>
```

### ControllerPollScreen.tsx Changes

#### Fix back button handler (lines 68-74)
```tsx
const handleBack = () => {
  if (window.history.state && window.history.state.idx > 0) {
    window.history.back();
  } else {
    navigate('/team', { replace: true });
  }
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/TVHostController.tsx` | Add room edit functionality, fix back button navigation, add RoomIconPickerModal |
| `src/components/controller/ControllerPollScreen.tsx` | Fix back button navigation handler |

---

## Expected Outcome

After implementation:
1. **Back button** will reliably navigate users back to `/team` when accessed via direct link (QR/notification), or to the previous page when there's navigation history
2. **Room editing** will be available in the TV Host Controller lobby phase, allowing hosts to change the room name and icon using the existing RoomIconPickerModal component
3. The UI will match user expectations from the RoomLobbyV2 experience
