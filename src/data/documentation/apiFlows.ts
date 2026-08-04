export const API_FLOWS = [
  {
    name: "Authentication Flow",
    description: "User login/registration process",
    diagram: `graph TD
    A[User Opens App] --> B{Has Session?}
    B -->|Yes| C[Load Profile from DB]
    B -->|No| D[Show Auth Page]
    D --> E{Login or Register?}
    E -->|Login| F[Supabase signInWithPassword]
    E -->|Register| G[Supabase signUp]
    E -->|OAuth| H[Supabase signInWithOAuth]
    F --> I{Success?}
    G --> I
    H --> I
    I -->|Yes| J[Create/Fetch Profile]
    I -->|No| K[Show Error]
    J --> L[Set Auth Context]
    L --> M[Navigate to Home]
    C --> L`,
    steps: [
      "1. App checks for existing Supabase session on load",
      "2. If session exists, fetches profile from `profiles` table",
      "3. If no session, shows login/register options",
      "4. On successful auth, creates profile if new user",
      "5. Sets AuthContext with user and profile data",
      "6. Redirects to home page"
    ]
  },
  {
    name: "Question Fetching Flow",
    description: "Unified question selection via questionService",
    diagram: `graph TD
    A[Game Mode Starts] --> B[Call questionService.getQuestions]
    B --> C{Check Parameters}
    C --> D[Filter by Language]
    D --> E[Filter by Category/Level]
    E --> F[Filter is_active = true]
    F --> G[Get Seen Question IDs]
    G --> H[Exclude Seen Questions]
    H --> I{Enough Questions?}
    I -->|Yes| J[Shuffle & Return]
    I -->|No| K[Check Exhaustion]
    K --> L{All Seen?}
    L -->|Yes| M[Reset Seen Tracker]
    M --> N[Return All Questions]
    L -->|No| O[Include Some Seen]
    O --> J
    J --> P[Update Seen Tracker]
    P --> Q[Return to Game]`,
    steps: [
      "1. Game mode calls questionService with parameters",
      "2. Filters by language (ka/en) and category",
      "3. Filters only active, production-ready questions",
      "4. Retrieves seen question IDs from localStorage",
      "5. Excludes already-seen questions",
      "6. If not enough questions, handles exhaustion",
      "7. Shuffles and returns requested count",
      "8. Updates seen tracker with new questions"
    ]
  },
  {
    name: "Multiplayer Room Flow",
    description: "Creating and joining multiplayer rooms",
    diagram: `graph TD
    A[Host Creates Room] --> B[Generate Room Code]
    B --> C[Insert into game_rooms]
    C --> D[Add Host to room_participants]
    D --> E[Subscribe to Realtime]
    E --> F[Show Room Code/QR]
    
    G[Player Joins] --> H[Enter Room Code]
    H --> I[Fetch Room by Code]
    I --> J{Room Exists?}
    J -->|Yes| K[Add to room_participants]
    J -->|No| L[Show Error]
    K --> M[Subscribe to Realtime]
    M --> N[Wait in Lobby]
    
    F --> O{All Ready?}
    N --> O
    O -->|Yes| P[Host Starts Game]
    P --> Q[Generate room_questions]
    Q --> R[Update room status]
    R --> S[All Players See Questions]`,
    steps: [
      "1. Host creates room with settings",
      "2. Unique 6-char code generated",
      "3. Room inserted into game_rooms table",
      "4. Host added to room_participants",
      "5. Realtime subscription started for updates",
      "6. Players join via code or QR scan",
      "7. Each joiner added to room_participants",
      "8. Host starts when ready",
      "9. Questions pre-generated into room_questions",
      "10. All players receive same questions via realtime"
    ]
  },
  {
    name: "Payment Flow (Stripe)",
    description: "Gem purchase via Stripe checkout",
    diagram: `graph TD
    A[User Selects Gem Pack] --> B[Call create-gem-checkout]
    B --> C[Create Stripe Session]
    C --> D[Return Checkout URL]
    D --> E[Redirect to Stripe]
    E --> F{Payment Success?}
    F -->|Yes| G[Stripe Webhook Fires]
    F -->|No| H[Return to App]
    G --> I[Verify Session]
    I --> J[Add Gems to Profile]
    J --> K[Log in gem_purchases]
    K --> L[Redirect to Success Page]`,
    steps: [
      "1. User selects gem package in shop",
      "2. Frontend calls create-gem-checkout edge function",
      "3. Edge function creates Stripe checkout session",
      "4. User redirected to Stripe hosted checkout",
      "5. On success, Stripe fires webhook",
      "6. stripe-gem-webhook verifies payment",
      "7. Gems added to user's profile",
      "8. Purchase logged in gem_purchases table",
      "9. User redirected back to app"
    ]
  },
  {
    name: "AI Avatar Generation Flow",
    description: "Generating AI avatars via AI gateway",
    diagram: `graph TD
    A[User Uploads Photo] --> B[Upload to Storage]
    B --> C[Call generate-avatar]
    C --> D[Send to AI gateway]
    D --> E{Generation Success?}
    E -->|Yes| F[Save to Storage]
    F --> G[Insert avatar_generations]
    G --> H[Update Profile avatar_url]
    H --> I[Show New Avatar]
    E -->|No| J[Return Error]
    
    K[Optional: Animate] --> L[Call animate-avatar]
    L --> M[Video Generation]
    M --> N[Save animated_avatar_url]`,
    steps: [
      "1. User uploads source photo",
      "2. Photo stored in Supabase Storage",
      "3. generate-avatar edge function called",
      "4. AI gateway processes image with prompt",
      "5. Generated avatar saved to storage",
      "6. Record created in avatar_generations",
      "7. Profile updated with new avatar URL",
      "8. Optional: animate-avatar for video version"
    ]
  },
  {
    name: "Daily Reward Claim Flow",
    description: "Claiming daily login rewards",
    diagram: `graph TD
    A[User Opens App] --> B[Check user_daily_rewards]
    B --> C{Last Claim Today?}
    C -->|Yes| D[Show Timer]
    C -->|No| E[Show Claim Button]
    E --> F[User Claims]
    F --> G[Calculate Streak]
    G --> H{Streak Broken?}
    H -->|Yes| I[Reset to Day 1]
    H -->|No| J[Increment Streak]
    I --> K[Award Base Reward]
    J --> L[Award Streak Bonus]
    K --> M[Update last_claimed_at]
    L --> M
    M --> N[Show Reward Animation]`,
    steps: [
      "1. App checks user_daily_rewards on load",
      "2. Compares last_claimed_at to current date",
      "3. If already claimed today, shows countdown",
      "4. If claimable, shows claim button",
      "5. On claim, calculates current streak",
      "6. Awards base reward + streak multiplier",
      "7. Updates database with new claim time",
      "8. Shows confetti and coin animation"
    ]
  },
  {
    name: "Category Level Progress Flow",
    description: "Tracking and unlocking category levels",
    diagram: `graph TD
    A[User Completes Level] --> B[Calculate Stars]
    B --> C{First Completion?}
    C -->|Yes| D[Insert user_level_progress]
    C -->|No| E{Better Score?}
    E -->|Yes| F[Update stars_earned]
    E -->|No| G[Keep Existing]
    D --> H[Award XP]
    F --> H
    H --> I[Check Next Level]
    I --> J{Meets Requirements?}
    J -->|Yes| K[Unlock Next Level]
    J -->|No| L[Show Locked]
    K --> M[Update UI]`,
    steps: [
      "1. User completes level with score",
      "2. Stars calculated (1-3 based on performance)",
      "3. Check if first time completing level",
      "4. Insert or update user_level_progress",
      "5. Award XP based on performance",
      "6. Check if next level can be unlocked",
      "7. Unlock requires previous level completion",
      "8. Update UI to show progress"
    ]
  },
  {
    name: "Real-time Chat Flow",
    description: "Direct messaging with real-time updates",
    diagram: `graph TD
    A[User Opens Chat] --> B[Fetch Recent Messages]
    B --> C[Subscribe to Realtime]
    C --> D[Listen for INSERTs]
    
    E[User Types] --> F[Show Typing Indicator]
    F --> G[Update user_presence]
    
    H[User Sends Message] --> I[Insert chat_messages]
    I --> J[Realtime Broadcasts]
    J --> K[Recipient Sees Message]
    K --> L[Mark as Read]
    L --> M[Update read_at]`,
    steps: [
      "1. Chat modal fetches last 50 messages",
      "2. Subscribes to chat_messages realtime channel",
      "3. Typing indicator updates user_presence",
      "4. Message inserted to chat_messages",
      "5. Realtime broadcasts to recipient",
      "6. Recipient sees message instantly",
      "7. read_at updated when viewed"
    ]
  },
  {
    name: "Leaderboard Calculation Flow",
    description: "Weekly league rankings and rewards",
    diagram: `graph TD
    A[User Earns XP] --> B[Update user_league_data]
    B --> C[Recalculate Rank]
    
    D[Weekly Reset Job] --> E[Snapshot Rankings]
    E --> F[Calculate Tier Placements]
    F --> G[Award Rewards]
    G --> H[Insert leaderboard_rewards]
    H --> I[Reset weekly_xp]
    I --> J[Notify Users]`,
    steps: [
      "1. User earns XP from games",
      "2. user_league_data updated with weekly_xp",
      "3. Rank calculated relative to tier",
      "4. Weekly reset job runs Sunday midnight",
      "5. Final rankings snapshotted",
      "6. Rewards distributed based on placement",
      "7. Promotions/demotions calculated",
      "8. weekly_xp reset to 0 for new week"
    ]
  },
  {
    name: "Power-Up Usage Flow",
    description: "Using power-ups during gameplay",
    diagram: `graph TD
    A[User Taps Power-Up] --> B{Has Power-Up?}
    B -->|No| C[Show Shop Prompt]
    B -->|Yes| D[Activate Effect]
    D --> E{Which Type?}
    E -->|Double| F[2x Points This Question]
    E -->|Bomb| G[Remove 2 Wrong Answers]
    E -->|Skip| H[Skip to Next Question]
    E -->|Magic| I[Show Correct Answer]
    F --> J[Decrement user_power_ups]
    G --> J
    H --> J
    I --> J
    J --> K[Update Mission Progress]`,
    steps: [
      "1. User taps power-up during question",
      "2. Check inventory in user_power_ups",
      "3. If none, prompt to visit shop",
      "4. Activate power-up effect",
      "5. Double: 2x points for correct answer",
      "6. Bomb: Hide 2 incorrect answers",
      "7. Skip: Move to next question",
      "8. Magic: Reveal correct answer",
      "9. Decrement count in database",
      "10. Track for daily missions"
    ]
  }
];

