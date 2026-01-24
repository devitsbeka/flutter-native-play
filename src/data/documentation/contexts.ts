// Contexts Documentation
// Documents all React Context providers

export interface ContextValue {
  name: string;
  type: string;
  description: string;
  descriptionKa: string;
}

export interface ContextDoc {
  name: string;
  category: string;
  categoryKa: string;
  description: string;
  descriptionKa: string;
  filePath: string;
  values: ContextValue[];
  hook: string;
  dependencies?: string[];
}

export const CONTEXT_AUTH: ContextDoc = {
  name: 'AuthContext',
  category: 'Core',
  categoryKa: 'მთავარი',
  description: 'Manages authentication state, user profile, and auth methods. Wraps the entire app.',
  descriptionKa: 'მართავს ავტორიზაციის state-ს, მომხმარებლის პროფილს და auth მეთოდებს. ახვევს მთელ აპლიკაციას.',
  filePath: 'src/contexts/AuthContext.tsx',
  values: [
    { name: 'user', type: 'User | null', description: 'Supabase auth user', descriptionKa: 'Supabase auth მომხმარებელი' },
    { name: 'profile', type: 'Profile | null', description: 'User profile data', descriptionKa: 'მომხმარებლის პროფილის მონაცემები' },
    { name: 'isAuthenticated', type: 'boolean', description: 'Login status', descriptionKa: 'შესვლის სტატუსი' },
    { name: 'isLoading', type: 'boolean', description: 'Auth state loading', descriptionKa: 'Auth state იტვირთება' },
    { name: 'signIn', type: 'function', description: 'Sign in method', descriptionKa: 'შესვლის მეთოდი' },
    { name: 'signUp', type: 'function', description: 'Sign up method', descriptionKa: 'რეგისტრაციის მეთოდი' },
    { name: 'signOut', type: 'function', description: 'Sign out method', descriptionKa: 'გასვლის მეთოდი' },
    { name: 'updateProfile', type: 'function', description: 'Update profile method', descriptionKa: 'პროფილის განახლების მეთოდი' },
  ],
  hook: 'useAuth',
  dependencies: ['@supabase/supabase-js']
};

export const CONTEXT_LANGUAGE: ContextDoc = {
  name: 'LanguageContext',
  category: 'Core',
  categoryKa: 'მთავარი',
  description: 'Provides internationalization (i18n) support. Manages language state and translations.',
  descriptionKa: 'უზრუნველყოფს ინტერნაციონალიზაციის (i18n) მხარდაჭერას. მართავს ენის state-ს და თარგმანებს.',
  filePath: 'src/contexts/LanguageContext.tsx',
  values: [
    { name: 'language', type: '"ka" | "en"', description: 'Current language code', descriptionKa: 'მიმდინარე ენის კოდი' },
    { name: 'setLanguage', type: 'function', description: 'Change language', descriptionKa: 'ენის შეცვლა' },
    { name: 't', type: 'function', description: 'Translation function', descriptionKa: 'თარგმანის ფუნქცია' },
  ],
  hook: 'useLanguage'
};

export const CONTEXT_SOUND: ContextDoc = {
  name: 'SoundContext',
  category: 'Core',
  categoryKa: 'მთავარი',
  description: 'Manages audio playback for sound effects and background music. Respects user preferences.',
  descriptionKa: 'მართავს აუდიო დაკვრას ხმოვანი ეფექტებისა და ფონური მუსიკისთვის. პატივს სცემს მომხმარებლის პარამეტრებს.',
  filePath: 'src/contexts/SoundContext.tsx',
  values: [
    { name: 'playSound', type: 'function', description: 'Play a sound effect', descriptionKa: 'ხმოვანი ეფექტის დაკვრა' },
    { name: 'playBackgroundMusic', type: 'function', description: 'Start background music', descriptionKa: 'ფონური მუსიკის დაწყება' },
    { name: 'stopBackgroundMusic', type: 'function', description: 'Stop background music', descriptionKa: 'ფონური მუსიკის გაჩერება' },
    { name: 'isMuted', type: 'boolean', description: 'Mute state', descriptionKa: 'გაჩუმების მდგომარეობა' },
    { name: 'setMuted', type: 'function', description: 'Toggle mute', descriptionKa: 'გაჩუმების გადართვა' },
  ],
  hook: 'useSound'
};

