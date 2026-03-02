import { lazy, Suspense } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import { SoundProvider } from "@/contexts/SoundContext";
import { NotificationModalProvider } from "@/contexts/NotificationModalContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { BackgroundGenerationProvider } from "@/contexts/BackgroundGenerationContext";
import { PlayerProfileProvider } from "@/contexts/PlayerProfileContext";
import { AvatarModalProvider } from "@/contexts/AvatarModalContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { PostHogProvider } from "@/providers/PostHogProvider";
import { VipProvider } from "@/contexts/VipContext";
import { FriendsProvider } from "@/contexts/FriendsContext";
import { PlayGuardProvider } from "@/contexts/PlayGuardContext";
import { PendingChallengesProvider } from "@/contexts/PendingChallengesContext";
import { TVGameProvider } from "@/contexts/TVGameContext";
import { SplashScreen } from "@/components/SplashScreen";
// VideoPreloader auto-starts on import - no component needed
import "@/components/game/VideoPreloader";
import { GlobalSplineBackground } from "@/components/GlobalSplineBackground";
import { UserPresenceTracker } from "@/components/UserPresenceTracker";
import { PageSkeleton } from "@/components/PageSkeleton";
import { Navigate } from "react-router-dom";
import { OfflineBanner } from "./components/shared/OfflineBanner";

// Build-time flag for admin inclusion (default: included unless explicitly disabled)
const INCLUDE_ADMIN = import.meta.env.VITE_INCLUDE_ADMIN !== 'false';

// Eagerly loaded pages (critical path)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Loading from "./pages/Loading";

