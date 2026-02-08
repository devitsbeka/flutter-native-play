

## Advanced Stats Tab for User Analytics

### Overview

Add a new **"Stats"** tab to the existing User Analytics page that provides deep behavioral insights critical for a public beta release. This requires both database changes (new session tracking table) and a rich new UI tab.

### What Changes

#### 1. New Database Table: `user_sessions`

The current `user_presence` table only tracks status and page -- it has no browser, OS, device, or session duration data. A new `user_sessions` table will capture this:

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Primary key |
| `user_id` | TEXT | User or guest ID |
| `session_start` | TIMESTAMPTZ | When the session began |
| `session_end` | TIMESTAMPTZ | When the session ended (null if still active) |
| `duration_seconds` | INTEGER | Computed duration |
| `browser` | TEXT | e.g. Chrome, Safari, Firefox |
| `os` | TEXT | e.g. iOS, Android, Windows, macOS |
| `device_type` | TEXT | mobile, tablet, desktop |
| `screen_width` | INTEGER | Screen resolution width |
| `screen_height` | INTEGER | Screen resolution height |
| `entry_page` | TEXT | First page visited |
| `exit_page` | TEXT | Last page visited |
| `pages_visited` | INTEGER | Total pages viewed in session |
| `country_code` | TEXT | Country from presence data |
| `is_bounce` | BOOLEAN | True if duration < 10 seconds |
| `created_at` | TIMESTAMPTZ | Record creation time |

RLS: Admin-only read, service-role insert from client tracker.

#### 2. Update Presence Hook to Track Sessions

**File: `src/hooks/useUserPresence.ts`**

Enhance the existing presence hook to:
- Parse `navigator.userAgent` to extract browser, OS, and device type on session start
- Record `session_start` time when user opens the app
- Track pages visited count as user navigates
- On `beforeunload` or `visibilitychange` (hidden for extended period), write the session end with computed duration
- Mark sessions with `is_bounce = true` when duration < 10 seconds
- Use the `user_sessions` table for this data

#### 3. Add Tabs to UserAnalytics Page

**File: `src/pages/admin/UserAnalytics.tsx`**

Transform the page to use two tabs:
- **"Users"** tab (default) -- contains the existing user table, filters, country breakdown, and activity timeline (everything currently shown)
- **"Stats"** tab -- the new comprehensive stats view

#### 4. Create the Stats Tab Component

**New file: `src/components/admin/analytics/StatsTab.tsx`**

This is the main new component with the following sections:

**Section A: Real-time Active Users**
- Currently online (last_seen < 1 minute, status = 'online')
- Active in last 1 hour
- Active in last 3 hours
- Active in last 6 hours
- Active in last 24 hours
- Each shown as a stat card with user count

**Section B: Device and Browser Breakdown**
- Most used browsers (pie chart or horizontal bars): Chrome, Safari, Firefox, etc.
- Operating systems: iOS, Android, Windows, macOS, Linux
- Device types: Mobile vs Tablet vs Desktop
- Top screen resolutions
- Data from `user_sessions` table

**Section C: Session Duration Metrics**
- Average session duration (overall)
- Median session duration
- Average pages per session
- Most visited pages (ranked list with visit counts)
- Average time breakdown by page (which pages keep users engaged)

**Section D: Bounce Rate Panel**
- Total visitors who left in under 10 seconds
- Bounce rate percentage (bounced / total sessions)
- List of recent bounce sessions showing: entry page, device, country, timestamp
- Trend: today's bounce rate vs yesterday

**Section E: Beta Engagement Metrics**
- New users today / this week / this month
- Returning users rate (users who came back after first visit)
- Peak usage hours (heatmap-style visualization)
- User retention: Day 1, Day 3, Day 7 retention rates
- Country distribution of active users
- Feature adoption: which pages/features are most/least used

#### 5. Create a User-Agent Parser Utility

**New file: `src/utils/userAgentParser.ts`**

A lightweight parser (no external library needed) that extracts:
- Browser name and version from `navigator.userAgent`
- OS name from `navigator.userAgent` and `navigator.platform`
- Device type from screen size + touch capability

### Data Flow

```text
User visits app
    |
    v
useUserPresence hook starts
    |
    +--> Parses navigator.userAgent (browser, OS, device)
    +--> Records session_start in user_sessions table
    +--> Starts tracking page navigation count
    |
    v
User navigates between pages
    |
    +--> Increments pages_visited count
    +--> Updates exit_page
    |
    v
User leaves / tab hidden for 5+ min
    |
    +--> Writes session_end, duration_seconds, is_bounce
    +--> Final session record saved
```

### Technical Details

| File | Change |
|------|--------|
| Database migration | Create `user_sessions` table with RLS policies |
| `src/hooks/useUserPresence.ts` | Add session tracking (UA parsing, session start/end, page count) |
| `src/utils/userAgentParser.ts` | New utility for parsing browser/OS/device from user agent |
| `src/pages/admin/UserAnalytics.tsx` | Add tabs (Users / Stats) wrapping existing content + new Stats tab |
| `src/components/admin/analytics/StatsTab.tsx` | New comprehensive stats dashboard component |

### Sections in the Stats Tab (summary)

1. **Real-time presence** -- Online now, 1h, 3h, 6h, 24h user counts
2. **Browser / OS / Device** -- Bar charts showing distribution
3. **Session duration** -- Average time, pages per session, most visited pages
4. **Bounce rate** -- Users who left in under 10 seconds, with details
5. **Beta engagement** -- New vs returning users, retention rates, peak hours, feature adoption

All data is queryable from the new `user_sessions` table combined with existing `user_presence` and `profiles` tables.
