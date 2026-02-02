

# Plan: Add Search Icon to Mobile Header with Full-Screen Search Panel

## Overview

Add a search icon before the notification bell on mobile, and when clicked, show a full-screen search panel with horizontally scrollable lists for friends, rooms, trivias, collections, and MyTriviaParties.

---

## Technical Changes

### File 1: `src/pages/Index.tsx`

#### Change 1.1: Add Search Icon to Mobile Header

**Location: Lines 447-499** - Modify the right side header section

Move the SpotlightSearch button outside the `hidden md:flex` wrapper so it's visible on mobile too:

```typescript
// BEFORE (simplified):
{user && (
  <div className="hidden md:flex items-center gap-1">
    <SpotlightSearch variant="button" />
  </div>
)}

{user && (
  <div className="flex items-center gap-1">
    <Bell button />
  </div>
)}

// AFTER:
{user && (
  <div className="flex items-center gap-1">
    {/* Search button - visible on all screens */}
    <SpotlightSearch variant="button" />
    
    {/* Bell icon with unread badge */}
    <motion.button ... Bell ... />
  </div>
)}
```

---

### File 2: `src/components/search/SpotlightSearch.tsx`

#### Change 2.1: Replace CommandDialog with Custom Full-Screen Panel

Transform the existing SpotlightSearch to show a mobile-friendly full-screen panel with horizontal scroll lists instead of the existing command dialog.

**Key changes:**

1. **Import additional hooks:**
```typescript
import { useMyQuizPosts } from "@/hooks/useSocialFeed";
import { useMyCollections } from "@/hooks/useCollections";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
```

2. **Add new state for mobile panel mode:**
```typescript
const [showMobilePanel, setShowMobilePanel] = useState(false);
```

3. **Create new horizontal scroll sections:**

```typescript
// Friends Section (horizontal scroll)
<div className="space-y-2">
  <h3 className="text-sm font-semibold text-muted-foreground px-4">მეგობრები</h3>
  <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
    {friends.map((friend) => (
      <FriendCard key={friend.id} friend={friend} onClick={() => handleFriendSelect(friend.id)} />
    ))}
  </div>
</div>

// Rooms Section (horizontal scroll)
<div className="space-y-2">
  <h3 className="text-sm font-semibold text-muted-foreground px-4">ოთახები</h3>
  <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
    {rooms.map((room) => (
      <RoomCard key={room.id} room={room} onClick={() => handleRoomSelect(room.room_code)} />
    ))}
  </div>
</div>

// Similar sections for: Trivias, Collections, MyTriviaParties
```

4. **Create compact card components for horizontal scroll:**
   - `FriendCard` - Avatar + name (compact)
   - `RoomCard` - Icon + name (compact)  
   - `TriviaCard` - Cover + title (compact)
   - `CollectionCard` - Cover + title (compact)

5. **Render full-screen panel on mobile:**

```typescript
{/* Full-screen search panel */}
<AnimatePresence>
  {open && (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 bg-background"
    >
      {/* Header with search bar and close */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <button onClick={() => setOpen(false)}>
            <ChevronLeft />
          </button>
          <input 
            placeholder="ძებნა..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-muted rounded-full px-4 py-2"
          />
        </div>
      </div>
      
      {/* Content with horizontal lists */}
      <div className="flex-1 overflow-y-auto">
        {/* Friends horizontal scroll */}
        {/* Rooms horizontal scroll */}
        {/* Trivias horizontal scroll */}
        {/* Collections horizontal scroll */}
        {/* MyTriviaParties horizontal scroll */}
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

---

### File 3: Create `src/components/search/SearchHorizontalLists.tsx` (New File)

A dedicated component for the horizontal scrolling sections:

```typescript
interface SearchHorizontalListsProps {
  friends: Friend[];
  rooms: MyRoom[];
  trivias: QuizPost[];
  collections: Collection[];
  onSelectFriend: (id: string) => void;
  onSelectRoom: (code: string) => void;
  onSelectTrivia: (id: string) => void;
  onSelectCollection: (id: string) => void;
}

