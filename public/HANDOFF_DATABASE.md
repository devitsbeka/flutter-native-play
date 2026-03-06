# MyTrivia — Database Handoff Document

## 1. Database Instance

| Field | Value |
|-------|-------|
| **Provider** | Supabase (via Lovable Cloud) |
| **Project ID** | `sqwpzezkhpqkdyltvsim` |
| **Region** | Default Supabase region |
| **API URL** | `https://sqwpzezkhpqkdyltvsim.supabase.co` |
| **Anon (Public) Key** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxd3B6ZXpraHBxa2R5bHR2c2ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMzY5MTQsImV4cCI6MjA4MTkxMjkxNH0.tNtgf8sbZakCP6HAUtoxVSrcshZ1Lvn_1OqS7K7VhTc` |
| **Database Engine** | PostgreSQL 15 |
| **Schema** | `public` (all app tables) |
| **Auth** | Supabase Auth (`auth` schema — managed, do not modify) |
| **Storage** | Supabase Storage (`storage` schema — managed) |

> **There is only ONE database instance.** All data — questions, users, game state, analytics, icons, payments — lives in a single Supabase PostgreSQL database.

---

## 2. How to Connect

### Client-Side (React App)
```typescript
import { supabase } from "@/integrations/supabase/client";
// Auto-configured from .env: VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY
```

### Edge Functions (Server-Side)
```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,        // same API URL
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!  // bypasses RLS
);
```

### Direct SQL Access
- Via Lovable Cloud → "View Backend" → Run SQL
- Or via Supabase Dashboard: `https://supabase.com/dashboard/project/sqwpzezkhpqkdyltvsim`

### Environment Variables (auto-managed in `.env`)
```
VITE_SUPABASE_PROJECT_ID=sqwpzezkhpqkdyltvsim
VITE_SUPABASE_URL=https://sqwpzezkhpqkdyltvsim.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key above>
```

### Edge Function Secrets (stored in Supabase Vault)
```
SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL,
SUPABASE_PUBLISHABLE_KEY, LOVABLE_API_KEY, FAL_KEY, LIGHTX_API_KEY,
STABILITY_API_KEY, VYRO_API_KEY, OPENROUTER_API_KEY, FIRECRAWL_API_KEY,
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, REVENUECAT_API_KEY,
GOOGLE_CLIENT_ID, GOOGLE_SECRET, FIREBASE_SERVICE_ACCOUNT,
ADMOB_APP_ID, ADMOB_REWARDED_AD_UNIT_ID
```

---

## 3. Table Inventory (87 tables)

### Current Data Counts (Test Environment)
| Table | Rows |
|-------|------|
| `questions` | 16,376 |
| `profiles` | 639 |
| `icon_library` | 9,016 |
| `categories` | 45 |

### Table Groups

#### 👤 Users & Auth
| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (nickname, avatar, coins, gems, streaks, country). Linked to `auth.users` via `user_id`. |
| `user_roles` | Role-based access (admin/moderator/user). Checked via `has_role()` function. |
| `user_sessions` | Session tracking (analytics: duration, bounces). |
| `user_daily_plays` | Daily play count tracking. |
| `user_daily_rewards` | Daily reward claims. |
| `user_daily_spins` | Daily spin wheel tracking. |
| `user_daily_vip_rewards` | VIP daily reward claims. |
| `user_rewards` | All reward history (spins, chests). |
| `user_power_ups` | Owned power-ups inventory. |
| `user_presence` | Online/offline status. |
| `user_blocks` | Blocked user relationships. |
| `user_reports` | User reports/moderation. |
| `push_tokens` | Push notification device tokens. |
| `password_reset_attempts` | Security question-based password reset log. |
| `vip_subscriptions` | Pro/VIP subscription status + expiry. |

#### ❓ Questions & Content
| Table | Purpose |
|-------|---------|
| `questions` | Main question bank (16k+). Has text, answers, difficulty, category, icon, media URLs, quality scores. |
| `categories` | Question categories with icons, colors, sort order, language. |
| `category_translations` | i18n for category names/descriptions. |
| `icon_library` | 9k+ icon metadata (slug, tags, category, URL). |
| `icon_assignment_history` | Audit trail for question→icon assignments. |
| `icon_fix_history` | Audit trail for icon URL fixes. |
| `icon_verification_results` | Icon URL validity checks. |
| `knowledge_sources` | External URL sources for question generation. |
| `trivia_facts` | Fun facts tied to categories. |
| `ai_generation_settings` | AI prompt templates for image/question generation. |

