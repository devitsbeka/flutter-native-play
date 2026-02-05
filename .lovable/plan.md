
# Plan: Global Avatar Modal System

## Goal
Create a global context for opening the Avatar Modal ("შენი ავატარი" screen) from anywhere in the app when users click on their own avatar, ensuring selfie/upload functionality works consistently.

---

## Current State

The `AvatarModal` component exists and works correctly, but it's embedded locally in:
- Home screen (`Index.tsx`)
- Side menu (`SideMenuDrawer.tsx`) 
- Profile page (`Profile.tsx`)

This creates maintenance issues and potential inconsistencies.

---

## Technical Changes

### 1. Create AvatarModalContext
**New file:** `src/contexts/AvatarModalContext.tsx`

Create a global context similar to `PlayerProfileContext`:
- `openAvatarModal()` - function to open the modal
- `closeAvatarModal()` - function to close the modal
- `isOpen` - current state

The context will render the single `AvatarModal` instance at the app root level.

---

### 2. Add Provider to App.tsx
**File:** `src/App.tsx`

Wrap the app with `AvatarModalProvider` inside the existing provider tree (after `AuthProvider` since AvatarModal needs auth).

---

### 3. Remove Local AvatarModal Instances

**Files to update:**

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Remove local `isAvatarModalOpen` state and `<AvatarModal>` component. Use `useAvatarModal()` hook instead. |
| `src/components/home/SideMenuDrawer.tsx` | Remove local state and modal. Use hook. |
| `src/pages/Profile.tsx` | Remove `showAvatarGenerator` state and modal. Use hook. |

---

### 4. Update Avatar Click Handlers

In all places where user clicks on their own avatar:

```tsx
// Before
onClick={() => setIsAvatarModalOpen(true)}

// After
const { openAvatarModal } = useAvatarModal();
onClick={() => user ? openAvatarModal() : navigate("/auth")}
```

---

### 5. Make SmartAvatar Self-Opening for Own Profile

**File:** `src/components/shared/SmartAvatar.tsx`

Add optional prop `isCurrentUser` that when true, clicking opens the avatar modal instead of the profile modal:

```tsx
interface SmartAvatarProps {
  // ... existing props
  userId?: string;        // User ID for profile opening
  isCurrentUser?: boolean; // If true, opens avatar modal instead
}
```

This enables consistent behavior across leaderboards, friend lists, etc.

---

## File Changes Summary

| Action | File |
|--------|------|
| Create | `src/contexts/AvatarModalContext.tsx` |
| Modify | `src/App.tsx` |
| Modify | `src/pages/Index.tsx` |
| Modify | `src/components/home/SideMenuDrawer.tsx` |
| Modify | `src/pages/Profile.tsx` |
| Modify | `src/components/shared/SmartAvatar.tsx` |

---

## User Experience

After these changes:
1. Clicking avatar on home screen → Opens "შენი ავატარი" modal
2. Clicking avatar in side menu → Opens "შენი ავატარი" modal  
3. Clicking avatar on profile page → Opens "შენი ავატარი" modal
4. Selfie button → Opens camera (unchanged)
5. Upload button → Opens file picker (unchanged)
6. All functionality works identically from any entry point
