// Complete Pages Documentation
// Documents ALL pages in the application

export interface PageDoc {
  name: string;
  path: string;
  route: string;
  description: string;
  features: string[];
  hooks: string[];
  components: string[];
}

export const PAGES_MAIN: PageDoc[] = [
  {
    name: "Index",
    path: "src/pages/Index.tsx",
    route: "/",
    description: "Main home page with game dashboard, category selection, and quick actions.",
    features: ["Category grid", "Daily rewards", "Streak display", "Quick play", "Featured quizzes"],
    hooks: ["useAuth", "useCategories", "useCurrency", "useRewardTimers", "useDailyPlays"],
    components: ["HomeScreen", "CategoryCard", "LevelBadge", "QuickActionsBar"]
  },
  {
    name: "Auth",
    path: "src/pages/Auth.tsx",
    route: "/auth",
    description: "Authentication page with login, register, and OAuth options.",
    features: ["Email login", "Email register", "Google OAuth", "Apple OAuth", "Password reset"],
    hooks: ["useAuth"],
    components: ["AuthForm", "OAuthButtons"]
  },
  {
    name: "Profile",
    path: "src/pages/Profile.tsx",
    route: "/profile",
    description: "User profile page showing stats, achievements, and settings.",
    features: ["Avatar display", "Stats overview", "Achievement badges", "Edit profile", "Frame selection"],
    hooks: ["useAuth", "usePlayerProfile", "useAvatarFrames", "useTotalStars"],
    components: ["ProfileHeader", "StatCard", "AchievementGrid"]
  },
  {
    name: "Settings",
    path: "src/pages/Settings.tsx",
    route: "/settings",
    description: "Application settings including sound, language, and account options.",
    features: ["Sound settings", "Language selection", "Privacy settings", "Account management"],
    hooks: ["useAuth", "useLanguage"],
    components: ["SoundSettingsModal", "PrivacyModal", "HelpModal"]
  },
  {
    name: "SettingsName",
    path: "src/pages/SettingsName.tsx",
    route: "/settings/name",
    description: "Change display name/nickname settings page.",
    features: ["Name input", "Validation", "Save changes"],
    hooks: ["useAuth"],
    components: ["Input", "Button"]
  },
  {
    name: "SettingsPassword",
    path: "src/pages/SettingsPassword.tsx",
    route: "/settings/password",
    description: "Change password settings page.",
    features: ["Current password", "New password", "Confirm password"],
    hooks: ["useAuth"],
    components: ["Input", "Button"]
  },
  {
    name: "SettingsPrivacy",
    path: "src/pages/SettingsPrivacy.tsx",
    route: "/settings/privacy",
    description: "Privacy settings and data management page.",
    features: ["Data export", "Account deletion", "Privacy preferences"],
    hooks: ["useAuth"],
    components: ["PrivacyModal"]
  },
  {
    name: "CategoryPage",
    path: "src/pages/CategoryPage.tsx",
    route: "/category/:categoryId",
    description: "Category detail page showing all levels and progress.",
    features: ["Level grid", "Progress tracking", "Star display", "Level unlock status"],
    hooks: ["useCategories", "useCategoryProgress", "useQuestionAvailability"],
    components: ["LevelCard", "ProgressBar", "CategoryHeader"]
  },
  {
    name: "CategoryQuizPage",
    path: "src/pages/CategoryQuizPage.tsx",
    route: "/category/:categoryId/level/:level",
    description: "Active quiz gameplay page for category levels.",
    features: ["Question display", "Timer", "Answer selection", "Power-ups", "Results"],
    hooks: ["useTrivia", "useSessionQuestions", "useGameStake", "useUserPowerUps"],
    components: ["QuestionScreen", "TimerBadge", "PowerUpBar", "AnswerButton"]
  },
  {
    name: "Game",
    path: "src/pages/Game.tsx",
    route: "/game",
    description: "VS mode game page with matchmaking and gameplay.",
    features: ["Matchmaking", "VS gameplay", "Score tracking", "Results"],
    hooks: ["useTrivia", "useGameStake"],
    components: ["GameContainer", "VSScreen", "MatchResultScreen"]
  },
  {
    name: "Leaderboards",
    path: "src/pages/Leaderboards.tsx",
    route: "/leaderboards",
    description: "Weekly league leaderboards with tier rankings.",
    features: ["Tier tabs", "Player rankings", "Weekly rewards", "Promotion/demotion"],
    hooks: ["useLeagueLeaderboard", "useLeaderboardRewards"],
    components: ["PodiumDisplay", "LeaderboardList", "TierBadge"]
  },
  {
    name: "PowerUps",
    path: "src/pages/PowerUps.tsx",
    route: "/power-ups",
    description: "Shop page for purchasing power-ups, frames, and currency.",
    features: ["Power-up shop", "Frame shop", "Currency exchange", "VIP promotion"],
    hooks: ["useShopPageData", "useUserPowerUps", "useCurrency", "useVipStatus"],
    components: ["ShopHeader", "ShopTabBar", "ShopProductGrid", "ShopBundleCard"]
  },
  {
    name: "VIP",
    path: "src/pages/VIP.tsx",
    route: "/vip",
    description: "VIP subscription page with tier options and benefits.",
    features: ["Tier comparison", "Benefits list", "Purchase flow", "Current status"],
    hooks: ["useVipStatus", "useInAppPurchases"],
    components: ["VIPTierCard", "BenefitsList"]
  },
  {
    name: "Notifications",
    path: "src/pages/Notifications.tsx",
    route: "/notifications",
    description: "In-app notifications page showing all user notifications.",
    features: ["Notification list", "Read/unread status", "Action handling"],
    hooks: ["useNotifications"],
    components: ["NotificationCard", "NotificationList"]
  },
  {
    name: "Discover",
    path: "src/pages/Discover.tsx",
    route: "/discover",
    description: "Social discovery page for user-created content.",
    features: ["Feed browsing", "Filtering", "Collections", "Creator profiles"],
    hooks: ["useSocialFeed", "useCollections", "useExploreCreators"],
    components: ["FilterBar", "QuizPostCard", "CollectionPreviewModal"]
  },
  {
    name: "Support",
    path: "src/pages/Support.tsx",
    route: "/support",
    description: "Support and help page with contact options.",
    features: ["FAQ", "Contact form", "Email support"],
    hooks: [],
    components: ["HelpModal"]
  },
  {
    name: "PrivacyPolicy",
    path: "src/pages/PrivacyPolicy.tsx",
    route: "/privacy-policy",
    description: "Privacy policy page in Georgian.",
    features: ["Legal text display"],
    hooks: [],
    components: []
  },
  {
    name: "PrivacyPolicyEN",
    path: "src/pages/PrivacyPolicyEN.tsx",
    route: "/privacy-policy-en",
    description: "Privacy policy page in English.",
    features: ["Legal text display"],
    hooks: [],
    components: []
  },
  {
    name: "TermsOfService",
    path: "src/pages/TermsOfService.tsx",
    route: "/terms",
    description: "Terms of service page in Georgian.",
    features: ["Legal text display"],
    hooks: [],
    components: []
  },
  {
    name: "TermsOfServiceEN",
    path: "src/pages/TermsOfServiceEN.tsx",
    route: "/terms-en",
    description: "Terms of service page in English.",
    features: ["Legal text display"],
    hooks: [],
    components: []
  },
  {
    name: "NotFound",
    path: "src/pages/NotFound.tsx",
    route: "*",
    description: "404 not found page.",
    features: ["Error display", "Navigation back"],
    hooks: [],
    components: []
  },
  {
    name: "Loading",
    path: "src/pages/Loading.tsx",
    route: "/loading",
    description: "Loading/splash screen page.",
    features: ["Loading animation", "Progress indicator"],
    hooks: [],
    components: ["SplashScreen"]
  }
];