export const DATABASE_RELATIONSHIPS = {
  description: "Key table relationships in the database schema",
  diagram: `erDiagram
    profiles ||--o{ user_level_progress : has
    profiles ||--o{ user_power_ups : owns
    profiles ||--o{ user_achievements : earns
    profiles ||--o{ user_daily_rewards : claims
    profiles ||--o{ vip_subscriptions : subscribes
    profiles ||--o{ user_league_data : competes
    profiles ||--o{ friends : has
    profiles ||--o{ game_sessions : plays
    
    categories ||--o{ questions : contains
    categories ||--o{ category_translations : translates
    categories ||--o{ user_level_progress : tracks
    
    questions ||--o{ icon_library : uses
    
    game_rooms ||--o{ room_participants : has
    game_rooms ||--o{ room_questions : contains
    game_rooms ||--o{ room_chat_messages : has
    
    tv_sessions ||--o{ tv_players : has
    tv_sessions ||--o{ tv_questions : contains
    tv_sessions ||--o{ tv_answers : records`,
  relationships: [
    {
      from: "profiles",
      to: "user_level_progress",
      type: "one-to-many",
      description: "User has progress records for each category/level played"
    },
    {
      from: "profiles",
      to: "user_power_ups",
      type: "one-to-many",
      description: "User owns inventory of power-ups"
    },
    {
      from: "profiles",
      to: "game_sessions",
      type: "one-to-many",
      description: "User plays many VS mode sessions"
    },
    {
      from: "categories",
      to: "questions",
      type: "one-to-many",
      description: "Category contains many questions across levels"
    },
    {
      from: "game_rooms",
      to: "room_participants",
      type: "one-to-many",
      description: "Room has multiple player participants"
    },
    {
      from: "questions",
      to: "icon_library",
      type: "many-to-one",
      description: "Questions reference icons from library"
    }
  ]
};

