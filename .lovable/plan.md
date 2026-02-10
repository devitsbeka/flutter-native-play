
## Create 8 New Fake Accounts with Real Photo Avatars

### Goal
Create 8 new user accounts with real human photos (instead of mascot illustrations) to showcase that users can upload their own photos and get animated avatars. Each account needs at least 1 published trivia.

### Account Mapping

| # | Username | Photo | Email (internal) |
|---|----------|-------|------------------|
| 1 | levan_88 | image-431.png (young man) | levan_88@mytrivia.local |
| 2 | Natato | image-432.png (red-haired woman) | natato@mytrivia.local |
| 3 | Elene_E | image-433.png (blue-eyed woman) | elene_e@mytrivia.local |
| 4 | Sofia | image-434.png (blonde woman) | sofia@mytrivia.local |
| 5 | LASH10 | image-435.png (man with glasses) | lash10@mytrivia.local |
| 6 | Nona_12 | image-436.png (woman with headband) | nona_12@mytrivia.local |
| 7 | Grigoli_a | image-437.png (bearded man with glasses) | grigoli_a@mytrivia.local |
| 8 | Kosta | image-438.png (curly-haired man) | kosta@mytrivia.local |

### Implementation Steps

**Step 1: Upload Photos to Storage**
- Copy all 8 uploaded images into the project
- Upload them to the `avatars` storage bucket so they have public URLs

**Step 2: Create Auth Users**
- Create 8 auth users in the database using the `@mytrivia.local` pseudo-email pattern (matching existing mascots)
- Each with a simple password

**Step 3: Create Profiles**
- Insert profile rows for each user with:
  - `nickname` matching the requested username
  - `avatar_url` pointing to the uploaded photo in storage
  - `country_code: 'GE'` (default Georgian)
  - `coins` varied (1000-4000 range for realism)

**Step 4: Create 1 Published Trivia Per Account**
Each account gets a unique Georgian-language trivia with 5 questions. Trivia topics will be varied and interesting:

| Username | Trivia Title | Topic | Icon |
|----------|-------------|-------|------|
| levan_88 | "ტექნოლოგიები" | Technology | `rocket` |
| Natato | "კინო და ფილმები" | Movies | `star` |
| Elene_E | "გეოგრაფია" | Geography | `compass` |
| Sofia | "ხელოვნება" | Art | `diamond` |
| LASH10 | "სპორტი" | Sports | `football` |
| Nona_12 | "კულინარია" | Food/Cooking | `coffee` |
| Grigoli_a | "ასტრონომია" | Astronomy | `telescope` |
| Kosta | "მუსიკა" | Music | `guitar` |

Each trivia will have 5 Georgian-language questions with 4 answer choices, following the same JSONB structure as existing mascot trivias. Icons will be context-based (not answer-revealing).

### Technical Details

- Auth users are created via SQL insert into `auth.users` (same method used for existing mascots)
- Profile trigger `handle_new_user` will auto-create profiles, but we may insert profiles directly for more control
- Trivia questions inserted into `user_quiz_posts` with `is_public: true`
- Question format matches existing: `{question_text, correct_answer, incorrect_answers[], difficulty, icon_slug}`
- No code changes needed -- this is purely database seeding

### What This Achieves
- New users see real human avatars alongside mascot avatars in leaderboards, trivia feeds, etc.
- Demonstrates that the app supports real photo avatars (not just mascots)
- Encourages users to upload their own photos
