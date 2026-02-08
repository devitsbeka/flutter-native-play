

## Filter Out Deleted Accounts from Search Results

### Problem
Deleted accounts (with nickname "[წაშლილი]") are appearing in search results when searching for friends. The `searchUsers` function in `FriendsContext.tsx` queries the `profiles` table but does not filter out these deleted accounts. The FriendsStoriesBar already filters them (via the `fetchFriends` logic), but the search endpoint does not.

### Solution
Add a `.neq("nickname", "[წაშლილი]")` filter to the `searchUsers` query in `FriendsContext.tsx`. This ensures deleted accounts never appear in search results across all modals that use this function (AddFriendModal, InviteFriendsModal).

### Technical Details

| File | Change |
|------|--------|
| `src/contexts/FriendsContext.tsx` | Add `.neq("nickname", "[წაშლილი]")` to the Supabase query in `searchUsers` (line 258) |

The updated query will be:

```typescript
const { data, error } = await supabase
  .from("profiles")
  .select("user_id, nickname, avatar_url, country_code")
  .ilike("nickname", `%${query}%`)
  .neq("user_id", user.id)
  .neq("nickname", "[წაშლილი]")   // <-- new line
  .limit(10);
```

This single change fixes deleted accounts appearing in both the AddFriendModal and InviteFriendsModal since they both use the same `searchUsers` function from the FriendsContext.