#### 🎮 Gameplay
| Table | Purpose |
|-------|---------|
| `game_sessions` | Solo game sessions (vs AI opponent). |
| `game_plays` | Individual game play records (score, stars, category). |
| `game_rooms` | Multiplayer rooms (code, host, status, category, game type). |
| `room_participants` | Players in a room. |
| `room_games` | Individual games within a room (scores, questions, winner). |
| `room_questions` | Questions assigned to a room. |
| `room_match_history` | Completed match results. |
| `room_chat_messages` | In-room chat. |
| `room_category_queue` | Category rotation queue for rooms. |
| `player_answers` | Per-question answer records (room/TV games). |
| `game_invitations` | Pending game invites. |

#### 📺 TV Mode
| Table | Purpose |
|-------|---------|
| `tv_sessions` | TV display sessions. |
| `tv_players` | Players connected to TV session. |
| `tv_poll_suggestions` | Category suggestions during TV polls. |
| `tv_poll_votes` | Votes on poll suggestions. |
| `tv_round_history` | Round-by-round TV game history. |
| `tv_session_queue` | Queued content for TV sessions. |

#### 🏆 Progression & Leaderboards
| Table | Purpose |
|-------|---------|
| `user_level_progress` | Per-category level completion (stars earned). |
| `user_category_progress` | Category-wide progress tracking. |
| `user_country_progress` | Country-based progression. |
| `user_category_last_seen` | Last visited category timestamp. |
| `category_leaderboard` | Per-category rankings. |
| `category_stats` | Per-user category accuracy stats. |
| `category_weekly_rewards` | Weekly leaderboard prizes. |
| `weekly_leaderboard_snapshots` | Historical weekly rankings. |
| `user_league_data` | League tier + weekly XP. |
| `user_achievements` | Earned achievements/badges. |
| `user_missions` | Active mission progress. |
| `user_mission_streaks` | Streak tracking for missions. |
| `leaderboard_badges` | Badge definitions (rank-based). |
| `leaderboard_exclusive_frames` | Avatar frame definitions (rank-based). |
| `user_leaderboard_badges` | Earned leaderboard badges. |
| `user_leaderboard_frames` | Earned avatar frames. |
| `user_avatar_frames` | Equipped avatar frames. |
| `level_positions` | Map positions for level display. |

#### 🛍 Economy & Shop
| Table | Purpose |
|-------|---------|
| `economy_config` | Economy tuning values (costs, rewards). |
| `shop_products` | In-app shop items. |
| `iap_products` | IAP product definitions (price, gems, platform). |
| `gem_purchases` | Stripe/IAP gem purchase records. |
| `purchase_transactions` | All purchase history. |

#### 🤝 Social
| Table | Purpose |
|-------|---------|
| `friendships` | Friend relationships + status (pending/accepted). |
| `friend_invites` | Referral invites with codes. |
| `chat_messages` | Direct messages between users. |
| `notifications` | In-app notification feed. |
| `user_favorites` | Favorited content. |

#### 📝 User-Generated Content
| Table | Purpose |
|-------|---------|
| `user_quiz_posts` | User-created trivia quizzes. |
| `quiz_collections` | Grouped quiz collections. |
| `quiz_post_likes` | Likes on quiz posts. |
| `quiz_post_comments` | Comments on quiz posts. |
| `quiz_post_plays` | Play records for user quizzes. |
| `quiz_post_saves` | Saved/bookmarked quizzes. |
| `collection_drafts` | Draft quiz collections. |
| `trivia_drafts` | Draft trivia content. |
| `cover_image_generations` | AI-generated cover images. |
| `avatar_generations` | AI-generated avatar history. |

#### 🔧 Admin & Generation
| Table | Purpose |
|-------|---------|
| `generation_jobs` | Bulk question generation jobs. |
| `generation_job_questions` | Questions produced by generation jobs. |
| `app_settings` | Global app configuration key-value store. |

