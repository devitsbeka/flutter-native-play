// Architecture Documentation
// Describes the overall system architecture and design patterns

export interface ArchitectureSection {
  id: string;
  title: string;
  titleKa: string;
  description: string;
  descriptionKa: string;
  diagram?: string;
  subsections?: ArchitectureSubsection[];
}

export interface ArchitectureSubsection {
  title: string;
  titleKa: string;
  content: string;
  contentKa: string;
  codeExample?: string;
}

export const ARCHITECTURE_OVERVIEW: ArchitectureSection = {
  id: 'overview',
  title: 'System Architecture Overview',
  titleKa: 'სისტემის არქიტექტურის მიმოხილვა',
  description: `
This is a Georgian trivia game application built with React, TypeScript, and Supabase.
The application supports multiple game modes, real-time multiplayer, user-generated content, and monetization.

**Tech Stack:**
- Frontend: React 18 + TypeScript + Vite
- Styling: Tailwind CSS + shadcn/ui components
- State: React Context + TanStack Query
- Backend: Supabase (PostgreSQL + Edge Functions + Realtime)
- Mobile: Capacitor (iOS/Android hybrid)
- Payments: Stripe + RevenueCat (for mobile IAP)
- Push: Firebase Cloud Messaging
- AI: AI gateway (for content generation)
  `,
  descriptionKa: `
ეს არის ქართული ტრივია თამაშის აპლიკაცია, აგებული React, TypeScript და Supabase ტექნოლოგიებზე.
აპლიკაცია მხარს უჭერს მრავალ თამაშის რეჟიმს, რეალურ დროში მულტიპლეიერს, მომხმარებლის მიერ შექმნილ კონტენტს და მონეტიზაციას.

**ტექნოლოგიური სტეკი:**
- ფრონტენდი: React 18 + TypeScript + Vite
- სტილები: Tailwind CSS + shadcn/ui კომპონენტები
- State: React Context + TanStack Query
- ბექენდი: Supabase (PostgreSQL + Edge Functions + Realtime)
- მობილური: Capacitor (iOS/Android ჰიბრიდი)
- გადახდები: Stripe + RevenueCat (მობილური IAP-სთვის)
- Push შეტყობინებები: Firebase Cloud Messaging
- AI: AI gateway (კონტენტის გენერაციისთვის)
  `,
  diagram: `
graph TD
    subgraph "Client Layer"
        A[React App] --> B[Capacitor Bridge]
        B --> C[iOS/Android Native]
    end
    
    subgraph "State Management"
        D[AuthContext] --> E[User State]
        F[TanStack Query] --> G[Server State Cache]
        H[Local Storage] --> I[Guest Progress]
    end
    
    subgraph "Backend Layer"
        J[Supabase Auth] --> K[JWT Tokens]
        L[PostgreSQL] --> M[79 Tables]
        N[Edge Functions] --> O[48 Functions]
        P[Realtime] --> Q[WebSocket Subscriptions]
        R[Storage] --> S[Images/Avatars]
    end
    
    subgraph "External Services"
        T[Stripe] --> U[Web Payments]
        V[RevenueCat] --> W[Mobile IAP]
        X[Firebase] --> Y[Push Notifications]
        Z[AI gateway] --> AA[Content Generation]
    end
    
    A --> J
    A --> L
    A --> N
    A --> P
    A --> R
    N --> T
    C --> V
    N --> X
    N --> Z
  `
};

