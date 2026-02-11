

## Fix: Admin Avatar Upload, Profile Edit, and Dialog Visibility

### Problems Found

1. **Avatar upload blocked by storage RLS**: The `avatars` bucket only allows users to upload to their own folder (`auth.uid() = foldername`). When an admin uploads to a mascot's folder (e.g., `mascot-id/avatar.png`), the policy rejects it.

2. **Profile update blocked by table RLS**: The `profiles` table UPDATE policy only allows `auth.uid() = user_id`. An admin cannot update another user's profile row.

3. **Edit dialog shows dark overlay but no content**: The `AdminProfileEditor` dialog has z-index and positioning issues causing the content to not render visibly on top of the profile modal.

### Fixes

#### 1. Database Migration: Add Admin RLS Policies

Add two new policies:

**Storage** - Allow admins to upload/update avatars for any user:
```sql
CREATE POLICY "Admins can upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update avatars"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND has_role(auth.uid(), 'admin'));
```

**Profiles table** - Allow admins to update any profile:
```sql
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));
```

#### 2. Fix AdminProfileEditor Dialog (`src/components/profile/AdminProfileEditor.tsx`)

The current approach wraps `DialogContent` in a manual `div` with positioning overrides, which conflicts with Radix Dialog's portal behavior. Fix by:

- Removing the extra wrapper `div` around `DialogContent`
- Adding proper z-index classes directly to `DialogContent`
- Ensuring the overlay and content both render above `z-[100]` (the profile modal)

#### 3. Sync State in AdminProfileEditor

The component initializes state with `useState(currentNickname)` but doesn't update when props change (e.g., when reopening). Add `useEffect` or key-based reset to sync state when the dialog opens with new data.

### Files Changed

| File | Change |
|------|--------|
| Database migration | Add admin RLS for avatars storage + profiles table |
| `src/components/profile/AdminProfileEditor.tsx` | Fix dialog rendering, sync state on prop changes |

