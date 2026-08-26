import React, { useState, Suspense, lazy, memo, useMemo, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Minus, Plus, RotateCcw, Loader2, AlertTriangle, 
  Search, ChevronDown, ChevronRight, Monitor, Tablet, Smartphone, X,
  LayoutGrid, Layers, Play, Eye, PanelLeftClose, PanelLeft
} from "lucide-react";
import { 
  createMemoryRouter, 
  RouterProvider,
  UNSAFE_LocationContext,
  UNSAFE_NavigationContext,
  UNSAFE_RouteContext
} from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import { cn } from "@/lib/utils";

// ========== LAZY LOAD PAGE COMPONENTS ==========
const Index = lazy(() => import("@/pages/Index"));
const Auth = lazy(() => import("@/pages/Auth"));
const Discover = lazy(() => import("@/pages/Discover"));
const TeamV2 = lazy(() => import("@/pages/TeamV2"));
const Leaderboards = lazy(() => import("@/pages/Leaderboards"));
const Profile = lazy(() => import("@/pages/Profile"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const PowerUps = lazy(() => import("@/pages/PowerUps"));
const Support = lazy(() => import("@/pages/Support"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const PrivacyPolicyEN = lazy(() => import("@/pages/PrivacyPolicyEN"));
const TermsOfService = lazy(() => import("@/pages/TermsOfService"));
const TermsOfServiceEN = lazy(() => import("@/pages/TermsOfServiceEN"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const CategoryPage = lazy(() => import("@/pages/CategoryPage"));
const CategoryQuizPage = lazy(() => import("@/pages/CategoryQuizPage"));
const Game = lazy(() => import("@/pages/Game"));
const AdventureMapAdmin = lazy(() => import("@/pages/AdventureMapAdmin"));
const TVLobby = lazy(() => import("@/pages/TVLobby"));
const TVJoin = lazy(() => import("@/pages/TVJoin"));
const TVDisplay = lazy(() => import("@/pages/TVDisplay"));
const TVHostController = lazy(() => import("@/pages/TVHostController"));
const Styleguide = lazy(() => import("@/pages/Styleguide"));
const AllButtons = lazy(() => import("@/pages/AllButtons"));
const ModalsShowcase = lazy(() => import("@/pages/ModalsShowcase"));
const RoomRedirect = lazy(() => import("@/pages/RoomRedirect"));

// Admin pages
const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const AdminFlow = lazy(() => import("@/pages/admin/Flow"));
const ContentManager = lazy(() => import("@/pages/admin/ContentManager"));
const AdminImport = lazy(() => import("@/pages/admin/Import"));
const AdminOnlineUsers = lazy(() => import("@/pages/admin/OnlineUsers"));
const DuplicateScanner = lazy(() => import("@/pages/admin/DuplicateScanner"));
const IconLibraryAdmin = lazy(() => import("@/pages/admin/IconLibrary"));
const QuestionTools = lazy(() => import("@/pages/admin/QuestionTools"));
const IconAssignment = lazy(() => import("@/pages/admin/IconAssignment"));
const MissingIcons = lazy(() => import("@/pages/admin/MissingIcons"));
const FixIcons = lazy(() => import("@/pages/admin/FixIcons"));
const AIGenerations = lazy(() => import("@/pages/admin/AIGenerations"));
const PushNotifications = lazy(() => import("@/pages/admin/PushNotifications"));
const AdminReports = lazy(() => import("@/pages/admin/Reports"));

// ========== LAZY LOAD MODAL COMPONENTS ==========
// Home Modals
const AvatarModal = lazy(() => import("@/components/home/AvatarModal").then(m => ({ default: m.AvatarModal })));
const LevelUpModal = lazy(() => import("@/components/home/LevelUpModal").then(m => ({ default: m.LevelUpModal })));
const DailyRewardsModal = lazy(() => import("@/components/home/DailyRewardsModal").then(m => ({ default: m.DailyRewardsModal })));
const ChestRewardModal = lazy(() => import("@/components/home/ChestRewardModal").then(m => ({ default: m.ChestRewardModal })));
const MissionInfoModal = lazy(() => import("@/components/home/MissionInfoModal").then(m => ({ default: m.MissionInfoModal })));
const StreakModal = lazy(() => import("@/components/home/StreakModal").then(m => ({ default: m.StreakModal })));
const MissionsModal = lazy(() => import("@/components/home/MissionsModal").then(m => ({ default: m.MissionsModal })));
const MyPowersModal = lazy(() => import("@/components/home/MyPowersModal").then(m => ({ default: m.MyPowersModal })));
const LevelInfoModal = lazy(() => import("@/components/home/LevelInfoModal").then(m => ({ default: m.LevelInfoModal })));
const SettingsModal = lazy(() => import("@/components/home/SettingsModal").then(m => ({ default: m.SettingsModal })));
const SoundSettingsModal = lazy(() => import("@/components/home/SoundSettingsModal").then(m => ({ default: m.SoundSettingsModal })));
const PointsModal = lazy(() => import("@/components/home/PointsModal").then(m => ({ default: m.PointsModal })));
const PrivacyModal = lazy(() => import("@/components/home/PrivacyModal").then(m => ({ default: m.PrivacyModal })));
const NotEnoughCoinsModal = lazy(() => import("@/components/home/NotEnoughCoinsModal").then(m => ({ default: m.NotEnoughCoinsModal })));
const GuestMaxPlaysModal = lazy(() => import("@/components/home/GuestMaxPlaysModal").then(m => ({ default: m.GuestMaxPlaysModal })));
const RegisterPromptModal = lazy(() => import("@/components/home/RegisterPromptModal").then(m => ({ default: m.RegisterPromptModal })));
const GemShopModal = lazy(() => import("@/components/home/GemShopModal").then(m => ({ default: m.GemShopModal })));
const WatchAdModal = lazy(() => import("@/components/home/WatchAdModal").then(m => ({ default: m.WatchAdModal })));

// Shop Modals
const BuyCurrencyModal = lazy(() => import("@/components/shop/BuyCurrencyModal").then(m => ({ default: m.BuyCurrencyModal })));
const CurrencyExchangeModal = lazy(() => import("@/components/shop/CurrencyExchangeModal").then(m => ({ default: m.CurrencyExchangeModal })));
const CurrencyActionModal = lazy(() => import("@/components/shop/CurrencyActionModal").then(m => ({ default: m.CurrencyActionModal })));
const PurchaseSuccessModal = lazy(() => import("@/components/shop/PurchaseSuccessModal").then(m => ({ default: m.PurchaseSuccessModal })));
const ShopItemDetailModal = lazy(() => import("@/components/shop/ShopItemDetailModal").then(m => ({ default: m.ShopItemDetailModal })));

// Game Modals
const GameLoseModal = lazy(() => import("@/components/game/GameLoseModal").then(m => ({ default: m.GameLoseModal })));
const ComingSoonModal = lazy(() => import("@/components/game/ComingSoonModal").then(m => ({ default: m.ComingSoonModal })));
const LuckySpinModal = lazy(() => import("@/components/game/LuckySpinModal").then(m => ({ default: m.LuckySpinModal })));
const VSMatchHelpModal = lazy(() => import("@/components/game/VSMatchHelpModal").then(m => ({ default: m.VSMatchHelpModal })));

// Map Modals  
const PowerUpShopModal = lazy(() => import("@/components/map/PowerUpShopModal").then(m => ({ default: m.PowerUpShopModal })));
const LockedLevelModal = lazy(() => import("@/components/map/LockedLevelModal").then(m => ({ default: m.LockedLevelModal })));
const CompletedLevelModal = lazy(() => import("@/components/map/CompletedLevelModal").then(m => ({ default: m.CompletedLevelModal })));
const AdventureHelpModal = lazy(() => import("@/components/map/AdventureHelpModal").then(m => ({ default: m.AdventureHelpModal })));

// Team Modals
const CategorySelectorModal = lazy(() => import("@/components/team/CategorySelectorModal").then(m => ({ default: m.CategorySelectorModal })));
const TeamHelpModal = lazy(() => import("@/components/team/HelpModal").then(m => ({ default: m.HelpModal })));
const HowItWorksModal = lazy(() => import("@/components/team/HowItWorksModal").then(m => ({ default: m.HowItWorksModal })));
const InviteFriendsModal = lazy(() => import("@/components/team/InviteFriendsModal").then(m => ({ default: m.InviteFriendsModal })));
const AddFriendModal = lazy(() => import("@/components/team/AddFriendModal").then(m => ({ default: m.AddFriendModal })));
const RoomIconPickerModal = lazy(() => import("@/components/team/RoomIconPickerModal").then(m => ({ default: m.RoomIconPickerModal })));
const GradientPicker = lazy(() => import("@/components/team/GradientPicker").then(m => ({ default: m.GradientPicker })));

// TV Modals
const TVEnterCodeModal = lazy(() => import("@/components/team/TVEnterCodeModal").then(m => ({ default: m.TVEnterCodeModal })));

// Social Modals
const CreateTriviaTypeModal = lazy(() => import("@/components/social/CreateTriviaTypeModal").then(m => ({ default: m.CreateTriviaTypeModal })));

// Profile Modals
const PlayerProfileModal = lazy(() => import("@/components/profile/PlayerProfileModal").then(m => ({ default: m.PlayerProfileModal })));
const AvatarGeneratorModal = lazy(() => import("@/components/profile/AvatarGeneratorModal").then(m => ({ default: m.AvatarGeneratorModal })));

// Leaderboard Modals
const ClaimRewardsModal = lazy(() => import("@/components/leaderboard/ClaimRewardsModal").then(m => ({ default: m.ClaimRewardsModal })));
const PlayCategoryModal = lazy(() => import("@/components/leaderboard/PlayCategoryModal").then(m => ({ default: m.PlayCategoryModal })));

// Challenge Modals
const ChallengeTypeModal = lazy(() => import("@/components/challenge/ChallengeTypeModal").then(m => ({ default: m.ChallengeTypeModal })));

// Onboarding Modals
const SignupOnboardingModal = lazy(() => import("@/components/onboarding/SignupOnboardingModal").then(m => ({ default: m.SignupOnboardingModal })));

// Controller Modals
const GuestJoinModal = lazy(() => import("@/components/controller/GuestJoinModal").then(m => ({ default: m.GuestJoinModal })));

// ========== PAGE DEFINITIONS ==========
interface PageDefinition {
  id: string;
  label: string;
  labelGe: string;
  Component: React.LazyExoticComponent<React.ComponentType<any>>;
  route?: string;
  isModal?: boolean;
  modalProps?: Record<string, any>;
}

interface CategoryDefinition {
  id: string;
  title: string;
  titleGe: string;
  icon: string;
  isModal?: boolean;
  pages: PageDefinition[];
}

// ========== PAGE CATEGORIES (Non-Modal) ==========
const pageCategories: CategoryDefinition[] = [
  {
    id: "core",
    title: "Core Pages",
    titleGe: "მთავარი გვერდები",
    icon: "📱",
    pages: [
      { id: "home", label: "Home", labelGe: "მთავარი", Component: Index, route: "/" },
      { id: "auth", label: "Auth", labelGe: "ავტორიზაცია", Component: Auth, route: "/auth" },
      { id: "discover", label: "Discover", labelGe: "აღმოჩენა", Component: Discover, route: "/discover" },
      { id: "team", label: "Team Feed", labelGe: "თიმი", Component: TeamV2, route: "/team" },
      { id: "leaderboards", label: "Leaderboards", labelGe: "ლიდერბორდი", Component: Leaderboards, route: "/leaderboards" },
      { id: "profile", label: "Profile", labelGe: "პროფილი", Component: Profile, route: "/profile" },
      { id: "notifications", label: "Notifications", labelGe: "შეტყობინებები", Component: Notifications, route: "/notifications" },
    ],
  },
  {
    id: "game",
    title: "Game Flow",
    titleGe: "თამაშის ფლოუ",
    icon: "🎮",
    pages: [
      { id: "category", label: "Category Detail", labelGe: "კატეგორია", Component: CategoryPage, route: "/category/science" },
      { id: "quiz", label: "Quiz Game", labelGe: "ქვიზი", Component: CategoryQuizPage, route: "/play/science/1" },
      { id: "game", label: "Quick Game", labelGe: "სწრაფი თამაში", Component: Game, route: "/game" },
      { id: "adventure", label: "Adventure Map", labelGe: "თავგადასავალი", Component: AdventureMapAdmin, route: "/adventure-map-admin" },
    ],
  },
  {
    id: "tv",
    title: "TV Mode",
    titleGe: "TV / მულტიპლეიერი",
    icon: "📺",
    pages: [
      { id: "tv-lobby", label: "TV Lobby", labelGe: "TV ლობი", Component: TVLobby, route: "/tv" },
      { id: "tv-join", label: "TV Join", labelGe: "შეერთება", Component: TVJoin, route: "/join" },
    ],
  },
  {
    id: "monetization",
    title: "Monetization",
    titleGe: "მაღაზია და VIP",
    icon: "💎",
    pages: [
      { id: "powerups", label: "Power-Ups", labelGe: "ძალები", Component: PowerUps, route: "/power-ups" },
    ],
  },
  {
    id: "legal",
    title: "Legal & Support",
    titleGe: "იურიდიული / დახმარება",
    icon: "📄",
    pages: [
      { id: "privacy-ge", label: "Privacy (GE)", labelGe: "კონფიდენციალურობა", Component: PrivacyPolicy, route: "/privacy-policy" },
      { id: "privacy-en", label: "Privacy (EN)", labelGe: "Privacy Policy", Component: PrivacyPolicyEN, route: "/privacy-policy-en" },
      { id: "terms-ge", label: "Terms (GE)", labelGe: "წესები", Component: TermsOfService, route: "/terms" },
      { id: "terms-en", label: "Terms (EN)", labelGe: "Terms of Service", Component: TermsOfServiceEN, route: "/terms-en" },
      { id: "support", label: "Support", labelGe: "დახმარება", Component: Support, route: "/support" },
    ],
  },
  {
    id: "admin",
    title: "Admin Pages",
    titleGe: "ადმინ გვერდები",
    icon: "⚙️",
    pages: [
      { id: "admin-dashboard", label: "Dashboard", labelGe: "დაშბორდი", Component: AdminDashboard, route: "/admin" },
      { id: "admin-flow", label: "Flow", labelGe: "ფლოუ", Component: AdminFlow, route: "/admin/flow" },
      { id: "admin-content", label: "Content Manager", labelGe: "კონტენტი", Component: ContentManager, route: "/admin/content" },
      { id: "admin-import", label: "Import", labelGe: "იმპორტი", Component: AdminImport, route: "/admin/import" },
      { id: "admin-users", label: "Online Users", labelGe: "ონლაინ იუზერები", Component: AdminOnlineUsers, route: "/admin/users" },
    ],
  },
  {
    id: "dev",
    title: "Developer Tools",
    titleGe: "დეველოპერის ხელსაწყოები",
    icon: "🛠️",
    pages: [
      { id: "styleguide", label: "Styleguide", labelGe: "სტაილგაიდი", Component: Styleguide, route: "/styleguide" },
      { id: "all-buttons", label: "All Buttons", labelGe: "ყველა ღილაკი", Component: AllButtons, route: "/all-buttons" },
      { id: "modals-showcase", label: "Modals Showcase", labelGe: "მოდალების ვიტრინა", Component: ModalsShowcase, route: "/modals-showcase" },
      { id: "not-found", label: "404 Page", labelGe: "404 გვერდი", Component: NotFound, route: "/404" },
    ],
  },
];

// ========== MODAL CATEGORIES ==========
const modalCategories: CategoryDefinition[] = [
  {
    id: "modals-home",
    title: "Home & Core",
    titleGe: "მთავარი მოდალები",
    icon: "🏠",
    isModal: true,
    pages: [
      { id: "avatar-modal", label: "Avatar", labelGe: "ავატარი", Component: AvatarModal, isModal: true, modalProps: {} },
      { id: "level-up-modal", label: "Level Up", labelGe: "ლეველი", Component: LevelUpModal, isModal: true, modalProps: { newLevel: 5, coinsReward: 100, gemsReward: 5 } },
      { id: "daily-rewards-modal", label: "Daily Rewards", labelGe: "დღიური ჯილდო", Component: DailyRewardsModal, isModal: true, modalProps: {} },
      { id: "chest-reward-modal", label: "Chest Reward", labelGe: "სკივრის ჯილდო", Component: ChestRewardModal, isModal: true, modalProps: { chestType: "gold" } },
      { id: "streak-modal", label: "Streak", labelGe: "სტრიკი", Component: StreakModal, isModal: true, modalProps: { currentStreak: 7, bestStreak: 14 } },
      { id: "mission-info-week", label: "Week pack info", labelGe: "კვირის პაკეტი", Component: MissionInfoModal, isModal: true, modalProps: { topic: "weekPack", daysComplete: 3 } },
      { id: "mission-info-streak", label: "Streak info", labelGe: "სტრიქის ინფო", Component: MissionInfoModal, isModal: true, modalProps: { topic: "streak", currentStreak: 5 } },
      { id: "missions-modal", label: "Missions", labelGe: "მისიები", Component: MissionsModal, isModal: true, modalProps: {} },
      { id: "my-powers-modal", label: "My Powers", labelGe: "ჩემი ძალები", Component: MyPowersModal, isModal: true, modalProps: {} },
      { id: "level-info-modal", label: "Level Info", labelGe: "ლეველის ინფო", Component: LevelInfoModal, isModal: true, modalProps: { levelInfo: { level: 5, currentXp: 450, nextLevelXp: 1000, totalXp: 4500 } } },
      { id: "settings-modal", label: "Settings", labelGe: "პარამეტრები", Component: SettingsModal, isModal: true, modalProps: {} },
      { id: "sound-settings-modal", label: "Sound Settings", labelGe: "ხმის პარამეტრები", Component: SoundSettingsModal, isModal: true, modalProps: {} },
      { id: "points-modal", label: "Points", labelGe: "ქულები", Component: PointsModal, isModal: true, modalProps: { totalPoints: 5000, gamesPlayed: 42, averageScore: 85, bestGame: 100 } },
      { id: "privacy-modal", label: "Privacy", labelGe: "კონფიდენციალურობა", Component: PrivacyModal, isModal: true, modalProps: {} },
      { id: "not-enough-coins-modal", label: "Not Enough Coins", labelGe: "არ გყოფნი მონეტები", Component: NotEnoughCoinsModal, isModal: true, modalProps: { requiredAmount: 500, currentAmount: 100 } },
      { id: "guest-max-plays-modal", label: "Guest Max Plays", labelGe: "სტუმრის ლიმიტი", Component: GuestMaxPlaysModal, isModal: true, modalProps: {} },
      { id: "register-prompt-modal", label: "Register Prompt", labelGe: "რეგისტრაცია", Component: RegisterPromptModal, isModal: true, modalProps: {} },
      { id: "gem-shop-modal", label: "Gem Shop", labelGe: "ჯემების მაღაზია", Component: GemShopModal, isModal: true, modalProps: {} },
      { id: "watch-ad-modal", label: "Watch Ad", labelGe: "რეკლამის ნახვა", Component: WatchAdModal, isModal: true, modalProps: { rewardType: "coins", rewardAmount: 50 } },
    ],
  },
  {
    id: "modals-shop",
    title: "Shop Modals",
    titleGe: "მაღაზიის მოდალები",
    icon: "💰",
    isModal: true,
    pages: [
      { id: "buy-currency-modal", label: "Buy Currency", labelGe: "ვალუტის ყიდვა", Component: BuyCurrencyModal, isModal: true, modalProps: { currencyType: "coins" } },
      { id: "currency-exchange-modal", label: "Currency Exchange", labelGe: "გაცვლა", Component: CurrencyExchangeModal, isModal: true, modalProps: {} },
      { id: "currency-action-modal", label: "Currency Action", labelGe: "ვალუტის მოქმედება", Component: CurrencyActionModal, isModal: true, modalProps: { currencyType: "coins" } },
      { id: "purchase-success-modal", label: "Purchase Success", labelGe: "წარმატებული შეძენა", Component: PurchaseSuccessModal, isModal: true, modalProps: { itemName: "50 Coins", itemType: "coins" } },
      { id: "shop-item-detail-modal", label: "Shop Item Detail", labelGe: "ნივთის დეტალები", Component: ShopItemDetailModal, isModal: true, modalProps: { item: { id: "1", name: "Test Item", price: 100 } } },
    ],
  },
  {
    id: "modals-game",
    title: "Game Modals",
    titleGe: "თამაშის მოდალები",
    icon: "🎯",
    isModal: true,
    pages: [
      { id: "game-lose-modal", label: "Game Lose", labelGe: "წაგება", Component: GameLoseModal, isModal: true, modalProps: { userScore: 1500, opponentScore: 2000, opponentName: "Player2", coinsEarned: 10 } },
      { id: "coming-soon-modal", label: "Coming Soon", labelGe: "მალე", Component: ComingSoonModal, isModal: true, modalProps: { categoryName: "Science", levelNumber: 5 } },
      { id: "lucky-spin-modal", label: "Lucky Spin", labelGe: "იღბლიანი სპინი", Component: LuckySpinModal, isModal: true, modalProps: {} },
      { id: "vs-match-help-modal", label: "VS Match Help", labelGe: "VS დახმარება", Component: VSMatchHelpModal, isModal: true, modalProps: {} },
    ],
  },
  {
    id: "modals-map",
    title: "Map & Adventure",
    titleGe: "რუკის მოდალები",
    icon: "🗺️",
    isModal: true,
    pages: [
      { id: "powerup-shop-modal", label: "Power-Up Shop", labelGe: "პაუერაფ მაღაზია", Component: PowerUpShopModal, isModal: true, modalProps: {} },
      { id: "locked-level-modal", label: "Locked Level", labelGe: "ჩაკეტილი ლეველი", Component: LockedLevelModal, isModal: true, modalProps: { levelId: 5, requiredLevel: 4 } },
      { id: "completed-level-modal", label: "Completed Level", labelGe: "დასრულებული ლეველი", Component: CompletedLevelModal, isModal: true, modalProps: { levelId: 3, stats: { questionsAnswered: 10, correctAnswers: 8, pointsEarned: 800, starsEarned: 2, completedAt: new Date().toISOString() } } },
      { id: "adventure-help-modal", label: "Adventure Help", labelGe: "თავგადასავლის დახმარება", Component: AdventureHelpModal, isModal: true, modalProps: {} },
    ],
  },
  {
    id: "modals-team",
    title: "Team & Multiplayer",
    titleGe: "გუნდის მოდალები",
    icon: "👥",
    isModal: true,
    pages: [
      { id: "category-selector-modal", label: "Category Selector", labelGe: "კატეგორიის არჩევა", Component: CategorySelectorModal, isModal: true, modalProps: {} },
      { id: "team-help-modal", label: "Team Help", labelGe: "გუნდის დახმარება", Component: TeamHelpModal, isModal: true, modalProps: {} },
      { id: "how-it-works-modal", label: "How It Works", labelGe: "როგორ მუშაობს", Component: HowItWorksModal, isModal: true, modalProps: {} },
      { id: "invite-friends-modal", label: "Invite Friends", labelGe: "მეგობრების მოწვევა", Component: InviteFriendsModal, isModal: true, modalProps: { roomCode: "ABC123" } },
      { id: "add-friend-modal", label: "Add Friend", labelGe: "მეგობრის დამატება", Component: AddFriendModal, isModal: true, modalProps: {} },
      { id: "room-icon-picker-modal", label: "Room Icon Picker", labelGe: "აიქონის არჩევა", Component: RoomIconPickerModal, isModal: true, modalProps: {} },
      { id: "gradient-picker-modal", label: "Gradient Picker", labelGe: "გრადიენტის არჩევა", Component: GradientPicker, isModal: true, modalProps: {} },
      { id: "tv-enter-code-modal", label: "TV Enter Code", labelGe: "კოდის შეყვანა", Component: TVEnterCodeModal, isModal: true, modalProps: {} },
    ],
  },
  {
    id: "modals-profile",
    title: "Profile & Social",
    titleGe: "პროფილის მოდალები",
    icon: "👤",
    isModal: true,
    pages: [
      { id: "player-profile-modal", label: "Player Profile", labelGe: "მოთამაშის პროფილი", Component: PlayerProfileModal, isModal: true, modalProps: { userId: "demo-user" } },
      { id: "avatar-generator-modal", label: "Avatar Generator", labelGe: "ავატარის გენერატორი", Component: AvatarGeneratorModal, isModal: true, modalProps: {} },
      { id: "claim-rewards-modal", label: "Claim Rewards", labelGe: "ჯილდოების მიღება", Component: ClaimRewardsModal, isModal: true, modalProps: { rewards: { coins: 500, gems: 10 } } },
      { id: "play-category-modal", label: "Play Category", labelGe: "კატეგორიის თამაში", Component: PlayCategoryModal, isModal: true, modalProps: { categoryId: "science", categoryName: "Science" } },
      { id: "create-trivia-type-modal", label: "Create Trivia Type", labelGe: "ტრივიას ტიპის შექმნა", Component: CreateTriviaTypeModal, isModal: true, modalProps: {} },
    ],
  },
  {
    id: "modals-misc",
    title: "Other Modals",
    titleGe: "სხვა მოდალები",
    icon: "📋",
    isModal: true,
    pages: [
      { id: "challenge-type-modal", label: "Challenge Type", labelGe: "ჩელენჯის ტიპი", Component: ChallengeTypeModal, isModal: true, modalProps: {} },
      { id: "signup-onboarding-modal", label: "Signup Onboarding", labelGe: "რეგისტრაციის ონბორდინგი", Component: SignupOnboardingModal, isModal: true, modalProps: {} },
      { id: "guest-join-modal", label: "Guest Join", labelGe: "სტუმრის შესვლა", Component: GuestJoinModal, isModal: true, modalProps: {} },
    ],
  },
];

// Breakpoint configurations
const breakpoints = {
  mobile: { width: 375, height: 812, label: "Mobile", icon: Smartphone },
  tablet: { width: 768, height: 1024, label: "Tablet", icon: Tablet },
  desktop: { width: 1440, height: 900, label: "Desktop", icon: Monitor },
};

type BreakpointKey = keyof typeof breakpoints;

// Loading placeholder
const LoadingPlaceholder = () => (
  <div className="w-full h-full flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

// Error fallback for components that fail to render
const ErrorFallback = ({ error }: { error: Error }) => (
  <div className="w-full h-full flex flex-col items-center justify-center bg-destructive/5 p-6">
    <AlertTriangle className="w-10 h-10 text-destructive mb-3" />
    <p className="text-sm text-destructive font-medium text-center mb-2">Failed to load</p>
    <p className="text-xs text-muted-foreground text-center max-w-[280px] font-mono">
      {error.message.slice(0, 100)}
    </p>
  </div>
);

// Reset router context wrapper
const RouterContextReset = ({ children }: { children: React.ReactNode }) => (
  <UNSAFE_LocationContext.Provider value={null as any}>
    <UNSAFE_NavigationContext.Provider value={null as any}>
      <UNSAFE_RouteContext.Provider value={{ outlet: null, matches: [], isDataRoute: false }}>
        {children}
      </UNSAFE_RouteContext.Provider>
    </UNSAFE_NavigationContext.Provider>
  </UNSAFE_LocationContext.Provider>
);

// Isolated page renderer with its own router
const IsolatedPageRenderer = memo(function IsolatedPageRenderer({
  Component,
  route,
}: {
  Component: React.LazyExoticComponent<React.ComponentType<any>>;
  route: string;
}) {
  const router = useMemo(() => {
    return createMemoryRouter(
      [{ path: "*", element: <Suspense fallback={<LoadingPlaceholder />}><Component /></Suspense> }],
      { initialEntries: [route] }
    );
  }, [Component, route]);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <RouterContextReset>
        <RouterProvider router={router} />
      </RouterContextReset>
    </ErrorBoundary>
  );
});

// Device Mockup component for different breakpoints (PAGES ONLY)
const DeviceMockup = memo(function DeviceMockup({ 
  page,
  breakpoint,
  scale,
  onClick,
}: { 
  page: PageDefinition;
  breakpoint: BreakpointKey;
  scale: number;
  onClick?: () => void;
}) {
  const config = breakpoints[breakpoint];
  const { Component, route, label, labelGe } = page;
  
  const scaledWidth = config.width * scale;
  const scaledHeight = config.height * scale;
  
  return (
    <div 
      className="flex flex-col items-center gap-3 shrink-0 cursor-pointer group"
      onClick={onClick}
    >
      <div 
        className={cn(
          "relative overflow-hidden shadow-2xl transition-transform group-hover:scale-[1.02]",
          breakpoint === "mobile" && "rounded-[40px] bg-[#1a1a1a] p-3",
          breakpoint === "tablet" && "rounded-[24px] bg-[#1a1a1a] p-3",
          breakpoint === "desktop" && "rounded-lg bg-[#2a2a2a]"
        )}
        style={{ 
          width: breakpoint === "desktop" ? scaledWidth + 4 : scaledWidth + 24,
          height: breakpoint === "desktop" ? scaledHeight + 36 : scaledHeight + 24,
        }}
      >
        {breakpoint === "desktop" && (
          <div className="h-8 bg-[#3a3a3a] flex items-center px-3 gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <div className="flex-1 mx-4">
              <div className="bg-[#1a1a1a] rounded h-5 max-w-md mx-auto flex items-center justify-center">
                <span className="text-[10px] text-white/40 truncate px-2">{route}</span>
              </div>
            </div>
          </div>
        )}
        
        {breakpoint !== "desktop" && (
          <div className={cn(
            "absolute bg-[#0a0a0a]",
            breakpoint === "mobile" && "inset-[6px] rounded-[49px]",
            breakpoint === "tablet" && "inset-[6px] rounded-[18px]"
          )} />
        )}
        
        <div 
          className={cn(
            "relative overflow-hidden bg-background",
            breakpoint === "mobile" && "rounded-[34px]",
            breakpoint === "tablet" && "rounded-[12px]",
          )}
          style={{ width: scaledWidth, height: scaledHeight }}
        >
          {breakpoint === "mobile" && (
            <div 
              className="absolute left-1/2 -translate-x-1/2 bg-black rounded-[20px] z-50"
              style={{ top: 8 * scale, width: 126 * scale, height: 37 * scale }} 
            />
          )}
          
          <div 
            className="overflow-hidden"
            style={{ width: scaledWidth, height: scaledHeight, pointerEvents: 'none' }}
          >
            <div style={{ 
              transform: `scale(${scale})`, 
              transformOrigin: 'top left',
              width: config.width,
              height: config.height,
            }}>
              <IsolatedPageRenderer Component={Component} route={route || "/"} />
            </div>
          </div>
          
          {breakpoint === "mobile" && (
            <div 
              className="absolute left-1/2 -translate-x-1/2 bg-foreground/30 rounded-full z-50"
              style={{ bottom: 8 * scale, width: 134 * scale, height: 5 * scale }} 
            />
          )}
        </div>
      </div>
      
      <div className="text-center">
        <p className="font-semibold text-sm text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{labelGe}</p>
        {route && <p className="text-[10px] text-muted-foreground/60 font-mono mt-1">{route}</p>}
      </div>
    </div>
  );
});

// Modal Card Component - Shows a clickable card to preview the modal
const ModalCard = memo(function ModalCard({
  page,
  onPreview,
}: {
  page: PageDefinition;
  onPreview: () => void;
}) {
  return (
    <div 
      className="group bg-card border border-border rounded-xl p-4 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer"
      onClick={onPreview}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
            {page.label}
          </h3>
          <p className="text-sm text-muted-foreground">{page.labelGe}</p>
        </div>
        <Button variant="ghost" size="icon" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Eye className="w-4 h-4" />
        </Button>
      </div>
      
      {page.modalProps && Object.keys(page.modalProps).length > 0 && (
        <div className="mt-2 p-2 bg-muted/50 rounded-lg">
          <p className="text-[10px] text-muted-foreground font-mono truncate">
            Props: {Object.keys(page.modalProps).slice(0, 3).join(', ')}
            {Object.keys(page.modalProps).length > 3 && '...'}
          </p>
        </div>
      )}
      
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Play className="w-3 h-3" />
        <span>Click to preview</span>
      </div>
    </div>
  );
});

// Active Modal Viewer - Renders ONE modal at a time in fullscreen overlay
const ActiveModalViewer = memo(function ActiveModalViewer({
  page,
  onClose,
}: {
  page: PageDefinition | null;
  onClose: () => void;
}) {
  if (!page) return null;
  
  const { Component, modalProps = {}, label, labelGe } = page;
  
  return (
    <div className="fixed inset-0 safe-screen z-50 bg-black/80 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-background/80 border-b">
        <div>
          <h2 className="font-bold text-lg">{label}</h2>
          <p className="text-sm text-muted-foreground">{labelGe}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onClose} className="gap-2">
          <X className="w-4 h-4" />
          Close Preview
        </Button>
      </div>
      
      {/* Modal Container */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Suspense fallback={<LoadingPlaceholder />}>
            <Component 
              {...modalProps}
              isOpen={true}
              open={true}
              onClose={onClose}
              onOpenChange={(open: boolean) => !open && onClose()}
            />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
});

// Sidebar Category Component
const SidebarCategory = memo(function SidebarCategory({
  category,
  isExpanded,
  onToggle,
  activePageId,
  onPageClick,
}: {
  category: CategoryDefinition;
  isExpanded: boolean;
  onToggle: () => void;
  activePageId: string | null;
  onPageClick: (pageId: string) => void;
}) {
  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-left",
          category.isModal && "border-l-2 border-primary/30"
        )}
      >
        <span className="text-base">{category.icon}</span>
        <span className="flex-1 font-medium text-sm">{category.title}</span>
        <span className="text-xs text-muted-foreground">({category.pages.length})</span>
        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {isExpanded && (
        <div className="ml-7 mt-1 space-y-0.5">
          {category.pages.map((page) => (
            <button
              key={page.id}
              onClick={() => onPageClick(page.id)}
              className={cn(
                "w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors",
                activePageId === page.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
              )}
            >
              {page.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

// Main Design Component
export default function Design() {
  const [activeTab, setActiveTab] = useState<"pages" | "modals">("pages");
  const [breakpoint, setBreakpoint] = useState<BreakpointKey>("mobile");
  const [scale, setScale] = useState(0.4);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    ...pageCategories.map(c => c.id),
    ...modalCategories.map(c => c.id)
  ]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<PageDefinition | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Get current categories based on tab
  const currentCategories = activeTab === "pages" ? pageCategories : modalCategories;
  
  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return currentCategories;
    
    const query = searchQuery.toLowerCase();
    return currentCategories.map(category => ({
      ...category,
      pages: category.pages.filter(page =>
        page.label.toLowerCase().includes(query) ||
        page.labelGe.toLowerCase().includes(query) ||
        (page.route && page.route.toLowerCase().includes(query))
      )
    })).filter(category => category.pages.length > 0);
  }, [searchQuery, currentCategories]);

  // Calculate totals
  const totalPages = pageCategories.reduce((acc, cat) => acc + cat.pages.length, 0);
  const totalModals = modalCategories.reduce((acc, cat) => acc + cat.pages.length, 0);

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  }, []);

  const handlePageClick = useCallback((pageId: string) => {
    setActivePageId(pageId);
    
    // Find the page/modal
    const allPages = [...pageCategories, ...modalCategories].flatMap(c => c.pages);
    const page = allPages.find(p => p.id === pageId);
    
    if (page?.isModal) {
      setActiveModal(page);
    } else {
      const element = document.getElementById(`page-${pageId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, []);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.05, 0.8));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.05, 0.2));
  const handleReset = () => setScale(0.4);

  const gridCols = useMemo(() => {
    if (breakpoint === "desktop") return "grid-cols-1 xl:grid-cols-2";
    if (breakpoint === "tablet") return "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3";
    return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
  }, [breakpoint]);

  return (
    <div className="h-screen flex overflow-hidden bg-muted/30">
      {/* Sidebar */}
      <aside className={cn(
        "bg-background border-r flex flex-col shrink-0 transition-all duration-300",
        sidebarCollapsed ? "w-12" : "w-64"
      )}>
        {/* Header with collapse toggle */}
        <div className={cn("border-b flex items-center", sidebarCollapsed ? "p-2 justify-center" : "p-4 justify-between")}>
          {!sidebarCollapsed && (
            <div>
              <h1 className="font-bold text-lg">Design System</h1>
              <p className="text-xs text-muted-foreground mt-1">
                {totalPages} pages • {totalModals} modals
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </Button>
        </div>
        
        {!sidebarCollapsed && (
          <>
            {/* Main Tabs */}
            <div className="p-3 border-b">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "pages" | "modals")}>
                <TabsList className="w-full">
                  <TabsTrigger value="pages" className="flex-1 gap-1">
                    <LayoutGrid className="w-3 h-3" />
                    Pages ({totalPages})
                  </TabsTrigger>
                  <TabsTrigger value="modals" className="flex-1 gap-1">
                    <Layers className="w-3 h-3" />
                    Modals ({totalModals})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            {/* Search */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={`Search ${activeTab}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            {/* Categories */}
            <ScrollArea className="flex-1 p-2">
              {filteredCategories.map((category) => (
                <SidebarCategory
                  key={category.id}
                  category={category}
                  isExpanded={expandedCategories.includes(category.id)}
                  onToggle={() => toggleCategory(category.id)}
                  activePageId={activePageId}
                  onPageClick={handlePageClick}
                />
              ))}
            </ScrollArea>
          </>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header - Only show device controls for Pages tab */}
        {activeTab === "pages" && (
          <header className="h-14 bg-background border-b flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              {(Object.entries(breakpoints) as [BreakpointKey, typeof breakpoints.mobile][]).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <Button
                    key={key}
                    variant={breakpoint === key ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setBreakpoint(key)}
                    className="gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{config.label}</span>
                    <span className="text-xs opacity-60 hidden md:inline">{config.width}px</span>
                  </Button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomOut} disabled={scale <= 0.2}>
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium w-14 text-center">{Math.round(scale * 100)}%</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomIn} disabled={scale >= 0.8}>
                <Plus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </header>
        )}

        {/* Content Area */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {activeTab === "pages" ? (
              // Pages Grid - Renders actual page previews
              filteredCategories.map((category) => (
                <section key={category.id} className="mb-12">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-2xl">{category.icon}</span>
                    <div>
                      <h2 className="text-lg font-bold">{category.title}</h2>
                      <p className="text-sm text-muted-foreground">{category.titleGe}</p>
                    </div>
                    <span className="text-sm text-muted-foreground ml-2">({category.pages.length})</span>
                  </div>
                  
                  <div className={cn("grid gap-8", gridCols)}>
                    {category.pages.map((page) => (
                      <div key={page.id} id={`page-${page.id}`} className="flex justify-center">
                        <DeviceMockup
                          page={page}
                          breakpoint={breakpoint}
                          scale={scale}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              ))
            ) : (
              // Modals Grid - Shows clickable cards, NOT actual modals
              filteredCategories.map((category) => (
                <section key={category.id} className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">{category.icon}</span>
                    <div>
                      <h2 className="text-lg font-bold">{category.title}</h2>
                      <p className="text-sm text-muted-foreground">{category.titleGe}</p>
                    </div>
                    <span className="text-sm text-muted-foreground ml-2">({category.pages.length})</span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {category.pages.map((page) => (
                      <ModalCard
                        key={page.id}
                        page={page}
                        onPreview={() => setActiveModal(page)}
                      />
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Active Modal Viewer - Only ONE modal rendered at a time */}
      <ActiveModalViewer
        page={activeModal}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
}
