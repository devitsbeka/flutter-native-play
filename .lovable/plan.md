

## Full Plan: Solo Play + Challenge-a-Friend

This plan includes ALL parts: allowing solo play in game rooms AND the complete Challenge-a-Friend viral sharing feature.

---

### Part 1: Allow Solo Play in Game Rooms

**File: `src/components/team/RoomLobbyV2.tsx`**
- Change `canStartGame` (line 570) from `participants.length >= (currentRoom.min_players || 2)` to `participants.length >= 1`
- Update button label (lines 1001-1002) to remove "waiting for players" text since solo play is now allowed

**Database migration:**
```sql
ALTER TABLE game_rooms ALTER COLUMN min_players SET DEFAULT 1;
UPDATE game_rooms SET min_players = 1 WHERE min_players = 2;
```

---

### Part 2: Challenge-a-Friend Feature

#### Database: 2 New Tables

**`challenge_links`** -- stores each challenge a user creates after playing
- `id` (uuid PK), `code` (unique 8-char), `challenger_id` (FK profiles), `challenger_nickname`, `challenger_avatar_url`, `challenger_score`, `total_questions`, `category_name`, `category_icon_slug`, `questions` (jsonb snapshot), `room_id` (nullable), `created_at`, `expires_at` (default now+30d)
- RLS: anon SELECT (public read), authenticated INSERT for own `challenger_id`

**`challenge_attempts`** -- tracks guest plays
- `id` (uuid PK), `challenge_link_id` (FK), `player_name`, `player_score`, `user_id` (nullable, linked after signup), `created_at`
- RLS: anon INSERT + SELECT, authenticated UPDATE own rows

**`generate_challenge_code()`** -- DB function, 8-char alphanumeric code

#### New Files

**`src/pages/ChallengeLanding.tsx`** -- Single page with 3 phases:
1. **Landing phase**: Fetches challenge by URL code, shows challenger's avatar/score/category, name input, "Start" button -- no auth needed
2. **Playing phase**: Reuses `QuizQuestionCard` and `QuizAnswerButton` to play the snapshotted questions with timer
3. **Results phase**: Side-by-side score comparison (challenger vs guest), then inline signup CTA (email + password, name pre-filled) + OAuth buttons. On signup, links `user_id` to the attempt row

**`src/components/challenge/ChallengeShareModal.tsx`** -- Modal triggered from GameResultsScreenV2:
- Creates a `challenge_links` row with the game's questions snapshot + score
- Shows generated link
- "Share" button uses `navigator.share()` for native mobile sharing (WhatsApp, etc.)
- Fallback: copy-to-clipboard

**`supabase/functions/challenge-og-image/index.ts`** -- Edge function for dynamic social preview images:
- Accepts challenge code as query param
- Fetches challenge data, renders an SVG with challenger avatar, score, category
- Returns PNG for WhatsApp/Facebook/etc. link previews

#### Files to Edit

**`src/App.tsx`** -- Add route:
- `<Route path="/challenge/:code" element={<ChallengeLanding />} />`

**`src/components/team/GameResultsScreenV2.tsx`** -- Add "Challenge Friends" button:
- New button in the host's bottom action area (between existing buttons, around line 546-585)
- Opens `ChallengeShareModal`
- Passes current game questions, score, category info, and room_id

---

### Files Summary

| Action | File |
|--------|------|
| Edit | `src/components/team/RoomLobbyV2.tsx` (solo play logic) |
| Edit | `src/components/team/GameResultsScreenV2.tsx` (challenge button) |
| Edit | `src/App.tsx` (add /challenge route) |
| Create | `src/pages/ChallengeLanding.tsx` |
| Create | `src/components/challenge/ChallengeShareModal.tsx` |
| Create | `supabase/functions/challenge-og-image/index.ts` |
| Migration | `challenge_links` + `challenge_attempts` tables, `generate_challenge_code()` function, RLS policies |
| Migration | `game_rooms.min_players` default change |

