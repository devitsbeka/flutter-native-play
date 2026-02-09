
## Fix: Broken Avatar on Profile Page (and other locations)

### Root Cause

The **Profile page** (`src/pages/Profile.tsx`, line 111) renders the avatar using a raw `<img>` tag:

```
<img src={profile.avatar_url || "/placeholder.svg"} />
```

This does NOT pass the URL through `resolveAvatarUrl()`, which is needed to convert local asset paths (like `/src/assets/avatars/mascot-avatar-3.png`) into actual bundled URLs. The **Home screen** works because `AvatarCircle` calls `resolveAvatarUrl()` internally.

Similarly, several **admin components** use plain `<AvatarImage>` instead of `<ResolvedAvatarImage>`, which causes the same issue there.

### Affected Files

| File | Issue |
|------|-------|
| `src/pages/Profile.tsx` (line 111) | Raw `<img src={profile.avatar_url}>` -- **main user-facing bug** |
| `src/components/admin/analytics/UserDetailModal.tsx` | Uses `AvatarImage` instead of `ResolvedAvatarImage` |
| `src/components/admin/analytics/InsightsTab.tsx` | Uses `AvatarImage` instead of `ResolvedAvatarImage` |
| `src/components/admin/analytics/UserAnalyticsTable.tsx` | Uses `AvatarImage` instead of `ResolvedAvatarImage` |
| `src/components/admin/GameStatsModal.tsx` | Uses `AvatarImage` instead of `ResolvedAvatarImage` |
| `src/components/admin/AdsAnalyticsModal.tsx` | Uses `AvatarImage` instead of `ResolvedAvatarImage` |

### Changes

**1. `src/pages/Profile.tsx`** -- Fix the main avatar display
- Import `resolveAvatarUrl` from `@/utils/avatarUtils`
- Wrap the `<img>` src: `src={resolveAvatarUrl(profile.avatar_url) || "/placeholder.svg"}`

**2. Admin components (5 files)** -- Swap `AvatarImage` to `ResolvedAvatarImage`
- Replace `import { AvatarImage }` with `import { ResolvedAvatarImage }` 
- Replace `<AvatarImage src={...} />` with `<ResolvedAvatarImage src={...} />`

This ensures every avatar rendering location uses the same resolution pipeline, so local asset paths, Vite-hashed paths, and external URLs all work correctly.
