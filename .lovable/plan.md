

## Make Username Clickable on Main Page

### Goal
Make the user's nickname on the main page clickable to open a quick "Change Name" modal, giving users easy access to rename themselves without navigating to settings.

### Changes

#### 1. Create `ChangeNameModal` component
**New file: `src/components/home/ChangeNameModal.tsx`**

A lightweight modal (using the existing `GameModal` component) with:
- An input field pre-filled with the current nickname (max 20 chars)
- A save button (using `ChunkyButton` with "mint" variant, matching existing patterns)
- Calls `supabase.from("profiles").update({ nickname })` on save, then refreshes the profile via `fetchProfile`
- Shows success/error notifications via `useNotificationModal`
- Localized labels using `useLanguage`

#### 2. Update `src/pages/Index.tsx`
- Import the new `ChangeNameModal`
- Add state: `showChangeNameModal`
- Wrap all 3 nickname `<span>` elements (mobile ~line 1462, md-xl ~line 1083, xl+ ~line 1173) in a clickable `motion.button` with hover/tap scale animation
- Each click sets `showChangeNameModal(true)`
- Render `<ChangeNameModal>` alongside the other modals

### Technical Details
- Follows the exact same update pattern used in `SettingsModal.tsx` and `DetailsSettingsMenu.tsx` (Supabase profile update + fetchProfile + notification)
- Only shown for logged-in users (the nickname spans already only render when `user` exists)
- The nickname spans will get a subtle cursor-pointer and hover effect to hint clickability