export const PROVIDER_HIERARCHY: ArchitectureSection = {
  id: 'providers',
  title: 'Provider Hierarchy',
  titleKa: 'პროვაიდერების იერარქია',
  description: `
The application uses a nested provider pattern for global state management.
Each provider wraps the application and provides context to all children.
The order matters - providers that depend on others must be nested inside them.
  `,
  descriptionKa: `
აპლიკაცია იყენებს ჩადგმული პროვაიდერების პატერნს გლობალური state-ის მართვისთვის.
თითოეული პროვაიდერი ახვევს აპლიკაციას და აწვდის კონტექსტს ყველა შვილ კომპონენტს.
თანმიმდევრობას აქვს მნიშვნელობა - პროვაიდერები, რომლებიც დამოკიდებულია სხვებზე, უნდა იყოს მათში ჩადგმული.
  `,
  subsections: [
    {
      title: 'LanguageProvider (Outermost)',
      titleKa: 'LanguageProvider (გარე)',
      content: 'Provides i18n support with Georgian (ka) and English (en) languages. Uses localStorage for persistence.',
      contentKa: 'უზრუნველყოფს i18n მხარდაჭერას ქართული (ka) და ინგლისური (en) ენებისთვის. იყენებს localStorage-ს შენახვისთვის.',
      codeExample: `
const { language, setLanguage, t } = useLanguage();
// t('key') returns translated string
      `
    },
    {
      title: 'AuthProvider',
      titleKa: 'AuthProvider',
      content: 'Manages Supabase authentication state, user profile, and session. Provides login/logout/signup methods.',
      contentKa: 'მართავს Supabase ავტორიზაციის state-ს, მომხმარებლის პროფილს და სესიას. უზრუნველყოფს login/logout/signup მეთოდებს.',
      codeExample: `
const { user, profile, signIn, signOut, isAuthenticated } = useAuth();
      `
    },
    {
      title: 'OnboardingProvider',
      titleKa: 'OnboardingProvider',
      content: 'Tracks first-time user experience flags. Shows tutorials and guides for new users.',
      contentKa: 'თვალყურს ადევნებს პირველად მომხმარებლის გამოცდილების ფლაგებს. აჩვენებს ტუტორიალებს და გაიდებს ახალი მომხმარებლებისთვის.',
      codeExample: `
const { hasSeenOnboarding, markOnboardingComplete } = useOnboarding();
      `
    },
    {
      title: 'SoundProvider',
      titleKa: 'SoundProvider',
      content: 'Manages audio playback for sound effects and background music. Respects user preferences.',
      contentKa: 'მართავს აუდიო დაკვრას ხმოვანი ეფექტებისა და ფონური მუსიკისთვის. პატივს სცემს მომხმარებლის პარამეტრებს.',
      codeExample: `
const { playSound, playBackgroundMusic, stopBackgroundMusic, isMuted } = useSound();
      `
    },
    {
      title: 'NotificationModalProvider',
      titleKa: 'NotificationModalProvider',
      content: 'Shows in-app notification modals for achievements, rewards, and system messages.',
      contentKa: 'აჩვენებს აპლიკაციის შიდა შეტყობინებების მოდალებს მიღწევებისთვის, ჯილდოებისთვის და სისტემური შეტყობინებებისთვის.',
      codeExample: `
const { showNotification, showReward, showAchievement } = useNotificationModal();
      `
    },
    {
      title: 'BackgroundGenerationProvider',
      titleKa: 'BackgroundGenerationProvider',
      content: 'Manages background AI avatar generation queue. Polls for completion and updates profile.',
      contentKa: 'მართავს ფონური AI ავატარის გენერაციის რიგს. იკითხავს დასრულებას და აახლებს პროფილს.',
      codeExample: `
const { isGenerating, queueGeneration } = useBackgroundGeneration();
      `
    },
    {
      title: 'PlayerProfileProvider',
      titleKa: 'PlayerProfileProvider',
      content: 'Provides a global modal for viewing any player profile. Used throughout the app for profile clicks.',
      contentKa: 'უზრუნველყოფს გლობალურ მოდალს ნებისმიერი მოთამაშის პროფილის სანახავად. გამოიყენება აპლიკაციაში პროფილზე დაწკაპუნებისთვის.',
      codeExample: `
const { openProfile, closeProfile } = usePlayerProfile();
openProfile(userId);
      `
    }
  ]
};

