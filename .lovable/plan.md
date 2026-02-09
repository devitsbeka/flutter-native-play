

## Filter Out Admins and Mascot Accounts from User Analytics

### Problem
The User Analytics page shows ALL accounts including admin accounts (beka, TriviaMaste, Beka) and the 16 mascot/fake accounts (Giorgi, Nika, Tornike, Nino, Saba, Salome, Dato, Keti, Irakli, Tekla, etc.). This pollutes the analytics with non-real-user data.

### Solution
Filter out both groups at data fetch time so they never appear in the user table, stats, or country breakdown.

### Accounts to Exclude

**Admins** (from `user_roles` table):
- Fetch admin user IDs dynamically via `user_roles` where `role = 'admin'`

**Mascots** (hardcoded structured UUIDs):
- Tornike, Nino, Saba, Salome, Dato, Keti, Irakli, Tekla (these have recognizable patterned UUIDs like `b1a2c3d4-...`)
- Giorgi (`71eb3fac-...`), Nika (`dbf8dbc0-...`)

### Changes

**File: `src/pages/admin/UserAnalytics.tsx`**

1. Define a constant set of known mascot user IDs at the top of the file
2. In `fetchAllUsers()`, also fetch admin IDs from `user_roles` table
3. After mapping profiles, filter out any user whose ID is in the admin set or mascot set
4. This affects all downstream computed values (stats, country breakdown, filtered list) automatically since they derive from the `users` state

**File: `src/components/admin/analytics/StatsTab.tsx`**

1. Same approach: fetch admin IDs from `user_roles`, combine with mascot IDs
2. Filter `sessions` and `presenceData` to exclude those user IDs before computing metrics
3. This ensures session duration, bounce rate, engagement, and device metrics only reflect real users

### Result
- User count, online/offline stats, country breakdown -- all reflect real users only
- Stats tab (session duration, bounce rate, engagement) -- excludes admin/mascot sessions
- No UI changes needed, just cleaner data

