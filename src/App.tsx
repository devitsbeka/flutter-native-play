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
import { LanguageFollowsCountry } from "@/components/shared/LanguageFollowsCountry";
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
import { ScrollLockGuard } from "@/components/ScrollLockGuard";
import { AutoplayRescue } from "@/components/system/AutoplayRescue";
import { PushRegistrar } from "@/native/PushRegistrar";
import { AdminAIPromptSync } from "@/components/system/AdminAIPromptSync";
import { MotionConfig } from "framer-motion";
import { StaleAnimationCleanup } from "@/components/system/StaleAnimationCleanup";
import { ScenePortraitHealer } from "@/components/system/ScenePortraitHealer";
import { ReducedMotionGuard } from "@/components/system/ReducedMotionGuard";
import { RoundStartWatcher } from "@/components/system/RoundStartWatcher";
import { HiddenWorkGuard } from "@/components/system/HiddenWorkGuard";
import { FakeFriendRequestAutoAccept } from "@/components/system/FakeFriendRequestAutoAccept";
import { PageSkeleton } from "@/components/PageSkeleton";
import { Navigate, useParams } from "react-router-dom";
import { isLegalLanguage } from "@/utils/legalLanguage";
import { OfflineBanner } from "./components/shared/OfflineBanner";
import { GlobalJoinRequestGate } from "@/components/team/JoinRequestGate";
import { GlobalGameInviteGate } from "@/components/team/GameInviteGate";
import { Toaster } from "sonner";
import { useFreshBuildGuard } from "@/hooks/useFreshBuildGuard";

// Build-time flag for admin inclusion (default: included unless explicitly disabled)
const INCLUDE_ADMIN = import.meta.env.VITE_INCLUDE_ADMIN !== 'false';

// Eagerly loaded pages (critical path)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Loading from "./pages/Loading";

