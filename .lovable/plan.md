

## User Deep Dive Modal - Analytics Drill-Down

### Overview
When you click on any user row in the User Analytics table, a full-screen dialog will open showing comprehensive behavioral analytics for that user. This gives you everything you need to understand how each user interacts with the app.

### What You'll See

The modal will have a **header** showing the user's profile (avatar, nickname, VIP status, country, join date, coins/gems balance) and **4 tabbed sections** below:

---

#### Tab 1: Overview (Summary Cards)
Quick-glance stats at the top:
- Total games played (matchmaking + category + rooms)
- Win rate (from game_sessions won/lost)
- Total time spent in app (sum of session durations)
- Number of return visits (unique session days)
- Current streak and best streak
- Favorite category (most played)
- Average session duration
- Bounce rate (% of sessions under 10s)

#### Tab 2: Game History
- **Matchmaking Games** table: opponent, score, result (won/lost), date (from `game_sessions`)
- **Category Games** table: category name, level, score, stars earned, date (from `game_plays`)
- **Room Games** table: room code, players, score, won/lost, date (from `room_match_history`)
- Each section shows the last 20 entries, sorted by most recent

#### Tab 3: Category Breakdown
- Bar chart or list showing which categories the user plays most (from `game_plays` grouped by `category_id`)
- For each category: total plays, average score, accuracy rate (score/total_questions), highest level reached
- This tells you which content resonates with each user

#### Tab 4: Sessions & Behavior
- **Session Timeline**: list of recent sessions with start time, duration, pages visited, entry/exit page, device, browser (from `user_sessions`)
- **Activity Pattern**: which days and hours this user is most active
- **Device Info**: what devices/browsers they use
- **Daily Play Usage**: plays used per day, ads watched (from `user_daily_plays`)

---

### Technical Details

| Component | Description |
|-----------|-------------|
| **New file**: `src/components/admin/analytics/UserDetailModal.tsx` | Main modal component with tabs and data fetching |
| **Edit**: `src/components/admin/analytics/UserAnalyticsTable.tsx` | Add `onClick` handler to each user row + pass selected user callback |
| **Edit**: `src/pages/admin/UserAnalytics.tsx` | Add state for selected user and render the modal |

#### Data Queries (all filtered by `user_id`)

```text
1. game_sessions       -> matchmaking history (opponent, scores, won/lost)
2. game_plays           -> category plays (category_id, level, score, stars)
3. room_match_history   -> room games (filter player_scores JSON by user_id)
4. user_sessions        -> session behavior (duration, pages, device, bounce)
5. user_daily_plays     -> daily play usage and ad watches
6. categories           -> category names for display
7. profiles             -> already available from parent (coins, gems, streak, etc.)
```

#### UI Pattern
- Uses the existing `Dialog` component (same pattern as `GameStatsModal`)
- Full-width dialog (`max-w-4xl`) with `ScrollArea` for content
- `Tabs` component for the 4 sections
- Row click makes the entire row a clickable surface with hover cursor
- Loading spinner per tab while data fetches

#### Key Metrics Calculated Client-Side
- **Win rate**: `game_sessions WHERE status = 'won'` / total
- **Total time spent**: `SUM(user_sessions.duration_seconds)`
- **Return visits**: count of unique session dates
- **Favorite category**: most frequent `category_id` in `game_plays`
- **Category accuracy**: `AVG(score / total_questions)` per category

