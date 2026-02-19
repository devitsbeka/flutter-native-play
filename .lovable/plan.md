

## Fix: Image Questions Showing as Text in Multiplayer Games

### Root Cause

The `room_questions` database table is missing `image_url`, `video_url`, and `audio_url` columns. When multiplayer games store questions to sync between players, media URLs are silently dropped. When other players load these questions, there's no media data -- so image questions fall back to displaying text.

### What Needs to Change

#### 1. Database Migration -- Add media columns to `room_questions`

Add three nullable text columns:
- `image_url` (text, nullable)
- `video_url` (text, nullable)  
- `audio_url` (text, nullable)

#### 2. `src/contexts/MultiplayerContextV2.tsx` -- 4 fixes

**Fix A: Standard category question mapping (line ~1267)**
Currently missing `imageUrl`, `videoUrl`, `audioUrl` when mapping fetched questions:
```
imageUrl: q.imageUrl || undefined,
videoUrl: q.videoUrl || undefined,
audioUrl: q.audioUrl || undefined,
```

**Fix B: `saveQuestionsAndStartGame` insert (line ~1326)**
Add media fields when storing questions to `room_questions`:
```
image_url: q.imageUrl || null,
video_url: q.videoUrl || null,
audio_url: q.audioUrl || null,
```

**Fix C: Custom trivia insert (line ~1148)**
Same fix -- add media fields when inserting custom trivia questions.

**Fix D: Reading questions back in `joinRoom` (line ~914)**
When mapping `room_questions` rows to `TriviaQuestion[]`, include:
```
imageUrl: q.image_url || undefined,
videoUrl: q.video_url || undefined,
audioUrl: q.audio_url || undefined,
```

### Files to Change
- **Database migration**: Add 3 columns to `room_questions`
- **`src/contexts/MultiplayerContextV2.tsx`**: 4 locations to pass through media URLs

### Why This Fixes It
The host fetches questions (with media URLs) from the database. Currently those URLs are discarded when syncing to other players via `room_questions`. After the fix, media URLs persist through the entire flow: fetch -> store -> read -> render.