export const CONTEXT_NOTIFICATION_MODAL: ContextDoc = {
  name: 'NotificationModalContext',
  category: 'UI',
  categoryKa: 'UI',
  description: 'Shows in-app notification modals for achievements, rewards, and system messages.',
  descriptionKa: 'აჩვენებს აპლიკაციის შიდა შეტყობინებების მოდალებს მიღწევებისთვის, ჯილდოებისთვის და სისტემური შეტყობინებებისთვის.',
  filePath: 'src/contexts/NotificationModalContext.tsx',
  values: [
    { name: 'showNotification', type: 'function', description: 'Show notification modal', descriptionKa: 'შეტყობინების მოდალის ჩვენება' },
    { name: 'showReward', type: 'function', description: 'Show reward animation', descriptionKa: 'ჯილდოს ანიმაციის ჩვენება' },
    { name: 'showAchievement', type: 'function', description: 'Show achievement unlock', descriptionKa: 'მიღწევის განბლოკვის ჩვენება' },
    { name: 'hideNotification', type: 'function', description: 'Hide current notification', descriptionKa: 'მიმდინარე შეტყობინების დამალვა' },
  ],
  hook: 'useNotificationModal'
};

export const CONTEXT_ONBOARDING: ContextDoc = {
  name: 'OnboardingContext',
  category: 'UI',
  categoryKa: 'UI',
  description: 'Tracks first-time user experience flags. Shows tutorials and guides for new users.',
  descriptionKa: 'თვალყურს ადევნებს პირველად მომხმარებლის გამოცდილების ფლაგებს. აჩვენებს ტუტორიალებს და გაიდებს ახალი მომხმარებლებისთვის.',
  filePath: 'src/contexts/OnboardingContext.tsx',
  values: [
    { name: 'hasSeenOnboarding', type: 'boolean', description: 'Completed onboarding', descriptionKa: 'დასრულებული onboarding' },
    { name: 'hasSeenFeature', type: 'function', description: 'Check feature seen', descriptionKa: 'ფუნქციის ნანახობის შემოწმება' },
    { name: 'markOnboardingComplete', type: 'function', description: 'Mark onboarding done', descriptionKa: 'onboarding-ის დასრულებულად მონიშვნა' },
    { name: 'markFeatureSeen', type: 'function', description: 'Mark feature seen', descriptionKa: 'ფუნქციის ნანახად მონიშვნა' },
  ],
  hook: 'useOnboarding'
};

export const CONTEXT_PLAYER_PROFILE: ContextDoc = {
  name: 'PlayerProfileContext',
  category: 'Social',
  categoryKa: 'სოციალური',
  description: 'Provides a global modal for viewing any player profile. Used throughout the app for profile clicks.',
  descriptionKa: 'უზრუნველყოფს გლობალურ მოდალს ნებისმიერი მოთამაშის პროფილის სანახავად. გამოიყენება აპლიკაციაში პროფილზე დაწკაპუნებისთვის.',
  filePath: 'src/contexts/PlayerProfileContext.tsx',
  values: [
    { name: 'openProfile', type: 'function', description: 'Open profile modal', descriptionKa: 'პროფილის მოდალის გახსნა' },
    { name: 'closeProfile', type: 'function', description: 'Close profile modal', descriptionKa: 'პროფილის მოდალის დახურვა' },
    { name: 'isOpen', type: 'boolean', description: 'Modal open state', descriptionKa: 'მოდალის გახსნის მდგომარეობა' },
    { name: 'profileUserId', type: 'string | null', description: 'Currently viewing user', descriptionKa: 'ამჟამად სანახავი მომხმარებელი' },
  ],
  hook: 'usePlayerProfile'
};

export const CONTEXT_MULTIPLAYER_V2: ContextDoc = {
  name: 'MultiplayerContextV2',
  category: 'Game',
  categoryKa: 'თამაში',
  description: 'Main multiplayer game context. Manages room state, participants, questions, and real-time sync.',
  descriptionKa: 'მთავარი მულტიპლეიერ თამაშის კონტექსტი. მართავს ოთახის state-ს, მონაწილეებს, კითხვებს და რეალურ დროის სინქრონიზაციას.',
  filePath: 'src/contexts/MultiplayerContextV2.tsx',
  values: [
    { name: 'room', type: 'GameRoom | null', description: 'Current room', descriptionKa: 'მიმდინარე ოთახი' },
    { name: 'participants', type: 'Participant[]', description: 'Room participants', descriptionKa: 'ოთახის მონაწილეები' },
    { name: 'currentQuestion', type: 'Question | null', description: 'Current question', descriptionKa: 'მიმდინარე კითხვა' },
    { name: 'phase', type: 'GamePhase', description: 'Game phase', descriptionKa: 'თამაშის ფაზა' },
    { name: 'createRoom', type: 'function', description: 'Create room', descriptionKa: 'ოთახის შექმნა' },
    { name: 'enterRoom', type: 'function', description: 'Join room', descriptionKa: 'ოთახში შესვლა' },
    { name: 'leaveRoom', type: 'function', description: 'Leave room', descriptionKa: 'ოთახიდან გასვლა' },
    { name: 'startGame', type: 'function', description: 'Start game', descriptionKa: 'თამაშის დაწყება' },
    { name: 'submitAnswer', type: 'function', description: 'Submit answer', descriptionKa: 'პასუხის გაგზავნა' },
  ],
  hook: 'useMultiplayerV2',
  dependencies: ['@supabase/supabase-js', 'questionService']
};

