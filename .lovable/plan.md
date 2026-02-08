

## Create 8 Perfect Mascot Sample Accounts + Fix Opponent System

### Overview

This plan covers three changes:
1. **Update the opponent system** to use Georgian names and mascot avatars instead of generic English names with old bot avatars
2. **Repurpose 8 existing test accounts** as the 8 mascot sample accounts with proper Georgian names
3. **Create a seeding edge function** that generates quality trivia content (in Georgian) for each account, including collections with multiple rounds

---

### Part 1: Update `src/data/opponents.ts`

Replace the English first/last name lists and old bot avatars with:

- **Georgian first names**: გიორგი, მარიამი, ნიკა, ანა, დავითი, ელენე, ლუკა, თამარი, ნინო, ალექსანდრე, სოფია, ილია, ბარბარე, ლიკა, ზურა, ნანა, რატი, კოტე, and more
- **Georgian last name initials**: კ., გ., ბ., ჩ., თ., მ., ლ., ს., etc.
- **Mascot avatars**: Import all 8 `mascot-avatar-*.png` files instead of `bot-avatar-*.png`
- **Country distribution**: Heavily weighted toward Georgia (GE) with occasional others
- **Name format**: "გიორგი კ." instead of "SkylerJ"

---

### Part 2: Update 8 Existing Accounts in Database

Map the 8 existing `@mytrivia.local` accounts to the mascot characters:

| # | Mascot Avatar | Georgian Name | User ID (existing) | Email |
|---|--------------|--------------|-------------------|-------|
| 1 | mascot-avatar-1 (purple crown) | გიორგი | 71eb3fac (mako@) | mako@mytrivia.local |
| 2 | mascot-avatar-2 (koala safari) | მარიამი | 06f96912 (mariami@) | mariami@mytrivia.local |
| 3 | mascot-avatar-3 (red headphones) | ნიკა | dbf8dbc0 (hgghn@) | hgghn@mytrivia.local |
| 4 | mascot-avatar-4 (beret) | ანა | 2574663a (ani@) | ani@mytrivia.local |
| 5 | mascot-avatar-5 (sombrero) | დავითი | af7699b1 (anuki@) | anuki@mytrivia.local |
| 6 | mascot-avatar-6 (goggles pink) | ელენე | 9b9330ae (hhhhh@) | hhhhh@mytrivia.local |
| 7 | mascot-avatar-7 (yellow beanie) | ლუკა | 7570d628 (brad@) | brad@mytrivia.local |
| 8 | mascot-avatar-8 (red beret) | თამარი | d11948a8 (bela@) | bela@mytrivia.local |

SQL migration will:
- Update each profile's `nickname` and `avatar_url` (using canonical `/src/assets/avatars/mascot-avatar-N.png` paths)
- Set `country_code = 'GE'` and reasonable `coins` values
- Delete any existing quiz content and collections for these accounts (clean slate)
- Also clean up the 4 unused test accounts (gaga, triviamascot, hello, mascot) by setting them to inactive or deleting their profiles

---

### Part 3: Create `seed-sample-content` Edge Function

A one-time-use edge function that generates quality quiz content for each mascot account:

**Content plan per account (diverse topics to show app possibilities):**

1. **გიორგი** (mascot-1): Standalone trivias about football (soccer) and a "Sports Stars" collection with 3 rounds (Messi, Ronaldo, NBA)
2. **მარიამი** (mascot-2): Standalone trivia about cooking/food and a "Georgian Cuisine" collection with 3 rounds (appetizers, main courses, desserts)
3. **ნიკა** (mascot-3): Standalone trivia about music and a "Music Decades" collection with 3 rounds (80s, 90s, 2000s)
4. **ანა** (mascot-4): Standalone trivia about art/painting and a "Famous Artists" collection with 2 rounds (Renaissance, Modern)
5. **დავითი** (mascot-5): Standalone trivia about movies and a "Movie Franchises" collection with 3 rounds (Marvel, Harry Potter, Star Wars)
6. **ელენე** (mascot-6): Standalone trivia about science and a "Space & Universe" collection with 2 rounds (Solar System, Stars & Galaxies)
7. **ლუკა** (mascot-7): Standalone trivia about gaming/esports and a "Video Games" collection with 3 rounds (Nintendo, PlayStation, PC Gaming)
8. **თამარი** (mascot-8): Standalone trivia about literature and a "World Literature" collection with 2 rounds (Georgian Authors, World Classics)

The edge function will:
- Use AI (Gemini Flash) to generate 5-10 questions per trivia in Georgian
- Create collections with appropriate cover gradients
- Insert rounds linked to collections with proper `round_number` ordering
- Set realistic `plays_count`, `likes_count`, `saves_count` values to make the feed look alive

---

### Technical Details

**File changes:**
- `src/data/opponents.ts` -- Replace names, avatars, country distribution
- `supabase/functions/seed-sample-content/index.ts` -- New edge function for content generation

**Database migration:**
- UPDATE profiles for the 8 selected accounts
- DELETE existing quiz/collection content for those accounts
- DELETE or clean up the 4 leftover unused test accounts

**Execution flow:**
1. Apply the database migration to update profiles
2. Deploy the seed edge function
3. Call the edge function once to generate all content
4. The 8 accounts will then appear in the explore feed with quality Georgian-language trivias and collections

### Files Changed
- `src/data/opponents.ts` -- Georgian names + mascot avatars
- `supabase/functions/seed-sample-content/index.ts` -- New edge function (one-time content seeder)
- Database migration for profile updates and cleanup
