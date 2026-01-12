import React, { useState, Suspense, lazy, memo, useMemo, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Minus, Plus, RotateCcw, Loader2, AlertTriangle, 
  Search, ChevronDown, ChevronRight, Monitor, Tablet, Smartphone, X,
  LayoutGrid, Layers
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
const VIP = lazy(() => import("@/pages/VIP"));
const PowerUps = lazy(() => import("@/pages/PowerUps"));
const WorldHome = lazy(() => import("@/pages/WorldHome"));
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
const AdFreeModal = lazy(() => import("@/components/home/AdFreeModal").then(m => ({ default: m.AdFreeModal })));
const WatchAdModal = lazy(() => import("@/components/home/WatchAdModal").then(m => ({ default: m.WatchAdModal })));
const HomeHelpModal = lazy(() => import("@/components/home/HelpModal").then(m => ({ default: m.HelpModal })));
const PowerUpTutorialModalHome = lazy(() => import("@/components/home/PowerUpTutorialModal").then(m => ({ default: m.PowerUpTutorialModal })));

// Shop Modals
const BuyCurrencyModal = lazy(() => import("@/components/shop/BuyCurrencyModal").then(m => ({ default: m.BuyCurrencyModal })));
const CurrencyExchangeModal = lazy(() => import("@/components/shop/CurrencyExchangeModal").then(m => ({ default: m.CurrencyExchangeModal })));
const CurrencyActionModal = lazy(() => import("@/components/shop/CurrencyActionModal").then(m => ({ default: m.CurrencyActionModal })));
const PurchaseSuccessModal = lazy(() => import("@/components/shop/PurchaseSuccessModal").then(m => ({ default: m.PurchaseSuccessModal })));
const ShopItemDetailModal = lazy(() => import("@/components/shop/ShopItemDetailModal").then(m => ({ default: m.ShopItemDetailModal })));

// Game Modals
const GameLoseModal = lazy(() => import("@/components/game/GameLoseModal").then(m => ({ default: m.GameLoseModal })));
const ComingSoonModal = lazy(() => import("@/components/game/ComingSoonModal").then(m => ({ default: m.ComingSoonModal })));
const CategoryWheelModal = lazy(() => import("@/components/game/CategoryWheelModal").then(m => ({ default: m.CategoryWheelModal })));
const LuckySpinModal = lazy(() => import("@/components/game/LuckySpinModal").then(m => ({ default: m.LuckySpinModal })));
const PowerUpDetailModal = lazy(() => import("@/components/game/PowerUpDetailModal").then(m => ({ default: m.PowerUpDetailModal })));
const GamePowerUpTutorialModal = lazy(() => import("@/components/game/PowerUpTutorialModal").then(m => ({ default: m.PowerUpTutorialModal })));
const VSMatchHelpModal = lazy(() => import("@/components/game/VSMatchHelpModal").then(m => ({ default: m.VSMatchHelpModal })));

// Map Modals  
const PowerUpShopModal = lazy(() => import("@/components/map/PowerUpShopModal").then(m => ({ default: m.PowerUpShopModal })));
const LockedLevelModal = lazy(() => import("@/components/map/LockedLevelModal").then(m => ({ default: m.LockedLevelModal })));
const CompletedLevelModal = lazy(() => import("@/components/map/CompletedLevelModal").then(m => ({ default: m.CompletedLevelModal })));
const AdventureHelpModal = lazy(() => import("@/components/map/AdventureHelpModal").then(m => ({ default: m.AdventureHelpModal })));

// Team Modals
const CreateRoomModal = lazy(() => import("@/components/team/CreateRoomModal").then(m => ({ default: m.CreateRoomModal })));
const JoinRoomModal = lazy(() => import("@/components/team/JoinRoomModal").then(m => ({ default: m.JoinRoomModal })));
const QuickPlayModal = lazy(() => import("@/components/team/QuickPlayModal").then(m => ({ default: m.QuickPlayModal })));
const CategorySelectorModal = lazy(() => import("@/components/team/CategorySelectorModal").then(m => ({ default: m.CategorySelectorModal })));
const TeamHelpModal = lazy(() => import("@/components/team/HelpModal").then(m => ({ default: m.HelpModal })));
const HowItWorksModal = lazy(() => import("@/components/team/HowItWorksModal").then(m => ({ default: m.HowItWorksModal })));
const InviteFriendsModal = lazy(() => import("@/components/team/InviteFriendsModal").then(m => ({ default: m.InviteFriendsModal })));
const GameInviteModal = lazy(() => import("@/components/team/GameInviteModal").then(m => ({ default: m.GameInviteModal })));
const AddFriendModal = lazy(() => import("@/components/team/AddFriendModal").then(m => ({ default: m.AddFriendModal })));
const AllFriendsModal = lazy(() => import("@/components/team/AllFriendsModal").then(m => ({ default: m.AllFriendsModal })));
const AllRecentPlayersModal = lazy(() => import("@/components/team/AllRecentPlayersModal").then(m => ({ default: m.AllRecentPlayersModal })));
const AllRecentRoomsModal = lazy(() => import("@/components/team/AllRecentRoomsModal").then(m => ({ default: m.AllRecentRoomsModal })));
const RoomIconPickerModal = lazy(() => import("@/components/team/RoomIconPickerModal").then(m => ({ default: m.RoomIconPickerModal })));
const GradientPicker = lazy(() => import("@/components/team/GradientPicker").then(m => ({ default: m.GradientPicker })));
const ChatModal = lazy(() => import("@/components/team/ChatModal").then(m => ({ default: m.ChatModal })));
// QRScannerModal removed - triggers camera access
const CreateBlindTriviaModal = lazy(() => import("@/components/team/CreateBlindTriviaModal").then(m => ({ default: m.CreateBlindTriviaModal })));
const MyTriviasPickerModal = lazy(() => import("@/components/team/MyTriviasPickerModal").then(m => ({ default: m.MyTriviasPickerModal })));

// TV Modals
const TVMirrorModal = lazy(() => import("@/components/tv/TVMirrorModal").then(m => ({ default: m.TVMirrorModal })));
const TVConnectModal = lazy(() => import("@/components/team/TVConnectModal").then(m => ({ default: m.TVConnectModal })));
const TVDiscoveryModal = lazy(() => import("@/components/team/TVDiscoveryModal").then(m => ({ default: m.TVDiscoveryModal })));
const TVEnterCodeModal = lazy(() => import("@/components/team/TVEnterCodeModal").then(m => ({ default: m.TVEnterCodeModal })));
const TVJoinModal = lazy(() => import("@/components/team/TVJoinModal").then(m => ({ default: m.TVJoinModal })));
const TVPlayModal = lazy(() => import("@/components/team/TVPlayModal").then(m => ({ default: m.TVPlayModal })));
const TVSetupModal = lazy(() => import("@/components/team/TVSetupModal").then(m => ({ default: m.TVSetupModal })));

// Social Modals
const CreateQuizModal = lazy(() => import("@/components/social/CreateQuizModal").then(m => ({ default: m.CreateQuizModal })));
const EditQuizModal = lazy(() => import("@/components/social/EditQuizModal").then(m => ({ default: m.EditQuizModal })));
const CreateCollectionModal = lazy(() => import("@/components/social/CreateCollectionModal").then(m => ({ default: m.CreateCollectionModal })));
const AddRoundToCollectionModal = lazy(() => import("@/components/social/AddRoundToCollectionModal").then(m => ({ default: m.AddRoundToCollectionModal })));
const EditRoundModal = lazy(() => import("@/components/social/EditRoundModal").then(m => ({ default: m.EditRoundModal })));
const TriviaPreviewModal = lazy(() => import("@/components/social/TriviaPreviewModal").then(m => ({ default: m.TriviaPreviewModal })));
const QuizPlayModal = lazy(() => import("@/components/social/QuizPlayModal").then(m => ({ default: m.QuizPlayModal })));
const CollectionPreviewModal = lazy(() => import("@/components/social/CollectionPreviewModal").then(m => ({ default: m.CollectionPreviewModal })));
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

// ========== STATIC MODAL PREVIEW COMPONENT ==========
// This renders a static preview placeholder for modals to prevent portal/overlay issues
interface StaticModalPreviewProps {
  page: {
    id: string;
    label: string;
    labelGe: string;
    modalProps?: Record<string, any>;
  };
}

const StaticModalPreview = memo(function StaticModalPreview({ page }: StaticModalPreviewProps) {
  return (
    <div className="relative w-full h-full bg-gradient-to-br from-background via-muted to-background flex items-center justify-center overflow-hidden">
      {/* Simulated backdrop */}
      <div className="absolute inset-0 bg-black/40" />
      
      {/* Modal card preview */}
      <div className="relative z-10 bg-card rounded-2xl shadow-2xl border border-border/50 p-6 max-w-[85%] max-h-[85%] overflow-hidden">
        {/* Modal header simulation */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground">{page.label}</h3>
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
        
        {/* Modal content placeholder */}
        <div className="space-y-3">
          <div className="h-3 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
          <div className="h-3 bg-muted rounded w-2/3" />
        </div>
        
        {/* Modal props preview if available */}
        {page.modalProps && Object.keys(page.modalProps).length > 0 && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground font-mono">
              Props: {Object.keys(page.modalProps).join(', ')}
            </p>
          </div>
        )}
        
        {/* Georgian label */}
        <p className="mt-4 text-sm text-muted-foreground text-center">{page.labelGe}</p>
        
        {/* Action buttons simulation */}
        <div className="flex gap-2 mt-4 justify-end">
          <div className="px-4 py-2 bg-muted rounded-lg text-sm text-muted-foreground">Cancel</div>
          <div className="px-4 py-2 bg-primary rounded-lg text-sm text-primary-foreground">Confirm</div>
        </div>
      </div>
    </div>
  );
});

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

const pageCategories: CategoryDefinition[] = [
  // ========== PAGE CATEGORIES ==========
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
      { id: "world", label: "World Map", labelGe: "მსოფლიო რუკა", Component: WorldHome, route: "/world" },
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
      // TVDisplay and TVHostController removed - require TVGameProvider context
    ],
  },
  {
    id: "monetization",
    title: "Monetization",
    titleGe: "მაღაზია და VIP",
    icon: "💎",
    pages: [
      { id: "vip", label: "VIP", labelGe: "VIP", Component: VIP, route: "/vip" },
      { id: "powerups", label: "Power-Ups", labelGe: "პაუერაფები", Component: PowerUps, route: "/power-ups" },
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
    id: "styleguide",
    title: "Style Guides",
    titleGe: "სტილის გზამკვლევი",
    icon: "🎨",
    pages: [
      { id: "styleguide", label: "Styleguide", labelGe: "სტილგაიდი", Component: Styleguide, route: "/styleguide" },
      { id: "buttons", label: "All Buttons", labelGe: "ღილაკები", Component: AllButtons, route: "/all-buttons" },
      { id: "modals", label: "Modals Showcase", labelGe: "მოდალები", Component: ModalsShowcase, route: "/modals" },
    ],
  },
  {
    id: "errors",
    title: "Error States",
    titleGe: "შეცდომები",
    icon: "⚠️",
    pages: [
      { id: "404", label: "404 Not Found", labelGe: "გვერდი ვერ მოიძებნა", Component: NotFound, route: "/404" },
      { id: "redirect", label: "Room Redirect", labelGe: "გადამისამართება", Component: RoomRedirect, route: "/room/test" },
    ],
  },
  {
    id: "admin",
    title: "Admin Pages",
    titleGe: "ადმინის გვერდები",
    icon: "⚙️",
    pages: [
      { id: "admin-dashboard", label: "Dashboard", labelGe: "დეშბორდი", Component: AdminDashboard, route: "/admin" },
      { id: "admin-flow", label: "Flow", labelGe: "ფლოუ", Component: AdminFlow, route: "/admin/flow" },
      { id: "admin-content", label: "Content Manager", labelGe: "კონტენტი", Component: ContentManager, route: "/admin/content" },
      { id: "admin-import", label: "Import", labelGe: "იმპორტი", Component: AdminImport, route: "/admin/import" },
      { id: "admin-users", label: "Online Users", labelGe: "მომხმარებლები", Component: AdminOnlineUsers, route: "/admin/users" },
      { id: "admin-duplicates", label: "Duplicate Scanner", labelGe: "დუბლიკატები", Component: DuplicateScanner, route: "/admin/duplicates" },
      { id: "admin-icons", label: "Icon Library", labelGe: "აიქონები", Component: IconLibraryAdmin, route: "/admin/icons" },
      { id: "admin-tools", label: "Question Tools", labelGe: "კითხვები", Component: QuestionTools, route: "/admin/tools" },
      { id: "admin-icon-assign", label: "Icon Assignment", labelGe: "აიქონების მინიჭება", Component: IconAssignment, route: "/admin/icon-assign" },
      { id: "admin-missing-icons", label: "Missing Icons", labelGe: "დაკარგული აიქონები", Component: MissingIcons, route: "/admin/missing-icons" },
      { id: "admin-fix-icons", label: "Fix Icons", labelGe: "აიქონების შესწორება", Component: FixIcons, route: "/admin/fix-icons" },
      { id: "admin-ai", label: "AI Generations", labelGe: "AI გენერაციები", Component: AIGenerations, route: "/admin/ai-generations" },
      { id: "admin-push", label: "Push Notifications", labelGe: "შეტყობინებები", Component: PushNotifications, route: "/admin/push" },
      { id: "admin-reports", label: "Reports", labelGe: "რეპორტები", Component: AdminReports, route: "/admin/reports" },
    ],
  },

  // ========== MODAL CATEGORIES ==========
  {
    id: "modals-home",
    title: "Home Modals",
    titleGe: "მთავარი მოდალები",
    icon: "🏠",
    isModal: true,
    pages: [
      { id: "avatar-modal", label: "Avatar Modal", labelGe: "ავატარი", Component: AvatarModal, isModal: true, modalProps: {} },
      { id: "level-up-modal", label: "Level Up", labelGe: "ლეველი აპი", Component: LevelUpModal, isModal: true, modalProps: { newLevel: 5, previousLevel: 4, rewards: { coins: 100, gems: 5 } } },
      { id: "daily-rewards-modal", label: "Daily Rewards", labelGe: "დღიური ჯილდოები", Component: DailyRewardsModal, isModal: true, modalProps: { currentStreak: 3 } },
      { id: "chest-reward-modal", label: "Chest Reward", labelGe: "სკივრი", Component: ChestRewardModal, isModal: true, modalProps: { chestType: "gold", rewards: [] } },
      { id: "streak-modal", label: "Streak", labelGe: "სტრიკი", Component: StreakModal, isModal: true, modalProps: { currentStreak: 7, bestStreak: 14 } },
      { id: "missions-modal", label: "Missions", labelGe: "მისიები", Component: MissionsModal, isModal: true, modalProps: {} },
      { id: "my-powers-modal", label: "My Powers", labelGe: "ჩემი პაუერაფები", Component: MyPowersModal, isModal: true, modalProps: {} },
      { id: "level-info-modal", label: "Level Info", labelGe: "ლეველის ინფო", Component: LevelInfoModal, isModal: true, modalProps: { levelInfo: { level: 5, currentXp: 450, nextLevelXp: 1000, totalXp: 4500 } } },
      { id: "settings-modal", label: "Settings", labelGe: "პარამეტრები", Component: SettingsModal, isModal: true, modalProps: {} },
      { id: "sound-settings-modal", label: "Sound Settings", labelGe: "ხმის პარამეტრები", Component: SoundSettingsModal, isModal: true, modalProps: {} },
      { id: "points-modal", label: "Points", labelGe: "ქულები", Component: PointsModal, isModal: true, modalProps: { totalPoints: 5000, gamesPlayed: 42, averageScore: 85, bestGame: 100 } },
      { id: "privacy-modal", label: "Privacy", labelGe: "კონფიდენციალურობა", Component: PrivacyModal, isModal: true, modalProps: {} },
      { id: "not-enough-coins-modal", label: "Not Enough Coins", labelGe: "არ გყოფნი მონეტები", Component: NotEnoughCoinsModal, isModal: true, modalProps: { requiredAmount: 500, currentAmount: 100 } },
      { id: "guest-max-plays-modal", label: "Guest Max Plays", labelGe: "სტუმრის ლიმიტი", Component: GuestMaxPlaysModal, isModal: true, modalProps: {} },
      { id: "register-prompt-modal", label: "Register Prompt", labelGe: "რეგისტრაცია", Component: RegisterPromptModal, isModal: true, modalProps: {} },
      { id: "gem-shop-modal", label: "Gem Shop", labelGe: "ჯემების მაღაზია", Component: GemShopModal, isModal: true, modalProps: {} },
      { id: "ad-free-modal", label: "Ad Free", labelGe: "რეკლამის გარეშე", Component: AdFreeModal, isModal: true, modalProps: {} },
      { id: "watch-ad-modal", label: "Watch Ad", labelGe: "რეკლამის ნახვა", Component: WatchAdModal, isModal: true, modalProps: { rewardType: "coins", rewardAmount: 50 } },
      { id: "home-help-modal", label: "Help", labelGe: "დახმარება", Component: HomeHelpModal, isModal: true, modalProps: {} },
      // PowerUpTutorialModalHome removed - requires powerUp prop with name property
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
      // CategoryWheelModal, PowerUpDetailModal, GamePowerUpTutorialModal removed - require callbacks/props that crash in isolation
      { id: "lucky-spin-modal", label: "Lucky Spin", labelGe: "იღბლიანი სპინი", Component: LuckySpinModal, isModal: true, modalProps: {} },
      { id: "vs-match-help-modal", label: "VS Match Help", labelGe: "VS დახმარება", Component: VSMatchHelpModal, isModal: true, modalProps: {} },
    ],
  },
  {
    id: "modals-map",
    title: "Map & Adventure Modals",
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
    title: "Team & Multiplayer Modals",
    titleGe: "გუნდის მოდალები",
    icon: "👥",
    isModal: true,
    pages: [
      // CreateRoomModal, JoinRoomModal, QuickPlayModal removed - require MultiplayerProvider context
      { id: "category-selector-modal", label: "Category Selector", labelGe: "კატეგორიის არჩევა", Component: CategorySelectorModal, isModal: true, modalProps: {} },
      { id: "team-help-modal", label: "Team Help", labelGe: "გუნდის დახმარება", Component: TeamHelpModal, isModal: true, modalProps: {} },
      { id: "how-it-works-modal", label: "How It Works", labelGe: "როგორ მუშაობს", Component: HowItWorksModal, isModal: true, modalProps: {} },
      { id: "invite-friends-modal", label: "Invite Friends", labelGe: "მეგობრების მოწვევა", Component: InviteFriendsModal, isModal: true, modalProps: { roomCode: "ABC123" } },
      { id: "add-friend-modal", label: "Add Friend", labelGe: "მეგობრის დამატება", Component: AddFriendModal, isModal: true, modalProps: {} },
      { id: "room-icon-picker-modal", label: "Room Icon Picker", labelGe: "აიქონის არჩევა", Component: RoomIconPickerModal, isModal: true, modalProps: {} },
      { id: "gradient-picker-modal", label: "Gradient Picker", labelGe: "გრადიენტის არჩევა", Component: GradientPicker, isModal: true, modalProps: {} },
      // QR Scanner, Chat, BlindTrivia, TriviaPicker removed - require context providers or complex state
    ],
  },
  {
    id: "modals-tv",
    title: "TV Modals",
    titleGe: "TV მოდალები",
    icon: "📺",
    isModal: true,
    pages: [
      // TV modals removed - require TVGameProvider context
      { id: "tv-enter-code-modal", label: "TV Enter Code", labelGe: "კოდის შეყვანა", Component: TVEnterCodeModal, isModal: true, modalProps: {} },
    ],
  },
  {
    id: "modals-social",
    title: "Social & UGC Modals",
    titleGe: "სოციალური მოდალები",
    icon: "📱",
    isModal: true,
    pages: [
      // Complex UGC modals removed - require auth context and database queries
      { id: "create-trivia-type-modal", label: "Create Trivia Type", labelGe: "ტრივიას ტიპის შექმნა", Component: CreateTriviaTypeModal, isModal: true, modalProps: {} },
    ],
  },
  {
    id: "modals-profile",
    title: "Profile & Leaderboard Modals",
    titleGe: "პროფილის მოდალები",
    icon: "👤",
    isModal: true,
    pages: [
      { id: "player-profile-modal", label: "Player Profile", labelGe: "მოთამაშის პროფილი", Component: PlayerProfileModal, isModal: true, modalProps: { userId: "demo-user" } },
      { id: "avatar-generator-modal", label: "Avatar Generator", labelGe: "ავატარის გენერატორი", Component: AvatarGeneratorModal, isModal: true, modalProps: {} },
      { id: "claim-rewards-modal", label: "Claim Rewards", labelGe: "ჯილდოების მიღება", Component: ClaimRewardsModal, isModal: true, modalProps: { rewards: { coins: 500, gems: 10 } } },
      { id: "play-category-modal", label: "Play Category", labelGe: "კატეგორიის თამაში", Component: PlayCategoryModal, isModal: true, modalProps: { categoryId: "science", categoryName: "Science" } },
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

// Device Mockup component for different breakpoints
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
  const { Component, route, label, labelGe, isModal, modalProps } = page;
  
  // Calculate scaled dimensions
  const scaledWidth = config.width * scale;
  const scaledHeight = config.height * scale;
  
  return (
    <div 
      className="flex flex-col items-center gap-3 shrink-0 cursor-pointer group"
      onClick={onClick}
    >
      {/* Device Frame */}
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
        {/* Desktop browser bar */}
        {breakpoint === "desktop" && (
          <div className="h-8 bg-[#3a3a3a] flex items-center px-3 gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <div className="flex-1 mx-4">
              <div className="bg-[#1a1a1a] rounded h-5 max-w-md mx-auto flex items-center justify-center">
                <span className="text-[10px] text-white/40 truncate px-2">{route || "modal"}</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Mobile/Tablet inner bezel */}
        {breakpoint !== "desktop" && (
          <div className={cn(
            "absolute bg-[#0a0a0a]",
            breakpoint === "mobile" && "inset-[6px] rounded-[49px]",
            breakpoint === "tablet" && "inset-[6px] rounded-[18px]"
          )} />
        )}
        
        {/* Screen container */}
        <div 
          className={cn(
            "relative overflow-hidden bg-background",
            breakpoint === "mobile" && "rounded-[34px]",
            breakpoint === "tablet" && "rounded-[12px]",
          )}
          style={{ 
            width: scaledWidth,
            height: breakpoint === "desktop" ? scaledHeight : scaledHeight,
          }}
        >
          {/* Mobile Dynamic Island */}
          {breakpoint === "mobile" && (
            <div 
              className="absolute left-1/2 -translate-x-1/2 bg-black rounded-[20px] z-50"
              style={{ 
                top: 8 * scale, 
                width: 126 * scale, 
                height: 37 * scale 
              }} 
            />
          )}
          
          {/* Page content with inner scaling */}
          <div 
            className="overflow-hidden"
            style={{ 
              width: scaledWidth, 
              height: scaledHeight,
              pointerEvents: 'none' 
            }}
          >
            <div style={{ 
              transform: `scale(${scale})`, 
              transformOrigin: 'top left',
              width: config.width,
              height: config.height,
            }}>
              {isModal ? (
                <StaticModalPreview page={page} />
              ) : (
                <IsolatedPageRenderer Component={Component} route={route || "/"} />
              )}
            </div>
          </div>
          
          {/* Mobile home indicator */}
          {breakpoint === "mobile" && (
            <div 
              className="absolute left-1/2 -translate-x-1/2 bg-foreground/30 rounded-full z-50"
              style={{ 
                bottom: 8 * scale, 
                width: 134 * scale, 
                height: 5 * scale 
              }} 
            />
          )}
        </div>
      </div>
      
      {/* Labels */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-1.5">
          {isModal && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded">
              Modal
            </span>
          )}
          <p className="font-semibold text-sm text-foreground">{label}</p>
        </div>
        <p className="text-xs text-muted-foreground">{labelGe}</p>
        {route && <p className="text-[10px] text-muted-foreground/60 font-mono mt-1">{route}</p>}
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

// Expanded Modal Component
const ExpandedModal = memo(function ExpandedModal({
  page,
  breakpoint,
  onClose,
}: {
  page: PageDefinition | null;
  breakpoint: BreakpointKey;
  onClose: () => void;
}) {
  if (!page) return null;
  
  const config = breakpoints[breakpoint];
  const maxScale = Math.min(
    (window.innerWidth - 120) / config.width,
    (window.innerHeight - 200) / config.height,
    1
  );

  return (
    <div 
      className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex items-center justify-center p-8"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="relative">
        <Button
          variant="outline"
          size="icon"
          className="absolute -top-12 right-0 rounded-full"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
        <DeviceMockup
          page={page}
          breakpoint={breakpoint}
          scale={maxScale}
        />
      </div>
    </div>
  );
});

// Filter type
type FilterType = "all" | "pages" | "modals";

// Main Design Component
export default function Design() {
  const [breakpoint, setBreakpoint] = useState<BreakpointKey>("mobile");
  const [scale, setScale] = useState(0.4);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>(pageCategories.map(c => c.id));
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [expandedPage, setExpandedPage] = useState<PageDefinition | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  
  // Filter pages based on search and filter type
  const filteredCategories = useMemo(() => {
    let categories = pageCategories;
    
    // Filter by type
    if (filter === "pages") {
      categories = categories.filter(c => !c.isModal);
    } else if (filter === "modals") {
      categories = categories.filter(c => c.isModal);
    }
    
    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      categories = categories.map(category => ({
        ...category,
        pages: category.pages.filter(page =>
          page.label.toLowerCase().includes(query) ||
          page.labelGe.toLowerCase().includes(query) ||
          (page.route && page.route.toLowerCase().includes(query))
        )
      })).filter(category => category.pages.length > 0);
    }
    
    return categories;
  }, [searchQuery, filter]);

  // Calculate totals
  const totalPages = pageCategories.filter(c => !c.isModal).reduce((acc, cat) => acc + cat.pages.length, 0);
  const totalModals = pageCategories.filter(c => c.isModal).reduce((acc, cat) => acc + cat.pages.length, 0);
  const totalAll = totalPages + totalModals;

  // Handle category toggle
  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  }, []);

  // Handle page click in sidebar
  const handlePageClick = useCallback((pageId: string) => {
    setActivePageId(pageId);
    const element = document.getElementById(`page-${pageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // Zoom controls
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.05, 0.8));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.05, 0.2));
  const handleReset = () => setScale(0.4);

  // Grid columns based on breakpoint and scale
  const gridCols = useMemo(() => {
    if (breakpoint === "desktop") return "grid-cols-1 xl:grid-cols-2";
    if (breakpoint === "tablet") return "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3";
    return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
  }, [breakpoint]);

  return (
    <div className="h-screen flex overflow-hidden bg-muted/30">
      {/* Sidebar */}
      <aside className="w-64 bg-background border-r flex flex-col shrink-0">
        <div className="p-4 border-b">
          <h1 className="font-bold text-lg">Design System</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {totalPages} pages • {totalModals} modals
          </p>
        </div>
        
        {/* Filter Tabs */}
        <div className="p-3 border-b flex gap-1">
          <Button
            variant={filter === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("all")}
            className="flex-1 gap-1"
          >
            <LayoutGrid className="w-3 h-3" />
            All ({totalAll})
          </Button>
          <Button
            variant={filter === "pages" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("pages")}
            className="flex-1"
          >
            Pages
          </Button>
          <Button
            variant={filter === "modals" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("modals")}
            className="flex-1"
          >
            <Layers className="w-3 h-3" />
            Modals
          </Button>
        </div>
        
        {/* Search */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search screens..."
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
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 bg-background border-b flex items-center justify-between px-4 shrink-0">
          {/* Breakpoint Selector */}
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

          {/* Zoom Controls */}
          <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={handleZoomOut}
              disabled={scale <= 0.2}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium w-14 text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={handleZoomIn}
              disabled={scale >= 0.8}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={handleReset}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Screens Grid */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {filteredCategories.map((category) => (
              <section key={category.id} className="mb-12">
                {/* Category Header */}
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-2xl">{category.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold">{category.title}</h2>
                      {category.isModal && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                          Modals
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{category.titleGe}</p>
                  </div>
                  <span className="text-sm text-muted-foreground ml-2">({category.pages.length})</span>
                </div>
                
                {/* Pages Grid */}
                <div className={cn("grid gap-8", gridCols)}>
                  {category.pages.map((page) => (
                    <div 
                      key={page.id} 
                      id={`page-${page.id}`}
                      className="flex justify-center"
                    >
                      <DeviceMockup
                        page={page}
                        breakpoint={breakpoint}
                        scale={scale}
                        onClick={() => setExpandedPage(page)}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Expanded Modal */}
      <ExpandedModal
        page={expandedPage}
        breakpoint={breakpoint}
        onClose={() => setExpandedPage(null)}
      />
    </div>
  );
}
