

## Fix: Green "Friend Added" Button + Remove Date from Feed Cards

### Change 1: Make "friend added" button green (not purple)

Both `PlayerFeedItem.tsx` and `CreatorPortfolioCard.tsx` have a `renderFriendButton()` function with a `friends` case. The current styling uses `variant="outline"` which brings in purple-themed base styles from the Button component that compete with the green overrides. Additionally, the `disabled` attribute adds `opacity-50`, making the green nearly invisible.

**Fix**: Replace the button styling to use explicit green background, green border, and remove the competing `variant="outline"` base styles. Use `variant="ghost"` or override everything explicitly so the green is clearly visible. Also set full opacity since it's a status indicator, not a disabled action.

**Files**:
- `src/components/social/PlayerFeedItem.tsx` -- update the `friends` case in `renderFriendButton()` (around line 137-145)
- `src/components/social/CreatorPortfolioCard.tsx` -- update the `friends` case in `renderFriendButton()` (around line 88-98)

Updated button styling for both files:
```tsx
case 'friends':
  return (
    <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
      <UserCheck className="w-5 h-5 text-white" />
    </div>
  );
```

This gives a solid green rounded-square icon matching the same shape as the current purple one, but clearly green. No `disabled` attribute so no opacity reduction.

### Change 2: Remove date ("დაახლოებით 11 საათი") from feed cards

The relative time is shown in the subtitle line under the player name ("კოლექცია . დაახლოებით 11 საათი"). The user wants to remove the date portion entirely, keeping only the type label ("ტრივია" or "კოლექცია").

**Files**:
- `src/components/social/PlayerFeedItem.tsx` -- remove the `timeAgo` variable usage and the dot separator from the subtitle (lines 196-203 and 243-248)
- `src/components/social/CreatorPortfolioCard.tsx` -- remove the `timeAgo` variable usage and the dot separator from the subtitle (lines 51-55 and 174-179)

The subtitle will simply show the type icon + label without any timestamp.

### Summary

| File | Change |
|---|---|
| `PlayerFeedItem.tsx` | Green solid icon for "friends" state; remove date from subtitle |
| `CreatorPortfolioCard.tsx` | Green solid icon for "friends" state; remove date from subtitle |