export const GAME_MODES: ArchitectureSection = {
  id: 'game-modes',
  title: 'Game Modes',
  titleKa: 'თამაშის რეჟიმები',
  description: 'The application supports 4 distinct game modes, each with its own flow and database tables.',
  descriptionKa: 'აპლიკაცია მხარს უჭერს 4 განსხვავებულ თამაშის რეჟიმს, თითოეულს აქვს საკუთარი ფლოუ და მონაცემთა ბაზის ცხრილები.',
  subsections: [
    {
      title: '1. Category Mode (Solo)',
      titleKa: '1. კატეგორიის რეჟიმი (სოლო)',
      content: `
**Flow:** Select category → Select level → Answer 5 questions → Get star rating (1-3)
**Tables:** categories, questions, user_level_progress
**Features:**
- 20+ categories with Georgian content
- Progressive difficulty within levels
- Star-based progression (need 1 star to unlock next level)
- Tracks best score per level
      `,
      contentKa: `
**ფლოუ:** აირჩიე კატეგორია → აირჩიე დონე → უპასუხე 5 კითხვას → მიიღე ვარსკვლავის რეიტინგი (1-3)
**ცხრილები:** categories, questions, user_level_progress
**ფუნქციები:**
- 20+ კატეგორია ქართული კონტენტით
- პროგრესული სირთულე დონეებში
- ვარსკვლავებზე დაფუძნებული პროგრესი (საჭიროა 1 ვარსკვლავი შემდეგი დონის გასახსნელად)
- თვალყურს ადევნებს საუკეთესო ქულას დონეზე
      `
    },
    {
      title: '2. VS Mode (PvP Simulation)',
      titleKa: '2. VS რეჟიმი (PvP სიმულაცია)',
      content: `
**Flow:** Click Play → Matchmaking animation → Play against AI opponent → Win coins
**Tables:** game_sessions, profiles (for opponent data)
**Features:**
- Simulated opponents from real player profiles
- 10 questions per match
- Betting system (stake coins for higher rewards)
- Daily play limits (5 free, VIP unlimited)
      `,
      contentKa: `
**ფლოუ:** დააჭირე Play → მატჩმეიკინგის ანიმაცია → ითამაშე AI მოწინააღმდეგის წინააღმდეგ → მოიგე მონეტები
**ცხრილები:** game_sessions, profiles (მოწინააღმდეგის მონაცემებისთვის)
**ფუნქციები:**
- სიმულირებული მოწინააღმდეგეები რეალური მოთამაშეების პროფილებიდან
- 10 კითხვა მატჩზე
- ფსონის სისტემა (დადე მონეტები მაღალი ჯილდოსთვის)
- ყოველდღიური თამაშის ლიმიტები (5 უფასო, VIP შეუზღუდავი)
      `
    },
    {
      title: '3. Multiplayer Mode (Real-time)',
      titleKa: '3. მულტიპლეიერ რეჟიმი (რეალურ დროში)',
      content: `
**Flow:** Create/Join room → Wait for players → Host starts game → Real-time answers → Results
**Tables:** game_rooms, room_participants, room_questions, room_games, room_match_history
**Features:**
- Room codes for easy joining
- Real-time question sync via Supabase Realtime
- Support for 2-8 players
- Persistent rooms (can play multiple rounds)
- Challenge friends directly
      `,
      contentKa: `
**ფლოუ:** შექმენი/შეუერთდი ოთახს → დაელოდე მოთამაშეებს → ჰოსტი იწყებს თამაშს → რეალურ დროში პასუხები → შედეგები
**ცხრილები:** game_rooms, room_participants, room_questions, room_games, room_match_history
**ფუნქციები:**
- ოთახის კოდები მარტივი შეერთებისთვის
- რეალურ დროში კითხვების სინქრონიზაცია Supabase Realtime-ის საშუალებით
- 2-8 მოთამაშის მხარდაჭერა
- მუდმივი ოთახები (შეგიძლია ითამაშო მრავალი რაუნდი)
- პირდაპირ გამოწვიე მეგობრები
      `
    },
    {
      title: '4. TV Mode (Party)',
      titleKa: '4. TV რეჟიმი (წვეულება)',
      content: `
**Flow:** Host creates session → Display QR on TV → Players join via phone → Play on big screen
**Tables:** tv_sessions, tv_players, tv_questions, tv_answers, tv_category_queue
**Features:**
- Large screen display optimized UI
- Mobile controller interface
- QR code join
- Category rotation queue
- Party mode for groups
      `,
      contentKa: `
**ფლოუ:** ჰოსტი ქმნის სესიას → აჩვენებს QR-ს TV-ზე → მოთამაშეები უერთდებიან ტელეფონით → თამაში დიდ ეკრანზე
**ცხრილები:** tv_sessions, tv_players, tv_questions, tv_answers, tv_category_queue
**ფუნქციები:**
- დიდი ეკრანის ჩვენებისთვის ოპტიმიზებული UI
- მობილური კონტროლერის ინტერფეისი
- QR კოდით შეერთება
- კატეგორიების როტაციის რიგი
- წვეულების რეჟიმი ჯგუფებისთვის
      `
    }
  ]
};