export function SearchHorizontalLists({ ... }: SearchHorizontalListsProps) {
  return (
    <div className="space-y-6 py-4">
      {/* Friends Section */}
      <HorizontalSection title="მეგობრები" icon={Users}>
        {friends.map((friend) => (
          <FriendMiniCard key={friend.id} friend={friend} onClick={() => onSelectFriend(friend.friendId)} />
        ))}
      </HorizontalSection>

      {/* Rooms Section */}
      <HorizontalSection title="ოთახები" icon={Gamepad2}>
        {rooms.map((room) => (
          <RoomMiniCard key={room.id} room={room} onClick={() => onSelectRoom(room.room_code)} />
        ))}
      </HorizontalSection>

      {/* Trivias Section */}
      <HorizontalSection title="ტრივიები" icon={Sparkles}>
        {trivias.map((trivia) => (
          <TriviaMiniCard key={trivia.id} trivia={trivia} onClick={() => onSelectTrivia(trivia.id)} />
        ))}
      </HorizontalSection>

      {/* Collections Section */}
      <HorizontalSection title="კოლექციები" icon={Folder}>
        {collections.map((collection) => (
          <CollectionMiniCard key={collection.id} collection={collection} onClick={() => onSelectCollection(collection.id)} />
        ))}
      </HorizontalSection>

      {/* MyTriviaParties = Rooms you created (host rooms) */}
      <HorizontalSection title="ჩემი წვეულებები" icon={Crown}>
        {rooms.filter(r => r.is_host).map((room) => (
          <RoomMiniCard key={room.id} room={room} onClick={() => onSelectRoom(room.room_code)} />
        ))}
      </HorizontalSection>
    </div>
  );
}
```

---

## Data Sources

| Section | Hook | Filter |
|---------|------|--------|
| Friends | `useFriends()` | All accepted friends |
| Rooms | `useMyRooms()` | All rooms user is part of |
| Trivias | `useMyQuizPosts()` | User's created trivias |
| Collections | `useMyCollections()` | User's collections |
| MyTriviaParties | `useMyRooms()` | Filter: `is_host === true` |

---

## UI Layout

```text
┌─────────────────────────────────────┐
│ ← [ Search bar input... ]           │
├─────────────────────────────────────┤
│                                     │
│ 👥 მეგობრები                         │
│ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ →     │
│ │ 😀│ │ 😎│ │ 🤓│ │ 😊│ │ 🥳│       │
│ │John│ │Ana│ │Max│ │Eva│ │Tom│      │
│ └───┘ └───┘ └───┘ └───┘ └───┘       │
│                                     │
│ 🎮 ოთახები                          │
│ ┌───────┐ ┌───────┐ ┌───────┐ →     │
│ │Room 1 │ │Room 2 │ │Room 3 │       │
│ │3 👤   │ │5 👤   │ │2 👤   │       │
│ └───────┘ └───────┘ └───────┘       │
│                                     │
│ ✨ ტრივიები                         │
│ ┌───────┐ ┌───────┐ ┌───────┐ →     │
│ │History│ │Science│ │Music  │       │
│ │10 Q   │ │15 Q   │ │8 Q    │       │
│ └───────┘ └───────┘ └───────┘       │
│                                     │
│ 📁 კოლექციები                        │
│ ┌───────┐ ┌───────┐ ┌───────┐ →     │
│ │My Quiz│ │Fun Set│ │Series │       │
│ │3 რაუნ │ │5 რაუნ │ │2 რაუნ │       │
│ └───────┘ └───────┘ └───────┘       │
│                                     │
│ 👑 ჩემი წვეულებები                   │
│ ┌───────┐ ┌───────┐ →               │
│ │Party 1│ │Party 2│                 │
│ │8 👤   │ │12 👤  │                 │
│ └───────┘ └───────┘                 │
│                                     │
└─────────────────────────────────────┘
```

---

## Files Changed Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/pages/Index.tsx` | Modify | Show search icon on mobile header |
| `src/components/search/SpotlightSearch.tsx` | Modify | Add full-screen panel with horizontal lists |
| `src/components/search/SearchHorizontalLists.tsx` | Create | Reusable horizontal scroll sections |
| `src/components/search/SearchMiniCards.tsx` | Create | Compact card components for horizontal scroll |

---

## Expected Result

- Search icon appears before notification bell on mobile
- Clicking search opens full-screen panel (not dialog)
- Panel shows 5 horizontal scrollable sections:
  - Friends (with avatars)
  - Rooms (with participant count)
  - Trivias (with question count)
  - Collections (with round count)
  - MyTriviaParties (host rooms)
- Search input filters all lists simultaneously
- Tapping any item navigates to that item's detail page

