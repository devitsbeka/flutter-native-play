

## Upgrade User Analytics to Real-Time Actionable Dashboard

### Problems Found

1. **Data IS loading** (63 real users in DB, 62 shown -- off by 1 due to timing), but:
   - The "Updated Xs ago" counter is static -- it only recalculates when the component re-renders, not every second, so it always shows "0s ago"
   - No Supabase realtime subscription -- relies solely on 30s polling, meaning a new signup can take up to 30s to appear
   - No visual indicator that data refreshed (no flash/animation)

2. **The dashboard is just a user list, not analytics.** You have rich data (24 signups today, 68 games, 22 unique players, 50 sessions) but it's hidden behind a flat table. There's no way to see trends, funnels, or retention at a glance.

### Solution: Transform into a Real Analytics Dashboard

#### Part 1: Fix Real-Time Updates

**File: `src/pages/admin/UserAnalytics.tsx`**
- Add a Supabase realtime subscription on the `profiles` table to instantly detect new signups (INSERT events trigger immediate re-fetch)
- Add a 1-second interval timer that updates the "Updated Xs ago" counter live
- Flash the stat cards briefly when values change (e.g., total users goes from 62 to 63)

#### Part 2: Add Actionable Analytics Cards (New Users Tab)

**File: `src/pages/admin/UserAnalytics.tsx`** -- Add a third tab: "Insights"

**New file: `src/components/admin/analytics/InsightsTab.tsx`**

This tab will show 4 key sections, all derived from existing data (no new tables needed):

1. **Signup Trend** (last 7 days bar chart)
   - Daily signup count from `profiles.created_at`
   - Today's count highlighted vs yesterday
   - "Growth" percentage (today vs yesterday)

2. **User Engagement Funnel**
   - Total signups → Played at least 1 game → Played 5+ games → Played 10+ games
   - Shows conversion rate at each step
   - Helps you see where users drop off

3. **Today's New Users** (mini cards, not a table)
   - Each new user today shown as a card with: name, time since signup, games played since joining, coins earned
   - Sorted by signup time (newest first)
   - Live badge if they're currently online

4. **Retention Overview**
   - Day 0 (signed up today, played today): X%
   - Users who signed up yesterday and came back today: X%
   - Week 1 retention: users from 7 days ago who were active in last 24h
   - Simple visual with percentages

#### Part 3: Improve the Users Tab

**File: `src/components/admin/analytics/UserAnalyticsTable.tsx`**
- Add a "NEW" badge next to users who signed up today
- Sort online users to the top by default

### Technical Details

- Realtime subscription uses `postgres_changes` on `profiles` table (INSERT event)
- The "Updated ago" counter uses a separate `useState` + `setInterval(1000)` that reads from the `lastUpdated` ref
- Engagement funnel queries `profiles.games_played` field (already fetched, no extra DB calls)
- Retention calculation uses `profiles.created_at` cross-referenced with `user_presence.last_seen`
- Signup trend aggregates `profiles.created_at` by date (single query, already in memory)
- All new analytics are computed from data already fetched -- no additional database queries needed for the funnel and trend sections

### No Database Changes Required
All the data needed is already in `profiles`, `user_presence`, and `game_plays` tables.