#### 🔗 Challenge Links
| Table | Purpose |
|-------|---------|
| `challenge_links` | Shareable challenge URLs with embedded questions. |
| `challenge_attempts` | Attempts on challenge links. |

---

## 4. Storage Buckets

| Bucket | Public | Purpose |
|--------|--------|---------|
| `icons` | ✅ | Category/UI icons |
| `icon-library` | ✅ | 9k+ question icons (PNG). URL pattern: `<API_URL>/storage/v1/object/public/icon-library/{slug}.png` |
| `avatars` | ✅ | User avatar images (original + AI-generated) |
| `quiz-covers` | ✅ | User quiz cover images |
| `room-covers` | ✅ | Game room cover images |
| `question-media` | ✅ | Question images, videos, audio files |

---

## 5. Key Relationships

```
auth.users (managed)
  └── profiles.user_id (1:1)
        └── user_roles.user_id (1:many)
        └── all user_* tables via user_id

categories.id
  └── questions.category_id (1:many)
  └── category_translations.category_id (1:many)
  └── user_level_progress, category_leaderboard, etc.

game_rooms.id
  └── room_participants.room_id
  └── room_games.room_id
  └── room_chat_messages.room_id
  └── player_answers.room_id

user_quiz_posts.id
  └── quiz_post_likes.post_id
  └── quiz_post_comments.post_id
  └── quiz_post_plays.post_id
  └── quiz_post_saves.post_id

icon_library.slug ↔ questions.icon_slug (logical, not FK)
```

---

## 6. Auth Architecture

- **Provider**: Supabase Auth
- **Methods**: Email+Password, Username (pseudo-email `@mytrivia.local`), Apple Sign-In, Google Sign-In
- **Profile creation**: Automatic via `handle_new_user()` trigger on `auth.users`
- **Role check**: `has_role(user_id, 'admin')` — security definer function
- **Password recovery**: Security questions (no email reset for username accounts)
- **OAuth**: Apple (native iOS + web via Lovable), Google (via Lovable OAuth)

---

## 7. Edge Functions (52 deployed)

All deployed at: `https://sqwpzezkhpqkdyltvsim.supabase.co/functions/v1/{function-name}`

Most require JWT auth (`Authorization: Bearer <user_token>`). Exceptions (public):
- `stripe-gem-webhook` — Stripe webhook
- `review-generated-questions` — Public review endpoint
- `fix-generated-question` — Public fix endpoint
- `challenge-og-image` — OG image generation
- `seed-sample-content` — One-time seeding

---

## 8. Realtime Subscriptions

Tables with realtime enabled (via `supabase_realtime` publication):
- `profiles` — Avatar/nickname changes
- `game_rooms` — Room status updates
- `room_participants` — Player join/leave
- `room_chat_messages` — In-room chat
- `tv_sessions`, `tv_players` — TV mode state
- `player_answers` — Live answer tracking
- `notifications` — Real-time notification feed

---

## 9. Key Database Functions

| Function | Purpose |
|----------|---------|
| `handle_new_user()` | Auto-creates profile on signup (trigger on `auth.users`) |
| `has_role(user_id, role)` | Security-definer role check (avoids RLS recursion) |
| `update_user_currency(user_id, coins_delta, gems_delta)` | Atomic currency update with balance checks |
| `search_questions(...)` | Paginated question search with filters |
| `get_questions_sorted_by_length(...)` | Questions sorted by text/answer length |
| `get_category_question_counts()` | Per-category question/production counts |
| `get_league_leaderboard(tier, region)` | League rankings query |
| `generate_room_code()` | Random 6-char room code |
| `generate_referral_code()` | Random 8-char referral code |
| `process_referral_reward(invite_id, new_user_id)` | Grants VIP to both referrer and referee |
| `update_category_total_levels()` | Trigger: recalculates levels when questions change |

---

## 10. Two Environments

| Environment | Purpose | Data |
|-------------|---------|------|
| **Test** | Development & staging | Editable, used by Lovable preview |
| **Live** | Production (`flutter-native-play.lovable.app`) | Read-only from Lovable, serves real users |

Publishing deploys code + schema from Test → Live. **Data is NOT synced between environments.**
