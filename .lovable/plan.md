

## Seed Leaderboard Play Records for All Mascot Trivia Posts

### Problem

Each mascot trivia post has a fake `plays_count` (20-99) but almost zero actual records in the `quiz_post_plays` table. The leaderboard reads from `quiz_post_plays`, so it appears empty despite the play counter suggesting high activity.

### Solution

Insert play records into `quiz_post_plays` for all 32 mascot trivia posts. For each post, the 7 other mascot accounts (everyone except the post creator) will appear as players with varied scores. This gives exactly 7 unique leaderboard entries per post -- well within the 5-20 range requested.

Scores will be distributed realistically across the 0-7 range (each trivia has 7 questions), with variety: some players score high (6-7), some mid-range (3-5), and some low (1-2). Played dates will be spread over the past 2-4 weeks.

### Score Distribution Strategy

Each post gets 7 players with scores following this pattern to look natural:
- 1 top scorer: 7/7
- 1 strong: 6/7
- 2 mid-range: 4-5/7
- 2 lower: 2-3/7
- 1 weak: 1/7

The actual scores rotate per post so the same mascot isn't always #1.

### Mascot User IDs

| Mascot | User ID |
|--------|---------|
| Giorgi | `71eb3fac-ba7c-4e7e-8b5e-02a21323e76e` |
| Mariami | `06f96912-ddc0-4a02-abc2-21817b4e9d20` |
| Nika | `dbf8dbc0-5e95-4870-8b47-a043ead0fb9f` |
| Ana | `2574663a-d951-4475-9feb-60fef89caf9d` |
| Daviti | `af7699b1-ce81-4c39-8693-624ce0c20ad1` |
| Elene | `9b9330ae-740f-4b53-8e40-9202ce3660c9` |
| Luka | `7570d628-619b-434c-8d5c-fa6007eaa43f` |
| Tamari | `d11948a8-afc0-4203-8020-0f1c800f17bb` |

### Posts to Seed (32 total)

All posts from all 8 mascot accounts. For each post, the 7 mascots who did NOT create it will have a play record inserted.

### Technical Details

**Database migration only -- no code changes needed.**

A single SQL migration that:

1. Deletes any existing mascot-to-mascot play records (to avoid duplicates on re-run)
2. Inserts 7 play records per post (224 total rows = 32 posts x 7 players each)
3. Each INSERT specifies: `user_id` (player), `post_id`, `score` (0-7), and `played_at` (varied dates in the past 2-4 weeks)

The score assignments rotate so that across different posts, different mascots appear as top scorers -- making leaderboards look organic and varied.

### What the User Will See

- Every mascot trivia lobby page will now show 7 players in the leaderboard
- Scores will range from 1/7 to 7/7 with realistic variety
- Different mascots will rank #1 on different posts
- The existing real play records (like Elene's 0/7 on "Retro Games") will remain alongside the seeded data

### Files Changed
- Database migration only (insert ~224 rows into `quiz_post_plays`)

