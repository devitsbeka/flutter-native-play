
# TV Mode Game Documentation Page: /admin/tvmodegame

## Overview

Create a comprehensive, standalone documentation page at `/admin/tvmodegame` that serves as the definitive reference for the entire TV mode game system. This page will document every component, hook, context, database table, RLS policy, utility function, and data flow related to TV mode gameplay.

---

## Architecture Summary

The TV Mode system consists of:
- **5 Main Pages** (TV Display, Lobby, Host Controller, Join, Showcase)
- **25 TV Components** in `src/components/tv/`
- **12 Controller Components** in `src/components/controller/`
- **1 Primary Context** (`TVGameContext`) with ~2400 lines
- **1 Mock Context** (`TVMockContext`) for testing
- **3 Dedicated Hooks** (`useTVPoll`, `useTVSessionQueue`, `useTVDiscovery`)
- **6 Database Tables** (`tv_sessions`, `tv_players`, `tv_poll_suggestions`, `tv_poll_votes`, `tv_session_queue`, `tv_round_history`)
- **1 Related Table** (`player_answers` with `tv_session_id` column)
- **2 Utility Files** (`tvDebug.ts`, `tvScoring.ts`)
- **21+ RLS Policies** across TV tables
- **2 Database Functions** (`is_tv_session_participant`, `update_suggestion_vote_count`)

---

## Page Structure (Tabbed Navigation)

### Tab 1: Overview
- System architecture diagram (Mermaid flowchart)
- Phase state machine diagram
- Key concepts: Sessions, Players, Polls, Rounds, Queue
- Quick reference: All file paths

### Tab 2: Pages (5)
| Page | Path | Route | Description |
|------|------|-------|-------------|
| TVDisplay | `src/pages/TVDisplay.tsx` | `/tv/display/:code?` | Main TV display that shows game content |
| TVLobby | `src/pages/TVLobby.tsx` | `/tv` | Creates new TV session, shows pairing screen |
| TVHostController | `src/pages/TVHostController.tsx` | `/tv/host/:sessionId` | Host's mobile controller interface |
| TVJoin | `src/pages/TVJoin.tsx` | `/join/:code?` or `/join/session/:sessionId` | Player join flow |
| TVScreensShowcase | `src/pages/TVScreensShowcase.tsx` | `/tv-showcase` | Development testing page |

### Tab 3: TV Components (25)
Organized by function:
- **Screens**: TVPairingScreenV3, TVLobbyScreenV2, TVCountdownScreenV2, TVQuestionScreenV4, TVRevealScreen, TVResultsScreenV2, TVPollScreen, TVRoundIntroScreen, TVIdleScreen, TVGameOverScreen
- **UI Elements**: TVBrandingOverlay, TVDebugOverlay, TVLeaderboardPanel, TVScoreboardPanel, TVRoundQueueIndicator, QRCodeDisplay
- **Utilities**: TVErrorBoundary, PlayOnTVButton, TVMirrorModal

### Tab 4: Controller Components (12)
- ControllerCodeEntry, ControllerLobby, ControllerCountdown, ControllerQuestion, ControllerReveal, ControllerResults
- ControllerPollScreen, ControllerPollResults, ControllerPollResultsGuest, ControllerDirectSelection
- ControllerRoundIntroWaiting, GuestJoinModal

### Tab 5: Contexts (2)
**TVGameContext** (~2400 lines):
- State interface: `TVGameState` with 18 properties
- Actions: `createSession`, `joinSession`, `startGame`, `startPlaying`, `startNextRound`, `submitAnswer`, `markReady`, `leaveSession`, `resetGame`
- Phase types: 15 phases (pairing, waiting, lobby, countdown, question, playing, reveal, results, completed, idle, round-intro, poll-suggest, poll-voting, poll-results, category-select)
- Key functions: `confirmActivePlayers`, `advanceToReveal`, `checkAndAdvanceIfAllAnswered`, `mapDbStatusToPhase`
- Realtime channels: Session changes, Presence, Player answers

**TVMockContext**:
- Purpose: Testing/showcase without database
- Mock data: Players, questions, category queue

### Tab 6: Hooks (3)
**useTVPoll** (635 lines):
- Manages poll suggestions and voting
- Functions: `submitSuggestion`, `removeSuggestion`, `toggleVote`, `startVoting`, `endVoting`, `finalizePollAndStartGame`
- Realtime: Subscribes to `tv_poll_suggestions`, `tv_poll_votes`, `tv_sessions`

**useTVSessionQueue** (407 lines):
- Manages round queue with drag-and-drop reordering
- Functions: `addCategoryToQueue`, `addToQueue`, `removeFromQueue`, `reorderQueue`
- Fallback: Syncs with `room_category_queue` if TV queue empty

**useTVDiscovery** (259 lines):
- Automatic TV discovery via Realtime Presence
- Functions: `startScanning`, `stopScanning`, `connectToTV`, `connectWithCode`

### Tab 7: Database Tables (7)

**tv_sessions** (27 columns):
```
id, room_id, pairing_code, tv_pairing_code, host_user_id, status, 
is_paired, current_question_index, question_start_time, reveal_start_time,
questions (JSONB), category_name, category_icon, game_name, room_name,
round_number, total_rounds, total_rounds_played, accumulated_scores (JSONB),
active_player_count, poll_start_time, poll_duration,
current_round_suggester_id, current_round_suggester_nickname, 
current_round_suggester_avatar_url, created_at, expires_at
```

**tv_players** (16 columns):
```
id, tv_session_id, user_id, player_id, nickname, avatar_url,
is_host, is_authenticated, total_score, rounds_played,
questions_answered, current_round_score, is_ready, is_active,
joined_at, updated_at
```