// Lazy loaded pages (reduces initial bundle)
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const PowerUps = lazy(() => import("./pages/PowerUps"));
const Leaderboards = lazy(() => import("./pages/Leaderboards"));
const Profile = lazy(() => import("./pages/Profile"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const TeamV2 = lazy(() => import("./pages/TeamV2"));
const Discover = lazy(() => import("./pages/Discover"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const CategoryQuizPage = lazy(() => import("./pages/CategoryQuizPage"));
const WorldHome = lazy(() => import("./pages/WorldHome"));
const Game = lazy(() => import("./pages/Game"));
const TriviaLobby = lazy(() => import("./pages/TriviaLobby"));
const CollectionLobby = lazy(() => import("./pages/CollectionLobby"));
const TriviaLoader = lazy(() => import("./pages/TriviaLoader"));
const RoomRedirect = lazy(() => import("./pages/RoomRedirect"));
const TVDisplay = lazy(() => import("./pages/TVDisplay"));
const TVHostController = lazy(() => import("./pages/TVHostController"));
const TVLobby = lazy(() => import("./pages/TVLobby"));
const TVJoin = lazy(() => import("./pages/TVJoin"));
const VIP = lazy(() => import("./pages/VIP"));
const Notifications = lazy(() => import("./pages/Notifications"));


// Settings pages
const Settings = lazy(() => import("./pages/Settings"));
const SettingsName = lazy(() => import("./pages/SettingsName"));
const SettingsPassword = lazy(() => import("./pages/SettingsPassword"));
const SettingsPrivacy = lazy(() => import("./pages/SettingsPrivacy"));

// Legal pages
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const PrivacyPolicyEN = lazy(() => import("./pages/PrivacyPolicyEN"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const TermsOfServiceEN = lazy(() => import("./pages/TermsOfServiceEN"));
const Support = lazy(() => import("./pages/Support"));
const DeleteAccount = lazy(() => import("./pages/DeleteAccount"));

// Admin pages - conditionally imported to enable tree-shaking when excluded
const AdminRoute = INCLUDE_ADMIN ? lazy(() => import("./components/admin/AdminRoute").then(m => ({ default: m.AdminRoute }))) : null;
const Admin = INCLUDE_ADMIN ? lazy(() => import("./pages/Admin")) : null;
const AdminDashboard = INCLUDE_ADMIN ? lazy(() => import("./pages/admin/Dashboard")) : null;
const ContentManager = INCLUDE_ADMIN ? lazy(() => import("./pages/admin/ContentManager")) : null;
const QuestionStudio = INCLUDE_ADMIN ? lazy(() => import("./pages/admin/QuestionStudio")) : null;
const AdminOnlineUsers = INCLUDE_ADMIN ? lazy(() => import("./pages/admin/OnlineUsers")) : null;
const AdminImport = INCLUDE_ADMIN ? lazy(() => import("./pages/admin/Import")) : null;
const DuplicateScanner = INCLUDE_ADMIN ? lazy(() => import("./pages/admin/DuplicateScanner")) : null;
const IconLibraryAdmin = INCLUDE_ADMIN ? lazy(() => import("./pages/admin/IconLibrary")) : null;
const QuestionTools = INCLUDE_ADMIN ? lazy(() => import("./pages/admin/QuestionTools")) : null;
const IconAssignment = INCLUDE_ADMIN ? lazy(() => import("./pages/admin/IconAssignment")) : null;
const IconReview = INCLUDE_ADMIN ? lazy(() => import("./pages/admin/IconReview")) : null;
const MissingIcons = INCLUDE_ADMIN ? lazy(() => import("./pages/admin/MissingIcons")) : null;
const FixIcons = INCLUDE_ADMIN ? lazy(() => import("./pages/admin/FixIcons")) : null;
const AIGenerations = INCLUDE_ADMIN ? lazy(() => import("./pages/admin/AIGenerations")) : null;
const QualityReview = INCLUDE_ADMIN ? lazy(() => import("./pages/admin/QualityReview")) : null;
const PushNotifications = INCLUDE_ADMIN ? lazy(() => import("./pages/admin/PushNotifications")) : null;
const TVModeGameDocs = INCLUDE_ADMIN ? lazy(() => import("./pages/admin/TVModeGameDocs")) : null;
const AdminReports = INCLUDE_ADMIN ? lazy(() => import("./pages/admin/Reports")) : null;
const AdminFlow = INCLUDE_ADMIN ? lazy(() => import("./pages/admin/Flow")) : null;
const AdminDesign = INCLUDE_ADMIN ? lazy(() => import("./pages/admin/Design")) : null;
const AdminEconomy = INCLUDE_ADMIN ? lazy(() => import("./pages/admin/Economy")) : null;
const AdminSettings = INCLUDE_ADMIN ? lazy(() => import("./pages/admin/Settings")) : null;
const AdminGuestShowcase = INCLUDE_ADMIN ? lazy(() => import("./pages/AdminGuestShowcase")) : null;
const UserAnalytics = INCLUDE_ADMIN ? lazy(() => import("./pages/admin/UserAnalytics")) : null;
const OnboardingWelcomePreview = INCLUDE_ADMIN ? lazy(() => import("./pages/OnboardingWelcomePreview")) : null;

// Shop pages
const ShopSuccess = lazy(() => import("./pages/shop/Success"));
const ShopCancel = lazy(() => import("./pages/shop/Cancel"));
const Styleguide = lazy(() => import("./pages/Styleguide"));
const AllButtons = lazy(() => import("./pages/AllButtons"));
const ModalsShowcase = lazy(() => import("./pages/ModalsShowcase"));
const TVScreensShowcase = lazy(() => import("./pages/TVScreensShowcase"));
const Docs = lazy(() => import("./pages/Docs"));
const OnboardingPreview = lazy(() => import("./pages/OnboardingPreview"));
const ChallengeLanding = lazy(() => import("./pages/ChallengeLanding"));
const SampleDemoTV = lazy(() => import("./pages/SampleDemoTV"));
const DemoHome = lazy(() => import("./pages/DemoHome"));

const App = () => (
  <LanguageProvider>
    <AuthProvider>
      <PostHogProvider>
      <VipProvider>
      <SoundProvider>
        <FriendsProvider>
        <PlayGuardProvider>
        <PendingChallengesProvider>
        <NotificationsProvider>
          <OnboardingProvider>
            <NotificationModalProvider>
            <BackgroundGenerationProvider>
              <PlayerProfileProvider>
                <AvatarModalProvider>
                  <SplashScreen>
                    <TooltipProvider>
            {/* Offline detection banner */}
            <OfflineBanner />
            
            {/* Global persistent background with particles */}
            <GlobalSplineBackground />
            
            <UserPresenceTracker />
            <Suspense fallback={<PageSkeleton />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/demohome" element={<DemoHome />} />
                <Route path="/loading" element={<Loading />} />
                <Route path="/trivialoader" element={<TriviaLoader />} />
                
                <Route path="/power-ups" element={<PowerUps />} />
                <Route path="/category/:categoryId" element={<CategoryPage />} />
                <Route path="/play/:categoryId/:levelId" element={<CategoryQuizPage />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/leaderboards" element={<Leaderboards />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/:userId" element={<PublicProfile />} />
                <Route path="/world" element={<WorldHome />} />
                <Route path="/game" element={<Game />} />
                <Route path="/team" element={<TeamV2 />} />
                <Route path="/trivia/:triviaId" element={<TriviaLobby />} />
                <Route path="/collection/:collectionId" element={<CollectionLobby />} />
                <Route path="/room/:code" element={<RoomRedirect />} />
                <Route path="/tv" element={<TVLobby />} />
                <Route path="/tv/host/:sessionId" element={<TVGameProvider><TVHostController /></TVGameProvider>} />
                <Route path="/tv/:code" element={<TVDisplay />} />
                <Route path="/join" element={<TVJoin />} />
                <Route path="/join/session/:sessionId" element={<TVJoin />} />
                <Route path="/join/:code" element={<TVJoin />} />
                <Route path="/controller/:code" element={<Navigate to="/join" replace />} />
                <Route path="/vip" element={<VIP />} />
                <Route path="/discover" element={<Discover />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/privacy-policy-en" element={<PrivacyPolicyEN />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/terms-en" element={<TermsOfServiceEN />} />
                <Route path="/support" element={<Support />} />
                <Route path="/delete-account" element={<DeleteAccount />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/settings/name" element={<SettingsName />} />
                <Route path="/settings/password" element={<SettingsPassword />} />
                <Route path="/settings/privacy" element={<SettingsPrivacy />} />
                {INCLUDE_ADMIN && Admin && AdminRoute && (
                  <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>}>
                    <Route index element={AdminDashboard && <AdminDashboard />} />
                    <Route path="question-studio" element={QuestionStudio && <QuestionStudio />} />
                    <Route path="flow" element={AdminFlow && <AdminFlow />} />
                    <Route path="content" element={ContentManager && <ContentManager />} />
                    <Route path="import" element={AdminImport && <AdminImport />} />
                    <Route path="users" element={AdminOnlineUsers && <AdminOnlineUsers />} />
                    <Route path="user-analytics" element={UserAnalytics && <UserAnalytics />} />
                    <Route path="duplicates" element={DuplicateScanner && <DuplicateScanner />} />
                    <Route path="icons" element={IconLibraryAdmin && <IconLibraryAdmin />} />
                    <Route path="tools" element={QuestionTools && <QuestionTools />} />
                    <Route path="icon-assign" element={IconAssignment && <IconAssignment />} />
                    <Route path="icon-review" element={IconReview && <IconReview />} />
                    <Route path="missing-icons" element={MissingIcons && <MissingIcons />} />
                    <Route path="fix-icons" element={FixIcons && <FixIcons />} />
                    <Route path="ai-generations" element={AIGenerations && <AIGenerations />} />
                    <Route path="review" element={QualityReview && <QualityReview />} />
                    <Route path="push" element={PushNotifications && <PushNotifications />} />
                    <Route path="reports" element={AdminReports && <AdminReports />} />
                    <Route path="design" element={AdminDesign && <AdminDesign />} />
                    <Route path="guest" element={AdminGuestShowcase && <AdminGuestShowcase />} />
                    <Route path="economy" element={AdminEconomy && <AdminEconomy />} />
                    <Route path="settings" element={AdminSettings && <AdminSettings />} />
                    <Route path="tvmodegame" element={TVModeGameDocs && <TVModeGameDocs />} />
                  </Route>
                )}
                {INCLUDE_ADMIN && AdminRoute && OnboardingWelcomePreview && (
                  <Route path="/onboarding" element={<AdminRoute><OnboardingWelcomePreview /></AdminRoute>} />
                )}
                <Route path="/shop/success" element={<ShopSuccess />} />
                <Route path="/shop/cancel" element={<ShopCancel />} />
                <Route path="/styleguide" element={<Styleguide />} />
                <Route path="/all-buttons" element={<AllButtons />} />
                <Route path="/modals" element={<ModalsShowcase />} />
                <Route path="/tv-showcase" element={<TVScreensShowcase />} />
                <Route path="/docs" element={<Docs />} />
                <Route path="/onboarding-preview" element={<OnboardingPreview />} />
                <Route path="/challenge/:code" element={<ChallengeLanding />} />
                <Route path="/sampledemotv" element={<SampleDemoTV />} />
                <Route path="/sampledemoplayer" element={<SampleDemoPlayer />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
                    </TooltipProvider>
                  </SplashScreen>
                </AvatarModalProvider>
              </PlayerProfileProvider>
            </BackgroundGenerationProvider>
            </NotificationModalProvider>
          </OnboardingProvider>
        </NotificationsProvider>
        </PendingChallengesProvider>
        </PlayGuardProvider>
        </FriendsProvider>
      </SoundProvider>
      </VipProvider>
    </PostHogProvider>
    </AuthProvider>
  </LanguageProvider>
);

export default App;
