import { lazy, Suspense } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import { SoundProvider } from "@/contexts/SoundContext";
import { NotificationModalProvider } from "@/contexts/NotificationModalContext";
import { BackgroundGenerationProvider } from "@/contexts/BackgroundGenerationContext";
import { PlayerProfileProvider } from "@/contexts/PlayerProfileContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { TVGameProvider } from "@/contexts/TVGameContext";
import { SplashScreen } from "@/components/SplashScreen";
// VideoPreloader auto-starts on import - no component needed
import "@/components/game/VideoPreloader";
import { GlobalSplineBackground } from "@/components/GlobalSplineBackground";
import { AdminRoute } from "@/components/admin/AdminRoute";
import { UserPresenceTracker } from "@/components/UserPresenceTracker";
import { PageSkeleton } from "@/components/PageSkeleton";
import { Navigate } from "react-router-dom";
import { OfflineBanner } from "./components/shared/OfflineBanner";

// Eagerly loaded pages (critical path)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Loading from "./pages/Loading";

// Lazy loaded pages (reduces initial bundle)
const PowerUps = lazy(() => import("./pages/PowerUps"));
const Leaderboards = lazy(() => import("./pages/Leaderboards"));
const Profile = lazy(() => import("./pages/Profile"));
const TeamV2 = lazy(() => import("./pages/TeamV2"));
const Discover = lazy(() => import("./pages/Discover"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const CategoryQuizPage = lazy(() => import("./pages/CategoryQuizPage"));
const WorldHome = lazy(() => import("./pages/WorldHome"));
const Game = lazy(() => import("./pages/Game"));
const TriviaLobby = lazy(() => import("./pages/TriviaLobby"));
const CollectionLobby = lazy(() => import("./pages/CollectionLobby"));
const RoomRedirect = lazy(() => import("./pages/RoomRedirect"));
const TVDisplay = lazy(() => import("./pages/TVDisplay"));
const TVHostController = lazy(() => import("./pages/TVHostController"));
const TVLobby = lazy(() => import("./pages/TVLobby"));
const TVJoin = lazy(() => import("./pages/TVJoin"));
const VIP = lazy(() => import("./pages/VIP"));
const Notifications = lazy(() => import("./pages/Notifications"));
const AdventureMapAdmin = lazy(() => import("./pages/AdventureMapAdmin"));

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

// Admin pages (lazy loaded as rarely accessed)
const Admin = lazy(() => import("./pages/Admin"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const ContentManager = lazy(() => import("./pages/admin/ContentManager"));
const AdminOnlineUsers = lazy(() => import("./pages/admin/OnlineUsers"));
const AdminImport = lazy(() => import("./pages/admin/Import"));
const DuplicateScanner = lazy(() => import("./pages/admin/DuplicateScanner"));
const IconLibraryAdmin = lazy(() => import("./pages/admin/IconLibrary"));
const QuestionTools = lazy(() => import("./pages/admin/QuestionTools"));
const IconAssignment = lazy(() => import("./pages/admin/IconAssignment"));
const IconReview = lazy(() => import("./pages/admin/IconReview"));
const MissingIcons = lazy(() => import("./pages/admin/MissingIcons"));
const FixIcons = lazy(() => import("./pages/admin/FixIcons"));
const AIGenerations = lazy(() => import("./pages/admin/AIGenerations"));
const PushNotifications = lazy(() => import("./pages/admin/PushNotifications"));
const TVModeGameDocs = lazy(() => import("./pages/admin/TVModeGameDocs"));
const AdminReports = lazy(() => import("./pages/admin/Reports"));
const AdminFlow = lazy(() => import("./pages/admin/Flow"));
const AdminDesign = lazy(() => import("./pages/admin/Design"));
const AdminEconomy = lazy(() => import("./pages/admin/Economy"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const AdminGuestShowcase = lazy(() => import("./pages/AdminGuestShowcase"));

// Shop pages
const ShopSuccess = lazy(() => import("./pages/shop/Success"));
const ShopCancel = lazy(() => import("./pages/shop/Cancel"));
const Styleguide = lazy(() => import("./pages/Styleguide"));
const AllButtons = lazy(() => import("./pages/AllButtons"));
const ModalsShowcase = lazy(() => import("./pages/ModalsShowcase"));
const TVScreensShowcase = lazy(() => import("./pages/TVScreensShowcase"));
const Docs = lazy(() => import("./pages/Docs"));

const App = () => (
  <LanguageProvider>
    <AuthProvider>
      <OnboardingProvider>
        <SoundProvider>
          <NotificationModalProvider>
            <BackgroundGenerationProvider>
              <PlayerProfileProvider>
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
                <Route path="/loading" element={<Loading />} />
                <Route path="/adventure-map-admin" element={<AdventureMapAdmin />} />
                <Route path="/power-ups" element={<PowerUps />} />
                <Route path="/category/:categoryId" element={<CategoryPage />} />
                <Route path="/play/:categoryId/:levelId" element={<CategoryQuizPage />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/leaderboards" element={<Leaderboards />} />
                <Route path="/profile" element={<Profile />} />
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
                <Route path="/settings" element={<Settings />} />
                <Route path="/settings/name" element={<SettingsName />} />
                <Route path="/settings/password" element={<SettingsPassword />} />
                <Route path="/settings/privacy" element={<SettingsPrivacy />} />
                <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="flow" element={<AdminFlow />} />
                  <Route path="content" element={<ContentManager />} />
                  <Route path="import" element={<AdminImport />} />
                  <Route path="users" element={<AdminOnlineUsers />} />
                  <Route path="duplicates" element={<DuplicateScanner />} />
                  <Route path="icons" element={<IconLibraryAdmin />} />
                  <Route path="tools" element={<QuestionTools />} />
                  <Route path="icon-assign" element={<IconAssignment />} />
                  <Route path="icon-review" element={<IconReview />} />
                  <Route path="missing-icons" element={<MissingIcons />} />
                  <Route path="fix-icons" element={<FixIcons />} />
                  <Route path="ai-generations" element={<AIGenerations />} />
                  <Route path="push" element={<PushNotifications />} />
                  <Route path="reports" element={<AdminReports />} />
                  <Route path="design" element={<AdminDesign />} />
                  <Route path="guest" element={<AdminGuestShowcase />} />
                  <Route path="economy" element={<AdminEconomy />} />
                  <Route path="settings" element={<AdminSettings />} />
                  <Route path="tvmodegame" element={<TVModeGameDocs />} />
                </Route>
                <Route path="/shop/success" element={<ShopSuccess />} />
                <Route path="/shop/cancel" element={<ShopCancel />} />
                <Route path="/styleguide" element={<Styleguide />} />
                <Route path="/all-buttons" element={<AllButtons />} />
                <Route path="/modals" element={<ModalsShowcase />} />
                <Route path="/tv-showcase" element={<TVScreensShowcase />} />
                <Route path="/docs" element={<Docs />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
                  </TooltipProvider>
                </SplashScreen>
              </PlayerProfileProvider>
            </BackgroundGenerationProvider>
          </NotificationModalProvider>
        </SoundProvider>
      </OnboardingProvider>
    </AuthProvider>
  </LanguageProvider>
);

export default App;