export const CONTEXT_TV_GAME: ContextDoc = {
  name: 'TVGameContext',
  category: 'Game',
  categoryKa: 'თამაში',
  description: 'Manages TV mode game state. Used for party mode with large screen display and mobile controllers.',
  descriptionKa: 'მართავს TV რეჟიმის თამაშის state-ს. გამოიყენება წვეულების რეჟიმისთვის დიდი ეკრანის ჩვენებით და მობილური კონტროლერებით.',
  filePath: 'src/contexts/TVGameContext.tsx',
  values: [
    { name: 'session', type: 'TVSession | null', description: 'TV session', descriptionKa: 'TV სესია' },
    { name: 'players', type: 'TVPlayer[]', description: 'Connected players', descriptionKa: 'დაკავშირებული მოთამაშეები' },
    { name: 'currentQuestion', type: 'TVQuestion | null', description: 'Current question', descriptionKa: 'მიმდინარე კითხვა' },
    { name: 'phase', type: 'TVPhase', description: 'Session phase', descriptionKa: 'სესიის ფაზა' },
    { name: 'createSession', type: 'function', description: 'Create TV session', descriptionKa: 'TV სესიის შექმნა' },
    { name: 'joinSession', type: 'function', description: 'Join as player', descriptionKa: 'შეუერთდი როგორც მოთამაშე' },
    { name: 'startRound', type: 'function', description: 'Start round', descriptionKa: 'რაუნდის დაწყება' },
  ],
  hook: 'useTVGame',
  dependencies: ['@supabase/supabase-js']
};

export const CONTEXT_BACKGROUND_GENERATION: ContextDoc = {
  name: 'BackgroundGenerationContext',
  category: 'AI',
  categoryKa: 'AI',
  description: 'Manages background AI avatar generation queue. Polls for completion and updates profile.',
  descriptionKa: 'მართავს ფონური AI ავატარის გენერაციის რიგს. იკითხავს დასრულებას და აახლებს პროფილს.',
  filePath: 'src/contexts/BackgroundGenerationContext.tsx',
  values: [
    { name: 'isGenerating', type: 'boolean', description: 'Generation in progress', descriptionKa: 'გენერაცია მიმდინარეობს' },
    { name: 'progress', type: 'number', description: 'Generation progress', descriptionKa: 'გენერაციის პროგრესი' },
    { name: 'queueGeneration', type: 'function', description: 'Queue avatar generation', descriptionKa: 'ავატარის გენერაციის რიგში დაყენება' },
    { name: 'cancelGeneration', type: 'function', description: 'Cancel generation', descriptionKa: 'გენერაციის გაუქმება' },
  ],
  hook: 'useBackgroundGeneration'
};

// Export all contexts
export const ALL_CONTEXTS: ContextDoc[] = [
  CONTEXT_AUTH,
  CONTEXT_LANGUAGE,
  CONTEXT_SOUND,
  CONTEXT_NOTIFICATION_MODAL,
  CONTEXT_ONBOARDING,
  CONTEXT_PLAYER_PROFILE,
  CONTEXT_MULTIPLAYER_V2,
  CONTEXT_TV_GAME,
  CONTEXT_BACKGROUND_GENERATION,
];

// Context categories for navigation
export const CONTEXT_CATEGORIES = [
  { id: 'core', name: 'Core', nameKa: 'მთავარი' },
  { id: 'ui', name: 'UI', nameKa: 'UI' },
  { id: 'social', name: 'Social', nameKa: 'სოციალური' },
  { id: 'game', name: 'Game', nameKa: 'თამაში' },
  { id: 'ai', name: 'AI', nameKa: 'AI' },
];