**tv_poll_suggestions** (13 columns):
```
id, session_id, user_id, nickname, avatar_url, source_type,
category_id, user_trivia_id, category_name, icon_slug,
cover_image, vote_count, created_at
```

**tv_poll_votes** (5 columns):
```
id, session_id, suggestion_id, user_id, created_at
```

**tv_session_queue** (12 columns):
```
id, session_id, position, source_type, category_id, category_name,
icon_slug, user_trivia_id, suggester_user_id, suggester_nickname,
suggester_avatar_url, created_at
```

**tv_round_history** (11 columns):
```
id, tv_session_id, round_number, category_name, category_id,
category_icon, player_scores (JSONB), total_questions,
started_at, completed_at, created_at
```

**player_answers** (TV-related columns):
```
tv_session_id (nullable UUID for TV mode answers)
```

### Tab 8: RLS Policies (21)

Documented with SQL and explanation:
- tv_sessions: 4 policies (SELECT, INSERT, UPDATE x2, DELETE)
- tv_players: 4 policies (SELECT, INSERT, UPDATE, DELETE)
- tv_poll_suggestions: 3 policies (SELECT, INSERT, DELETE)
- tv_poll_votes: 3 policies (SELECT, INSERT, DELETE)
- tv_session_queue: 4 policies (SELECT, INSERT, UPDATE, DELETE)
- tv_round_history: 2 policies (SELECT, INSERT)

### Tab 9: Database Functions (2)

**is_tv_session_participant(p_session_id, p_player_identifier)**:
- Checks if a player is registered in a TV session
- Used by poll RLS policies

**update_suggestion_vote_count()**:
- Trigger function on tv_poll_votes
- Auto-updates vote_count on tv_poll_suggestions

### Tab 10: Utilities (2)

**tvDebug.ts**:
- `tvLog`, `tvLogPhase`, `tvLogPlayer`, `tvLogError`, `tvLogPresence`, `tvLogTimer`
- In-memory log history (100 entries max)
- Development-only logging

**tvScoring.ts**:
- `calculatePoints(isCorrect, timeRemaining)` - 100 base + 5 per second
- `calculateTimeRemaining(questionStartTime)`
- `getQuestionTime()` - Returns 15 seconds
- Session binding utilities for join idempotency

### Tab 11: Data Flows

**Game Start Flow** (Mermaid sequence diagram):
Host Controller -> TVGameContext -> Supabase -> TV Display

**Poll Flow** (Mermaid sequence diagram):
Suggestion -> Voting -> Results -> Game Start

**Auto-Advance Logic**:
- Safety window: 2500ms after question start
- Player count verification: 7 attempts, 200ms intervals
- Debounce: `checkInProgressRef` prevents concurrent triggers

**Presence Sync**:
- Supabase Realtime Presence channel
- Deduplication by nickname
- Avatar position reset on new question

### Tab 12: Phase State Machine

```
pairing -> waiting -> lobby -> countdown -> question -> reveal -> 
  -> (next question OR results OR round-intro)
  
round-intro -> countdown -> ...

lobby -> poll-suggest -> poll-voting -> poll-results -> countdown -> ...

results -> completed (if final round)
         -> round-intro (if more rounds in queue)
```

### Tab 13: Configuration Constants

- QUESTION_TIME: 15 seconds
- REVEAL_DURATION_MS: 1400ms
- BASE_POINTS: 100
- TIME_BONUS_MULTIPLIER: 5
- CODE_REFRESH_INTERVAL: 5 minutes
- Session binding expiry: 24 hours

---

## Implementation Steps

### Step 1: Create Route
Add route in `src/App.tsx`:
```typescript
<Route path="/admin/tvmodegame" element={<TVModeGameDocs />} />
```

### Step 2: Create Data File
Create `src/data/documentation/tvModeComplete.ts` with all TV mode documentation data structured for rendering.

### Step 3: Create Page Component
Create `src/pages/admin/TVModeGameDocs.tsx`:
- Tabbed navigation using Radix Tabs
- Collapsible sections for code examples
- Search functionality
- Mermaid diagrams for flows
- Code highlighting for SQL/TypeScript

### Step 4: Document Each Category
For each item, include:
- File path (clickable reference)
- Line count
- Purpose/description
- Key exports/functions
- Dependencies
- Usage examples
- Related items

### Step 5: Add Mermaid Diagrams
- Phase state machine
- Data flow diagrams
- Database relationships
- Component hierarchy

### Step 6: Add Search
Filter across all tabs by:
- Component/function name
- Description keywords
- File paths

---

## Technical Details

### File Structure
```
src/
├── pages/admin/
│   └── TVModeGameDocs.tsx (new - ~1200 lines)
├── data/documentation/
│   └── tvModeComplete.ts (new - ~800 lines)
```

### Dependencies
- Radix Tabs (already installed)
- Framer Motion (already installed)
- Lucide icons (already installed)
- Mermaid (optional, can use presentation-mermaid or static diagrams)

### UI Components Used
- Tabs, TabsList, TabsTrigger, TabsContent
- ScrollArea
- Collapsible, CollapsibleTrigger, CollapsibleContent
- Input (for search)
- Card components
- Code blocks with syntax highlighting

---

## Expected Deliverables

1. **TVModeGameDocs.tsx** - Main page component (~1200 lines)
2. **tvModeComplete.ts** - Documentation data file (~800 lines)
3. **Route registration** in App.tsx
4. Complete documentation for all 80+ TV mode entities

---

## Notes

- All text will be in English (following docsLang pattern from existing Docs.tsx)
- Admin role check not strictly required as this is documentation
- Page will be self-contained with no external API calls
- All code references will include line numbers where relevant
- This will serve as the authoritative source of truth for TV mode development
