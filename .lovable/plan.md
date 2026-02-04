
# Empty State UI Improvements for Rooms and Trivias

## Overview

When users have no rooms or no trivias, the current UI still shows the search/filter bar at the top, which is unnecessary. The empty state should be cleaner with the "Add" button integrated into the empty state below the icon and message.

## Changes Summary

### 1. Rooms Tab Empty State (`src/components/team/MyRoomsSection.tsx`)
- **Icon**: Replace `glitchIcon` with `dance-floor.png` 
- **Text**: Update to "ოთახები ჯერ არ გაქვს" for the "all" filter
- **Add Button**: Include a "+ ოთახი" button inside the empty state

### 2. My Trivia Tab Empty State (`src/components/social/MyTriviaTab.tsx`)
- **Icon**: Use `trivia-buzzer.png` for trivia context (already have `glitchIcon`, need trivia-specific)
- **Text**: Update to "ტრივიები ჯერ არ გაქვს"
- **Add Button**: Include a "+ ტრივია" button inside the empty state

### 3. Hide Filter Bar When Empty (`src/pages/TeamV2.tsx`)
- Pass `hasContent` information from `MyRoomsSection` and `MyTriviaTab` back to parent
- Conditionally hide `UnifiedFiltersBar` when there's no content

## Technical Implementation

### File: `src/components/team/MyRoomsSection.tsx`

1. Import `dance-floor.png` asset
2. Replace `glitchIcon` with `danceFloor` in empty state
3. Update empty state message for "all" filter
4. Add callback prop to notify parent about room count
5. Add "+ ოთახი" button inside empty state

```tsx
// Import dance-floor asset
import danceFloor from "@/assets/dance-floor.png";

// In empty state render (when not showing onboarding)
<motion.div className="flex flex-col items-center py-12 px-6">
  <div className="w-20 h-20 rounded-2xl overflow-hidden mb-4">
    <img src={danceFloor} alt="" className="w-full h-full object-contain" />
  </div>
  <p className="text-muted-foreground text-sm text-center mb-6">
    {activeFilter === "all" && "ოთახები ჯერ არ გაქვს"}
    {/* ... other filter messages */}
  </p>
  {onCreateRoom && activeFilter === "all" && (
    <ChunkyButton onClick={onCreateRoom}>+ ოთახი</ChunkyButton>
  )}
</motion.div>
```

### File: `src/components/social/MyTriviaTab.tsx`

1. Import `trivia-buzzer.png` asset  
2. Replace `glitchIcon` with `triviaBuzzer` in empty state
3. Update empty state text to "ტრივიები ჯერ არ გაქვს"
4. Add "+ ტრივია" button inside empty state

```tsx
// Import trivia-buzzer asset
import triviaBuzzer from "@/assets/trivia-buzzer.png";

// In empty state render
<motion.div className="flex flex-col items-center py-16 px-6">
  <div className="w-20 h-20 rounded-2xl overflow-hidden mb-4">
    <img src={triviaBuzzer} alt="" className="w-full h-full object-contain" />
  </div>
  <h3 className="text-lg font-semibold mb-2">ტრივიები ჯერ არ გაქვს</h3>
  <p className="text-muted-foreground text-center text-sm max-w-xs mb-6">
    {description}
  </p>
  {onCreateQuiz && (
    <ChunkyButton onClick={onCreateQuiz}>+ ტრივია</ChunkyButton>
  )}
</motion.div>
```

### File: `src/pages/TeamV2.tsx`

1. Add hooks to track if rooms/trivias are empty
2. Conditionally render `UnifiedFiltersBar` only when there's content

```tsx
// Import hooks for checking content
import { useMyRooms } from "@/hooks/useMyRooms";
import { useMyQuizPosts } from "@/hooks/useSocialFeed";
import { useMyCollections } from "@/hooks/useCollections";

// In component
const { rooms } = useMyRooms({ limit: 1 }); // Just need to check if any exist
const { data: myPosts } = useMyQuizPosts();
const { data: myCollections } = useMyCollections();

const hasRooms = rooms.length > 0;
const hasTrivias = (myPosts?.length || 0) > 0 || (myCollections?.length || 0) > 0;

// Conditional render of filter bar
{activeTab === "rooms" && hasRooms && (
  <UnifiedFiltersBar ... />
)}

{activeTab === "my-content" && hasTrivias && (
  <UnifiedFiltersBar ... />
)}
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/team/MyRoomsSection.tsx` | Import dance-floor icon, update empty state with new icon, text, and add button |
| `src/components/social/MyTriviaTab.tsx` | Import trivia-buzzer icon, update empty state with new icon, text, and add button |
| `src/pages/TeamV2.tsx` | Add content hooks, conditionally hide filter bar when empty |
