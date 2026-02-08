

## Fix: Inline "Remove" Button on Your Leaderboard Entry

### Current Behavior
Tapping your own leaderboard entry opens a full-screen AlertDialog confirmation. Tapping other users opens their profile page.

### New Behavior
- Tapping your own entry reveals an inline "წაშლა" (Remove) button directly on the row
- Tapping the remove button deletes your record and refreshes the leaderboard
- Tapping anywhere else (or the same row again) collapses the button
- Other users' entries still open their profile as before

### Changes

**File: `src/pages/TriviaLobby.tsx`**

1. Replace the `showRemoveDialog` state with an `expandedUserId` state that tracks which row is "expanded" to show the remove button
2. Remove the `AlertDialog` import and its JSX entirely
3. When the current user taps their own row:
   - If the row is collapsed, expand it to reveal a red "წაშლა" button on the right side (replacing the score display)
   - If the row is already expanded, collapse it back
4. The remove button calls `removeFromLeaderboard()` directly (no extra confirmation modal)
5. Add a subtle animation (slide-in from right) for the remove button using framer-motion

### Visual Layout of Expanded Row

```text
+-----------------------------------------------+
| #10  [avatar]  Gloria       [ წაშლა ]         |
|                7ქულა                           |
+-----------------------------------------------+
```

The score gets replaced by a red "წაშლა" button when the row is expanded. This keeps the interaction fast and inline.

### Technical Details
- State: `expandedUserId: string | null` replaces `showRemoveDialog: boolean`
- Remove the `AlertDialog` component and its imports
- The `isRemoving` state stays to disable the button during the async delete
- On successful removal, `expandedUserId` resets to `null`
- `onClick` for non-current-user rows remains `openProfile(entry.user_id)`