export const RLS_POLICY_PATTERNS = [
  {
    pattern: "User-owned data",
    description: "Users can only access their own records",
    example: `CREATE POLICY "Users can view own data"
ON public.user_power_ups FOR SELECT
USING (auth.uid() = user_id);`,
    tables: ["profiles", "user_power_ups", "user_achievements", "user_daily_rewards"]
  },
  {
    pattern: "Public read, authenticated write",
    description: "Anyone can read, only authenticated users can write",
    example: `CREATE POLICY "Public read"
ON public.categories FOR SELECT
USING (true);

CREATE POLICY "Authenticated insert"
ON public.quiz_post_likes FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);`,
    tables: ["categories", "questions", "leaderboard_rewards"]
  },
  {
    pattern: "Room participant access",
    description: "Only room participants can access room data",
    example: `CREATE POLICY "Participants can view room"
ON public.room_questions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM room_participants
    WHERE room_id = room_questions.room_id
    AND user_id = auth.uid()
  )
);`,
    tables: ["room_questions", "room_chat_messages", "room_participants"]
  },
  {
    pattern: "Admin-only access",
    description: "Only users with admin role can access",
    example: `CREATE POLICY "Admin only"
ON public.ai_generation_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);`,
    tables: ["ai_generation_settings", "trivia_generation_history"]
  }
];