export const PAGES_TEAM: PageDoc[] = [
  {
    name: "TeamV2",
    path: "src/pages/TeamV2.tsx",
    route: "/team",
    description: "Team/multiplayer hub for creating and joining rooms.",
    features: ["Room creation", "Recent rooms", "Recent players", "Quick play"],
    hooks: ["useMyRooms", "useRecentPlayers", "useRecentRooms", "useFriends"],
    components: ["TeamMenuScreen", "CreateRoomModal", "RecentPlayersList", "RecentRoomsSection"]
  },
  {
    name: "TriviaLobby",
    path: "src/pages/TriviaLobby.tsx",
    route: "/room/:roomId",
    description: "Multiplayer room lobby for waiting and game management.",
    features: ["Player list", "Room settings", "Chat", "Start game", "Category queue"],
    hooks: ["useGameRoom", "useRoomParticipants", "useRoomChat", "useRoomCategoryQueue"],
    components: ["LobbyPlayerList", "RoomChat", "CategoryQueuePreview"]
  },
  {
    name: "CollectionLobby",
    path: "src/pages/CollectionLobby.tsx",
    route: "/collection/:collectionId/lobby",
    description: "Lobby for playing user-created collections.",
    features: ["Collection preview", "Round list", "Start game"],
    hooks: ["useCollectionLobby", "useCollections"],
    components: ["CollectionPreview", "RoundList"]
  },
  {
    name: "RoomRedirect",
    path: "src/pages/RoomRedirect.tsx",
    route: "/join/:code",
    description: "Redirect page for joining rooms via code.",
    features: ["Code validation", "Room lookup", "Auto-join"],
    hooks: ["useGameRoom"],
    components: []
  }
];

