
## Create 8 New Mascot Accounts with Mixed Trivias

### What We're Doing
Adding 8 new bot/mascot profiles to the app, each publishing one "სხვადასხვა" (mixed) trivia with 5 questions from different topics. This will populate the Explore feed with more content from diverse mascot characters.

### Current State
- 8 existing mascot accounts: Giorgi, Nika, Daviti, Ana, Mariami, Elene, Luka, Tamari
- They use mascot-avatar-1 through mascot-avatar-8
- No foreign key constraints on `profiles` or `user_quiz_posts` tables, so we can insert directly

### New Mascot Accounts

| # | Name | Avatar |
|---|------|--------|
| 1 | Tornike | mascot-avatar-1.png |
| 2 | Nino | mascot-avatar-2.png |
| 3 | Saba | mascot-avatar-3.png |
| 4 | Salome | mascot-avatar-4.png |
| 5 | Dato | mascot-avatar-5.png |
| 6 | Keti | mascot-avatar-6.png |
| 7 | Irakli | mascot-avatar-7.png |
| 8 | Tekla | mascot-avatar-8.png |

All accounts will have:
- Country: Georgia (GE)
- Language: Georgian (ka)
- Region: ge
- Some coins and game stats for realism

### Trivias (one per account)
Each trivia will have:
- Subject: "სხვადასხვა" (mixed)
- 5 questions from different topics (geography, history, science, sports, movies, music, animals, food)
- Format: 4 answers (multiple choice)
- Varied cover gradients for visual diversity
- Unique titles like "ყველაფერი ცოტ-ცოტა", "შერეული ვიქტორინა", etc.

### Technical Details

**Single database migration** that:

1. **Inserts 8 new profiles** into the `profiles` table with generated UUIDs, Georgian names, mascot avatars, and varied stats (coins, games_played, etc.)

2. **Inserts 8 quiz posts** into `user_quiz_posts` table, each with:
   - `user_id` matching the new profile
   - `subject`: "სხვადასხვა"
   - `question_count`: 5
   - `answer_format`: "4_answers"
   - `is_public`: true
   - `questions`: JSONB array with 5 mixed-topic Georgian trivia questions
   - Unique `cover_gradient` and `title` per post
   - Random `likes_count` and `plays_count` for realism

No code file changes needed -- this is purely a data/migration task.
