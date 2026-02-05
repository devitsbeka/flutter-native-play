
# Plan: Add Edit Button to Trivia and Collection Lobby Pages

## Overview
When a user views their own trivia or collection (where they are the owner), they should see an edit button that opens the existing edit modal to allow modifications.

## Current Architecture
- **TriviaLobby** (`src/pages/TriviaLobby.tsx`): Displays individual trivia details with play button
- **CollectionLobby** (`src/pages/CollectionLobby.tsx`): Displays collection with rounds list
- **useTriviaLobby** hook: Returns `trivia.user_id` to identify owner
- **useCollectionLobby** hook: Returns `collection.user_id` to identify owner
- **EditQuizModal** (`src/components/social/EditQuizModal.tsx`): Existing full-featured edit modal for trivias
- **EditRoundModal** (`src/components/social/EditRoundModal.tsx`): Existing edit modal for rounds within collections
- Both pages already have creator avatar buttons in the top right

## Implementation

### File 1: `src/pages/TriviaLobby.tsx`

**Changes:**
1. Import `useAuth` to get current user
2. Import `EditQuizModal` component (lazy loaded)
3. Add state for edit modal: `const [isEditModalOpen, setIsEditModalOpen] = useState(false)`
4. Check if user is owner: `const isOwner = user?.id === trivia?.user_id`
5. Add edit button (Pencil icon) next to creator avatar in header (visible only when isOwner)
6. Render EditQuizModal when open

**UI Location:** Add a pencil icon button to the left of the creator avatar in the hero section header

### File 2: `src/pages/CollectionLobby.tsx`

**Changes:**
1. Import `useAuth` to get current user
2. Import `EditQuizModal` for collection editing and `EditRoundModal` for round editing (lazy loaded)
3. Add states:
   - `const [isEditCollectionOpen, setIsEditCollectionOpen] = useState(false)`
   - `const [editingRound, setEditingRound] = useState<any>(null)`
4. Check if user is owner: `const isOwner = user?.id === collection?.user_id`
5. Add edit button in hero header (visible only when isOwner)
6. Make each round row clickable to open EditRoundModal when user is owner
7. Render both edit modals

**UI Location:** 
- Edit collection button: pencil icon in hero header
- Edit rounds: clicking on a round row opens EditRoundModal

## Technical Details

### TriviaLobby Edit Button Position
```text
+--------------------------------------------------+
| [←]                Title              [✏️] [👤]   |
+--------------------------------------------------+
```
The edit button appears between the back button and the creator avatar.

### CollectionLobby Edit Button Position
Same header layout, plus each round in the list becomes clickable for editing.

### Lazy Loading
Both edit modals should be lazy loaded to avoid increasing initial bundle size:
```tsx
const EditQuizModal = lazy(() => 
  import("@/components/social/EditQuizModal").then(m => ({ default: m.EditQuizModal }))
);
```

### Ownership Check
```tsx
const { user } = useAuth();
const isOwner = user?.id === trivia?.user_id;
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/TriviaLobby.tsx` | Add edit button and EditQuizModal for owner |
| `src/pages/CollectionLobby.tsx` | Add edit button for collection and round editing for owner |