export const DATA_FLOW: ArchitectureSection = {
  id: 'data-flow',
  title: 'Data Flow Patterns',
  titleKa: 'მონაცემთა ნაკადის პატერნები',
  description: 'How data flows through the application from user action to database and back.',
  descriptionKa: 'როგორ მოძრაობს მონაცემები აპლიკაციაში მომხმარებლის მოქმედებიდან მონაცემთა ბაზამდე და უკან.',
  subsections: [
    {
      title: 'Question Fetching Pipeline',
      titleKa: 'კითხვების მიღების პაიპლაინი',
      content: `
**The Golden Standard: questionService.ts**

All game modes use a unified question fetching service that ensures:
1. Language filtering (ka/en based on app language)
2. Active/production questions only
3. Question length validation (max 120 chars for question, 45 for answers)
4. Seen question tracking (avoid repeats within session)
5. Exhaustion detection with fallback
      `,
      contentKa: `
**ოქროს სტანდარტი: questionService.ts**

ყველა თამაშის რეჟიმი იყენებს ერთიან კითხვების მიღების სერვისს, რომელიც უზრუნველყოფს:
1. ენის ფილტრაცია (ka/en აპლიკაციის ენის მიხედვით)
2. მხოლოდ აქტიური/პროდაქშენ კითხვები
3. კითხვის სიგრძის ვალიდაცია (მაქს 120 სიმბოლო კითხვისთვის, 45 პასუხებისთვის)
4. ნანახი კითხვების თვალყურის დევნება (თავიდან აცილება გამეორებების სესიის ფარგლებში)
5. ამოწურვის დეტექცია fallback-ით
      `,
      codeExample: `
// questionService.ts usage
import { getQuestionsForGame } from '@/services/questionService';

const questions = await getQuestionsForGame({
  categoryId: 'geography',
  count: 10,
  language: 'ka',
  excludeIds: seenQuestionIds,
});
      `
    },
    {
      title: 'Authentication Flow',
      titleKa: 'ავტორიზაციის ფლოუ',
      content: `
1. User submits email/password
2. Supabase Auth validates credentials
3. JWT token stored in localStorage
4. AuthProvider fetches/creates profile
5. Profile data cached in context
6. Subsequent requests include JWT in headers
      `,
      contentKa: `
1. მომხმარებელი აგზავნის ელფოსტას/პაროლს
2. Supabase Auth ამოწმებს მონაცემებს
3. JWT ტოკენი ინახება localStorage-ში
4. AuthProvider იღებს/ქმნის პროფილს
5. პროფილის მონაცემები ქეშირდება კონტექსტში
6. შემდგომი მოთხოვნები შეიცავს JWT-ს ჰედერებში
      `
    },
    {
      title: 'Real-time Subscriptions',
      titleKa: 'რეალურ დროის გამოწერები',
      content: `
Used for multiplayer sync:
- room_participants changes (player joins/leaves)
- room_questions changes (new question)
- room_games changes (game state updates)
- user_presence (online status)

Subscriptions are established on room join and cleaned up on exit.
      `,
      contentKa: `
გამოიყენება მულტიპლეიერის სინქრონიზაციისთვის:
- room_participants ცვლილებები (მოთამაშე შემოდის/გადის)
- room_questions ცვლილებები (ახალი კითხვა)
- room_games ცვლილებები (თამაშის state-ის განახლებები)
- user_presence (ონლაინ სტატუსი)

გამოწერები დგინდება ოთახში შესვლისას და იწმინდება გასვლისას.
      `,
      codeExample: `
const channel = supabase
  .channel(\`room:\${roomId}\`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'room_participants',
    filter: \`room_id=eq.\${roomId}\`
  }, handleParticipantChange)
  .subscribe();
      `
    }
  ]
};

export const ARCHITECTURE_SECTIONS: ArchitectureSection[] = [
  ARCHITECTURE_OVERVIEW,
  PROVIDER_HIERARCHY,
  GAME_MODES,
  DATA_FLOW
];