export const PAGES_TV: PageDoc[] = [
  {
    name: "TVDisplay",
    path: "src/pages/TVDisplay.tsx",
    route: "/tv/:sessionId",
    description: "Main TV display screen for party mode games.",
    features: ["Large format display", "Question rendering", "Leaderboard", "Results"],
    hooks: ["useTVDiscovery", "useTVSessionQueue"],
    components: ["TVQuestionScreen", "TVLeaderboardPanel", "TVResultsScreen"]
  },
  {
    name: "TVLobby",
    path: "src/pages/TVLobby.tsx",
    route: "/tv/:sessionId/lobby",
    description: "TV lobby screen showing QR code and connected players.",
    features: ["QR code display", "Player list", "Countdown", "Start game"],
    hooks: ["useTVDiscovery"],
    components: ["TVPairingScreen", "TVCountdownScreen", "QRCodeDisplay"]
  },
  {
    name: "TVJoin",
    path: "src/pages/TVJoin.tsx",
    route: "/tv/join/:code",
    description: "Mobile join page for connecting to TV sessions.",
    features: ["Code entry", "Session validation", "Player registration"],
    hooks: ["useTVDiscovery"],
    components: ["TVJoinModal"]
  },
  {
    name: "TVHostController",
    path: "src/pages/TVHostController.tsx",
    route: "/tv/:sessionId/host",
    description: "Host controller interface for managing TV games.",
    features: ["Start/pause controls", "Skip question", "End game"],
    hooks: ["useTVDiscovery", "useTVSessionQueue"],
    components: ["HostControlPanel"]
  }
];

