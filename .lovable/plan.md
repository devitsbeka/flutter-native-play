

# Auto-Start Game After Avatar Setup

## Problem
When a user clicks Play but has no avatar, they're shown the avatar modal. After setting their avatar, they're just returned to the home screen instead of being taken directly into the game (VS screen / matchmaking).

## Solution
Add an `onComplete` callback to the avatar modal flow so that when triggered from the Play button, saving an avatar navigates the user to `/game` instead of just closing the modal.

## Changes

### 1. `src/contexts/AvatarModalContext.tsx`
- Add an optional `onComplete` callback to the context
- Update `openAvatarModal` to accept an optional callback: `openAvatarModal(onComplete?: () => void)`
- Store the callback in a ref
- Pass an `onComplete` prop to `AvatarModal`; when avatar is saved, call `onComplete` (if set) instead of just closing

### 2. `src/components/home/AvatarModal.tsx`
- Accept a new optional `onComplete?: () => void` prop
- In `saveAvatar`, `saveOriginalPhoto`, `selectPreviousAvatar`, and `selectDefaultAvatar` (the save functions that call `onClose()`) -- after successful save, call `onComplete()` if provided, otherwise call `onClose()`

### 3. `src/pages/Index.tsx`
- In `handlePlayClick`, when `!profile?.avatar_url`, pass a callback to `openAvatarModal` that navigates to `/game`:
  ```
  openAvatarModal(() => navigate("/game"));
  ```

## Technical Details

**AvatarModalContext changes:**
```typescript
interface AvatarModalContextType {
  openAvatarModal: (onComplete?: () => void) => void;
  closeAvatarModal: () => void;
  isOpen: boolean;
}

// Store pending callback in a ref
const onCompleteRef = useRef<(() => void) | null>(null);

const openAvatarModal = useCallback((onComplete?: () => void) => {
  onCompleteRef.current = onComplete || null;
  setIsOpen(true);
}, []);

const closeAvatarModal = useCallback(() => {
  setIsOpen(false);
  onCompleteRef.current = null;
}, []);

// Pass onComplete to AvatarModal
<AvatarModal
  isOpen={isOpen}
  onClose={closeAvatarModal}
  onComplete={() => {
    const cb = onCompleteRef.current;
    setIsOpen(false);
    onCompleteRef.current = null;
    cb?.();
  }}
/>
```

**AvatarModal changes:**
- New prop: `onComplete?: () => void`
- In each save function, replace `onClose()` with: `onComplete ? onComplete() : onClose()`

**Index.tsx change:**
```typescript
} else if (!profile?.avatar_url) {
  openAvatarModal(() => navigate("/game"));
}
```

## Files to edit
1. `src/contexts/AvatarModalContext.tsx` -- Add onComplete callback support
2. `src/components/home/AvatarModal.tsx` -- Use onComplete when saving avatar
3. `src/pages/Index.tsx` -- Pass navigate callback when opening avatar modal from play button
