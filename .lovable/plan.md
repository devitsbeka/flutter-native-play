

## Room Challenge Invite Flow: End-to-End Fix

### Problem
Currently, when a host plays a room game and shares a challenge link ("გამოწვიე მეგობარი"), the friend:
1. Plays the challenge on `ChallengeLanding.tsx`
2. Sees "გაწევრიანდი უფასოდ" which navigates to `/auth` (sign-in page, not registration)
3. After registration, lands on the home page -- NOT back in the room
4. The host never sees the friend's result in the room

### Solution

#### 1. Fix "გაწევრიანდი უფასოდ" to open Registration (not Sign In)
In `ChallengeLanding.tsx`, change the CTA navigation from `/auth` to `/auth?mode=signup&returnTo=/team?join=ROOM_CODE` so that:
- The registration form shows by default (not sign-in)
- After registration, user is redirected back to the room

**Technical change:** Update line 433 to include `mode=signup` and a `returnTo` parameter that includes the room code from `challenge_links.room_id`.

#### 2. Fetch room_code alongside challenge data
The `challenge_links` table already has a `room_id` column. We need to also fetch the room code from `game_rooms` so we can build the returnTo URL.

**Technical change:** After fetching the challenge link, also query `game_rooms` for the `code` using the `room_id`. Store it in state.

#### 3. Link challenge attempt to user after registration
The `challenge_attempts` table already has a `user_id` column (nullable). Currently it's always null for guest plays. We need to:
- Store the challenge attempt ID in localStorage before redirecting to auth
- After registration + redirect back to the room, link the attempt to the new user

**Technical change:**
- In `ChallengeLanding.tsx`: Save `{ challengeLinkId, attemptId, playerScore, roomId }` to localStorage before navigating to auth
- In `TeamV2.tsx` (or `RoomRedirect.tsx`): On mount, check for pending challenge data in localStorage. If found, update the `challenge_attempts` row with the new `user_id`

#### 4. Show challenge results to the host in the room
The host needs to see who played their challenge and the results. The `challenge_attempts` table already links to `challenge_links` which links to `game_rooms` via `room_id`.

**Technical change:** Add a "Challenge Results" section in the room lobby (`RoomLobbyV2.tsx`) that queries `challenge_attempts` joined with `challenge_links` filtered by `room_id`, showing:
- Player name
- Player score vs challenger score
- Win/lose status
- Timestamp

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/ChallengeLanding.tsx` | Fetch room code, change CTA to `/auth?mode=signup&returnTo=...`, save attempt data to localStorage |
| `src/pages/TeamV2.tsx` | On mount, check localStorage for pending challenge data, link attempt to user |
| `src/components/team/RoomLobbyV2.tsx` | Add challenge results section showing who played and scores |

### Implementation Sequence
1. Update `ChallengeLanding.tsx` -- fetch room code, fix CTA, persist data
2. Update `TeamV2.tsx` -- handle post-registration linking
3. Update `RoomLobbyV2.tsx` -- display challenge results to host