export const PAGES_ADMIN: PageDoc[] = [
  {
    name: "Admin",
    path: "src/pages/Admin.tsx",
    route: "/admin",
    description: "Main admin dashboard with navigation to all admin features.",
    features: ["Quick stats", "Navigation", "Recent activity"],
    hooks: ["useAdminRole"],
    components: ["AdminLayout", "AdminRoute"]
  },
  {
    name: "AdminCategories",
    path: "src/pages/admin/Categories.tsx",
    route: "/admin/categories",
    description: "Admin page for managing quiz categories.",
    features: ["Category CRUD", "Sorting", "Activation toggle"],
    hooks: ["useAdminCategories"],
    components: ["CategoryEditor", "CategoryList"]
  },
  {
    name: "AdminQuestions",
    path: "src/pages/admin/Questions.tsx",
    route: "/admin/questions",
    description: "Admin page for managing quiz questions.",
    features: ["Question CRUD", "Bulk actions", "Filtering", "Icon assignment"],
    hooks: ["useAdminQuestions", "useIconLibrary"],
    components: ["QuestionEditor", "QuestionTable", "BulkActionsBar"]
  },
  {
    name: "AdminGenerate",
    path: "src/pages/admin/Generate.tsx",
    route: "/admin/generate",
    description: "AI trivia generation interface.",
    features: ["Category selection", "Generation settings", "History"],
    hooks: ["useAIGenerationSettings"],
    components: ["GenerationHistoryTable", "TestGenerationPanel"]
  },
  {
    name: "AdminIcons",
    path: "src/pages/admin/Icons.tsx",
    route: "/admin/icons",
    description: "Icon library management page.",
    features: ["Icon upload", "Icon search", "Assignment", "Verification"],
    hooks: ["useIconLibrary", "useIconVerification"],
    components: ["IconPicker", "IconUploader", "IconUsageStats"]
  },
  {
    name: "AdminUsers",
    path: "src/pages/admin/Users.tsx",
    route: "/admin/users",
    description: "User management page.",
    features: ["User list", "Role assignment", "Ban/unban"],
    hooks: ["useAdminRole"],
    components: ["UserTable", "RoleEditor"]
  },
  {
    name: "AdminEconomy",
    path: "src/pages/admin/Economy.tsx",
    route: "/admin/economy",
    description: "Economy configuration page.",
    features: ["Reward values", "Costs", "Currency rates"],
    hooks: ["useEconomyConfig"],
    components: ["EconomyEditor"]
  },
  {
    name: "WorldHome",
    path: "src/pages/WorldHome.tsx",
    route: "/world",
    description: "World map overview page (deprecated/experimental).",
    features: ["World map", "Region selection"],
    hooks: ["useWorldProgress"],
    components: ["WorldMap"]
  },
  {
    name: "AdventureMapAdmin",
    path: "src/pages/AdventureMapAdmin.tsx",
    route: "/admin/map",
    description: "Adventure map level position editor.",
    features: ["Drag-drop positioning", "Level connections"],
    hooks: ["useLevelPositions"],
    components: ["AdminMap"]
  }
];

export const PAGES_SHOWCASE: PageDoc[] = [
  {
    name: "Styleguide",
    path: "src/pages/Styleguide.tsx",
    route: "/styleguide",
    description: "Design system showcase with all UI components.",
    features: ["Color palette", "Typography", "Component demos"],
    hooks: [],
    components: ["All UI components"]
  },
  {
    name: "AllButtons",
    path: "src/pages/AllButtons.tsx",
    route: "/buttons",
    description: "Button component showcase.",
    features: ["All button variants", "States", "Sizes"],
    hooks: [],
    components: ["Button", "ChunkyButton"]
  },
  {
    name: "ModalsShowcase",
    path: "src/pages/ModalsShowcase.tsx",
    route: "/modals",
    description: "Modal component showcase.",
    features: ["All modal types", "Animations"],
    hooks: [],
    components: ["GameModal", "Dialog"]
  },
  {
    name: "TVScreensShowcase",
    path: "src/pages/TVScreensShowcase.tsx",
    route: "/tv-screens",
    description: "TV mode screens showcase.",
    features: ["All TV screens", "States"],
    hooks: [],
    components: ["All TV components"]
  },
  {
    name: "AdminGuestShowcase",
    path: "src/pages/AdminGuestShowcase.tsx",
    route: "/admin/guest-showcase",
    description: "Guest user flow showcase.",
    features: ["Guest onboarding", "Limitations"],
    hooks: [],
    components: ["GuestActivationFlow"]
  },
  {
    name: "Docs",
    path: "src/pages/Docs.tsx",
    route: "/docs",
    description: "Technical documentation page (this page).",
    features: ["Architecture docs", "API reference", "Component docs"],
    hooks: [],
    components: ["DocsSidebar", "DocsContent"]
  }
];

export const ALL_PAGES = [
  ...PAGES_MAIN,
  ...PAGES_TEAM,
  ...PAGES_TV,
  ...PAGES_ADMIN,
  ...PAGES_SHOWCASE
];

export const PAGE_CATEGORIES = [
  { id: "main", name: "Main Pages", count: PAGES_MAIN.length },
  { id: "team", name: "Team/Multiplayer", count: PAGES_TEAM.length },
  { id: "tv", name: "TV Mode", count: PAGES_TV.length },
  { id: "admin", name: "Admin", count: PAGES_ADMIN.length },
  { id: "showcase", name: "Showcase/Dev", count: PAGES_SHOWCASE.length },
];