// Lazy loaded pages (reduces initial bundle)
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PowerUps = lazy(() => import("./pages/PowerUps"));
// The streak page — where the home screen's flame lands (Figma 1069:18).
const Streak = lazy(() => import("./pages/Streak"));
const Leaderboards = lazy(() => import("./pages/Leaderboards"));
const Profile = lazy(() => import("./pages/Profile"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const TeamV2 = lazy(() => import("./pages/TeamV2"));
const CreateRoom = lazy(() => import("./pages/CreateRoom"));
const TeamBattlePage = lazy(() => import("./pages/TeamBattlePage"));
const KingPage = lazy(() => import("./pages/KingPage"));
const QueuePage = lazy(() => import("./pages/QueuePage"));
const OnlineGameHub = lazy(() => import("./pages/OnlineGameHub"));
const Discover = lazy(() => import("./pages/Discover"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const CategoryQuizPage = lazy(() => import("./pages/CategoryQuizPage"));
const Game = lazy(() => import("./pages/Game"));
const TriviaLobby = lazy(() => import("./pages/TriviaLobby"));
const CollectionLobby = lazy(() => import("./pages/CollectionLobby"));
const TriviaLoader = lazy(() => import("./pages/TriviaLoader"));
const RoomRedirect = lazy(() => import("./pages/RoomRedirect"));
const InvitePage = lazy(() => import("./pages/InvitePage"));
const TVDisplay = lazy(() => import("./pages/TVDisplay"));
const TVHostController = lazy(() => import("./pages/TVHostController"));
const TVLobby = lazy(() => import("./pages/TVLobby"));
const TVJoin = lazy(() => import("./pages/TVJoin"));
const Notifications = lazy(() => import("./pages/Notifications"));
// The Words mode. Its own chunk: the scene photos alone are larger than
// most pages, and nothing else in the app needs them.
const Words = lazy(() => import("./pages/Words"));
// The new-UI home (src/features/home-v3): the reference's "Stories" screen
// with MyTrivia's content in it. A preview at mytrivia.io/newui, like /dev/v2 —
// the routes are cheap, the chunk loads only when visited, and it exposes
// nothing the app does not already show.
const HomeV3 = lazy(() => import("./features/home-v3/pages/HomeV3"));
const PathDetailV3 = lazy(() => import("./features/home-v3/pages/PathDetailV3"));


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

/**
 * The legal pages at a URL that names its language.
 *
 * App Store Connect takes a privacy policy URL per App Store localization, and
 * the page behind each has to render in that language for someone who has
 * never opened the app. `/privacy-policy` follows stored preference, so it
 * cannot promise that; `/privacy-policy/de` can.
 *
 * An unsupported code redirects to the preference-following route rather than
 * 404ing — a mistyped listing link should still show the policy.
 */
function LegalByLanguage({ page }: { page: "privacy" | "terms" }) {
  const { lang } = useParams<{ lang: string }>();
  const base = page === "privacy" ? "/privacy-policy" : "/terms";

  if (!isLegalLanguage(lang)) return <Navigate to={base} replace />;

  return page === "privacy" ? <PrivacyPolicy lang={lang} /> : <TermsOfService lang={lang} />;
}
/** /v3/path/:id was the new-UI preview's first address; it moved to /newui. */
function NewUiPathRedirect() {
  const { pathId } = useParams<{ pathId: string }>();
  return <Navigate to={`/newui/path/${pathId ?? ""}`} replace />;
}
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
const SocialFrames = INCLUDE_ADMIN ? lazy(() => import("./pages/admin/SocialFrames")) : null;
const AdminEconomy = INCLUDE_ADMIN ? lazy(() => import("./pages/admin/Economy")) : null;
const AdminSettings = INCLUDE_ADMIN ? lazy(() => import("./pages/admin/Settings")) : null;
const AdminGuestShowcase = INCLUDE_ADMIN ? lazy(() => import("./pages/AdminGuestShowcase")) : null;
const UserAnalytics = INCLUDE_ADMIN ? lazy(() => import("./pages/admin/UserAnalytics")) : null;
const OnboardingWelcomePreview = INCLUDE_ADMIN ? lazy(() => import("./pages/OnboardingWelcomePreview")) : null;

// Shop pages
const ShopSuccess = lazy(() => import("./pages/shop/Success"));
const ShopCancel = lazy(() => import("./pages/shop/Cancel"));
// Internal design-system and documentation pages. These were reachable in
// production by anyone who typed the URL, and /docs in particular renders the
// full internal map: 79 tables, every RPC, every edge function, every hook.
// RLS still guards the data, but there is no reason to hand out the blueprint.
//
// Excluded at BUILD time rather than route-guarded, because a guarded route
// still ships the chunk - and the chunk is the leak. Set
// VITE_INCLUDE_DEV_PAGES=true to get them back in a production build.
const INCLUDE_DEV_PAGES = import.meta.env.DEV || import.meta.env.VITE_INCLUDE_DEV_PAGES === 'true';
// The universal lobby fed mock rooms, for screenshot passes (src/dev/LobbyShot.tsx).
const LobbyShot = INCLUDE_DEV_PAGES ? lazy(() => import("./dev/LobbyShot")) : null;

const Styleguide = INCLUDE_DEV_PAGES ? lazy(() => import("./pages/Styleguide")) : null;
const AllButtons = INCLUDE_DEV_PAGES ? lazy(() => import("./pages/AllButtons")) : null;
const ModalsShowcase = INCLUDE_DEV_PAGES ? lazy(() => import("./pages/ModalsShowcase")) : null;
const TVScreensShowcase = INCLUDE_DEV_PAGES ? lazy(() => import("./pages/TVScreensShowcase")) : null;
const Docs = INCLUDE_DEV_PAGES ? lazy(() => import("./pages/Docs")) : null;
const OnboardingPreview = INCLUDE_DEV_PAGES ? lazy(() => import("./pages/OnboardingPreview")) : null;
const SampleDemoTV = INCLUDE_DEV_PAGES ? lazy(() => import("./pages/SampleDemoTV")) : null;
const SampleDemoPlayer = INCLUDE_DEV_PAGES ? lazy(() => import("./pages/SampleDemoPlayer")) : null;

// Not a dev page - this is the public landing for a shared challenge link.
const ChallengeLanding = lazy(() => import("./pages/ChallengeLanding"));

// Reloads long-open tabs when a newer build is deployed (at safe moments only)
const FreshBuildGuard = () => {
  useFreshBuildGuard();
  return null;
};

const App = () => (
  <LanguageProvider>
    <AuthProvider>
      {/* The account's country decides the language. Inside AuthProvider
          because LanguageProvider is outside it. */}
      <LanguageFollowsCountry />
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
                    {/* Reduce Motion is the one lever a player has when
                        an app's animation makes their phone hot, and it
                        did nothing here: the app runs hundreds of
                        infinite decorative animations and none of them
                        asked. "user" makes Framer Motion follow the OS
                        setting, and index.css does the same for the CSS
                        ones and for the looping background video. */}
                    <MotionConfig reducedMotion="user">
                    <TooltipProvider>
            {/* The app calls toast() in ~580 places — every failure, every
                limit, every confirmation — and none of it had ever reached a
                screen, because no Toaster was mounted to render it. That is
                what "it loads for a second and does nothing" was: the app
                explaining itself to nobody. Above z-[100] so it clears the
                full-screen game modals, which is exactly where the messages
                that went missing were being raised. */}
            <Toaster
              position="top-center"
              richColors
              closeButton
              duration={4000}
              // One at a time. Sonner stacks three by default, and with
              // toast() called in ~580 places a single action can raise
              // several at once — a column of cards down the screen for what
              // is usually one event described three ways. Extras still
              // queue and appear as the current one leaves.
              visibleToasts={1}
              // Clear of the status bar, which the webview now draws under.
              // Object form, not a bare string: a string sets every side, so
              // it would indent the toasts horizontally as well.
              offset={{ top: "calc(1rem + var(--safe-top))" }}
              style={{ zIndex: 2147483647 }}
            />

            {/* Offline detection banner */}
            <OfflineBanner />

            {/* Somebody knocking on a room this player hosts, wherever they
                are in the app: the same doorstep the lobby used to own, so
                a host reading Discover still answers, and a yes walks them
                into the room. */}
            <GlobalJoinRequestGate />
            {/* And the same card the other way round: a friend inviting this
                player into their room. */}
            <GlobalGameInviteGate />
            
            {/* Global persistent background with particles */}
            <GlobalSplineBackground />
            
            <UserPresenceTracker />
            <ScrollLockGuard />
            <AutoplayRescue />
            <PushRegistrar />
            <AdminAIPromptSync />
            <StaleAnimationCleanup />
            <ScenePortraitHealer />
            <ReducedMotionGuard />
            <HiddenWorkGuard />
            <FakeFriendRequestAutoAccept />
            <FreshBuildGuard />
            {/* Outside <Routes> on purpose: MultiplayerProviderV2 is mounted
                inside the /team route, so nothing followed a player who
                wandered off while waiting for the host to start. Inside
                BrowserRouter (main.tsx), so it can navigate. */}
            <RoundStartWatcher />
            <Suspense fallback={<PageSkeleton />}>
              <Routes>
                <Route path="/" element={<Index />} />
                {/* Experimental world-map homepage. Not gated with the
                    showcase routes above: those are excluded from a production
                    build because each one pulls in a chunk that would otherwise
                    ship (/docs in particular renders the internal schema map).
                    This route renders Index, which every visitor already
                    downloads, so shipping it costs nothing and exposes nothing.

                    It is a preview, not a secret — Index.tsx only swaps in
                    LoggedInHomeV2 for a signed-in user, and an unguessed URL is
                    not a security boundary. Also reachable on device via
                    mytrivia://dev/v2. */}
                <Route path="/dev/v2" element={<Index />} />
                {/* The new-UI preview (mytrivia.io/newui) — see the lazy import above. */}
                <Route path="/newui" element={<HomeV3 />} />
                <Route path="/newui/path/:pathId" element={<PathDetailV3 />} />
                {/* The preview's first address; anything shared from it still lands. */}
                <Route path="/v3" element={<Navigate to="/newui" replace />} />
                <Route path="/v3/path/:pathId" element={<NewUiPathRedirect />} />
                <Route path="/loading" element={<Loading />} />
                <Route path="/trivialoader" element={<TriviaLoader />} />
                
                <Route path="/power-ups" element={<PowerUps />} />
                <Route path="/streak" element={<Streak />} />
                <Route path="/category/:categoryId" element={<CategoryPage />} />
                <Route path="/play/:categoryId/:levelId" element={<CategoryQuizPage />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/leaderboards" element={<Leaderboards />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/:userId" element={<PublicProfile />} />
                <Route path="/game" element={<Game />} />
                {/* The /play chooser page is gone — the play-options modal on
                    the home screen offers every game type now. Old links and
                    the queue page's "play with friends instead" land home,
                    where that modal lives. Coexists with
                    /play/:categoryId/:levelId (exact match wins). */}
                <Route path="/play" element={<Navigate to="/" replace />} />
                <Route path="/play/queue" element={<QueuePage />} />
                <Route path="/team-battle" element={<TeamBattlePage />} />
                <Route path="/king" element={<KingPage />} />
                <Route path="/lobby/:gameType" element={<OnlineGameHub />} />
                <Route path="/create-room" element={<CreateRoom />} />
                <Route path="/team" element={<TeamV2 />} />
                <Route path="/trivia/:triviaId" element={<TriviaLobby />} />
                <Route path="/collection/:collectionId" element={<CollectionLobby />} />
                {/* Every invite shared before /i/ existed is this shape,
                    and they are out in the world. Same welcome screen,
                    resolved by room code — see InvitePage. */}
                <Route path="/room/:code" element={<InvitePage by="room" />} />
                {/* A shared invite link. Shows who is inviting you before it
                    joins anything — see InvitePage. */}
                <Route path="/i/:code" element={<InvitePage />} />
                <Route path="/tv" element={<TVLobby />} />
                <Route path="/tv/host/:sessionId" element={<TVGameProvider><TVHostController /></TVGameProvider>} />
                <Route path="/tv/:code" element={<TVDisplay />} />
                <Route path="/join" element={<TVJoin />} />
                <Route path="/join/session/:sessionId" element={<TVJoin />} />
                <Route path="/join/:code" element={<TVJoin />} />
                <Route path="/controller/:code" element={<Navigate to="/join" replace />} />
                {/* The VIP page is gone — PRO is sold from the profile. */}
                <Route path="/vip" element={<Navigate to="/profile?tab=PRO" replace />} />
                <Route path="/discover" element={<Discover />} />
                {/* Words — the word-wheel crossword mode, solo or with one
                    friend. See src/features/words. */}
                <Route path="/words" element={<Words />} />
                <Route path="/words/:code" element={<Words />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/privacy-policy-en" element={<PrivacyPolicyEN />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/terms-en" element={<TermsOfServiceEN />} />
                {/* Per-language legal URLs, for the App Store listing. */}
                <Route path="/privacy-policy/:lang" element={<LegalByLanguage page="privacy" />} />
                <Route path="/terms/:lang" element={<LegalByLanguage page="terms" />} />
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
                    <Route path="social" element={SocialFrames && <SocialFrames />} />
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
                {INCLUDE_DEV_PAGES && Styleguide && <Route path="/styleguide" element={<Styleguide />} />}
                {INCLUDE_DEV_PAGES && AllButtons && <Route path="/all-buttons" element={<AllButtons />} />}
                {INCLUDE_DEV_PAGES && ModalsShowcase && <Route path="/modals" element={<ModalsShowcase />} />}
                {INCLUDE_DEV_PAGES && TVScreensShowcase && <Route path="/tv-showcase" element={<TVScreensShowcase />} />}
                {INCLUDE_DEV_PAGES && LobbyShot && <Route path="/dev/lobby" element={<LobbyShot />} />}
                {INCLUDE_DEV_PAGES && Docs && <Route path="/docs" element={<Docs />} />}
                {INCLUDE_DEV_PAGES && OnboardingPreview && <Route path="/onboarding-preview" element={<OnboardingPreview />} />}
                {INCLUDE_DEV_PAGES && SampleDemoTV && <Route path="/sampledemotv" element={<SampleDemoTV />} />}
                {INCLUDE_DEV_PAGES && SampleDemoPlayer && <Route path="/sampledemoplayer" element={<SampleDemoPlayer />} />}
                <Route path="/challenge/:code" element={<ChallengeLanding />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
                    </TooltipProvider>
                    </MotionConfig>
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
