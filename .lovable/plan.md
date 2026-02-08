

## Clickable Stats: Full User Analytics Dashboard

### Overview

Transform the four top dashboard stat cards into clickable elements that open detailed analytics views. Each stat card will navigate to a dedicated detail page or expand into a rich drill-down showing all users, their statuses, locations, time spent, and activity metrics.

### What Changes

#### 1. Make ALL Dashboard Stats Clickable

**File: `src/pages/admin/Dashboard.tsx`**

Currently only the "Online" stat links to `/admin/users`. We will:
- Make all 4 stat cards clickable (Online, Games Today, Ads Watched, App Store)
- Add a new route `/admin/user-analytics` for the comprehensive user analytics page
- The "Online" stat card navigates to the new analytics page instead of the basic `/admin/users`

#### 2. Create a New Comprehensive User Analytics Page

**New file: `src/pages/admin/UserAnalytics.tsx`**

A full-featured analytics page with multiple sections:

**Header Stats Bar** (top row of quick metrics):
- Total registered users (from `profiles`)
- Currently online (from `user_presence` with status='online' and last_seen < 2min)
- Away users
- Offline users (seen in last 24h but not active)
- Guest vs Registered breakdown

**User Table** with columns:
- Avatar + Nickname (with VIP crown badge)
- Status indicator (green dot = online, yellow = away, gray = offline)
- Country flag + country code
- Current page they're viewing
- Last seen (relative time, e.g., "2 minutes ago")
- Total games played (from `profiles.games_played`)
- Member since (from `profiles.created_at`)
- Coins + Gems balance

**Filters and Search**:
- Search by nickname
- Filter by status: All / Online / Away / Offline
- Filter by country/region
- Filter by VIP / Free
- Sort by: Last seen, Games played, Coins, Join date

**Country Breakdown Section**:
- Horizontal bar chart showing users per country
- Click a country to filter the user table

**Activity Timeline** (bottom section):
- Games played today vs yesterday vs last week
- Peak hours chart (when most users are online)

#### 3. Create Detailed Game Stats Modal

**New file: `src/components/admin/GameStatsModal.tsx`**

Opens when clicking the "Games Today" stat. Shows:
- Total games played today (category + multiplayer)
- Breakdown by game type (solo category, room multiplayer)
- Top 10 players by games today
- Games by category popularity

#### 4. Create Ads Analytics Modal

**New file: `src/components/admin/AdsAnalyticsModal.tsx`**

Opens when clicking the "Ads Watched" stat. Shows:
- Total ads watched today
- Top ad watchers (leaderboard)
- Average ads per user
- Ads trend (today vs yesterday)

#### 5. Register New Route

**File: `src/App.tsx`**

Add the new `UserAnalytics` page to the admin routes:
```
<Route path="user-analytics" element={<UserAnalytics />} />
```

#### 6. Update Admin Sidebar Navigation

**File: `src/pages/Admin.tsx`**

Change the existing "Users" nav item to point to the new analytics page and rename it to better reflect its expanded scope.

### Data Sources (all existing -- no new tables needed)

| Data | Source Table |
|------|-------------|
| User profiles | `profiles` (nickname, avatar, country, coins, gems, games_played, created_at) |
| Online status | `user_presence` (status, current_page, last_seen, country_code) |
| VIP status | `vip_subscriptions` (user_id, expires_at, vip_tier) |
| Games played today | `game_plays` (played_at) + `room_games` (created_at) |
| Ads watched | `user_daily_plays` (plays_from_ads, ads_watched_today) |

### Technical Details

| File | Change |
|------|--------|
| `src/pages/admin/Dashboard.tsx` | Make all 4 stat cards clickable with navigation links |
| `src/pages/admin/UserAnalytics.tsx` | New comprehensive user analytics page with table, filters, country breakdown |
| `src/components/admin/GameStatsModal.tsx` | New modal for game stats drill-down |
| `src/components/admin/AdsAnalyticsModal.tsx` | New modal for ads analytics drill-down |
| `src/App.tsx` | Add `/admin/user-analytics` route |
| `src/pages/Admin.tsx` | Update sidebar nav item label and route |

### User Experience

1. Admin opens Dashboard -- sees the 4 stat cards at top
2. Clicks "Online (4)" card -- navigates to `/admin/user-analytics` showing full user table with all users, statuses, locations, time data
3. Clicks "Games Today" card -- opens a modal with game breakdown and top players
4. Clicks "Ads Watched" card -- opens a modal with ads analytics
5. On the User Analytics page, admin can search users, filter by status/country/VIP, sort by various columns, and see country distribution

