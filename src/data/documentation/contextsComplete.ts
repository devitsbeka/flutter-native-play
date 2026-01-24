// Complete Context Providers Documentation
// Documents ALL context providers in the application

export interface ContextDocFull {
  name: string;
  path: string;
  description: string;
  hook: string;
  providedValues: ContextValue[];
  dependencies: string[];
  usedIn: string[];
}

export interface ContextValue {
  name: string;
  type: string;
  description: string;
}

export const ALL_CONTEXTS_FULL: ContextDocFull[] = [
  {
    name: "AuthContext",
    path: "src/contexts/AuthContext.tsx",
    description: "Core authentication context. Manages user session, profile data, and auth operations.",
    hook: "useAuth",
    providedValues: [
      { name: "user", type: "User | null", description: "Current Supabase user object" },
      { name: "profile", type: "Profile | null", description: "User's profile from profiles table" },
      { name: "loading", type: "boolean", description: "Auth state loading indicator" },
      { name: "signIn", type: "(email, password) => Promise", description: "Email/password login" },
      { name: "signUp", type: "(email, password, metadata) => Promise", description: "Register new user" },
      { name: "signOut", type: "() => Promise", description: "Log out current user" },
      { name: "signInWithGoogle", type: "() => Promise", description: "Google OAuth login" },
      { name: "signInWithApple", type: "() => Promise", description: "Apple OAuth login" },
      { name: "updateProfile", type: "(data) => Promise", description: "Update user profile" },
      { name: "refreshProfile", type: "() => Promise", description: "Reload profile from DB" },
    ],
    dependencies: ["supabase"],
    usedIn: ["Entire application"]
  },
  {
    name: "LanguageContext",
    path: "src/contexts/LanguageContext.tsx",
    description: "Internationalization context. Manages current language and translations.",
    hook: "useLanguage",
    providedValues: [
      { name: "language", type: "'ka' | 'en'", description: "Current language code" },
      { name: "setLanguage", type: "(lang) => void", description: "Change language" },
      { name: "t", type: "(key) => string", description: "Translation function" },
      { name: "isGeorgian", type: "boolean", description: "Is Georgian selected" },
    ],
    dependencies: ["locales/*"],
    usedIn: ["Entire application"]
  },
  {
    name: "SoundContext",
    path: "src/contexts/SoundContext.tsx",
    description: "Audio management context. Controls music, SFX, and vibration.",
    hook: "useSound",
    providedValues: [
      { name: "musicEnabled", type: "boolean", description: "Background music enabled" },
      { name: "sfxEnabled", type: "boolean", description: "Sound effects enabled" },
      { name: "vibrationEnabled", type: "boolean", description: "Haptic feedback enabled" },
      { name: "setMusicEnabled", type: "(enabled) => void", description: "Toggle music" },
      { name: "setSfxEnabled", type: "(enabled) => void", description: "Toggle SFX" },
      { name: "setVibrationEnabled", type: "(enabled) => void", description: "Toggle vibration" },
      { name: "playSound", type: "(soundId) => void", description: "Play sound effect" },
      { name: "vibrate", type: "(pattern) => void", description: "Trigger vibration" },
    ],
    dependencies: ["Capacitor Haptics"],
    usedIn: ["Game screens", "Buttons", "Notifications"]
  },
  {
    name: "OnboardingContext",
    path: "src/contexts/OnboardingContext.tsx",
    description: "User onboarding flow management.",
    hook: "useOnboarding",
    providedValues: [
      { name: "isOnboarding", type: "boolean", description: "Is user in onboarding" },
      { name: "currentStep", type: "number", description: "Current onboarding step" },
      { name: "totalSteps", type: "number", description: "Total onboarding steps" },
      { name: "startOnboarding", type: "() => void", description: "Begin onboarding flow" },
      { name: "nextStep", type: "() => void", description: "Advance to next step" },
      { name: "skipOnboarding", type: "() => void", description: "Skip remaining steps" },
      { name: "completeOnboarding", type: "() => void", description: "Mark as complete" },
    ],
    dependencies: ["AuthContext"],
    usedIn: ["New user registration flow"]
  },
  {
    name: "NotificationModalContext",
    path: "src/contexts/NotificationModalContext.tsx",
    description: "In-app notification modal management.",
    hook: "useNotificationModal",
    providedValues: [
      { name: "showNotification", type: "(config) => void", description: "Display notification modal" },
      { name: "hideNotification", type: "() => void", description: "Close notification modal" },
      { name: "isVisible", type: "boolean", description: "Modal visibility state" },
      { name: "currentNotification", type: "NotificationConfig | null", description: "Active notification" },
    ],
    dependencies: [],
    usedIn: ["Rewards", "Achievements", "System alerts"]
  },
  {
    name: "BackgroundGenerationContext",
    path: "src/contexts/BackgroundGenerationContext.tsx",
    description: "AI background generation queue management.",
    hook: "useBackgroundGeneration",
    providedValues: [
      { name: "isGenerating", type: "boolean", description: "Generation in progress" },
      { name: "queue", type: "GenerationJob[]", description: "Pending generation jobs" },
      { name: "addToQueue", type: "(job) => void", description: "Add job to queue" },
      { name: "currentJob", type: "GenerationJob | null", description: "Currently processing job" },
      { name: "progress", type: "number", description: "Current job progress 0-100" },
    ],
    dependencies: ["Edge functions"],
    usedIn: ["Avatar generation", "Cover generation"]
  },
  {
    name: "PlayerProfileContext",
    path: "src/contexts/PlayerProfileContext.tsx",
    description: "Player profile modal management.",
    hook: "usePlayerProfileModal",
    providedValues: [
      { name: "openProfile", type: "(userId) => void", description: "Open profile modal" },
      { name: "closeProfile", type: "() => void", description: "Close profile modal" },
      { name: "isOpen", type: "boolean", description: "Modal open state" },
      { name: "currentUserId", type: "string | null", description: "Viewed user ID" },
    ],
    dependencies: ["usePlayerProfile"],
    usedIn: ["Leaderboards", "Friend lists", "Chat"]
  },
  {
    name: "GameContext",
    path: "src/contexts/GameContext.tsx",
    description: "VS mode game state management.",
    hook: "useGame",
    providedValues: [
      { name: "gameState", type: "GameState", description: "Current game state" },
      { name: "currentQuestion", type: "Question | null", description: "Active question" },
      { name: "score", type: "number", description: "Player score" },
      { name: "opponentScore", type: "number", description: "Opponent score" },
      { name: "submitAnswer", type: "(answer) => void", description: "Submit answer" },
      { name: "startGame", type: "(questions) => void", description: "Start new game" },
      { name: "endGame", type: "() => void", description: "End current game" },
    ],
    dependencies: ["AuthContext", "SoundContext"],
    usedIn: ["VS mode gameplay"]
  },
  {
    name: "MultiplayerContext",
    path: "src/contexts/MultiplayerContext.tsx",
    description: "Original multiplayer room management (deprecated).",
    hook: "useMultiplayer",
    providedValues: [
      { name: "room", type: "Room | null", description: "Current room" },
      { name: "participants", type: "Participant[]", description: "Room participants" },
      { name: "joinRoom", type: "(code) => Promise", description: "Join room by code" },
      { name: "leaveRoom", type: "() => void", description: "Leave current room" },
    ],
    dependencies: ["supabase realtime"],
    usedIn: ["Legacy multiplayer"]
  },
  {
    name: "MultiplayerContextV2",
    path: "src/contexts/MultiplayerContextV2.tsx",
    description: "Updated multiplayer room management with improved real-time.",
    hook: "useMultiplayerV2",
    providedValues: [
      { name: "room", type: "Room | null", description: "Current room data" },
      { name: "participants", type: "Participant[]", description: "Room participants" },
      { name: "gameState", type: "GameState", description: "Current game state" },
      { name: "currentQuestion", type: "Question | null", description: "Active question" },
      { name: "submitAnswer", type: "(answer) => Promise", description: "Submit answer" },
      { name: "isHost", type: "boolean", description: "Is current user host" },
      { name: "startGame", type: "() => Promise", description: "Start game (host only)" },
    ],
    dependencies: ["supabase realtime", "AuthContext"],
    usedIn: ["TriviaLobby", "Multiplayer gameplay"]
  },
  {
    name: "TVGameContext",
    path: "src/contexts/TVGameContext.tsx",
    description: "TV mode game state and session management.",
    hook: "useTVGame",
    providedValues: [
      { name: "session", type: "TVSession | null", description: "Current TV session" },
      { name: "players", type: "TVPlayer[]", description: "Connected players" },
      { name: "currentQuestion", type: "Question | null", description: "Current question" },
      { name: "round", type: "number", description: "Current round number" },
      { name: "phase", type: "TVPhase", description: "Current game phase" },
      { name: "startSession", type: "() => Promise<string>", description: "Create new session" },
      { name: "endSession", type: "() => Promise", description: "End current session" },
      { name: "nextQuestion", type: "() => void", description: "Advance to next question" },
    ],
    dependencies: ["supabase realtime", "AuthContext"],
    usedIn: ["TVDisplay", "TVLobby", "TVHostController"]
  },
  {
    name: "TVMockContext",
    path: "src/contexts/TVMockContext.tsx",
    description: "Mock TV context for development/testing.",
    hook: "useTVMock",
    providedValues: [
      { name: "mockPlayers", type: "TVPlayer[]", description: "Simulated players" },
      { name: "simulateAnswer", type: "(playerId, answer) => void", description: "Simulate player answer" },
      { name: "addMockPlayer", type: "() => void", description: "Add simulated player" },
    ],
    dependencies: [],
    usedIn: ["TVScreensShowcase", "Development"]
  },
];

export const CONTEXT_HIERARCHY = `
App.tsx Provider Hierarchy:
├── ThemeProvider (next-themes)
│   └── BrowserRouter
│       └── QueryClientProvider (react-query)
│           └── LanguageProvider
│               └── AuthProvider
│                   └── OnboardingProvider
│                       └── SoundProvider
│                           └── NotificationModalProvider
│                               └── BackgroundGenerationProvider
│                                   └── PlayerProfileProvider
│                                       └── Routes
`;

export const CONTEXT_USAGE_GUIDE = `
Context Usage Guidelines:

1. AuthContext - Use for any auth-related functionality
   - Always check 'user' before profile operations
   - Use 'profile' for display data (coins, gems, avatar)

2. LanguageContext - Use for all user-facing text
   - Always use t('key') for translations
   - Never hardcode strings in components

3. SoundContext - Use for audio feedback
   - Call playSound() for UI interactions
   - Check sfxEnabled before playing

4. GameContext - Only for VS mode games
   - For multiplayer, use MultiplayerContextV2
   - For TV mode, use TVGameContext

5. PlayerProfileContext - Use for viewing other players
   - Call openProfile(userId) to show modal
   - Works anywhere in the app

6. NotificationModalContext - Use for celebratory/alert modals
   - Not for toast notifications (use useToast)
   - Good for rewards, level-ups, achievements
`;
